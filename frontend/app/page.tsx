"use client";

import React from "react";
import Link from "next/link";
import { TrendingUp, ShieldCheck, LineChart, Cpu, Zap, PieChart, ShieldAlert } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-[#04060d] text-slate-100 overflow-hidden">
      {/* Background glow effects */}
      <div className="glow-bg top-[-100px] left-[-100px] opacity-60" />
      <div className="glow-bg bottom-[-100px] right-[-100px] opacity-60" />

      {/* Landing Navbar */}
      <header className="border-b border-[rgba(255,255,255,0.06)] bg-[#04060d]/60 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2 text-indigo-400 font-bold text-xl tracking-tight">
            <TrendingUp className="h-6 w-6 text-indigo-400" />
            <span className="text-white">MarketMind</span>
            <span className="text-indigo-400">AI</span>
          </Link>
          <div className="flex items-center space-x-4">
            <Link href="/login" className="text-sm font-semibold text-slate-300 hover:text-white transition-all">
              Login
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition-all"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 text-center relative z-10 space-y-8">
        <div className="space-y-4">
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Quantitative Indian Market Intelligence (NSE/BSE)</span>
          </span>
          <h1 className="mx-auto max-w-4xl text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
            AI-Powered Stock Intelligence for <span className="text-indigo-400">Indian Markets</span>
          </h1>
          <p className="mx-auto max-w-2xl text-slate-400 text-base sm:text-lg">
            Empower your trading decisions with real-time technical indicators, support/resistance engines, news sentiment AI, and strategy backtesting.
          </p>
        </div>

        <div className="flex justify-center space-x-4">
          <Link
            href="/signup"
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-md shadow-lg shadow-indigo-600/20 hover:shadow-indigo-500/30 transition-all"
          >
            Create Free Account
          </Link>
          <Link
            href="/login"
            className="px-6 py-3 border border-[rgba(255,255,255,0.08)] bg-slate-900/40 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg font-bold text-md transition-all"
          >
            Login to Workspace
          </Link>
        </div>
      </section>

      {/* Regulatory/Scientific Disclaimer */}
      <section className="mx-auto max-w-5xl px-4 relative z-10">
        <div className="p-4 rounded-xl bg-slate-950/60 border border-[rgba(255,255,255,0.04)] flex items-start space-x-3 text-xs text-slate-500 text-left leading-normal">
          <ShieldAlert className="h-5 w-5 text-amber-500/80 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-slate-400 block mb-0.5">Disclaimer & Risk Disclosure</span>
            MarketMind AI provides evidence-based momentum math, candlestick filters, and historical simulations. The platform does NOT claim, offer, or guarantee future stock price predictions. Active investing carries capital risks; past performances do not represent future outcomes. Always perform independent audits before placing trades.
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 relative z-10 space-y-12">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white tracking-tight">Built for Data-Driven Investors</h2>
          <p className="text-slate-400 text-sm mt-2">Comprehensive quantitative modules integrated under a single SaaS workspace.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1: Indicators */}
          <div className="glass p-6 rounded-2xl space-y-3">
            <div className="h-10 w-10 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl flex items-center justify-center">
              <LineChart className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-white">Advanced Indicators</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Real-time calculation of SMA, EMA, RSI oscillators, MACD histograms, VWAP volume levels, and ATR volatility parameters.
            </p>
          </div>

          {/* Card 2: Patterns */}
          <div className="glass p-6 rounded-2xl space-y-3">
            <div className="h-10 w-10 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl flex items-center justify-center">
              <Cpu className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-white">Pattern Recognition</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Algorithmic swing pivot trackers, Fibonacci retracements, and daily candlestick setups matching (Doji, Hammer, Engulfing).
            </p>
          </div>

          {/* Card 3: Backtesting */}
          <div className="glass p-6 rounded-2xl space-y-3">
            <div className="h-10 w-10 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl flex items-center justify-center">
              <Zap className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-white">Strategy Backtester</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Backtest trading logic over 10 years of Indian market history, analyzing CAGR, Sharpe Ratio, and drawdown percentages.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Grid */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 relative z-10 space-y-12">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white tracking-tight">Flexible Pricing Plans</h2>
          <p className="text-slate-400 text-sm mt-2">Scale your quantitative analysis toolkit as your portfolio grows.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Free Tier */}
          <div className="glass p-8 rounded-2xl border-[rgba(255,255,255,0.06)] space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Free Tier</span>
                <h3 className="text-3xl font-extrabold text-white mt-1">₹0 <span className="text-sm font-normal text-slate-500">/ month</span></h3>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-300">
                <li className="flex items-center space-x-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                  <span>Standard Moving Averages & RSI indicators</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                  <span>Interactive stock charting panel</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                  <span>1 Custom Ticker watchlist limits</span>
                </li>
              </ul>
            </div>
            <Link
              href="/signup"
              className="block w-full py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 text-center rounded-lg text-sm font-semibold transition-all"
            >
              Sign Up Free
            </Link>
          </div>

          {/* Premium Tier */}
          <div className="glass p-8 rounded-2xl border-indigo-500/20 bg-gradient-to-b from-indigo-950/20 to-indigo-950/5 space-y-6 flex flex-col justify-between relative">
            <div className="absolute top-4 right-4 bg-indigo-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">POPULAR</div>
            <div className="space-y-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Premium Tier</span>
                <h3 className="text-3xl font-extrabold text-white mt-1">₹999 <span className="text-sm font-normal text-slate-500">/ month</span></h3>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-300">
                <li className="flex items-center space-x-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                  <span>Advanced Support/Resistance clustering</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                  <span>10-Year historical strategy backtester</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                  <span>Portfolio Beta risk ratings & allocations analyzer</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                  <span>Unlimited watchlist setups & price trigger alerts</span>
                </li>
              </ul>
            </div>
            <Link
              href="/signup"
              className="block w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-center rounded-lg text-sm font-semibold transition-all shadow-md shadow-indigo-600/20"
            >
              Subscribe Premium
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[rgba(255,255,255,0.06)] py-8 mt-12 text-center text-xs text-slate-600">
        <div className="mx-auto max-w-7xl px-4">
          © {new Date().getFullYear()} MarketMind AI. Designed for modern Indian traders. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
