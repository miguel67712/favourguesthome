import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, LogIn, UserPlus, Globe, AlertCircle, CheckCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/hooks/useLang";
import logo from "@/assets/logo.png";

type Mode = "login" | "signup";

const LoginPage = () => {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const { lang, setLang, t } = useLang();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const switchMode = (m: Mode) => {
    setMode(m);
    setError("");
    setSuccessMsg("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!email.trim() || !password.trim()) {
      setError(t.fillAllFields);
      return;
    }

    setSubmitting(true);
    const normalizedEmail = email.trim().toLowerCase();

    if (mode === "login") {
      const { error: err, isAdmin } = await signIn(normalizedEmail, password);
      if (err) {
        setError(t.invalidCredentials);
        setSubmitting(false);
        return;
      }
      navigate(isAdmin ? "/admin" : "/home", { replace: true });
    } else {
      const { error: err, isAdmin } = await signUp(normalizedEmail, password);
      if (err) {
        // Common: user already registered
        if (err.toLowerCase().includes("already registered") || err.toLowerCase().includes("already been registered")) {
          setError(t.emailAlreadyUsed);
        } else {
          setError(err);
        }
        setSubmitting(false);
        return;
      }
      // If signup returns a session (email confirmation off), navigate immediately
      navigate(isAdmin ? "/admin" : "/home", { replace: true });
    }
  };

  const inp =
    "w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary transition outline-none";

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="w-full max-w-md relative"
      >
        {/* Card */}
        <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
          {/* Warm accent strip */}
          <div className="h-1 w-full gradient-primary" />

          <div className="p-8">
            {/* Logo + headline */}
            <div className="text-center mb-8">
              <img
                src={logo}
                alt="Favour Guest Homes"
                className="h-28 w-28 mx-auto rounded-2xl object-contain mb-4"
              />
              <h1 className="font-display text-2xl font-bold text-foreground">
                {t.welcomeTo} <span className="text-primary">{t.guestHomes}</span>
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                {mode === "login" ? t.signInExplore : t.createAccount}
              </p>
            </div>

            {/* Tab switcher */}
            <div className="flex bg-secondary rounded-xl p-1 mb-6">
              {(["login", "signup"] as Mode[]).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => switchMode(m)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                    mode === m
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {m === "login" ? t.signIn : t.createAccountBtn}
                </button>
              ))}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                  <Mail size={11} /> {t.email}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={inp}
                  required
                  autoComplete="email"
                  autoFocus
                />
              </div>

              {/* Password */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                  <Lock size={11} /> {t.password}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`${inp} pr-11`}
                    required
                    minLength={6}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {mode === "signup" && (
                  <p className="text-xs text-muted-foreground mt-1.5">Minimum 6 characters</p>
                )}
              </div>

              {/* Error */}
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="flex items-start gap-2.5 bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl text-sm"
                  >
                    <AlertCircle size={15} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}
                {successMsg && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="flex items-start gap-2.5 bg-available/10 border border-available/30 text-available px-4 py-3 rounded-xl text-sm"
                  >
                    <CheckCircle size={15} className="mt-0.5 shrink-0" />
                    <span>{successMsg}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full gradient-primary text-primary-foreground py-3 rounded-xl font-semibold shadow-warm hover:opacity-90 transition disabled:opacity-60 flex items-center justify-center gap-2 mt-1"
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
                    {t.pleaseWait}
                  </>
                ) : mode === "login" ? (
                  <><LogIn size={15} /> {t.signIn}</>
                ) : (
                  <><UserPlus size={15} /> {t.createAccountBtn}</>
                )}
              </button>
            </form>

            {/* Switch mode hint */}
            <p className="text-center text-sm text-muted-foreground mt-5">
              {mode === "login" ? (
                <>
                  {t.noAccount}{" "}
                  <button onClick={() => switchMode("signup")} className="text-primary font-semibold hover:underline">
                    {t.signUpHere}
                  </button>
                </>
              ) : (
                <>
                  {t.hasAccount}{" "}
                  <button onClick={() => switchMode("login")} className="text-primary font-semibold hover:underline">
                    {t.signInHere}
                  </button>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Language switcher */}
        <div className="flex justify-center mt-5">
          <button
            onClick={() => setLang(lang === "en" ? "fr" : "en")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition border border-border px-4 py-2 rounded-full bg-card"
          >
            <Globe size={13} /> {lang === "en" ? "Français" : "English"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
