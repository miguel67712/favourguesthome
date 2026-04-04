// ═══════════════════════════════════════════════════════════════════════════
// Supabase Edge Function: verify-payment
// Verifies a completed MoMo transaction with Flutterwave
// Secret key NEVER in browser — maximum security
// Deploy: supabase functions deploy verify-payment
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
    const { tx_ref, tx_id, reservation_id, expected_amount } = await req.json();

    if ((!tx_ref && !tx_id) || !reservation_id) {
      return json({ success: false, error: "Missing required fields" }, 400);
    }

    const FLW_SECRET = Deno.env.get("FLW_SECRET_KEY");
    if (!FLW_SECRET) {
      return json({ success: false, error: "Payment service not configured" }, 500);
    }

    // ── Verify by transaction ID (most reliable) ──────────────────────────
    let verifyUrl: string;
    if (tx_id) {
      verifyUrl = `https://api.flutterwave.com/v3/transactions/${tx_id}/verify`;
    } else {
      // Fallback: search by tx_ref
      verifyUrl = `https://api.flutterwave.com/v3/transactions?tx_ref=${tx_ref}`;
    }

    const flwRes = await fetch(verifyUrl, {
      headers: { "Authorization": `Bearer ${FLW_SECRET}` },
    });
    const flwData = await flwRes.json();
    console.log("FLW verify response:", JSON.stringify(flwData));

    // Handle both verify-by-id and search responses
    const txData = tx_id ? flwData.data : flwData.data?.[0];

    if (flwData.status !== "success" || !txData) {
      return json({ success: false, error: "Transaction not found" }, 400);
    }

    // ── Security checks ───────────────────────────────────────────────────
    if (txData.status !== "successful") {
      return json({ success: false, error: `Transaction status: ${txData.status}` }, 400);
    }
    if (txData.currency !== "XAF") {
      return json({ success: false, error: "Invalid currency — security check failed" }, 400);
    }
    if (expected_amount && txData.amount < Number(expected_amount)) {
      return json({ success: false, error: `Amount mismatch: got ${txData.amount}, expected ${expected_amount}` }, 400);
    }

    // ── Update reservation as PAID and CONFIRMED ──────────────────────────
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: dbErr } = await supabase.from("reservations").update({
      payment_status: "paid",
      payment_method: txData.payment_type || "mobilemoneycameroon",
      transaction_id: String(txData.id),
      amount_paid:    txData.amount,
      status:         "confirmed",
    } as any).eq("id", reservation_id);

    if (dbErr) {
      console.error("DB update error:", dbErr);
      return json({ success: false, error: "Database update failed" }, 500);
    }

    return json({
      success:      true,
      transaction:  txData.id,
      amount:       txData.amount,
      currency:     txData.currency,
      network:      txData.payment_type,
      customer:     txData.customer?.name,
    });

  } catch (err) {
    console.error("verify-payment error:", err);
    return json({ success: false, error: "Server error" }, 500);
  }
});
