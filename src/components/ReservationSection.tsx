import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar, User, Phone, BedDouble, Send, Home, Loader2,
  CheckCircle, Copy, ArrowLeft, Smartphone, AlertCircle, Shield,
} from "lucide-react";
import { toast } from "sonner";
import { publicSupabase, supabase } from "@/integrations/supabase/client";
import { useLang } from "@/hooks/useLang";
import { formatPrice, RoomType } from "@/lib/roomsData";
import type { Tables } from "@/integrations/supabase/types";

type Room = Tables<"rooms">;

// ── Business constants ────────────────────────────────────────────────────────
const MOMO_NUMBER   = "683408023";
const MOMO_NAME     = "Roy Ndah Penn";
const ORANGE_NUMBER = "683408023"; // update if different Orange line

type PayMethod = "mtn_momo" | "orange_money";

const PRICES: Record<RoomType, number> = { single: 10000, studio: 15000, apartment: 25000 };

// ── Payment step types ────────────────────────────────────────────────────────
type Step = "form" | "payment" | "confirm" | "done";

interface ReservationDraft {
  name: string; phone: string; roomType: RoomType;
  selectedRoom: string; checkIn: string; checkOut: string; message: string;
  reservationId: string; amount: number;
}

// ── MTN MoMo logo SVG ────────────────────────────────────────────────────────
const MTNLogo = () => (
  <svg viewBox="0 0 80 30" className="h-7 w-auto">
    <rect width="80" height="30" rx="4" fill="#FFCC00"/>
    <text x="40" y="21" textAnchor="middle" fontFamily="Arial Black,sans-serif" fontWeight="900" fontSize="14" fill="#000">MTN</text>
  </svg>
);

const OrangeLogo = () => (
  <svg viewBox="0 0 90 30" className="h-7 w-auto">
    <rect width="90" height="30" rx="4" fill="#FF6600"/>
    <text x="45" y="21" textAnchor="middle" fontFamily="Arial,sans-serif" fontWeight="700" fontSize="13" fill="#fff">ORANGE</text>
  </svg>
);

// ── USSD instruction generators ───────────────────────────────────────────────
function getMTNSteps(amount: number): string[] {
  return [
    `Dial *126# on your MTN phone`,
    `Select "1" → Transfer Money`,
    `Select "1" → MoMo User`,
    `Enter the number: ${MOMO_NUMBER}`,
    `Enter amount: ${amount.toLocaleString()} XAF`,
    `Enter your MoMo PIN to confirm`,
    `Copy the transaction ID from the SMS you receive`,
    `Paste it below to complete your booking`,
  ];
}

function getOrangeSteps(amount: number): string[] {
  return [
    `Dial #150*1# on your Orange phone`,
    `Select "Transfert d'argent"`,
    `Enter the number: ${ORANGE_NUMBER}`,
    `Enter amount: ${amount.toLocaleString()} XAF`,
    `Enter your Orange Money PIN to confirm`,
    `Copy the transaction ID from the confirmation SMS`,
    `Paste it below to complete your booking`,
  ];
}

// ── Main component ────────────────────────────────────────────────────────────
const ReservationSection = () => {
  const { t } = useLang();
  const [rooms, setRooms]       = useState<Room[]>([]);
  const [roomsLoading, setRL]   = useState(true);
  const [step, setStep]         = useState<Step>("form");
  const [payMethod, setPayMeth] = useState<PayMethod>("mtn_momo");
  const [txId, setTxId]         = useState("");
  const [submitting, setSub]    = useState(false);
  const [draft, setDraft]       = useState<ReservationDraft | null>(null);

  const [form, setForm] = useState({
    name: "", phone: "", roomType: "single" as RoomType,
    selectedRoom: "", checkIn: "", checkOut: "", message: "",
  });

  // ── Fetch available rooms ──────────────────────────────────────────────────
  const fetchRooms = useCallback(async () => {
    const { data, error } = await publicSupabase
      .from("rooms").select("*").eq("occupied", false).order("name");
    if (error) { setRL(false); return; }
    setRooms(data ?? []); setRL(false);
  }, []);

  useEffect(() => {
    let active = true;
    fetchRooms();
    const ch = supabase.channel("res-rooms-rt2")
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms" }, () => { if (active) fetchRooms(); })
      .subscribe();
    const iv = setInterval(() => { if (active) fetchRooms(); }, 6000);
    const onF = () => { if (active) fetchRooms(); };
    const onS = (e: StorageEvent) => { if (e.key === "fg-last-room-sync" && active) fetchRooms(); };
    window.addEventListener("focus", onF); window.addEventListener("storage", onS);
    return () => { active = false; clearInterval(iv); window.removeEventListener("focus", onF); window.removeEventListener("storage", onS); supabase.removeChannel(ch); };
  }, [fetchRooms]);

  const filteredRooms = rooms.filter(r => r.type === form.roomType);
  useEffect(() => {
    if (form.selectedRoom && !filteredRooms.some(r => r.id === form.selectedRoom))
      setForm(p => ({ ...p, selectedRoom: "" }));
  }, [filteredRooms, form.selectedRoom]);

  const labels: Record<RoomType, string> = { single: t.singleRoom, studio: t.studio, apartment: t.apartment };
  const amount = PRICES[form.roomType];

  // ── Step 1: Submit reservation, go to payment ──────────────────────────────
  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.checkIn || !form.checkOut) {
      toast.error(t.fillFields); return;
    }
    setSub(true);
    // Insert only guaranteed base columns - payment columns added via migration
    const { data, error } = await supabase.from("reservations").insert({
      guest_name: form.name,
      phone: form.phone,
      room_type: form.roomType,
      check_in: form.checkIn,
      check_out: form.checkOut,
      message: form.message || null,
    }).select("id").single();
    setSub(false);
    if (error) {
      console.error("[Reservation] insert failed:", error.code, error.message, error.details);
      toast.error(t.reservationError); return;
    }
    if (!data) { toast.error(t.reservationError); return; }
    // Attach payment metadata if migration has been run (silently skipped otherwise)
    try {
      await (supabase.from("reservations") as any).update({
        payment_status: "unpaid",
        amount_paid: amount,
      }).eq("id", data.id);
    } catch (_) { /* payment columns not yet added - ok */ }

    setDraft({
      ...form, roomType: form.roomType,
      reservationId: data.id, amount,
    });
    setStep("payment");
  };

  // ── Step 2: After paying, go to confirm ───────────────────────────────────
  const goToConfirm = () => {
    if (!payMethod) { toast.error("Please select a payment method."); return; }
    setStep("confirm");
  };

  // ── Step 3: Submit transaction ID ─────────────────────────────────────────
  const handleConfirmPayment = async () => {
    if (!txId.trim()) { toast.error("Please enter your transaction ID."); return; }
    if (!draft) return;
    setSub(true);
    const { error } = await supabase.from("reservations").update({
      payment_method: payMethod,
      payment_status: "pending_verification",
      transaction_id: txId.trim(),
    }).eq("id", draft.reservationId);
    setSub(false);
    if (error) { toast.error("Could not save your transaction ID. Please try WhatsApp."); return; }

    // Also send WhatsApp message to owner
    const sel = rooms.find(r => r.id === draft.selectedRoom);
    const msg = [
      `💰 PAYMENT SUBMITTED`,
      `Name: ${draft.name}`,
      `Phone: ${draft.phone}`,
      `Room: ${labels[draft.roomType]}${sel ? ` (${sel.name})` : ""}`,
      `Check-in: ${draft.checkIn}`,
      `Check-out: ${draft.checkOut}`,
      `Amount: ${draft.amount.toLocaleString()} XAF`,
      `Method: ${payMethod === "mtn_momo" ? "MTN MoMo" : "Orange Money"}`,
      `TxID: ${txId.trim()}`,
      draft.message ? `Note: ${draft.message}` : "",
    ].filter(Boolean).join("\n");
    window.open(`https://wa.me/237652300164?text=${encodeURIComponent(msg)}`, "_blank");

    toast.success("Payment submitted! We will verify and confirm shortly.");
    setStep("done");
  };

  const copyNumber = (num: string) => {
    navigator.clipboard.writeText(num).then(() => toast.success("Number copied!"));
  };

  const reset = () => {
    setStep("form"); setDraft(null); setTxId(""); setPayMeth("mtn_momo");
    setForm({ name: "", phone: "", roomType: "single", selectedRoom: "", checkIn: "", checkOut: "", message: "" });
  };

  const inp = "w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary transition outline-none";

  const paySteps = payMethod === "mtn_momo"
    ? getMTNSteps(draft?.amount ?? amount)
    : getOrangeSteps(draft?.amount ?? amount);

  return (
    <section id="reservation" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground mb-4">
            {t.makeA} <span className="text-primary">{t.reservationHighlight}</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto font-body">{t.reservationDesc}</p>
        </motion.div>

        <div className="max-w-2xl mx-auto">
          <AnimatePresence mode="wait">

            {/* ── STEP 1: Booking form ───────────────────────────────────── */}
            {step === "form" && (
              <motion.form key="form"
                initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }}
                onSubmit={handleBooking}
                className="bg-card rounded-2xl p-8 shadow-card border border-border"
              >
                {/* Progress */}
                <div className="flex items-center gap-2 mb-6">
                  {["Details","Payment","Confirm"].map((s, i) => (
                    <div key={s} className="flex items-center gap-2 flex-1">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? "gradient-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>{i+1}</div>
                      <span className={`text-xs font-medium ${i === 0 ? "text-foreground" : "text-muted-foreground"}`}>{s}</span>
                      {i < 2 && <div className="flex-1 h-px bg-border"/>}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-1.5 flex items-center gap-1"><User size={13}/> {t.fullName} *</label>
                    <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inp} required/>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-1.5 flex items-center gap-1"><Phone size={13}/> {t.phone} *</label>
                    <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="e.g. 6XXXXXXXX" className={inp} required/>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-1.5 flex items-center gap-1"><BedDouble size={13}/> {t.roomType}</label>
                    <select value={form.roomType} onChange={e => setForm({ ...form, roomType: e.target.value as RoomType, selectedRoom: "" })} className={inp}>
                      <option value="single">{t.singleRoom} — {formatPrice(10000)}/{t.night}</option>
                      <option value="studio">{t.studio} — {formatPrice(15000)}/{t.night}</option>
                      <option value="apartment">{t.apartment} — {formatPrice(25000)}/{t.night}</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-1.5 flex items-center gap-1"><Home size={13}/> {t.selectRoom}</label>
                    {roomsLoading
                      ? <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-input bg-background text-muted-foreground text-sm"><Loader2 size={13} className="animate-spin"/> Loading…</div>
                      : <select value={form.selectedRoom} onChange={e => setForm({ ...form, selectedRoom: e.target.value })} className={inp}>
                          <option value="">{t.anyAvailable}</option>
                          {filteredRooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                    }
                    {!roomsLoading && filteredRooms.length === 0 && <p className="text-xs text-destructive mt-1">{t.noRoomsAvailable}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-1.5">{t.price}</label>
                    <div className="px-4 py-2.5 rounded-lg bg-primary/10 border border-primary/20 text-primary font-bold text-lg">
                      {formatPrice(amount)} <span className="text-muted-foreground text-xs font-normal">/{t.night}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-1.5 flex items-center gap-1"><Calendar size={13}/> {t.checkIn} *</label>
                    <input type="date" value={form.checkIn} onChange={e => setForm({ ...form, checkIn: e.target.value })} className={inp} required min={new Date().toISOString().split("T")[0]}/>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-1.5 flex items-center gap-1"><Calendar size={13}/> {t.checkOut} *</label>
                    <input type="date" value={form.checkOut} onChange={e => setForm({ ...form, checkOut: e.target.value })} className={inp} required min={form.checkIn || new Date().toISOString().split("T")[0]}/>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">{t.additionalNotes}</label>
                  <textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} rows={2} className={`${inp} resize-none`}/>
                </div>
                <button type="submit" disabled={submitting}
                  className="mt-6 w-full flex items-center justify-center gap-2 gradient-primary text-primary-foreground py-3 rounded-xl font-bold text-base shadow-warm hover:opacity-90 transition disabled:opacity-50">
                  {submitting ? <><Loader2 size={18} className="animate-spin"/> Saving…</> : <><Send size={16}/> Continue to Payment →</>}
                </button>
              </motion.form>
            )}

            {/* ── STEP 2: Choose method & follow USSD steps ─────────────── */}
            {step === "payment" && draft && (
              <motion.div key="payment"
                initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
                className="bg-card rounded-2xl shadow-card border border-border overflow-hidden"
              >
                {/* Header */}
                <div className="gradient-primary p-6 text-primary-foreground">
                  <div className="flex items-center gap-2 mb-1">
                    {["Details","Payment","Confirm"].map((s, i) => (
                      <div key={s} className="flex items-center gap-2 flex-1">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i === 1 ? "bg-white text-primary" : "bg-white/30 text-white"}`}>{i+1}</div>
                        <span className={`text-xs font-medium ${i === 1 ? "text-white font-bold" : "text-white/70"}`}>{s}</span>
                        {i < 2 && <div className="flex-1 h-px bg-white/30"/>}
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 text-center">
                    <p className="text-white/80 text-sm">Amount to pay</p>
                    <p className="text-3xl font-display font-black">{formatPrice(draft.amount)}</p>
                    <p className="text-white/70 text-xs mt-1">Booking for {draft.name} · {labels[draft.roomType]}</p>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Method selector */}
                  <div>
                    <p className="text-sm font-bold text-foreground mb-3">Select Payment Method</p>
                    <div className="grid grid-cols-2 gap-3">
                      {([
                        { id: "mtn_momo" as PayMethod,     label: "MTN Mobile Money",  logo: <MTNLogo/>,    bg: "border-yellow-400 bg-yellow-50" },
                        { id: "orange_money" as PayMethod, label: "Orange Money",       logo: <OrangeLogo/>, bg: "border-orange-400 bg-orange-50" },
                      ]).map(m => (
                        <button key={m.id} type="button" onClick={() => setPayMeth(m.id)}
                          className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition ${payMethod === m.id ? m.bg + " shadow-sm" : "border-border hover:border-muted-foreground"}`}>
                          {m.logo}
                          <span className="text-xs font-semibold text-foreground">{m.label}</span>
                          {payMethod === m.id && <span className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center"><CheckCircle size={12} className="text-white"/></span>}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* USSD instructions */}
                  <div className="bg-secondary rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Smartphone size={15} className="text-primary"/> How to pay
                      </p>
                      <button onClick={() => copyNumber(payMethod === "mtn_momo" ? MOMO_NUMBER : ORANGE_NUMBER)}
                        className="flex items-center gap-1 text-xs text-primary border border-primary/30 px-2 py-1 rounded-full hover:bg-primary/10 transition">
                        <Copy size={11}/> Copy number
                      </button>
                    </div>

                    {/* Payment number big display */}
                    <div className="text-center py-3 mb-3 bg-card rounded-lg border border-border">
                      <p className="text-xs text-muted-foreground mb-0.5">Pay to this number</p>
                      <p className="text-2xl font-display font-black text-foreground tracking-wider">
                        {payMethod === "mtn_momo" ? MOMO_NUMBER : ORANGE_NUMBER}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{MOMO_NAME}</p>
                    </div>

                    <ol className="space-y-2">
                      {paySteps.map((step, i) => (
                        <li key={i} className="flex gap-3 items-start text-sm">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold mt-0.5">{i+1}</span>
                          <span className={`text-muted-foreground ${step.includes("Dial") || step.includes("dial") || step.includes("#150") || step.includes("*126") ? "font-mono font-bold text-foreground" : ""}`}>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                    <AlertCircle size={14} className="mt-0.5 shrink-0 text-amber-500"/>
                    Once you've completed the payment, click the button below and enter your transaction ID from the SMS.
                  </div>

                  <div className="flex gap-3">
                    <button onClick={() => setStep("form")}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground transition">
                      <ArrowLeft size={14}/> Back
                    </button>
                    <button onClick={goToConfirm}
                      className="flex-1 gradient-primary text-primary-foreground py-2.5 rounded-xl font-bold text-sm shadow-warm hover:opacity-90 transition flex items-center justify-center gap-2">
                      I've Paid — Enter Transaction ID →
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── STEP 3: Enter transaction ID ──────────────────────────── */}
            {step === "confirm" && draft && (
              <motion.div key="confirm"
                initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
                className="bg-card rounded-2xl shadow-card border border-border overflow-hidden"
              >
                <div className="gradient-primary p-5 text-primary-foreground text-center">
                  <div className="flex items-center gap-2 mb-3">
                    {["Details","Payment","Confirm"].map((s, i) => (
                      <div key={s} className="flex items-center gap-2 flex-1">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i === 2 ? "bg-white text-primary" : "bg-white/30 text-white"}`}>{i === 0 || i === 1 ? <CheckCircle size={14}/> : i+1}</div>
                        <span className={`text-xs font-medium ${i === 2 ? "text-white font-bold" : "text-white/70"}`}>{s}</span>
                        {i < 2 && <div className="flex-1 h-px bg-white/30"/>}
                      </div>
                    ))}
                  </div>
                  <Shield size={32} className="mx-auto mb-2 opacity-90"/>
                  <p className="font-display font-bold text-lg">Confirm Your Payment</p>
                  <p className="text-white/80 text-xs mt-1">Enter the transaction ID from your {payMethod === "mtn_momo" ? "MTN" : "Orange"} SMS</p>
                </div>

                <div className="p-6 space-y-5">
                  {/* Summary */}
                  <div className="bg-secondary rounded-xl p-4 space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Booking name</span><span className="font-semibold">{draft.name}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Room type</span><span className="font-semibold">{labels[draft.roomType]}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Dates</span><span className="font-semibold">{draft.checkIn} → {draft.checkOut}</span></div>
                    <div className="flex justify-between border-t border-border pt-2 mt-2">
                      <span className="text-muted-foreground">Amount paid</span>
                      <span className="font-bold text-primary text-base">{formatPrice(draft.amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Method</span>
                      <span className="font-semibold">{payMethod === "mtn_momo" ? "MTN Mobile Money" : "Orange Money"}</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-bold text-foreground mb-2 block">Transaction ID *</label>
                    <input
                      value={txId}
                      onChange={e => setTxId(e.target.value)}
                      placeholder="e.g. MP250320A1B2C3 or TXN123456"
                      className={inp + " font-mono text-base tracking-wider"}
                      autoFocus
                    />
                    <p className="text-xs text-muted-foreground mt-1.5">
                      Find this in the confirmation SMS from {payMethod === "mtn_momo" ? "MTN" : "Orange"}
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button onClick={() => setStep("payment")}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground transition">
                      <ArrowLeft size={14}/> Back
                    </button>
                    <button onClick={handleConfirmPayment} disabled={submitting || !txId.trim()}
                      className="flex-1 gradient-primary text-primary-foreground py-2.5 rounded-xl font-bold text-sm shadow-warm hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2">
                      {submitting ? <><Loader2 size={15} className="animate-spin"/> Submitting…</> : <><CheckCircle size={15}/> Confirm Payment</>}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── STEP 4: Done ──────────────────────────────────────────── */}
            {step === "done" && (
              <motion.div key="done"
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="bg-card rounded-2xl shadow-card border border-border p-10 text-center"
              >
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring", damping: 15 }}
                  className="w-20 h-20 rounded-full bg-available/15 border-2 border-available flex items-center justify-center mx-auto mb-6">
                  <CheckCircle size={40} className="text-available"/>
                </motion.div>
                <h3 className="font-display text-2xl font-bold text-foreground mb-2">Booking Submitted!</h3>
                <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-2">
                  Your payment is being verified. We will confirm your reservation via WhatsApp shortly.
                </p>
                <p className="text-muted-foreground text-xs mb-6">
                  Questions? Call us at{" "}
                  <a href="tel:+237652300164" className="text-primary font-semibold">(237) 652 300 164</a>
                </p>
                <button onClick={reset}
                  className="gradient-primary text-primary-foreground px-8 py-3 rounded-xl font-semibold shadow-warm hover:opacity-90 transition">
                  Make Another Booking
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};

export default ReservationSection;
