"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface UserSession {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: string;
}

interface AuthContextType {
  user: UserSession | null;
  loading: boolean;
  login: (email: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users list matching database seed data
export const MOCK_USERS: UserSession[] = [
  {
    id: "user-a-id-placeholder", // Will match seed user id or fallback
    email: "vana@nexuspm.com",
    fullName: "Nguyễn Văn A",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
    role: "Project Manager",
  },
  {
    id: "user-b-id-placeholder",
    email: "thib@nexuspm.com",
    fullName: "Trần Thị B",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
    role: "Lead Designer",
  },
  {
    id: "user-c-id-placeholder",
    email: "hoangc@nexuspm.com",
    fullName: "Lê Hoàng C",
    avatarUrl: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=100&auto=format&fit=crop&q=80",
    role: "Frontend Developer",
  },
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check local storage for existing session (supports PWA offline session)
    const storedUser = localStorage.getItem("nexuspm_session");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse stored session", e);
      }
    } else {
      // Default log in as User A (Project Manager) for preview convenience
      setUser(MOCK_USERS[0]);
      localStorage.setItem("nexuspm_session", JSON.stringify(MOCK_USERS[0]));
    }
    setLoading(false);
  }, []);

  const login = async (email: string): Promise<boolean> => {
    setLoading(true);
    // Simulate API request delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    const matched = MOCK_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (matched) {
      setUser(matched);
      localStorage.setItem("nexuspm_session", JSON.stringify(matched));
      setLoading(false);
      return true;
    }
    setLoading(false);
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("nexuspm_session");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
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
