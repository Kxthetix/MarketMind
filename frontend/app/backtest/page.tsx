"use client";

import React, { useState } from "react";
import { api } from "@/lib/api";
import { Play, TrendingUp, ShieldAlert, Award, TrendingDown, Percent, Calendar, RefreshCw } from "lucide-react";

interface TradeItem {
  type: string;
  date: string;
  price: number;
  shares: number;
  profit: number;
}

interface BacktestResults {
  win_rate: number;
  sharpe_ratio: number;
  cagr: number;
  max_drawdown: number;
  total_trades: number;
  initial_capital: number;
  final_equity: number;
  trades: TradeItem[];
}

export default function BacktestingPage() {
  const [strategy, setStrategy] = useState("RSI_Crossover");
  const [symbol, setSymbol] = useState("RELIANCE");
  const [startDate, setStartDate] = useState("2021-01-01");
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  
  // Strategy params
  const [rsiLower, setRsiLower] = useState("30");
  const [rsiUpper, setRsiUpper] = useState("70");
  const [fastPeriod, setFastPeriod] = useState("20");
  const [slowPeriod, setSlowPeriod] = useState("50");

  const [results, setResults] = useState<BacktestResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRunBacktest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setResults(null);

    // Build payload parameters
    const params: Record<string, any> = {};
    if (strategy === "RSI_Crossover") {
      params.rsi_lower = parseFloat(rsiLower);
      params.rsi_upper = parseFloat(rsiUpper);
    } else {
      params.fast_period = parseInt(fastPeriod);
      params.slow_period = parseInt(slowPeriod);
    }

    try {
      const payload = {
        strategy_name: strategy,
        symbol: symbol.toUpperCase().trim(),
        start_date: startDate,
        end_date: endDate,
        parameters: params,
      };

      const res = await api.post<BacktestResults>("/backtest/run", payload);
      setResults(res);
    } catch (err: any) {
      setError(err.message || "Backtest failed to run. Check input criteria.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 bg-[#04060d] space-y-8 relative">
      <div className="glow-bg top-0 left-10" />

      {/* Header */}
      <div className="relative z-10">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Strategy Backtesting Engine</h1>
        <p className="text-slate-400 text-sm mt-1">Run strategy logic against historical data to evaluate theoretical win ratios.</p>
      </div>

      {/* Config Form Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 relative z-10">
        
        {/* Settings column */}
        <div className="lg:col-span-1 glass p-6 rounded-2xl h-fit space-y-5">
          <h3 className="text-md font-bold text-white border-b border-[rgba(255,255,255,0.06)] pb-2 flex items-center space-x-2">
            <Calendar className="h-4.5 w-4.5 text-indigo-400" />
            <span>Settings</span>
          </h3>
          <form onSubmit={handleRunBacktest} className="space-y-4 text-sm">
            
            {/* Strategy Select */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Strategy</label>
              <select
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
                className="block w-full rounded-lg border border-[rgba(255,255,255,0.08)] bg-slate-900/40 px-3 py-2.5 text-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="RSI_Crossover">RSI Reversal Crossover</option>
                <option value="SMA_Crossover">Moving Average Crossover</option>
              </select>
            </div>

            {/* Symbol Ticker */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Stock Ticker</label>
              <input
                type="text"
                required
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                placeholder="RELIANCE"
                className="block w-full rounded-lg border border-[rgba(255,255,255,0.08)] bg-slate-900/40 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Start Date</label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="block w-full rounded-lg border border-[rgba(255,255,255,0.08)] bg-slate-900/40 px-2 py-1.5 text-slate-200 text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">End Date</label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="block w-full rounded-lg border border-[rgba(255,255,255,0.08)] bg-slate-900/40 px-2 py-1.5 text-slate-200 text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Strategy Parameters inputs */}
            {strategy === "RSI_Crossover" ? (
              <div className="grid grid-cols-2 gap-3 border-t border-[rgba(255,255,255,0.06)] pt-3">
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">RSI Buy (Lower)</label>
                  <input
                    type="number"
                    value={rsiLower}
                    onChange={(e) => setRsiLower(e.target.value)}
                    className="block w-full rounded-lg border border-[rgba(255,255,255,0.08)] bg-slate-900/40 p-2 text-slate-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">RSI Sell (Upper)</label>
                  <input
                    type="number"
                    value={rsiUpper}
                    onChange={(e) => setRsiUpper(e.target.value)}
                    className="block w-full rounded-lg border border-[rgba(255,255,255,0.08)] bg-slate-900/40 p-2 text-slate-200 focus:outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 border-t border-[rgba(255,255,255,0.06)] pt-3">
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Fast Window</label>
                  <input
                    type="number"
                    value={fastPeriod}
                    onChange={(e) => setFastPeriod(e.target.value)}
                    className="block w-full rounded-lg border border-[rgba(255,255,255,0.08)] bg-slate-900/40 p-2 text-slate-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Slow Window</label>
                  <input
                    type="number"
                    value={slowPeriod}
                    onChange={(e) => setSlowPeriod(e.target.value)}
                    className="block w-full rounded-lg border border-[rgba(255,255,255,0.08)] bg-slate-900/40 p-2 text-slate-200 focus:outline-none"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center space-x-1.5 py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all cursor-pointer disabled:opacity-50"
            >
              <Play className="h-4.5 w-4.5 fill-current" />
              <span>{loading ? "Simulating..." : "Run Backtest"}</span>
            </button>
          </form>
        </div>

        {/* Results columns */}
        <div className="lg:col-span-3 space-y-8">
          {error && (
            <div className="flex items-center space-x-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 p-4 rounded-xl">
              <ShieldAlert className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!results && !loading && (
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-[rgba(255,255,255,0.06)] rounded-2xl h-[450px] p-8 text-center bg-[#0b0f19]/35">
              <Award className="h-12 w-12 text-slate-600 mb-3" />
              <h4 className="text-white font-bold text-lg">No Simulation Report</h4>
              <p className="text-slate-500 text-sm max-w-sm mt-1">
                Configure your strategy parameter bounds and click run to trigger the analytics simulator.
              </p>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center border border-[rgba(255,255,255,0.06)] rounded-2xl h-[450px] bg-[#0b0f19] text-center">
              <div className="space-y-3">
                <RefreshCw className="h-8 w-8 animate-spin text-indigo-500 mx-auto" />
                <p className="text-slate-400 text-sm">Scanning historical candlesticks records...</p>
              </div>
            </div>
          )}

          {results && (
            <div className="space-y-8">
              {/* Analytics metrics grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                
                {/* Win Rate */}
                <div className="glass p-4 rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Win Rate</span>
                  <div className="flex items-baseline space-x-1.5 text-2xl font-bold text-white">
                    <span>{results.win_rate}%</span>
                  </div>
                </div>

                {/* Sharpe Ratio */}
                <div className="glass p-4 rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Sharpe Ratio</span>
                  <div className="flex items-baseline space-x-1.5 text-2xl font-bold text-white">
                    <span>{results.sharpe_ratio}</span>
                  </div>
                </div>

                {/* CAGR */}
                <div className="glass p-4 rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">CAGR</span>
                  <div className="flex items-baseline space-x-1.5 text-2xl font-bold text-emerald-400">
                    <span>{results.cagr >= 0 ? "+" : ""}{results.cagr}%</span>
                  </div>
                </div>

                {/* Max Drawdown */}
                <div className="glass p-4 rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Max Drawdown</span>
                  <div className="flex items-baseline space-x-1.5 text-2xl font-bold text-red-400">
                    <span>-{results.max_drawdown}%</span>
                  </div>
                </div>
              </div>

              {/* Capital overview */}
              <div className="glass p-6 rounded-2xl flex justify-between items-center text-sm">
                <div>
                  <span className="text-xs text-slate-400">Initial Capital</span>
                  <h4 className="text-lg font-bold text-slate-200">₹{results.initial_capital.toLocaleString()}</h4>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400">Ending Balance</span>
                  <h4 className="text-lg font-bold text-white">₹{results.final_equity.toLocaleString()}</h4>
                </div>
              </div>

              {/* Trades history log table */}
              <div className="glass p-6 rounded-2xl space-y-4">
                <h3 className="text-md font-bold text-white border-b border-[rgba(255,255,255,0.06)] pb-2">
                  Simulation Trades Log ({results.trades.length} Actions)
                </h3>
                <div className="overflow-x-auto max-h-[300px]">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="text-slate-500 border-b border-[rgba(255,255,255,0.04)] uppercase tracking-wider font-semibold">
                        <th className="py-2">Date</th>
                        <th className="py-2">Action</th>
                        <th className="py-2 text-right">Price (INR)</th>
                        <th className="py-2 text-right">Qty</th>
                        <th className="py-2 text-right">Profit / Loss</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[rgba(255,255,255,0.04)] font-mono">
                      {results.trades.map((tr, index) => {
                        const isBuy = tr.type === "buy";
                        return (
                          <tr key={index} className="hover:bg-slate-800/10 transition-all">
                            <td className="py-2.5 text-slate-400">{tr.date}</td>
                            <td className="py-2.5">
                              <span className={`inline-flex px-1.5 py-0.5 rounded font-bold uppercase text-[9px] ${
                                isBuy ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              }`}>
                                {tr.type}
                              </span>
                            </td>
                            <td className="py-2.5 text-right text-slate-200">₹{tr.price.toFixed(2)}</td>
                            <td className="py-2.5 text-right text-slate-300">{tr.shares}</td>
                            <td className={`py-2.5 text-right font-bold ${
                              isBuy ? "text-slate-500" : tr.profit >= 0 ? "text-emerald-400" : "text-red-400"
                            }`}>
                              {isBuy ? "—" : `${tr.profit >= 0 ? "+" : ""}₹${tr.profit.toFixed(2)}`}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
