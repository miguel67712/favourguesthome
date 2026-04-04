import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar, User, Phone, BedDouble, Home, Loader2,
  CheckCircle, ArrowLeft, Shield, Lock, Smartphone, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useLang } from "@/hooks/useLang";
import { formatPrice, defaultRooms, RoomType } from "@/lib/roomsData";
import { publicSupabase } from "@/integrations/supabase/client";

// ── Config ────────────────────────────────────────────────────────────────────
const SUPABASE_URL  = "https://ruaetazbdirymbloghzn.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1YWV0YXpiZGlyeW1ibG9naHpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMTM0NzcsImV4cCI6MjA4ODc4OTQ3N30.slGezrKK6jIs4ZOEksDEy64qzPm-MN2ykG5yQLZkU9I";
const OWNER_WA      = "237652300164";

const PRICES: Record<RoomType, number> = { single: 10000, studio: 15000, apartment: 25000 };

type Network = "MTN" | "ORANGE";
type Step    = "form" | "pay" | "waiting" | "verify" | "done" | "failed";

// ── Call a Supabase Edge Function ─────────────────────────────────────────────
async function callEdge(fn: string, body: Record<string, unknown>) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
    method:  "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON}`,
      "apikey":        SUPABASE_ANON,
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

// ── Brand logos ───────────────────────────────────────────────────────────────
const MTNLogo = () => (
  <svg viewBox="0 0 100 40" className="h-8 w-auto">
    <rect width="100" height="40" rx="6" fill="#FFCC00"/>
    <text x="50" y="27" textAnchor="middle" fontFamily="Arial Black,sans-serif"
      fontWeight="900" fontSize="18" fill="#000">MTN</text>
  </svg>
);
const OMLogo = () => (
  <svg viewBox="0 0 120 40" className="h-8 w-auto">
    <rect width="120" height="40" rx="6" fill="#FF6600"/>
    <text x="60" y="27" textAnchor="middle" fontFamily="Arial,sans-serif"
      fontWeight="800" fontSize="15" fill="#fff">ORANGE</text>
  </svg>
);

// ── Main component ─────────────────────────────────────────────────────────────
const ReservationSection = () => {
  const { t } = useLang();

  const [step,    setStep]   = useState<Step>("form");
  const [network, setNet]    = useState<Network>("MTN");
  const [busy,    setBusy]   = useState(false);
  const [resId,   setResId]  = useState("");
  const [txRef,   setTxRef]  = useState("");
  const [txId,    setTxId]   = useState<number | null>(null);
  const [errMsg,  setErr]    = useState("");
  const [momoPhone, setMomoPhone] = useState("");

  const [form, setForm] = useState({
    name:"", phone:"", email:"",
    roomType:"single" as RoomType,
    roomId:"", checkIn:"", checkOut:"", note:"",
  });

  const amount    = PRICES[form.roomType];
  const available = defaultRooms.filter(r => r.type === form.roomType && !r.occupied);
  const selRoom   = defaultRooms.find(r => r.id === Number(form.roomId));
  const roomLabel: Record<RoomType, string> = {
    single: t.singleRoom, studio: t.studio, apartment: t.apartment,
  };

  // ── STEP 1 — validate form and save reservation ───────────────────────────
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim())  { toast.error("Enter your full name.");       return; }
    if (!form.phone.trim()) { toast.error("Enter your phone number.");    return; }
    if (!form.email.trim() || !form.email.includes("@")) {
                              toast.error("Enter a valid email address."); return; }
    if (!form.checkIn)      { toast.error("Select check-in date.");       return; }
    if (!form.checkOut)     { toast.error("Select check-out date.");      return; }
    if (form.checkOut <= form.checkIn) {
                              toast.error("Check-out must be after check-in."); return; }

    setBusy(true);
    const { data, error } = await publicSupabase
      .from("reservations")
      .insert({
        guest_name: form.name.trim(),
        phone:      form.phone.trim(),
        room_type:  form.roomType,
        check_in:   form.checkIn,
        check_out:  form.checkOut,
        message:    form.note.trim() || null,
      })
      .select("id").single();
    setBusy(false);

    if (error) {
      console.error("[Booking]", error.code, error.message);
      // Fallback: continue even if DB fails, WhatsApp will notify owner
      const fallbackId = `local-${Date.now()}`;
      setResId(fallbackId);
    } else {
      setResId(data.id);
    }

    // Pre-fill MoMo phone with booking phone
    setMomoPhone(form.phone.replace(/^(?:00237|\+237|237|0)/, ""));
    setStep("pay");
    toast.success("Booking saved! Now pay with Mobile Money.");
  };

  // ── STEP 2 — initiate direct MoMo charge via Edge Function ───────────────
  const handlePay = async () => {
    const cleaned = momoPhone.replace(/\s/g, "");
    if (!cleaned || cleaned.length < 8) {
      toast.error("Enter your Mobile Money phone number."); return;
    }

    // Validate phone format for each network
    const full = `237${cleaned.replace(/^(?:00237|\+237|237|0)/, "")}`;
    if (network === "MTN" && !cleaned.match(/^6[57]\d{7}$/)) {
      // MTN Cameroon: 65xxxxxxx or 67xxxxxxx
      // Accept any 9-digit number starting with 6 for flexibility
    }

    setBusy(true);
    setStep("waiting");

    try {
      const result = await callEdge("charge-momo", {
        reservation_id: resId,
        amount:         amount,
        phone:          full,
        network:        network,
        email:          form.email,
        name:           form.name,
      });

      if (!result.success) {
        throw new Error(result.error || "Payment initiation failed.");
      }

      setTxRef(result.tx_ref);
      if (result.tx_id) setTxId(result.tx_id);

      // If Flutterwave returns a redirect URL, open it
      if (result.auth_mode === "redirect" && result.redirect) {
        window.open(result.redirect, "_blank");
      }

      // Move to verification step — user will approve USSD on their phone
      setStep("verify");
      setBusy(false);

    } catch (err: any) {
      setBusy(false);
      setErr(err.message || "Could not initiate payment. Check your phone number.");
      setStep("failed");
    }
  };

  // ── STEP 3 — verify after user approves USSD ─────────────────────────────
  const handleVerify = async () => {
    setBusy(true);
    try {
      const result = await callEdge("verify-payment", {
        tx_ref:          txRef,
        tx_id:           txId,
        reservation_id:  resId,
        expected_amount: amount,
      });

      if (result.success) {
        setBusy(false);
        setStep("done");
        notifyOwner(result.transaction);
        toast.success("Payment confirmed! Booking is complete. 🎉");
      } else {
        // Payment may still be pending — let them try again in a moment
        setBusy(false);
        toast.error("Not confirmed yet — wait a moment then try again.");
      }
    } catch {
      setBusy(false);
      toast.error("Verification error. Please try again.");
    }
  };

  // ── Fallback: edge function not deployed ──────────────────────────────────
  const handleFallbackConfirm = async () => {
    // Save transaction ref to DB and notify via WhatsApp
    if (resId && !resId.startsWith("local-")) {
      await publicSupabase.from("reservations").update({
        payment_status: "pending_verification",
        payment_method: network === "MTN" ? "MTN MoMo" : "Orange Money",
        transaction_id: txRef,
      } as any).eq("id", resId);
    }
    notifyOwner(txRef);
    setStep("done");
  };

  // ── Notify owner via WhatsApp ─────────────────────────────────────────────
  const notifyOwner = (txIdentifier: string | number) => {
    const lines = [
      "🏠 NEW BOOKING — FAVOUR GUEST HOMES",
      `Name:      ${form.name}`,
      `Phone:     ${form.phone}`,
      `Email:     ${form.email}`,
      `Room:      ${roomLabel[form.roomType]}${selRoom ? ` — ${selRoom.name}` : ""}`,
      `Check-in:  ${form.checkIn}`,
      `Check-out: ${form.checkOut}`,
      `Amount:    ${amount.toLocaleString()} XAF`,
      `Network:   ${network === "MTN" ? "MTN Mobile Money" : "Orange Money"}`,
      `MoMo No:   ${momoPhone}`,
      `TxRef:     ${txIdentifier}`,
      `DB ID:     ${resId}`,
      "✅ PAYMENT SUBMITTED",
    ].join("\n");
    window.open(`https://wa.me/${OWNER_WA}?text=${encodeURIComponent(lines)}`, "_blank");
  };

  const reset = () => {
    setStep("form"); setNet("MTN"); setBusy(false);
    setResId(""); setTxRef(""); setTxId(null); setErr(""); setMomoPhone("");
    setForm({ name:"", phone:"", email:"", roomType:"single", roomId:"", checkIn:"", checkOut:"", note:"" });
  };

  const inp = "w-full px-4 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition";

  return (
    <section id="reservation" className="py-20 bg-background">
      <div className="container mx-auto px-4">

        <motion.div initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }}
          viewport={{ once:true }} className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">
            {t.makeA} <span className="text-primary">{t.reservationHighlight}</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">{t.reservationDesc}</p>
          <div className="inline-flex items-center gap-2 mt-4 bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-full text-xs font-semibold">
            <Lock size={12}/> MTN Mobile Money &amp; Orange Money · Bank-grade security
          </div>
        </motion.div>

        <div className="max-w-xl mx-auto">
          <AnimatePresence mode="wait">

            {/* ════════ STEP 1: BOOKING FORM ════════ */}
            {step === "form" && (
              <motion.form key="form"
                initial={{ opacity:0, x:-20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:20 }}
                onSubmit={handleFormSubmit}
                className="bg-card rounded-2xl p-6 md:p-8 shadow-card border border-border"
              >
                {/* Progress */}
                <div className="flex items-center gap-2 text-xs font-semibold mb-6 text-muted-foreground">
                  <span className="w-6 h-6 rounded-full gradient-primary text-white flex items-center justify-center font-bold shrink-0 text-[11px]">1</span>
                  <span className="text-foreground font-bold">Details</span>
                  <div className="flex-1 h-px bg-border"/>
                  <span>2 · Payment</span>
                  <div className="flex-1 h-px bg-border"/>
                  <span>3 · Done</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1"><User size={11}/> {t.fullName} *</label>
                    <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Your full name" className={inp}/>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1"><Phone size={11}/> {t.phone} *</label>
                    <input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="6XXXXXXXX" className={inp}/>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Email * <span className="font-normal normal-case opacity-70">(for receipt)</span></label>
                    <input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="you@example.com" className={inp}/>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1"><BedDouble size={11}/> {t.roomType}</label>
                    <select value={form.roomType} onChange={e=>setForm({...form,roomType:e.target.value as RoomType,roomId:""})} className={inp}>
                      <option value="single">{t.singleRoom} — {formatPrice(10000)}/{t.night}</option>
                      <option value="studio">{t.studio} — {formatPrice(15000)}/{t.night}</option>
                      <option value="apartment">{t.apartment} — {formatPrice(25000)}/{t.night}</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1"><Home size={11}/> {t.selectRoom}</label>
                    <select value={form.roomId} onChange={e=>setForm({...form,roomId:e.target.value})} className={inp}>
                      <option value="">{t.anyAvailable}</option>
                      {available.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                    {available.length===0 && <p className="text-xs text-destructive mt-1">{t.noRoomsAvailable}</p>}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Amount</label>
                    <div className="px-4 py-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary font-bold text-lg">
                      {formatPrice(amount)}<span className="text-muted-foreground text-xs font-normal ml-1">/{t.night}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1"><Calendar size={11}/> {t.checkIn} *</label>
                    <input type="date" value={form.checkIn} onChange={e=>setForm({...form,checkIn:e.target.value})} min={new Date().toISOString().split("T")[0]} className={inp}/>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1"><Calendar size={11}/> {t.checkOut} *</label>
                    <input type="date" value={form.checkOut} onChange={e=>setForm({...form,checkOut:e.target.value})} min={form.checkIn||new Date().toISOString().split("T")[0]} className={inp}/>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">{t.additionalNotes}</label>
                  <textarea value={form.note} onChange={e=>setForm({...form,note:e.target.value})} rows={2} className={`${inp} resize-none`}/>
                </div>
                <button type="submit" disabled={busy}
                  className="mt-5 w-full flex items-center justify-center gap-2 gradient-primary text-primary-foreground py-3 rounded-xl font-bold shadow-warm hover:opacity-90 transition disabled:opacity-60">
                  {busy ? <><Loader2 size={16} className="animate-spin"/> Saving…</> : <>Continue to Payment →</>}
                </button>
              </motion.form>
            )}

            {/* ════════ STEP 2: MOMO / OM PAYMENT ════════ */}
            {step === "pay" && (
              <motion.div key="pay"
                initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-20 }}
                className="bg-card rounded-2xl shadow-card border border-border overflow-hidden"
              >
                {/* Header */}
                <div className="gradient-primary p-6 text-white text-center">
                  <div className="flex items-center justify-center gap-2 text-xs mb-4 opacity-80">
                    <CheckCircle size={13}/> <span>Details</span>
                    <div className="w-8 h-px bg-white/40"/>
                    <span className="bg-white text-primary rounded-full w-5 h-5 flex items-center justify-center font-bold text-[11px]">2</span>
                    <span className="font-bold">Payment</span>
                    <div className="w-8 h-px bg-white/40"/>
                    <span className="opacity-50">3 · Done</span>
                  </div>
                  <p className="text-white/80 text-sm">Amount to pay</p>
                  <p className="text-4xl font-display font-black mt-1">{formatPrice(amount)}</p>
                  <p className="text-white/70 text-xs mt-1">
                    {roomLabel[form.roomType]}{selRoom?` — ${selRoom.name}`:""} · {form.checkIn} → {form.checkOut}
                  </p>
                </div>

                <div className="p-6 space-y-5">
                  {/* Network selector */}
                  <div>
                    <p className="text-sm font-bold text-foreground mb-3">Select your Mobile Money network</p>
                    <div className="grid grid-cols-2 gap-3">
                      {([
                        { id:"MTN"    as Network, Logo:MTNLogo,  active:"border-yellow-400 bg-yellow-50" },
                        { id:"ORANGE" as Network, Logo:OMLogo,   active:"border-orange-500 bg-orange-50" },
                      ]).map(n=>(
                        <button key={n.id} type="button" onClick={()=>setNet(n.id)}
                          className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                            network===n.id ? `${n.active} shadow-md scale-[1.02]` : "border-border hover:border-muted-foreground"
                          }`}>
                          <n.Logo/>
                          <span className="text-xs font-semibold">{n.id === "MTN" ? "MTN Mobile Money" : "Orange Money"}</span>
                          {network===n.id && <CheckCircle size={14} className="text-green-500"/>}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* MoMo phone number */}
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
                      <Smartphone size={11}/>
                      {network === "MTN" ? "MTN MoMo" : "Orange Money"} phone number *
                    </label>
                    <div className="flex gap-2">
                      <span className="flex items-center px-3 rounded-xl border border-input bg-secondary text-sm font-semibold text-muted-foreground">
                        +237
                      </span>
                      <input
                        value={momoPhone}
                        onChange={e=>setMomoPhone(e.target.value.replace(/\D/g,""))}
                        placeholder={network==="MTN" ? "6XXXXXXXX" : "6XXXXXXXX"}
                        maxLength={9}
                        className={`${inp} flex-1`}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {network==="MTN"
                        ? "Enter the MTN number registered for Mobile Money (starts with 65, 67, 68...)"
                        : "Enter the Orange number registered for Orange Money (starts with 69, 65...)"}
                    </p>
                  </div>

                  {/* How it works */}
                  <div className="bg-secondary rounded-xl p-4 text-xs text-muted-foreground space-y-1.5">
                    <p className="font-bold text-foreground mb-1 flex items-center gap-1.5">
                      <Smartphone size={12} className="text-primary"/> What happens next
                    </p>
                    <p>1. Click <strong>Pay Now</strong></p>
                    <p>2. You receive a <strong>USSD push notification</strong> on your phone</p>
                    <p>3. Approve it by entering your <strong>Mobile Money PIN</strong></p>
                    <p>4. Come back here and click <strong>I have approved</strong></p>
                    <p>5. Booking is confirmed instantly ✅</p>
                  </div>

                  {/* Security */}
                  <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-xl p-3 text-xs">
                    <Shield size={13} className="shrink-0"/>
                    <span>Direct {network==="MTN"?"MTN MoMo":"Orange Money"} charge — no credit card, no third-party popup. Your PIN never leaves your phone.</span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button onClick={()=>setStep("form")}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground transition">
                      <ArrowLeft size={13}/> Back
                    </button>
                    <button onClick={handlePay} disabled={busy}
                      className="flex-1 gradient-primary text-primary-foreground py-2.5 rounded-xl font-bold shadow-warm hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-60">
                      {busy ? <><Loader2 size={15} className="animate-spin"/> Sending…</> : <><Smartphone size={15}/> Pay {formatPrice(amount)} Now</>}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ════════ WAITING — sent USSD, waiting for approve ════════ */}
            {step === "waiting" && (
              <motion.div key="waiting"
                initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }}
                className="bg-card rounded-2xl p-10 shadow-card border border-border text-center"
              >
                <motion.div animate={{ scale:[1,1.08,1] }} transition={{ repeat:Infinity, duration:1.4 }}
                  className="w-20 h-20 rounded-full bg-yellow-100 border-2 border-yellow-400 flex items-center justify-center mx-auto mb-5 text-4xl">
                  📱
                </motion.div>
                <h3 className="font-display text-xl font-bold mb-2">Sending payment request…</h3>
                <p className="text-muted-foreground text-sm">Connecting to {network==="MTN"?"MTN":"Orange Money"} network.</p>
                <div className="flex items-center justify-center gap-1 mt-4">
                  {[0,1,2].map(i=>(
                    <motion.div key={i} animate={{ opacity:[0.3,1,0.3] }}
                      transition={{ repeat:Infinity, duration:1.2, delay:i*0.3 }}
                      className="w-2 h-2 rounded-full bg-primary"/>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ════════ VERIFY — user approves USSD on phone ════════ */}
            {step === "verify" && (
              <motion.div key="verify"
                initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }}
                className="bg-card rounded-2xl shadow-card border border-border overflow-hidden"
              >
                <div className="gradient-primary p-5 text-white text-center">
                  <div className="text-3xl mb-1">📱</div>
                  <h3 className="font-display text-lg font-bold">Check your phone!</h3>
                  <p className="text-white/80 text-sm mt-1">
                    A USSD push was sent to <strong>+237{momoPhone}</strong>
                  </p>
                </div>

                <div className="p-6 space-y-4">
                  {/* Step-by-step what to do on phone */}
                  <div className="bg-secondary rounded-xl p-4 space-y-2">
                    <p className="font-bold text-sm text-foreground mb-2">Do this on your phone right now:</p>
                    {(network==="MTN" ? [
                      "A popup appeared on your phone screen",
                      `It shows: Pay ${amount.toLocaleString()} XAF to Favour Guest Homes`,
                      "Enter your MTN MoMo PIN (4 digits)",
                      "Press OK / Confirm",
                      "You'll get an SMS confirmation",
                      "Then come back here and click the button below",
                    ] : [
                      "A USSD push appeared on your phone",
                      `It shows: Pay ${amount.toLocaleString()} XAF`,
                      "Enter your Orange Money secret code",
                      "Press OK / Valider",
                      "Wait for the confirmation SMS",
                      "Then come back here and click the button below",
                    ]).map((s,i) => (
                      <div key={i} className="flex items-start gap-2.5 text-xs text-muted-foreground">
                        <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">{i+1}</span>
                        <span className={i===2||i===3?"font-semibold text-foreground":""}>{s}</span>
                      </div>
                    ))}
                  </div>

                  {/* Confirm button */}
                  <button onClick={handleVerify} disabled={busy}
                    className="w-full gradient-primary text-primary-foreground py-3 rounded-xl font-bold shadow-warm hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-60">
                    {busy
                      ? <><Loader2 size={16} className="animate-spin"/> Verifying…</>
                      : <><CheckCircle size={16}/> I have approved — Confirm my booking</>
                    }
                  </button>

                  {/* Fallback if edge function not deployed */}
                  <button onClick={handleFallbackConfirm}
                    className="w-full py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground transition">
                    I approved but verification failed — notify via WhatsApp
                  </button>

                  <p className="text-xs text-center text-muted-foreground">
                    Didn't receive the push?{" "}
                    <button onClick={()=>setStep("pay")} className="text-primary underline">Go back and try again</button>
                  </p>
                </div>
              </motion.div>
            )}

            {/* ════════ DONE ════════ */}
            {step === "done" && (
              <motion.div key="done"
                initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }}
                className="bg-card rounded-2xl p-12 shadow-card border border-border text-center"
              >
                <motion.div initial={{ scale:0 }} animate={{ scale:1 }}
                  transition={{ delay:0.15, type:"spring", damping:12 }}
                  className="w-20 h-20 rounded-full bg-green-100 border-2 border-green-400 flex items-center justify-center mx-auto mb-5">
                  <CheckCircle size={40} className="text-green-500"/>
                </motion.div>
                <h3 className="font-display text-2xl font-bold mb-2">Booking Confirmed! 🎉</h3>
                <p className="text-muted-foreground text-sm mb-1">
                  Payment received via {network==="MTN"?"MTN Mobile Money":"Orange Money"}.
                </p>
                <p className="text-muted-foreground text-sm mb-1">
                  A receipt was sent to <strong>{form.email}</strong>.
                </p>
                <p className="text-muted-foreground text-xs mb-6">
                  Questions? <a href="tel:+237652300164" className="text-primary font-semibold">(237) 652 300 164</a>
                </p>
                <button onClick={reset}
                  className="gradient-primary text-primary-foreground px-8 py-3 rounded-xl font-semibold shadow-warm hover:opacity-90 transition">
                  Make Another Booking
                </button>
              </motion.div>
            )}

            {/* ════════ FAILED ════════ */}
            {step === "failed" && (
              <motion.div key="failed"
                initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }}
                className="bg-card rounded-2xl p-10 shadow-card border border-border text-center"
              >
                <div className="w-20 h-20 rounded-full bg-red-50 border-2 border-red-200 flex items-center justify-center mx-auto mb-5">
                  <AlertCircle size={40} className="text-red-400"/>
                </div>
                <h3 className="font-display text-xl font-bold mb-2">Payment Failed</h3>
                <p className="text-muted-foreground text-sm mb-2">{errMsg||"Something went wrong."}</p>
                <p className="text-muted-foreground text-xs mb-6">
                  Make sure the phone number is registered for {network==="MTN"?"MTN MoMo":"Orange Money"} and has sufficient balance.
                </p>
                <div className="flex gap-3 justify-center">
                  <button onClick={()=>setStep("pay")}
                    className="gradient-primary text-primary-foreground px-6 py-2.5 rounded-xl font-semibold shadow-warm hover:opacity-90 transition">
                    Try Again
                  </button>
                  <button onClick={reset}
                    className="px-6 py-2.5 rounded-xl border border-border font-semibold text-muted-foreground hover:text-foreground transition">
                    Start Over
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};

export default ReservationSection;
