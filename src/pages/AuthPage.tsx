import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, Mail, Eye, EyeOff, LogIn, UserPlus, Globe } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/hooks/useLang";
import logo from "@/assets/logo.png";

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const { lang, setLang, t } = useLang();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) setError(error);
    } else {
      const { error: signUpErr } = await signUp(email, password);
      if (signUpErr) {
        setError(signUpErr);
      } else {
        const { error: signInErr } = await signIn(email, password);
        if (signInErr) setError(signInErr);
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-card rounded-2xl p-8 shadow-card border border-border"
      >
        <div className="text-center mb-8">
          <img src={logo} alt="FG Homes" className="h-28 w-28 mx-auto rounded-xl object-contain mb-4" />
          <h1 className="font-display text-2xl font-bold text-foreground">
            {t.welcomeTo} <span className="text-primary">{t.guestHomes}</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isLogin ? t.signInExplore : t.createAccount}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-foreground mb-1 flex items-center gap-1">
              <Mail size={14} /> {t.email}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary transition outline-none"
              required
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-foreground mb-1 flex items-center gap-1">
              <Lock size={14} /> {t.password}
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary transition outline-none pr-10"
                required
                minLength={6}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-destructive text-sm bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full gradient-primary text-primary-foreground py-3 rounded-xl font-semibold shadow-warm hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? t.pleaseWait : isLogin ? <><LogIn size={16} /> {t.signIn}</> : <><UserPlus size={16} /> {t.createAccountBtn}</>}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => { setIsLogin(!isLogin); setError(""); }}
            className="text-sm text-muted-foreground hover:text-primary transition"
          >
            {isLogin ? t.noAccount : t.hasAccount}
          </button>
          <button
            onClick={() => setLang(lang === "en" ? "fr" : "en")}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition border border-border px-3 py-1.5 rounded-full"
          >
            <Globe size={14} /> {lang === "en" ? "FR" : "EN"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthPage;
