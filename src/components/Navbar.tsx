import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Phone, Shield, Globe, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/hooks/useLang";
import logo from "@/assets/logo.png";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const { user, isAdmin, signOut } = useAuth();
  const { lang, setLang, t } = useLang();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    navigate("/", { replace: true });
  };

  const navLinks = [
    { label: t.home, href: "#home" },
    { label: t.rooms, href: "#rooms" },
    { label: t.reviews, href: "#reviews" },
    { label: t.directions, href: "#directions" },
    { label: t.reservation, href: "#reservation" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-md border-b border-border shadow-card">
      <div className="container mx-auto flex items-center justify-between py-2 px-4">
        {/* Logo */}
        <a href="#home" className="flex items-center gap-3">
          <img src={logo} alt="FG Homes Logo" className="h-20 w-20 rounded-xl object-contain" />
          <span className="font-display text-xl font-bold text-foreground">
            Favour <span className="text-primary">Guest Homes</span>
          </span>
        </a>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-5">
          {navLinks.map(l => (
            <a
              key={l.href}
              href={l.href}
              className="font-body text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              {l.label}
            </a>
          ))}

          {/* Admin badge — only when logged in as admin */}
          {isAdmin && (
            <a
              href="/admin"
              className="flex items-center gap-1.5 text-sm font-semibold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-full border border-primary/20 transition"
            >
              <Shield size={13} /> {t.admin}
            </a>
          )}

          {/* WhatsApp CTA */}
          <a
            href="https://wa.me/237652300164"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 gradient-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold shadow-warm hover:opacity-90 transition"
          >
            <Phone size={14} /> {t.contactUs}
          </a>

          {/* Language toggle */}
          <button
            onClick={() => setLang(lang === "en" ? "fr" : "en")}
            className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary transition border border-border px-3 py-1.5 rounded-full"
          >
            <Globe size={14} /> {lang === "en" ? "FR" : "EN"}
          </button>

          {/* Logout — shown whenever logged in */}
          {user && (
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-destructive transition"
            >
              <LogOut size={14} /> {t.logout}
            </button>
          )}
        </div>

        {/* Mobile hamburger */}
        <button onClick={() => setOpen(!open)} className="md:hidden text-foreground">
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden bg-card border-b border-border overflow-hidden"
          >
            <div className="flex flex-col p-4 gap-1">
              {navLinks.map(l => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="font-body text-sm font-medium text-foreground hover:text-primary py-2.5 border-b border-border/50 last:border-0"
                >
                  {l.label}
                </a>
              ))}

              {isAdmin && (
                <a
                  href="/admin"
                  onClick={() => setOpen(false)}
                  className="font-body text-sm font-semibold text-primary py-2.5 flex items-center gap-1.5 border-b border-border/50"
                >
                  <Shield size={14} /> {t.admin} Dashboard
                </a>
              )}

              <div className="pt-3 space-y-2">
                <a
                  href="https://wa.me/237652300164"
                  target="_blank"
                  rel="noreferrer"
                  className="gradient-primary text-primary-foreground text-center px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                >
                  <Phone size={14} /> {t.contactUs}
                </a>

                <div className="flex gap-2">
                  <button
                    onClick={() => { setLang(lang === "en" ? "fr" : "en"); setOpen(false); }}
                    className="flex-1 flex items-center justify-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary py-2 border border-border rounded-xl"
                  >
                    <Globe size={14} /> {lang === "en" ? "Français" : "English"}
                  </button>

                  {user && (
                    <button
                      onClick={handleSignOut}
                      className="flex-1 flex items-center justify-center gap-1.5 text-sm font-medium text-destructive hover:opacity-80 py-2 border border-destructive/30 rounded-xl bg-destructive/5"
                    >
                      <LogOut size={14} /> {t.logout}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
