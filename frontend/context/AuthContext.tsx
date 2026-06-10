"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "@/lib/api";

interface UserState {
  email: string;
  role: string;
  is_verified: boolean;
}

interface AuthContextType {
  user: UserState | null;
  token: string | null;
  loading: boolean;
  login: (form: FormData) => Promise<void>;
  signup: (email: string, pass: string) => Promise<void>;
  verifyOtp: (email: string, code: string) => Promise<void>;
  socialLogin: (provider: string, token: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserState | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Restore session
    const savedToken = localStorage.getItem("token");
    const savedRole = localStorage.getItem("role");
    const savedEmail = localStorage.getItem("email");
    
    if (savedToken && savedRole && savedEmail) {
      setToken(savedToken);
      setUser({
        email: savedEmail,
        role: savedRole,
        is_verified: true // If they have an active token session, assume verified
      });
    }
    setLoading(false);
  }, []);

  // Handle protected page routing redirects
  useEffect(() => {
    if (loading) return;
    
    const isAuthPage = ["/login", "/signup", "/verify-otp"].includes(pathname);
    
    if (!token && !isAuthPage && pathname !== "/") {
      router.push("/login");
    } else if (token && isAuthPage) {
      router.push("/dashboard");
    }
  }, [token, pathname, loading, router]);

  const login = async (formData: FormData) => {
    try {
      const data = await api.postForm<{ access_token: string; role: string; email: string }>(
        "/auth/login",
        formData
      );
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("role", data.role);
      localStorage.setItem("email", data.email);
      setToken(data.access_token);
      setUser({ email: data.email, role: data.role, is_verified: true });
      router.push("/dashboard");
    } catch (e: any) {
      throw new Error(e.message || "Failed to login");
    }
  };

  const signup = async (email: string, pass: string) => {
    try {
      await api.post("/auth/signup", { email, password: pass });
      // Redirect to OTP verification page
      router.push(`/verify-otp?email=${encodeURIComponent(email)}`);
    } catch (e: any) {
      throw new Error(e.message || "Signup failed");
    }
  };

  const verifyOtp = async (email: string, code: string) => {
    try {
      await api.post("/auth/verify-otp", { email, code });
      router.push("/login");
    } catch (e: any) {
      throw new Error(e.message || "OTP verification failed");
    }
  };

  const socialLogin = async (provider: string, provToken: string) => {
    try {
      const data = await api.post<{ access_token: string; role: string; email: string }>(
        `/auth/social-login?provider=${provider}&token=${provToken}`
      );
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("role", data.role);
      localStorage.setItem("email", data.email);
      setToken(data.access_token);
      setUser({ email: data.email, role: data.role, is_verified: true });
      router.push("/dashboard");
    } catch (e: any) {
      throw new Error(e.message || "Social login failed");
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("email");
    setToken(null);
    setUser(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, verifyOtp, socialLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
