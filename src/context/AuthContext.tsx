"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";

export interface UserSession {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role?: string;
  systemRole?: string;
  status?: string;
}

interface AuthContextType {
  user: UserSession | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, fullName: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initAuth() {
      try {
        const res = await fetch("/api/auth/session");
        const data = await res.json();
        
        if (data.user) {
          setUser(data.user);
          localStorage.setItem("nexuspm_session", JSON.stringify(data.user));
        } else {
          // If server says no session, check if there is an offline cache
          const storedUser = localStorage.getItem("nexuspm_session");
          if (storedUser) {
            setUser(JSON.parse(storedUser));
          }
        }
      } catch (e) {
        console.error("Failed to initialize session, using offline cache if exists", e);
        const storedUser = localStorage.getItem("nexuspm_session");
        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser));
          } catch (_) {}
        }
      } finally {
        setLoading(false);
      }
    }

    initAuth();
  }, []);

  const login = async (email: string, password = "password123"): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    try {
      // 1. Sign in with Firebase Auth client side
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // 2. Get ID Token
      const token = await firebaseUser.getIdToken();
      
      // 3. Post to API to set session cookie
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email }),
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        setUser(data.user);
        localStorage.setItem("nexuspm_session", JSON.stringify(data.user));
        setLoading(false);
        return { success: true };
      } else {
        setLoading(false);
        return { success: false, error: data.error || "Đăng nhập thất bại" };
      }
    } catch (err: any) {
      setLoading(false);
      let errorMsg = "Đăng nhập thất bại";
      if (
        err.code === "auth/user-not-found" || 
        err.code === "auth/wrong-password" || 
        err.code === "auth/invalid-credential" ||
        err.code === "auth/invalid-email"
      ) {
        errorMsg = "Email hoặc mật khẩu không chính xác";
      }
      return { success: false, error: errorMsg };
    }
  };

  const register = async (
    email: string,
    fullName: string,
    password = "password123"
  ): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    try {
      // 1. Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // 2. Get ID Token
      const token = await firebaseUser.getIdToken();
      
      // 3. Post to API to save profile in Firestore and set session cookie
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email, fullName }),
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        setUser(data.user);
        localStorage.setItem("nexuspm_session", JSON.stringify(data.user));
        setLoading(false);
        return { success: true };
      } else {
        setLoading(false);
        return { success: false, error: data.error || "Đăng ký thất bại" };
      }
    } catch (err: any) {
      setLoading(false);
      let errorMsg = "Đăng ký thất bại";
      if (err.code === "auth/email-already-in-use") {
        errorMsg = "Email này đã được sử dụng";
      } else if (err.code === "auth/weak-password") {
        errorMsg = "Mật khẩu quá yếu (tối thiểu 6 ký tự)";
      }
      return { success: false, error: errorMsg };
    }
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem("nexuspm_session");
    try {
      await signOut(auth);
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      console.error("Failed to notify logout to server", e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
