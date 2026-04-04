import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, User, Quote, MessageCircle, Loader2, AlertCircle,
  RefreshCw, ChevronDown, ChevronUp, Star as StarIcon,
} from "lucide-react";
import { publicSupabase } from "@/integrations/supabase/client";
import { useLang } from "@/hooks/useLang";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Review = Tables<"reviews">;

const Star = ({ filled, size = 16 }: { filled: boolean; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24"
    style={{ color: filled ? "#f59e0b" : "#d1d5db" }}>
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
      fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
  </svg>
);

const ReviewsSection = () => {
  const [reviews,   setReviews]   = useState<Review[]>([]);
  const [name,      setName]      = useState("");
  const [comment,   setComment]   = useState("");
  const [rating,    setRating]    = useState(5);
  const [hover,     setHover]     = useState(0);
  const [showForm,  setShowForm]  = useState(false);
  const [showAll,   setShowAll]   = useState(false);   // dropdown toggle
  const [submitting, setSub]      = useState(false);
  const [status,    setStatus]    = useState<"loading" | "ok" | "error">("loading");
  const { t } = useLang();

  const fetchReviews = useCallback(async () => {
    setStatus("loading");
    const { data, error } = await publicSupabase
      .from("reviews").select("*").order("created_at", { ascending: false });
    if (error) { setStatus("error"); return; }
    setReviews(data ?? []);
    setStatus("ok");
  }, []);

  useEffect(() => {
    fetchReviews();
    const ch = publicSupabase.channel("reviews-pub")
      .on("postgres_changes", { event: "*", schema: "public", table: "reviews" }, fetchReviews)
      .subscribe();
    return () => { publicSupabase.removeChannel(ch); };
  }, [fetchReviews]);

  const addReview = async () => {
    if (!name.trim() || !comment.trim()) { toast.error(t.fillAllFields); return; }
    setSub(true);
    const { error } = await publicSupabase
      .from("reviews").insert({ name: name.trim(), rating, comment: comment.trim() });
    setSub(false);
    if (error) { toast.error(t.reviewError); return; }
    toast.success(t.reviewSuccess);
    setName(""); setComment(""); setRating(5); setShowForm(false);
    fetchReviews();
  };

  const avg = reviews.length
    ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1)
    : "0";

  const counts = [5, 4, 3, 2, 1].map(s => ({
    s,
    n:   reviews.filter(r => r.rating === s).length,
    pct: reviews.length ? Math.round(reviews.filter(r => r.rating === s).length / reviews.length * 100) : 0,
  }));

  // Show first 3 in summary, rest in dropdown
  const PREVIEW = 3;
  const previewReviews = reviews.slice(0, PREVIEW);
  const moreReviews    = reviews.slice(PREVIEW);

  const inp = "w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition";

  return (
    <section id="reviews" className="py-20 bg-background overflow-hidden">
      <div className="container mx-auto px-4">

        {/* Heading */}
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground mb-4">
            {t.guestTestimonials} <span className="text-primary">{t.testimonialsHighlight}</span>
          </h2>

          {/* Rating summary card */}
          {status === "ok" && reviews.length > 0 && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }} transition={{ delay: 0.2 }}
              className="max-w-sm mx-auto bg-card rounded-2xl p-5 shadow-card border border-border mt-6">
              <div className="flex items-center gap-5">
                <div className="text-center">
                  <div className="text-4xl font-display font-black text-primary">{avg}</div>
                  <div className="flex gap-0.5 mt-1 justify-center">
                    {[1,2,3,4,5].map(s => <Star key={s} filled={parseFloat(avg) >= s} size={13}/>)}
                  </div>
                  <p className="text-muted-foreground text-xs mt-1">{reviews.length} {t.reviewsCount}</p>
                </div>
                <div className="flex-1 space-y-1.5">
                  {counts.map(r => (
                    <div key={r.s} className="flex items-center gap-1.5 text-xs">
                      <span className="w-3 text-muted-foreground">{r.s}</span>
                      <Star filled size={10}/>
                      <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} whileInView={{ width: `${r.pct}%` }}
                          viewport={{ once: true }} transition={{ delay: 0.3, duration: 0.6 }}
                          className="h-full rounded-full bg-amber-400"/>
                      </div>
                      <span className="w-5 text-muted-foreground text-right">{r.n}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Action buttons row */}
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          {/* Leave a review */}
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
            onClick={() => setShowForm(!showForm)}
            className="gradient-primary text-primary-foreground px-5 py-2.5 rounded-xl font-semibold shadow-warm hover:opacity-90 transition inline-flex items-center gap-2">
            <MessageCircle size={16}/> {showForm ? "Close Form" : t.leaveReview}
          </motion.button>

          {/* View / hide all reviews dropdown button */}
          {status === "ok" && reviews.length > 0 && (
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
              onClick={() => setShowAll(!showAll)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold border border-border bg-card text-foreground hover:border-primary hover:text-primary transition shadow-card">
              <StarIcon size={16} className="text-amber-400"/>
              {showAll ? "Hide Reviews" : `View All Reviews (${reviews.length})`}
              {showAll ? <ChevronUp size={15}/> : <ChevronDown size={15}/>}
            </motion.button>
          )}
        </div>

        {/* Review form */}
        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-8">
              <div className="max-w-xl mx-auto bg-card rounded-2xl p-6 shadow-card border border-border">
                <h3 className="font-display text-lg font-bold text-foreground mb-4">{t.shareExperience}</h3>
                <div className="space-y-3">
                  <input value={name} onChange={e => setName(e.target.value)} placeholder={t.yourName} className={inp}/>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">{t.yourRating}</label>
                    <div className="flex gap-1">
                      {[1,2,3,4,5].map(s => (
                        <motion.button whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }} key={s}
                          onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(0)}
                          onClick={() => setRating(s)}>
                          <Star size={32} filled={(hover || rating) >= s}/>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                  <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder={t.tellUs} rows={3}
                    className={inp + " resize-none"}/>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={addReview} disabled={submitting}
                    className="flex items-center gap-2 gradient-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold shadow-warm hover:opacity-90 transition w-full justify-center disabled:opacity-50">
                    <Send size={15}/> {submitting ? t.submitting : t.submitReview}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading / Error states */}
        {status === "loading" && (
          <div className="flex flex-col items-center py-10 gap-3 text-muted-foreground">
            <Loader2 size={26} className="animate-spin text-primary"/>
            <p className="text-sm">Loading reviews…</p>
          </div>
        )}
        {status === "error" && (
          <div className="flex flex-col items-center py-10 gap-4">
            <AlertCircle size={26} className="text-destructive"/>
            <p className="text-sm text-muted-foreground">Could not load reviews.</p>
            <button onClick={fetchReviews} className="flex items-center gap-2 text-sm text-primary border border-primary/30 px-4 py-2 rounded-full hover:bg-primary/10 transition">
              <RefreshCw size={13}/> Try again
            </button>
          </div>
        )}

        {/* Reviews — always show first 3 */}
        {status === "ok" && (
          <>
            {reviews.length === 0 ? (
              <p className="text-center text-muted-foreground py-10">No reviews yet — be the first to share your experience!</p>
            ) : (
              <>
                {/* Preview cards (always visible) */}
                <motion.div initial="hidden" whileInView="show" viewport={{ once: true }}
                  variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
                  {previewReviews.map(r => (
                    <ReviewCard key={r.id} r={r}/>
                  ))}
                </motion.div>

                {/* Dropdown — more reviews */}
                <AnimatePresence>
                  {showAll && moreReviews.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.35, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto mt-5">
                        {moreReviews.map((r, i) => (
                          <motion.div key={r.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.06 }}>
                            <ReviewCard r={r}/>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Show more / show less toggle at bottom */}
                {reviews.length > PREVIEW && (
                  <div className="flex justify-center mt-6">
                    <button onClick={() => setShowAll(!showAll)}
                      className="flex items-center gap-2 text-sm font-semibold text-primary border border-primary/30 px-5 py-2.5 rounded-full hover:bg-primary/10 transition">
                      {showAll ? <><ChevronUp size={15}/> Show less</> : <><ChevronDown size={15}/> Show {moreReviews.length} more review{moreReviews.length !== 1 ? "s" : ""}</>}
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </section>
  );
};

// Single review card component
const ReviewCard = ({ r }: { r: Review }) => (
  <motion.div
    variants={{ hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0, transition: { type: "spring" as const, damping: 20 } } }}
    whileHover={{ y: -4, transition: { duration: 0.2 } }}
    className="bg-card rounded-2xl p-5 shadow-card border border-border relative group hover:shadow-warm transition-shadow"
  >
    <Quote size={28} className="absolute top-4 right-4 text-primary/10 group-hover:text-primary/20 transition"/>
    <div className="flex items-center gap-3 mb-3">
      <div className="w-11 h-11 rounded-full gradient-primary flex items-center justify-center shadow-warm shrink-0">
        <User size={18} className="text-primary-foreground"/>
      </div>
      <div>
        <p className="font-display font-bold text-foreground text-sm">{r.name}</p>
        <p className="text-muted-foreground text-xs">
          {new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </p>
      </div>
    </div>
    <div className="flex gap-0.5 mb-2">
      {[1,2,3,4,5].map(s => (
        <svg key={s} width={14} height={14} viewBox="0 0 24 24" style={{ color: r.rating >= s ? "#f59e0b" : "#d1d5db" }}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            fill={r.rating >= s ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
        </svg>
      ))}
    </div>
    <p className="text-muted-foreground text-sm leading-relaxed italic">"{r.comment}"</p>
  </motion.div>
);

export default ReviewsSection;
