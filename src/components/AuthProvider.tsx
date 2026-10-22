"use client";

import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  type User,
} from "firebase/auth";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { auth, firebaseConfigured } from "@/lib/firebase";

type AuthCtx = {
  user: User | null;
  loading: boolean;
  configured: boolean;
  signInGoogle: () => Promise<void>;
  signInEmail: (email: string, password: string) => Promise<void>;
  signUpEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(firebaseConfigured);

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  const value = useMemo<AuthCtx>(() => {
    const need = () => {
      if (!auth) throw new Error("Firebase is not configured yet.");
      return auth;
    };
    return {
      user,
      loading,
      configured: firebaseConfigured,
      signInGoogle: async () => {
        await signInWithPopup(need(), new GoogleAuthProvider());
      },
      signInEmail: async (email, password) => {
        await signInWithEmailAndPassword(need(), email, password);
      },
      signUpEmail: async (email, password) => {
        await createUserWithEmailAndPassword(need(), email, password);
      },
      signOut: async () => {
        await fbSignOut(need());
      },
    };
  }, [user, loading]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
