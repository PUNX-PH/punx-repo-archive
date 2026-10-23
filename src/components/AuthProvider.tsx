"use client";

import {
  GoogleAuthProvider,
  onIdTokenChanged,
  signInWithPopup,
  signOut as fbSignOut,
  type User,
} from "firebase/auth";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { auth, firebaseConfigured } from "@/lib/firebase";
import { ALLOWED_DOMAIN, TOKEN_COOKIE, isPunxEmail } from "@/lib/domain";

type AuthCtx = {
  user: User | null;
  loading: boolean;
  configured: boolean;
  /** Set when someone signed in with an account that isn't allowed in. */
  authError: string | null;
  signInGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

const WRONG_ACCOUNT = `Only @${ALLOWED_DOMAIN} Google accounts can sign in. Choose your ${ALLOWED_DOMAIN} account.`;

function setTokenCookie(token: string | null) {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = token
    ? `${TOKEN_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=3600; SameSite=Lax${secure}`
    : `${TOKEN_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
}

const allowed = (u: User) => isPunxEmail(u.email) && u.emailVerified;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(firebaseConfigured);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth) return;
    const a = auth;
    // Fires on sign-in, sign-out and each hourly token refresh, so the cookie the server checks stays fresh.
    return onIdTokenChanged(a, async (u) => {
      if (u && !allowed(u)) {
        setTokenCookie(null);
        setAuthError(WRONG_ACCOUNT);
        setUser(null);
        setLoading(false);
        await fbSignOut(a);
        return;
      }
      // Cookie first, so the server accepts the very next navigation.
      setTokenCookie(u ? await u.getIdToken() : null);
      setUser(u);
      setLoading(false);
    });
  }, []);

  const value = useMemo<AuthCtx>(() => {
    const need = () => {
      if (!auth) throw new Error("Sign-in isn’t configured yet.");
      return auth;
    };
    return {
      user,
      loading,
      configured: firebaseConfigured,
      authError,
      signInGoogle: async () => {
        setAuthError(null);
        const provider = new GoogleAuthProvider();
        // `hd` only steers Google's account picker; the real check is the email test in the listener above and on the server.
        provider.setCustomParameters({ hd: ALLOWED_DOMAIN, prompt: "select_account" });
        await signInWithPopup(need(), provider);
      },
      signOut: async () => {
        setTokenCookie(null);
        await fbSignOut(need());
      },
    };
  }, [user, loading, authError]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
