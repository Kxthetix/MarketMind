"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Eye, Bell, Plus, Trash2, ArrowUpRight, ArrowDownRight, RefreshCw, CheckCircle, ShieldAlert } from "lucide-react";

interface Watchlist {
  id: string;
  name: string;
  symbols: string[];
}

interface AlertItem {
  id: string;
  symbol: string;
  alert_type: string;
  condition: string;
  target_value: number;
  is_active: boolean;
}

interface TickerQuote {
  symbol: string;
  price: number;
  change_percent: number;
}

export default function WatchlistPage() {
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [quotes, setQuotes] = useState<Record<string, TickerQuote>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Create watchlist states
  const [wlName, setWlName] = useState("");
  const [wlSymbols, setWlSymbols] = useState("");
  const [creatingWl, setCreatingWl] = useState(false);

  // Create alert states
  const [alertSymbol, setAlertSymbol] = useState("");
  const [alertType, setAlertType] = useState("price");
  const [alertCondition, setAlertCondition] = useState("above");
  const [alertValue, setAlertValue] = useState("");
  const [creatingAlert, setCreatingAlert] = useState(false);

  const fetchWatchlistData = async () => {
    try {
      const [wlRes, alertsRes] = await Promise.all([
        api.get<Watchlist[]>("/watchlists"),
        api.get<AlertItem[]>("/watchlists/alerts"),
      ]);

      setWatchlists(wlRes);
      setAlerts(alertsRes);

      // Collect all unique symbols to query quotes
      const allSymbols = new Set<string>();
      wlRes.forEach(wl => wl.symbols.forEach(sym => allSymbols.add(sym)));
      alertsRes.forEach(al => allSymbols.add(al.symbol));

      // Fetch quote for each symbol asynchronously
      const quotePromises = Array.from(allSymbols).map(async (sym) => {
        try {
          const q = await api.get<TickerQuote>(`/stock/${sym}/quote`);
          return { symbol: sym, data: q };
        } catch (e) {
          return { symbol: sym, data: null };
        }
      });

      const quoteResults = await Promise.all(quotePromises);
      const quotesMap: Record<string, TickerQuote> = {};
      quoteResults.forEach(r => {
        if (r.data) quotesMap[r.symbol] = r.data;
      });
      setQuotes(quotesMap);

    } catch (e: any) {
      setError(e.message || "Failed to load watchlists / alert indicators");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWatchlistData();
  }, []);

  const handleCreateWatchlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wlName.trim()) return;
    setCreatingWl(true);
    
    // Parse symbols
    const symbolsArr = wlSymbols
      .split(",")
      .map(s => s.trim().toUpperCase())
      .filter(s => s.length > 0);

    try {
      await api.post("/watchlists/create", {
        name: wlName.trim(),
        symbols: symbolsArr
      });
      setWlName("");
      setWlSymbols("");
      setLoading(true);
      await fetchWatchlistData();
    } catch (err: any) {
      setError(err.message || "Failed to create watchlist");
    } finally {
      setCreatingWl(false);
    }
  };

  const handleDeleteWatchlist = async (id: string) => {
    if (!confirm("Are you sure you want to delete this watchlist?")) return;
    try {
      await api.delete(`/watchlists/${id}`);
      setLoading(true);
      await fetchWatchlistData();
    } catch (err: any) {
      setError(err.message || "Failed to delete watchlist");
    }
  };

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertSymbol.trim() || !alertValue) return;
    setCreatingAlert(true);

    try {
      await api.post("/watchlists/alerts/create", {
        symbol: alertSymbol.trim().toUpperCase(),
        alert_type: alertType,
        condition: alertCondition,
        target_value: parseFloat(alertValue)
      });
      setAlertSymbol("");
      setAlertValue("");
      setLoading(true);
      await fetchWatchlistData();
    } catch (err: any) {
      setError(err.message || "Failed to set alert trigger");
    } finally {
      setCreatingAlert(false);
    }
  };

  const handleDeleteAlert = async (id: string) => {
    try {
      await api.delete(`/watchlists/alerts/${id}`);
      setLoading(true);
      await fetchWatchlistData();
    } catch (err: any) {
      setError(err.message || "Failed to remove alert");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center bg-[#04060d]">
        <div className="text-center space-y-3">
          <RefreshCw className="h-8 w-8 animate-spin text-indigo-500 mx-auto" />
          <p className="text-slate-400 text-sm">Synchronizing watchlist indexes and trigger thresholds...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 bg-[#04060d] space-y-8 relative">
      <div className="glow-bg top-0 left-10" />

      {/* Header */}
      <div className="relative z-10">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Watchlist & Alerts</h1>
        <p className="text-slate-400 text-sm mt-1">Configure active pricing trigger thresholds and manage custom watchlists.</p>
      </div>

      {error && (
        <div className="flex items-center space-x-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 p-4 rounded-xl relative z-10">
          <ShieldAlert className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
        
        {/* Watchlist Section: Left 2 Columns */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Create Watchlist Card */}
          <div className="glass p-6 rounded-2xl space-y-4">
            <h3 className="text-md font-bold text-white border-b border-[rgba(255,255,255,0.06)] pb-2 flex items-center space-x-1.5">
              <Plus className="h-4.5 w-4.5 text-indigo-400" />
              <span>Create Watchlist</span>
            </h3>
            <form onSubmit={handleCreateWatchlist} className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="sm:col-span-1">
                <label className="block text-slate-400 mb-1 font-semibold uppercase">Watchlist Name</label>
                <input
                  type="text"
                  required
                  placeholder="My Watchlist"
                  value={wlName}
                  onChange={(e) => setWlName(e.target.value)}
                  className="w-full bg-slate-900 border border-[rgba(255,255,255,0.08)] rounded p-2 text-white"
                />
              </div>
              <div className="sm:col-span-1">
                <label className="block text-slate-400 mb-1 font-semibold uppercase">Symbols (comma separated)</label>
                <input
                  type="text"
                  placeholder="TCS, INFY, RELIANCE"
                  value={wlSymbols}
                  onChange={(e) => setWlSymbols(e.target.value)}
                  className="w-full bg-slate-900 border border-[rgba(255,255,255,0.08)] rounded p-2 text-white"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={creatingWl}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded transition-all cursor-pointer text-sm"
                >
                  {creatingWl ? "Creating..." : "Create Watchlist"}
                </button>
              </div>
            </form>
          </div>

          {/* List Watchlists */}
          {watchlists.length === 0 ? (
            <div className="glass p-8 rounded-2xl text-center text-slate-400">
              <Eye className="h-10 w-10 text-slate-600 mx-auto mb-2" />
              <p className="text-sm">You have not created any watchlists yet.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {watchlists.map((wl) => (
                <div key={wl.id} className="glass p-6 rounded-2xl space-y-4">
                  <div className="flex justify-between items-center border-b border-[rgba(255,255,255,0.06)] pb-2.5">
                    <h4 className="text-md font-bold text-white flex items-center space-x-1.5">
                      <Eye className="h-4.5 w-4.5 text-indigo-400" />
                      <span>{wl.name} ({wl.symbols.length} Assets)</span>
                    </h4>
                    <button
                      onClick={() => handleDeleteWatchlist(wl.id)}
                      className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {wl.symbols.map((sym) => {
                      const q = quotes[sym];
                      const isBullish = q ? q.change_percent >= 0 : true;
                      return (
                        <div key={sym} className="p-4 rounded-xl bg-slate-900/40 border border-[rgba(255,255,255,0.06)] flex justify-between items-center">
                          <div>
                            <Link href={`/stock/${sym}`} className="text-sm font-bold text-indigo-400 hover:underline">
                              {sym}
                            </Link>
                            {q ? (
                              <span className="text-[10px] text-slate-400 block mt-0.5">Live Price</span>
                            ) : (
                              <span className="text-[10px] text-slate-500 block mt-0.5">Fetching feed...</span>
                            )}
                          </div>
                          {q && (
                            <div className="text-right">
                              <span className="text-sm font-bold text-slate-200">₹{q.price.toFixed(1)}</span>
                              <span className={`flex items-center text-[10px] font-semibold mt-0.5 ${isBullish ? "text-emerald-400" : "text-red-400"}`}>
                                {isBullish ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
                                <span>{isBullish ? "+" : ""}{q.change_percent.toFixed(2)}%</span>
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Alerts Section: Right Column */}
        <div className="space-y-8">
          
          {/* Create Alert Form */}
          <div className="glass p-6 rounded-2xl space-y-4">
            <h3 className="text-md font-bold text-white border-b border-[rgba(255,255,255,0.06)] pb-2 flex items-center space-x-1.5">
              <Bell className="h-4.5 w-4.5 text-indigo-400" />
              <span>Set Price Alert</span>
            </h3>
            <form onSubmit={handleCreateAlert} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold uppercase">Stock Symbol</label>
                <input
                  type="text"
                  required
                  placeholder="TCS"
                  value={alertSymbol}
                  onChange={(e) => setAlertSymbol(e.target.value)}
                  className="w-full bg-slate-900 border border-[rgba(255,255,255,0.08)] rounded p-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold uppercase">Alert Type</label>
                  <select
                    value={alertType}
                    onChange={(e) => setAlertType(e.target.value)}
                    className="w-full bg-slate-900 border border-[rgba(255,255,255,0.08)] rounded p-2 text-white"
                  >
                    <option value="price">Price Alert</option>
                    <option value="technical">Indicators Alert</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold uppercase">Condition</label>
                  <select
                    value={alertCondition}
                    onChange={(e) => setAlertCondition(e.target.value)}
                    className="w-full bg-slate-900 border border-[rgba(255,255,255,0.08)] rounded p-2 text-white"
                  >
                    <option value="above">Above (&gt;)</option>
                    <option value="below">Below (&lt;)</option>
                    <option value="crossover">Crossover</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold uppercase">Target Value (Price / RSI)</label>
                <input
                  type="number"
                  required
                  placeholder="3450"
                  value={alertValue}
                  onChange={(e) => setAlertValue(e.target.value)}
                  className="w-full bg-slate-900 border border-[rgba(255,255,255,0.08)] rounded p-2 text-white font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={creatingAlert}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded transition-all cursor-pointer text-xs uppercase tracking-wider"
              >
                {creatingAlert ? "Setting alert..." : "Activate Alert"}
              </button>
            </form>
          </div>

          {/* Active Alerts List */}
          <div className="glass p-6 rounded-2xl space-y-4">
            <h3 className="text-md font-bold text-white border-b border-[rgba(255,255,255,0.06)] pb-2">
              Active Trigger Monitors ({alerts.length})
            </h3>
            {alerts.length === 0 ? (
              <p className="text-slate-400 text-xs text-center py-4">No active price alert rules configured.</p>
            ) : (
              <div className="space-y-3">
                {alerts.map((al) => (
                  <div key={al.id} className="p-3 rounded-xl bg-slate-900/40 border border-[rgba(255,255,255,0.06)] flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-indigo-400">{al.symbol}</span>
                      <span className="text-slate-400 ml-2">
                        {al.alert_type} {al.condition} ₹{al.target_value}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteAlert(al.id)}
                      className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Regulatory Notice Footer */}
      <div className="glass p-6 rounded-2xl relative z-10 bg-slate-950/40 border-[rgba(255,255,255,0.06)]">
        <div className="flex flex-col space-y-2">
          <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider block leading-none">Regulatory Notice</span>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            MarketMind AI provides analytical insights and does not guarantee future market performance or investment outcomes. All reports, scores, ratings, and rankings are for educational and analytical purposes only. Invest at your own risk.
          </p>
        </div>
      </div>
    </div>
  );
}
