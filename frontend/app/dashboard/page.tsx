"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { TrendingUp, TrendingDown, RefreshCw, BarChart2, ShieldAlert, Sparkles, Brain, CheckCircle2 } from "lucide-react";

interface IndexData {
  symbol: string;
  price: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  prev_close: number;
  change: number;
  change_percent: number;
}

interface SectorData {
  name: string;
  change: number;
  status: string;
}

interface DashboardMetrics {
  indices: {
    nifty: IndexData;
    banknifty: IndexData;
  };
  top_gainers: IndexData[];
  top_losers: IndexData[];
  sector_performance: SectorData[];
  updated_at: string;
}

interface OpportunityRanking {
  symbol: string;
  price: number;
  change_percent: number;
  score: number;
  rating: string;
  breakdown: {
    technical_score: number;
    sentiment_score: number;
    trend_score: number;
    volume_score: number;
    risk_score: number;
  };
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardMetrics | null>(null);
  const [rankings, setRankings] = useState<OpportunityRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [rankingsLoading, setRankingsLoading] = useState(true);
  const [error, setError] = useState("");
  const [rankingsError, setRankingsError] = useState("");
  const [hoveredSymbol, setHoveredSymbol] = useState<string | null>(null);

  const fetchMetrics = async () => {
    setError("");
    try {
      const res = await api.get<DashboardMetrics>("/dashboard/metrics");
      setData(res);
    } catch (e: any) {
      setError(e.message || "Failed to load dashboard metrics");
    } finally {
      setLoading(false);
    }
  };

  const fetchRankings = async () => {
    setRankingsError("");
    setRankingsLoading(true);
    try {
      const res = await api.get<OpportunityRanking[]>("/analysis/rankings");
      setRankings(res);
    } catch (e: any) {
      setRankingsError(e.message || "Failed to load opportunity rankings");
    } finally {
      setRankingsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    fetchRankings();
    
    // Auto-refresh metrics every 60 seconds
    const interval = setInterval(fetchMetrics, 60000);
    return () => clearInterval(interval);
  }, []);

  const getRatingColor = (rating: string) => {
    switch (rating.toLowerCase()) {
      case "strong buy":
        return "text-emerald-400 bg-emerald-500/10 border-emerald-500/25";
      case "buy":
        return "text-indigo-400 bg-indigo-500/10 border-indigo-500/25";
      case "sell":
      case "strong sell":
        return "text-red-400 bg-red-500/10 border-red-500/25";
      default:
        return "text-amber-400 bg-amber-500/10 border-amber-500/25";
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center bg-[#04060d]">
        <div className="text-center space-y-3">
          <RefreshCw className="h-8 w-8 animate-spin text-indigo-500 mx-auto" />
          <p className="text-slate-400 text-sm">Streaming Indian market metrics...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 bg-[#04060d]">
        <div className="glass p-8 rounded-2xl border-red-500/20 text-center max-w-lg mx-auto space-y-4">
          <ShieldAlert className="h-12 w-12 text-red-400 mx-auto" />
          <h3 className="text-lg font-bold text-white">Market Feed Disconnected</h3>
          <p className="text-slate-400 text-sm">{error || "Unable to parse stream metadata."}</p>
          <button
            onClick={() => { setLoading(true); fetchMetrics(); }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition-all cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const { indices, top_gainers, top_losers, sector_performance, updated_at } = data;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 bg-[#04060d] space-y-8 relative">
      <div className="glow-bg top-0 left-10" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0 relative z-10">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Market Intelligence</h1>
          <p className="text-slate-400 text-sm mt-1">Real-time analytical insights for NSE/BSE stocks</p>
        </div>
        <div className="flex items-center space-x-3 text-xs text-slate-500">
          <span>Last sync: {updated_at}</span>
          <button
            onClick={() => { fetchMetrics(); fetchRankings(); }}
            className="p-2 rounded-lg border border-[rgba(255,255,255,0.06)] hover:bg-slate-800/40 text-slate-400 hover:text-white transition-all cursor-pointer"
            title="Refresh All Data"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Index Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
        {/* NIFTY 50 */}
        <div className="glass-interactive p-6 rounded-2xl flex flex-col justify-between h-40">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">NIFTY 50</span>
              <h2 className="text-2xl font-bold text-white mt-1">
                {indices.nifty.price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h2>
            </div>
            <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              indices.nifty.change >= 0 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
            }`}>
              {indices.nifty.change >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              <span>{indices.nifty.change_percent >= 0 ? "+" : ""}{indices.nifty.change_percent.toFixed(2)}%</span>
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 border-t border-[rgba(255,255,255,0.06)] pt-4 text-xs text-slate-500">
            <div>Open: <span className="text-slate-300 font-medium">{indices.nifty.open.toFixed(1)}</span></div>
            <div>High: <span className="text-slate-300 font-medium">{indices.nifty.high.toFixed(1)}</span></div>
            <div>Low: <span className="text-slate-300 font-medium">{indices.nifty.low.toFixed(1)}</span></div>
          </div>
        </div>

        {/* BANK NIFTY */}
        <div className="glass-interactive p-6 rounded-2xl flex flex-col justify-between h-40">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">BANK NIFTY</span>
              <h2 className="text-2xl font-bold text-white mt-1">
                {indices.banknifty.price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h2>
            </div>
            <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              indices.banknifty.change >= 0 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
            }`}>
              {indices.banknifty.change >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              <span>{indices.banknifty.change_percent >= 0 ? "+" : ""}{indices.banknifty.change_percent.toFixed(2)}%</span>
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 border-t border-[rgba(255,255,255,0.06)] pt-4 text-xs text-slate-500">
            <div>Open: <span className="text-slate-300 font-medium">{indices.banknifty.open.toFixed(1)}</span></div>
            <div>High: <span className="text-slate-300 font-medium">{indices.banknifty.high.toFixed(1)}</span></div>
            <div>Low: <span className="text-slate-300 font-medium">{indices.banknifty.low.toFixed(1)}</span></div>
          </div>
        </div>
      </div>

      {/* AI Opportunity Rankings Section */}
      <div className="glass p-6 rounded-2xl space-y-6 relative z-10 border-[rgba(99,102,241,0.15)] shadow-[0_0_20px_rgba(99,102,241,0.03)]">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0 border-b border-[rgba(255,255,255,0.06)] pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                AI Opportunity Rankings <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">LangGraph Multi-Agent</span>
              </h3>
              <p className="text-slate-400 text-xs mt-0.5">Weighted composite rating: 40% Technicals, 20% Sentiment, 20% Trend, 10% Volume, 10% Risk</p>
            </div>
          </div>
          <button
            onClick={fetchRankings}
            disabled={rankingsLoading}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-[rgba(255,255,255,0.08)] bg-slate-900/40 text-xs text-slate-300 hover:text-white hover:bg-slate-800/40 disabled:opacity-50 transition-all cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${rankingsLoading ? "animate-spin" : ""}`} />
            <span>{rankingsLoading ? "Analyzing..." : "Re-evaluate"}</span>
          </button>
        </div>

        {rankingsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="glass p-5 rounded-xl border border-[rgba(255,255,255,0.03)] space-y-4 animate-pulse">
                <div className="flex justify-between items-center">
                  <div className="h-5 bg-slate-800 rounded w-1/3" />
                  <div className="h-4 bg-slate-800 rounded w-1/4" />
                </div>
                <div className="h-8 bg-slate-800 rounded w-2/3" />
                <div className="space-y-2 pt-2">
                  <div className="h-2 bg-slate-800 rounded w-full" />
                  <div className="h-2 bg-slate-800 rounded w-5/6" />
                </div>
              </div>
            ))}
          </div>
        ) : rankingsError ? (
          <div className="flex flex-col items-center justify-center p-8 bg-slate-900/20 rounded-xl border border-red-500/10 text-center space-y-3">
            <ShieldAlert className="h-10 w-10 text-red-400" />
            <p className="text-sm text-slate-300">{rankingsError}</p>
            <button
              onClick={fetchRankings}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-lg text-xs font-semibold transition-all cursor-pointer"
            >
              Retry AI Analysis
            </button>
          </div>
        ) : rankings.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-6">No ranked opportunities found.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {rankings.map((stock) => {
              const changeIsPositive = stock.change_percent >= 0;
              const isHovered = hoveredSymbol === stock.symbol;
              return (
                <div
                  key={stock.symbol}
                  onMouseEnter={() => setHoveredSymbol(stock.symbol)}
                  onMouseLeave={() => setHoveredSymbol(null)}
                  className="glass-interactive p-5 rounded-xl border border-[rgba(255,255,255,0.06)] relative overflow-hidden flex flex-col justify-between group cursor-pointer"
                  style={{ minHeight: "260px" }}
                >
                  <Link href={`/stock/${stock.symbol}`} className="absolute inset-0 z-0" />
                  
                  {/* Subtle Glow Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  {/* Content (Z-indexed) */}
                  <div className="relative z-10 space-y-4 flex-grow flex flex-col justify-between">
                    <div>
                      {/* Ticker & Price Header */}
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-lg font-bold text-white tracking-tight group-hover:text-indigo-400 transition-colors">
                            {stock.symbol}
                          </span>
                          <span className="block text-[10px] text-slate-500 font-semibold uppercase">NSE Ticker</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-semibold text-slate-200 font-mono">
                            ₹{stock.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                          <span className={`flex items-center justify-end text-xs font-medium ${changeIsPositive ? "text-emerald-400" : "text-red-400"}`}>
                            {changeIsPositive ? "+" : ""}{stock.change_percent.toFixed(2)}%
                          </span>
                        </div>
                      </div>

                      {/* AI Score & Rating Badge */}
                      <div className="flex items-center justify-between mt-4 bg-slate-950/40 p-2.5 rounded-lg border border-[rgba(255,255,255,0.03)]">
                        <div className="flex items-center space-x-2">
                          <Brain className="h-4 w-4 text-indigo-400" />
                          <div>
                            <span className="text-[10px] text-slate-500 block leading-none font-medium">AI SCORE</span>
                            <span className="text-base font-extrabold text-white font-mono">{stock.score}</span>
                            <span className="text-[10px] text-slate-400">/100</span>
                          </div>
                        </div>
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold border uppercase tracking-wider ${getRatingColor(stock.rating)}`}>
                          {stock.rating}
                        </span>
                      </div>
                    </div>

                    {/* Weight Breakdowns */}
                    <div className="space-y-1.5 pt-3 border-t border-[rgba(255,255,255,0.06)]">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Agent Signals</span>
                      
                      {/* Technical Line */}
                      <div className="space-y-0.5">
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>Technical Setup (40%)</span>
                          <span className="font-mono text-slate-300 font-medium">{stock.breakdown.technical_score}%</span>
                        </div>
                        <div className="w-full bg-slate-950 rounded-full h-1 overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${stock.breakdown.technical_score}%` }} />
                        </div>
                      </div>

                      {/* Sentiment Line */}
                      <div className="space-y-0.5">
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>Sentiment Score (20%)</span>
                          <span className="font-mono text-slate-300 font-medium">{stock.breakdown.sentiment_score}%</span>
                        </div>
                        <div className="w-full bg-slate-950 rounded-full h-1 overflow-hidden">
                          <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${stock.breakdown.sentiment_score}%` }} />
                        </div>
                      </div>

                      {/* Trend Strength */}
                      <div className="space-y-0.5">
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>Trend Direction (20%)</span>
                          <span className="font-mono text-slate-300 font-medium">{stock.breakdown.trend_score}%</span>
                        </div>
                        <div className="w-full bg-slate-950 rounded-full h-1 overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${stock.breakdown.trend_score}%` }} />
                        </div>
                      </div>

                      {/* Risk Rating */}
                      <div className="space-y-0.5">
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>Risk Assessment (10%)</span>
                          <span className="font-mono text-slate-300 font-medium">{stock.breakdown.risk_score}%</span>
                        </div>
                        <div className="w-full bg-slate-950 rounded-full h-1 overflow-hidden">
                          <div className="h-full bg-amber-500 rounded-full" style={{ width: `${stock.breakdown.risk_score}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Gainers and Losers tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
        {/* Top Gainers */}
        <div className="glass p-6 rounded-2xl space-y-4">
          <div className="flex items-center space-x-2 text-emerald-400 border-b border-[rgba(255,255,255,0.06)] pb-3">
            <TrendingUp className="h-5 w-5" />
            <h3 className="text-lg font-bold text-white">Top Gainers</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="text-slate-500 border-b border-[rgba(255,255,255,0.04)] text-xs uppercase tracking-wider">
                  <th className="py-2">Symbol</th>
                  <th className="py-2 text-right">Price (INR)</th>
                  <th className="py-2 text-right">Change (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(255,255,255,0.04)]">
                {top_gainers.map((stock) => (
                  <tr key={stock.symbol} className="hover:bg-slate-800/10 transition-all">
                    <td className="py-3 font-semibold text-slate-200">
                      <Link href={`/stock/${stock.symbol}`} className="hover:underline text-indigo-400">
                        {stock.symbol}
                      </Link>
                    </td>
                    <td className="py-3 text-right text-slate-200 font-medium">
                      {stock.price.toFixed(2)}
                    </td>
                    <td className="py-3 text-right text-emerald-400 font-semibold">
                      +{stock.change_percent.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Losers */}
        <div className="glass p-6 rounded-2xl space-y-4">
          <div className="flex items-center space-x-2 text-red-400 border-b border-[rgba(255,255,255,0.06)] pb-3">
            <TrendingDown className="h-5 w-5" />
            <h3 className="text-lg font-bold text-white">Top Losers</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="text-slate-500 border-b border-[rgba(255,255,255,0.04)] text-xs uppercase tracking-wider">
                  <th className="py-2">Symbol</th>
                  <th className="py-2 text-right">Price (INR)</th>
                  <th className="py-2 text-right">Change (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(255,255,255,0.04)]">
                {top_losers.map((stock) => (
                  <tr key={stock.symbol} className="hover:bg-slate-800/10 transition-all">
                    <td className="py-3 font-semibold text-slate-200">
                      <Link href={`/stock/${stock.symbol}`} className="hover:underline text-indigo-400">
                        {stock.symbol}
                      </Link>
                    </td>
                    <td className="py-3 text-right text-slate-200 font-medium">
                      {stock.price.toFixed(2)}
                    </td>
                    <td className="py-3 text-right text-red-400 font-semibold">
                      {stock.change_percent.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Sector Performance Grid */}
      <div className="glass p-6 rounded-2xl space-y-4 relative z-10">
        <div className="flex items-center space-x-2 border-b border-[rgba(255,255,255,0.06)] pb-3">
          <BarChart2 className="h-5 w-5 text-indigo-400" />
          <h3 className="text-lg font-bold text-white">Sector heatmaps</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {sector_performance.map((sec) => (
            <div
              key={sec.name}
              className={`p-4 rounded-xl border flex flex-col justify-between h-24 transition-all hover:scale-105 ${
                sec.change >= 1.0
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                  : sec.change >= 0.0
                  ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-300"
                  : "bg-red-500/10 border-red-500/20 text-red-300"
              }`}
            >
              <span className="text-xs font-semibold text-slate-300 truncate">{sec.name}</span>
              <span className="text-lg font-bold self-end mt-2">
                {sec.change >= 0 ? "+" : ""}{sec.change.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

