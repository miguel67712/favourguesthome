import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar, User, Phone, BedDouble, Home, Loader2,
  CheckCircle, Lock, Smartphone, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useLang } from "@/hooks/useLang";
import { formatPrice, RoomType } from "@/lib/roomsData";
import { publicSupabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

// ─── Owner payment details ────────────────────────────────────────────────────
const MTN_NUMBER    = "683408023";   // MTN MoMo
const ORANGE_NUMBER = "689063588";   // Orange Money
const OWNER_NAME    = "Roy Ndah Penn";
const OWNER_WA      = "237652300164";

// ─── Prices per night ─────────────────────────────────────────────────────────
const PRICES: Record<RoomType, number> = { single: 10000, studio: 15000, apartment: 25000 };

type Room    = Tables<"rooms">;
type Network = "MTN" | "ORANGE";
type Step    = "form" | "pay" | "pending";

// ─────────────────────────────────────────────────────────────────────────────
const ReservationSection = () => {
  const { t } = useLang();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [rl,    setRL]    = useState(true);

  const fetchRooms = useCallback(async () => {
    const { data } = await publicSupabase
      .from("rooms").select("*").eq("occupied", false).order("name");
    setRooms(data ?? []); setRL(false);
  }, []);

  useEffect(() => {
    let on = true; fetchRooms();
    const ch = publicSupabase.channel("res-rooms")
      .on("postgres_changes", { event:"*", schema:"public", table:"rooms" }, () => { if(on) fetchRooms(); })
      .subscribe();
    const iv = setInterval(() => { if(on) fetchRooms(); }, 8000);
    return () => { on=false; clearInterval(iv); publicSupabase.removeChannel(ch); };
  }, [fetchRooms]);

  const [step,    setStep]   = useState<Step>("form");
  const [network, setNet]    = useState<Network>("MTN");
  const [busy,    setBusy]   = useState(false);
  const [resId,   setResId]  = useState("");
  const [nights,  setNights] = useState(1);
  const [form,    setForm]   = useState({
    name:"", phone:"", email:"",
    roomType:"single" as RoomType, roomId:"",
    checkIn:"", checkOut:"", note:"",
  });

  const filtered      = rooms.filter(r => r.type === form.roomType);
  const selRoom       = rooms.find(r => r.id === form.roomId);
  const pricePerNight = PRICES[form.roomType];
  const totalAmount   = pricePerNight * Math.max(1, nights);
  const roomLabel: Record<RoomType, string> = {
    single: t.singleRoom, studio: t.studio, apartment: t.apartment,
  };

  useEffect(() => {
    if (form.checkIn && form.checkOut) {
      const n = Math.round(
        (new Date(form.checkOut).getTime() - new Date(form.checkIn).getTime())
        / 86400000
      );
      setNights(n > 0 ? n : 1);
    }
  }, [form.checkIn, form.checkOut]);

  useEffect(() => { setForm(p => ({ ...p, roomId:"" })); }, [form.roomType]);

  // ── USSD codes — exact codes provided ────────────────────────────────────
  // MTN:    *126*14*683408023*AMOUNT#
  // Orange: #150*16*689063588*AMOUNT#
  const ussdDisplay = (net: Network) =>
    net === "MTN"
      ? `*126*14*${MTN_NUMBER}*${totalAmount}#`
      : `#150*16*${ORANGE_NUMBER}*${totalAmount}#`;

  // For tel: URI, # must be encoded as %23
  const ussdTelUri = (net: Network) =>
    net === "MTN"
      ? `*126*14*${MTN_NUMBER}*${totalAmount}%23`
      : `%23150*16*${ORANGE_NUMBER}*${totalAmount}%23`;

  // ── STEP 1: save booking, move to payment ─────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim())  { toast.error("Enter your full name.");          return; }
    if (!form.phone.trim()) { toast.error("Enter your phone number.");       return; }
    if (!form.email.trim() || !form.email.includes("@")) {
                              toast.error("Enter a valid email address.");   return; }
    if (!form.checkIn)      { toast.error("Select a check-in date.");        return; }
    if (!form.checkOut)     { toast.error("Select a check-out date.");       return; }
    if (form.checkOut <= form.checkIn) {
                              toast.error("Check-out must be after check-in."); return; }
    // Guard: double-check room still available
    if (form.roomId) {
      const { data: chk } = await publicSupabase
        .from("rooms").select("occupied").eq("id", form.roomId).single();
      if (chk?.occupied) {
        toast.error("That room was just taken. Please choose another room.");
        fetchRooms(); return;
      }
    }
    setBusy(true);
    const { data, error } = await publicSupabase
      .from("reservations").insert({
        guest_name: form.name.trim(),
        phone:      form.phone.trim(),
        room_type:  form.roomType,
        check_in:   form.checkIn,
        check_out:  form.checkOut,
        message:    form.note.trim() || null,
      }).select("id").single();
    setBusy(false);
    if (error) {
      console.error("[Booking]", error.code, error.message);
      setResId(`local-${Date.now()}`); // fallback — WhatsApp still works
    } else {
      setResId(data.id);
    }
    setStep("pay");
  };

  // ── STEP 2: guest taps Pay → USSD opens on phone ──────────────────────────
  // After tapping, they pay on phone, then we show "pending" screen.
  // The GUEST cannot confirm — only admin can mark as confirmed in dashboard.
  const handlePayTapped = () => {
    // Save payment_status = "pending_payment" to DB
    if (resId && !resId.startsWith("local-")) {
      publicSupabase.from("reservations").update({
        payment_method: network === "MTN" ? "MTN MoMo" : "Orange Money",
        payment_status: "pending_payment",
        amount_paid:    totalAmount,
      } as any).eq("id", resId).then();
    }
    // Notify owner via WhatsApp
    const msg = [
      "🔔 PAYMENT INITIATED — FAVOUR GUEST HOMES",
      `Guest:     ${form.name}`,
      `Phone:     ${form.phone}`,
      `Email:     ${form.email}`,
      `Room:      ${roomLabel[form.roomType]}${selRoom ? ` — ${selRoom.name}` : ""}`,
      `Check-in:  ${form.checkIn}`,
      `Check-out: ${form.checkOut}`,
      `Nights:    ${nights}`,
      `Amount:    ${totalAmount.toLocaleString()} XAF`,
      `Network:   ${network === "MTN" ? "MTN MoMo" : "Orange Money"}`,
      `USSD Code: ${ussdDisplay(network)}`,
      `Booking ID: ${resId}`,
      "⏳ Please check your phone for incoming payment and confirm.",
    ].join("\n");
    window.open(`https://wa.me/${OWNER_WA}?text=${encodeURIComponent(msg)}`, "_blank");
    setStep("pending");
  };

  const reset = () => {
    setStep("form"); setNet("MTN"); setBusy(false); setResId(""); setNights(1);
    setForm({ name:"", phone:"", email:"", roomType:"single", roomId:"", checkIn:"", checkOut:"", note:"" });
  };

  const inp = "w-full px-4 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition";

  const MTNLogo = () => (
    <svg viewBox="0 0 80 30" className="h-7 w-auto">
      <rect width="80" height="30" rx="5" fill="#FFCC00"/>
      <text x="40" y="21" textAnchor="middle" fontFamily="Arial Black,sans-serif" fontWeight="900" fontSize="14" fill="#000">MTN</text>
    </svg>
  );
  const OrangeLogo = () => (
    <svg viewBox="0 0 90 30" className="h-7 w-auto">
      <rect width="90" height="30" rx="5" fill="#FF6600"/>
      <text x="45" y="21" textAnchor="middle" fontFamily="Arial,sans-serif" fontWeight="800" fontSize="13" fill="#fff">ORANGE</text>
    </svg>
  );

  return (
    <section id="reservation" className="py-20 bg-background">
      <div className="container mx-auto px-4">

        <motion.div initial={{ opacity:0,y:20 }} whileInView={{ opacity:1,y:0 }}
          viewport={{ once:true }} className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">
            {t.makeA} <span className="text-primary">{t.reservationHighlight}</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">{t.reservationDesc}</p>
          <div className="inline-flex items-center gap-2 mt-4 bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-full text-xs font-semibold">
            <Lock size={12}/> MTN MoMo &amp; Orange Money · Pay directly from your phone
          </div>
        </motion.div>

        <div className="max-w-xl mx-auto">
          <AnimatePresence mode="wait">

            {/* ═══════ FORM ═══════ */}
            {step === "form" && (
              <motion.form key="form"
                initial={{ opacity:0,x:-20 }} animate={{ opacity:1,x:0 }} exit={{ opacity:0,x:20 }}
                onSubmit={handleSubmit}
                className="bg-card rounded-2xl p-6 md:p-8 shadow-card border border-border"
              >
                <div className="flex items-center gap-2 text-xs font-semibold mb-6">
                  <span className="w-6 h-6 rounded-full gradient-primary text-white flex items-center justify-center font-bold shrink-0">1</span>
                  <span className="text-foreground font-bold">Booking Details</span>
                  <div className="flex-1 h-px bg-border"/>
                  <span className="text-muted-foreground opacity-60">2 · Payment</span>
                  <div className="flex-1 h-px bg-border opacity-40"/>
                  <span className="text-muted-foreground opacity-60">3 · Awaiting confirmation</span>
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
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Email * <span className="font-normal normal-case opacity-70">(for confirmation)</span></label>
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
                    {rl
                      ? <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-input bg-background text-muted-foreground text-sm"><Loader2 size={13} className="animate-spin"/> Loading…</div>
                      : <>
                          <select value={form.roomId} onChange={e=>setForm({...form,roomId:e.target.value})} className={inp}>
                            <option value="">{t.anyAvailable}</option>
                            {filtered.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}
                          </select>
                          {filtered.length === 0
                            ? <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle size={11}/> No {form.roomType}s available right now</p>
                            : <p className="text-xs text-green-600 mt-1">✓ {filtered.length} available</p>
                          }
                        </>
                    }
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

                {form.checkIn && form.checkOut && nights > 0 && (
                  <motion.div initial={{ opacity:0,y:4 }} animate={{ opacity:1,y:0 }}
                    className="mt-4 p-4 rounded-xl bg-primary/10 border border-primary/20 flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{formatPrice(pricePerNight)} × {nights} night{nights!==1?"s":""}</span>
                    <span className="font-bold text-primary text-xl">{formatPrice(totalAmount)}</span>
                  </motion.div>
                )}

                <div className="mt-4">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">{t.additionalNotes}</label>
                  <textarea value={form.note} onChange={e=>setForm({...form,note:e.target.value})} rows={2} className={`${inp} resize-none`}/>
                </div>

                <button type="submit" disabled={busy || (!rl && filtered.length===0)}
                  className="mt-5 w-full flex items-center justify-center gap-2 gradient-primary text-primary-foreground py-3 rounded-xl font-bold shadow-warm hover:opacity-90 transition disabled:opacity-60">
                  {busy ? <><Loader2 size={16} className="animate-spin"/> Saving…</> : <>Continue to Payment →</>}
                </button>
              </motion.form>
            )}

            {/* ═══════ PAYMENT ═══════ */}
            {step === "pay" && (
              <motion.div key="pay"
                initial={{ opacity:0,x:20 }} animate={{ opacity:1,x:0 }} exit={{ opacity:0,x:-20 }}
                className="bg-card rounded-2xl shadow-card border border-border overflow-hidden"
              >
                <div className="gradient-primary p-6 text-white text-center">
                  <div className="flex items-center justify-center gap-2 text-xs mb-4 opacity-80">
                    <CheckCircle size={13}/> Details
                    <div className="w-6 h-px bg-white/40"/>
                    <span className="bg-white text-primary rounded-full w-5 h-5 flex items-center justify-center font-bold text-[11px]">2</span>
                    <span className="font-bold">Payment</span>
                    <div className="w-6 h-px bg-white/40"/>
                    <span className="opacity-50">3 Confirmation</span>
                  </div>
                  <p className="text-white/80 text-sm">Total to pay</p>
                  <p className="text-4xl font-display font-black mt-1">{formatPrice(totalAmount)}</p>
                  <p className="text-white/70 text-xs mt-1">
                    {roomLabel[form.roomType]}{selRoom?` — ${selRoom.name}`:""} · {nights} night{nights!==1?"s":""} · {form.checkIn} → {form.checkOut}
                  </p>
                </div>

                <div className="p-6 space-y-5">
                  {/* Network */}
                  <div>
                    <p className="text-sm font-bold text-foreground mb-3">Choose your network</p>
                    <div className="grid grid-cols-2 gap-3">
                      {([
                        { id:"MTN"    as Network, Logo:MTNLogo,    active:"border-yellow-400 bg-yellow-50", num:MTN_NUMBER },
                        { id:"ORANGE" as Network, Logo:OrangeLogo, active:"border-orange-500 bg-orange-50", num:ORANGE_NUMBER },
                      ]).map(n=>(
                        <button key={n.id} type="button" onClick={()=>setNet(n.id)}
                          className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${network===n.id?`${n.active} shadow-md scale-[1.02]`:"border-border hover:border-muted-foreground"}`}>
                          <n.Logo/>
                          <span className="text-xs font-semibold">{n.id==="MTN"?"MTN Mobile Money":"Orange Money"}</span>
                          <span className="text-xs text-muted-foreground font-mono">{n.num}</span>
                          {network===n.id && <CheckCircle size={14} className="text-green-500"/>}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* USSD code */}
                  <div className="bg-secondary rounded-xl p-4">
                    <p className="text-xs font-bold text-foreground mb-3 flex items-center gap-1.5">
                      <Smartphone size={12} className="text-primary"/> Your payment code
                    </p>
                    <div className="bg-card border-2 border-primary/40 rounded-xl p-4 text-center">
                      <p className="font-mono text-xl font-black text-foreground tracking-wide">
                        {ussdDisplay(network)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Pays <span className="font-bold text-foreground">{formatPrice(totalAmount)}</span> to{" "}
                        <span className="font-bold">{OWNER_NAME}</span> via{" "}
                        {network==="MTN"?"MTN Mobile Money":"Orange Money"}
                      </p>
                    </div>
                  </div>

                  {/* Instruction — clean, one step */}
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 space-y-1">
                    <p className="font-bold mb-1">How to pay:</p>
                    <p>Tap <strong>Open &amp; Pay</strong> below — your phone dialer opens with the code ready.</p>
                    <p>Press <strong>Call</strong> → enter your PIN when prompted → confirm.</p>
                    <p className="text-xs text-blue-600 mt-2">You will receive an SMS confirmation from {network==="MTN"?"MTN":"Orange"}.</p>
                  </div>

                  {/* Single pay button — opens phone dialer */}
                  <a
                    href={`tel:${ussdTelUri(network)}`}
                    onClick={handlePayTapped}
                    className="w-full gradient-primary text-primary-foreground py-4 rounded-xl font-bold shadow-warm hover:opacity-90 transition flex items-center justify-center gap-3 text-lg no-underline"
                  >
                    <Smartphone size={20}/>
                    Open &amp; Pay {formatPrice(totalAmount)}
                  </a>

                  <button onClick={()=>setStep("form")}
                    className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition text-center">
                    ← Go back and edit booking
                  </button>
                </div>
              </motion.div>
            )}

            {/* ═══════ PENDING CONFIRMATION ═══════ */}
            {step === "pending" && (
              <motion.div key="pending"
                initial={{ opacity:0,scale:0.9 }} animate={{ opacity:1,scale:1 }}
                className="bg-card rounded-2xl shadow-card border border-border overflow-hidden"
              >
                <div className="bg-amber-50 border-b border-amber-200 p-6 text-center">
                  <motion.div
                    animate={{ scale:[1,1.05,1] }} transition={{ repeat:Infinity, duration:2 }}
                    className="w-16 h-16 rounded-full bg-amber-100 border-2 border-amber-400 flex items-center justify-center mx-auto mb-3 text-3xl">
                    ⏳
                  </motion.div>
                  <h3 className="font-display text-xl font-bold text-amber-900">Awaiting Payment Confirmation</h3>
                  <p className="text-amber-700 text-sm mt-1">Your booking is <strong>saved</strong> and payment is being verified.</p>
                </div>

                <div className="p-6 space-y-4">
                  {/* Booking summary */}
                  <div className="bg-secondary rounded-xl p-4 space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Guest</span><span className="font-semibold">{form.name}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Room</span><span className="font-semibold">{roomLabel[form.roomType]}{selRoom?` — ${selRoom.name}`:""}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Dates</span><span className="font-semibold">{form.checkIn} → {form.checkOut}</span></div>
                    <div className="flex justify-between border-t border-border pt-2">
                      <span className="text-muted-foreground">Amount paid</span>
                      <span className="font-bold text-primary">{formatPrice(totalAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Method</span>
                      <span className="font-semibold">{network==="MTN"?"MTN Mobile Money":"Orange Money"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Booking ID</span>
                      <span className="font-mono text-xs">{resId.slice(0,12)}…</span>
                    </div>
                  </div>

                  {/* What happens next */}
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800 space-y-1.5">
                    <p className="font-bold flex items-center gap-1.5"><CheckCircle size={14}/> What happens next</p>
                    <p>1. The owner receives your payment notification on WhatsApp.</p>
                    <p>2. The owner checks their {network==="MTN"?"MTN":"Orange"} balance to verify your payment.</p>
                    <p>3. Once confirmed, you will receive a WhatsApp confirmation message.</p>
                    <p>4. Your room will be reserved under your name.</p>
                  </div>

                  {/* Security notice — guest cannot self-confirm */}
                  <div className="flex items-start gap-2 bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-600">
                    <Lock size={12} className="mt-0.5 shrink-0 text-gray-400"/>
                    <span>For security, your booking is confirmed <strong>only by the owner</strong> after verifying payment receipt. This prevents fraudulent bookings.</span>
                  </div>

                  <p className="text-center text-xs text-muted-foreground">
                    Questions? Call or WhatsApp:{" "}
                    <a href="tel:+237652300164" className="text-primary font-semibold">(237) 652 300 164</a>
                  </p>

                  <button onClick={reset}
                    className="w-full py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground transition">
                    Make Another Booking
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
