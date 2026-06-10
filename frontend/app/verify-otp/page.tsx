"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ShieldCheck, MailOpen, AlertCircle, ArrowRight } from "lucide-react";

function VerifyOtpContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  
  const { verifyOtp } = useAuth();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const code = formData.get("code") as string;

    try {
      await verifyOtp(email, code);
      setSuccess("Account activated successfully! Redirecting to login...");
    } catch (err: any) {
      setError(err.message || "Invalid or expired OTP verification code");
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-8 glass p-8 rounded-2xl relative z-10">
      {/* Brand Header */}
      <div className="text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 mb-3">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white">
          Verify Email
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Enter the 6-digit verification code sent to
        </p>
        <p className="mt-0.5 text-sm font-semibold text-indigo-300">
          {email}
        </p>
      </div>

      {/* Form */}
      <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
        {error && (
          <div className="flex items-center space-x-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-lg">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center space-x-2 text-sm text-green-400 bg-green-500/10 border border-green-500/20 p-3 rounded-lg">
            <span>{success}</span>
          </div>
        )}

        <div>
          <label htmlFor="code" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 text-center">
            Verification OTP Code
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <MailOpen className="h-5 w-5 text-slate-500" />
            </div>
            <input
              id="code"
              name="code"
              type="text"
              required
              maxLength={6}
              placeholder="123456"
              className="block w-full rounded-lg border border-[rgba(255,255,255,0.08)] bg-slate-900/40 py-2.5 pl-10 pr-3 text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-center text-lg tracking-widest font-bold transition-all"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="group relative flex w-full justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all cursor-pointer disabled:opacity-50"
        >
          {submitting ? "Verifying..." : "Verify Code"}
          <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-indigo-300 group-hover:translate-x-0.5 transition-transform">
            <ArrowRight className="h-4 w-4" />
          </span>
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-slate-400">
        Didn't receive the code? Check spam or console log, or{" "}
        <button
          type="button"
          onClick={() => alert("Verification code re-dispatched. Check backend console logs.")}
          className="font-semibold text-indigo-400 hover:text-indigo-300 bg-transparent border-0 cursor-pointer"
        >
          Resend OTP
        </button>
      </p>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8 bg-[#04060d]">
      <div className="glow-bg top-10 left-10" />
      <div className="glow-bg bottom-10 right-10" />
      <Suspense fallback={<div className="text-white text-center">Loading verification context...</div>}>
        <VerifyOtpContent />
      </Suspense>
    </div>
  );
}
