import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, Mail, Eye, EyeOff, LogIn, ShieldCheck, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import logo from "@/assets/logo.png";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const { error: err, isAdmin } = await signIn(email.trim().toLowerCase(), password);

    if (err) {
      setError("Incorrect email or password. Please try again.");
      setSubmitting(false);
      return;
    }

    if (!isAdmin) {
      setError("This account does not have admin access.");
      setSubmitting(false);
      return;
    }

    // Success — navigate to admin dashboard
    navigate("/admin", { replace: true });
  };

  const inp = "w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary transition outline-none";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden">
      {/* Soft blurred bg blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md relative"
      >
        <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
          {/* Accent bar */}
          <div className="h-1 w-full gradient-primary" />

          <div className="p-8">
            {/* Logo */}
            <div className="text-center mb-8">
              <div className="relative inline-block mb-4">
                <img src={logo} alt="FG Homes" className="h-24 w-24 rounded-2xl object-contain mx-auto" />
                <span className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground rounded-full p-1.5 shadow-warm">
                  <ShieldCheck size={14} />
                </span>
              </div>
              <h1 className="font-display text-2xl font-bold text-foreground">Admin Portal</h1>
              <p className="text-muted-foreground text-sm mt-1.5">
                Favour Guest Homes — Staff Only
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                  <Mail size={11} /> Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="favourguesthomes@gmail.com"
                  className={inp}
                  required
                  autoComplete="email"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                  <Lock size={11} /> Password
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
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2.5 bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl text-sm"
                >
                  <AlertCircle size={15} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full gradient-primary text-primary-foreground py-3 rounded-xl font-semibold shadow-warm hover:opacity-90 transition disabled:opacity-60 flex items-center justify-center gap-2 mt-1"
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
                    Signing in…
                  </>
                ) : (
                  <>
                    <LogIn size={15} /> Sign In to Dashboard
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <a href="/" className="text-sm text-muted-foreground hover:text-primary transition">
                ← Back to guest site
              </a>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Restricted to authorized staff only.
        </p>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
