// ═══════════════════════════════════════════════════════════════════════════
// Supabase Edge Function: charge-momo
// Initiates a DIRECT Mobile Money charge via Flutterwave API
// Secret key NEVER exposed to browser — maximum security
// Deploy: supabase functions deploy charge-momo
// ═══════════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const {
      reservation_id,
      amount,
      phone,        // e.g. "237677000000"
      network,      // "MTN" | "ORANGE"
      email,
      name,
    } = await req.json();

    // ── Input validation ──────────────────────────────────────────────────
    if (!reservation_id || !amount || !phone || !network || !email || !name) {
      return json({ success: false, error: "Missing required fields" }, 400);
    }
    if (!["MTN", "ORANGE"].includes(network)) {
      return json({ success: false, error: "Invalid network. Use MTN or ORANGE" }, 400);
    }
    if (amount < 100) {
      return json({ success: false, error: "Amount too small" }, 400);
    }

    // ── Get secret key (server-side only) ─────────────────────────────────
    const FLW_SECRET = Deno.env.get("FLW_SECRET_KEY");
    if (!FLW_SECRET) {
      return json({ success: false, error: "Payment service not configured. Contact support." }, 500);
    }

    // ── Build unique transaction ref ──────────────────────────────────────
    const txRef = `FGH-${reservation_id.slice(0, 8)}-${Date.now()}`;

    // ── Flutterwave Direct Charge — Mobile Money Cameroon ─────────────────
    // This sends a USSD push directly to the phone — no popup, no card UI
    const payload = {
      tx_ref:       txRef,
      amount:       Number(amount),
      currency:     "XAF",
      email:        email,
      phone_number: phone,                     // full number with country code
      network:      network,                   // "MTN" or "ORANGE"
      fullname:     name,
      client_ip:    "::1",
      device_fingerprint: txRef,
    };

    const flwRes = await fetch(
      "https://api.flutterwave.com/v3/charges?type=mobile_money_cameroon",
      {
        method:  "POST",
        headers: {
          "Authorization": `Bearer ${FLW_SECRET}`,
          "Content-Type":  "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const flwData = await flwRes.json();
    console.log("FLW charge response:", JSON.stringify(flwData));

    // Flutterwave returns status "success" with meta.authorization for pending USSD
    if (flwData.status !== "success") {
      return json({
        success: false,
        error:   flwData.message || "Failed to initiate payment. Check phone number.",
      }, 400);
    }

    // ── Save tx_ref to reservation for later verification ─────────────────
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await supabase.from("reservations").update({
      payment_status: "pending_verification",
      payment_method: network === "MTN" ? "MTN MoMo" : "Orange Money",
      transaction_id: flwData.data?.id ? String(flwData.data.id) : txRef,
    } as any).eq("id", reservation_id);

    // ── Return charge info to frontend ────────────────────────────────────
    return json({
      success:    true,
      tx_ref:     txRef,
      flw_ref:    flwData.data?.flw_ref,
      tx_id:      flwData.data?.id,
      message:    flwData.message,
      // Some networks need OTP validation (check meta.authorization)
      auth_mode:  flwData.meta?.authorization?.mode,       // "redirect" | "otp" | "pin" | "avs_noauth"
      redirect:   flwData.meta?.authorization?.redirect,    // if mode=redirect, open this URL
    });

  } catch (err) {
    console.error("charge-momo error:", err);
    return json({ success: false, error: "Server error. Please try again." }, 500);
  }
});
