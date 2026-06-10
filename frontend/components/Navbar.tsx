"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { TrendingUp, BarChart3, LayoutDashboard, Briefcase, Play, Eye, Settings, LogOut, Shield } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  if (!user) return null; // Hide Navbar on login/signup pages

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Stock Analysis", href: "/stock/RELIANCE", icon: BarChart3 }, // Default to RELIANCE for quick demo
    { name: "Backtesting", href: "/backtest", icon: Play },
    { name: "Portfolio", href: "/portfolio", icon: Briefcase },
    { name: "Watchlist", href: "/watchlist", icon: Eye },
  ];

  const isAdmin = user?.role === "admin";

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-[rgba(255,255,255,0.06)] bg-[#04060d]/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo Brand */}
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center space-x-2 text-indigo-400 font-bold text-xl tracking-tight">
              <TrendingUp className="h-6 w-6 text-indigo-400" />
              <span className="text-white">MarketMind</span>
              <span className="text-indigo-400">AI</span>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.split("/")[1] === item.href.split("/")[1];
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? "bg-indigo-600/15 text-indigo-300 border border-indigo-500/20"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                  }`}
                >
                  <Icon className="h-4.5 w-4.5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}

            {/* Admin link */}
            {isAdmin && (
              <Link
                href="/admin"
                className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                  pathname.startsWith("/admin")
                    ? "bg-amber-600/15 text-amber-300 border border-amber-500/20"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                }`}
              >
                <Shield className="h-4.5 w-4.5 text-amber-400" />
                <span>Admin</span>
              </Link>
            )}
          </div>

          {/* User Session Detail */}
          <div className="flex items-center space-x-4">
            <div className="flex flex-col items-end hidden sm:flex">
              <span className="text-xs text-slate-400 font-medium">{user.email}</span>
              <span className={`mt-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                user.role === "admin" 
                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  : user.role === "premium"
                  ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                  : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
              }`}>
                {user.role.toUpperCase()}
              </span>
            </div>

            <button
              onClick={logout}
              className="flex items-center justify-center p-2 rounded-lg border border-[rgba(255,255,255,0.06)] hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-all cursor-pointer"
              title="Logout"
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
