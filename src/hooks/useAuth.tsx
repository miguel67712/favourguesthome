import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

interface AuthContext {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null; isAdmin: boolean }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null; isAdmin: boolean }>;
  signOut: () => Promise<void>;
}

const AuthCtx = createContext<AuthContext>({
  user: null,
  isAdmin: false,
  loading: true,
  signIn: async () => ({ error: null, isAdmin: false }),
  signUp: async () => ({ error: null, isAdmin: false }),
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser]       = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkAdmin = async (userId: string): Promise<boolean> => {
    try {
      const { data } = await supabase
        .from("user_roles").select("role")
        .eq("user_id", userId).eq("role", "admin").maybeSingle();
      const admin = !!data;
      setIsAdmin(admin);
      return admin;
    } catch { setIsAdmin(false); return false; }
  };

  const tryEnsureAdminRole = async () => {
    try { await supabase.rpc("ensure_admin_role"); } catch { /* silent */ }
  };

  useEffect(() => {
    // 2-second hard timeout — loading MUST resolve so the page renders
    const timeout = setTimeout(() => setLoading(false), 2000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        clearTimeout(timeout);
        const u = session?.user ?? null;
        setUser(u);
        if (u) {
          // Don't await sequentially — run in parallel, always resolve loading
          Promise.allSettled([tryEnsureAdminRole(), checkAdmin(u.id)])
            .finally(() => setLoading(false));
        } else {
          setIsAdmin(false);
          setLoading(false);
        }
      }
    );
    return () => { subscription.unsubscribe(); clearTimeout(timeout); };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message, isAdmin: false };
    let admin = false;
    if (data.user) { await tryEnsureAdminRole(); admin = await checkAdmin(data.user.id); }
    return { error: null, isAdmin: admin };
  };

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message, isAdmin: false };
    let admin = false;
    if (data.user) { await tryEnsureAdminRole(); admin = await checkAdmin(data.user.id); }
    return { error: null, isAdmin: admin };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null); setIsAdmin(false);
  };

  return (
    <AuthCtx.Provider value={{ user, isAdmin, loading, signIn, signUp, signOut }}>
      {children}
    </AuthCtx.Provider>
  );
};

export const useAuth = () => useContext(AuthCtx);
