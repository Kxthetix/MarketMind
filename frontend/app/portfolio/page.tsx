"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Briefcase, AlertTriangle, Plus, Trash2, PieChart, TrendingUp, RefreshCw, CheckCircle, ShieldAlert } from "lucide-react";

interface HoldingInput {
  symbol: string;
  shares: number;
  avg_price: number;
}

interface EvaluatedHolding {
  symbol: string;
  shares: number;
  avg_price: number;
  live_price: number;
  cost_basis: number;
  current_value: number;
  pnl: number;
  pnl_percent: number;
  sector: string;
}

interface AllocationItem {
  symbol: string;
  allocation_percent: number;
  current_value: number;
}

interface SectorConcentrationItem {
  sector: string;
  allocation_percent: number;
  value: number;
}

interface PortfolioAnalysis {
  total_value: number;
  holdings: EvaluatedHolding[];
  diversification: AllocationItem[];
  sector_concentration: SectorConcentrationItem[];
  risk_exposure: {
    beta: number;
    risk_rating: string;
  };
  suggestions: string[];
}

export default function PortfolioPage() {
  const [analysis, setAnalysis] = useState<PortfolioAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Holdings Editor inputs
  const [showEditor, setShowEditor] = useState(false);
  const [editorHoldings, setEditorHoldings] = useState<HoldingInput[]>([]);
  const [newSymbol, setNewSymbol] = useState("");
  const [newShares, setNewShares] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchPortfolioAnalysis = async () => {
    try {
      const res = await api.get<PortfolioAnalysis>("/portfolio/analysis");
      setAnalysis(res);
      
      // Sync editor holdings
      const inputs = res.holdings.map(h => ({
        symbol: h.symbol,
        shares: h.shares,
        avg_price: h.avg_price
      }));
      setEditorHoldings(inputs);
    } catch (e: any) {
      setError(e.message || "Failed to load portfolio metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolioAnalysis();
  }, []);

  const handleAddRow = () => {
    if (newSymbol && newShares && newPrice) {
      setEditorHoldings([
        ...editorHoldings,
        {
          symbol: newSymbol.trim().toUpperCase(),
          shares: parseInt(newShares),
          avg_price: parseFloat(newPrice)
        }
      ]);
      setNewSymbol("");
      setNewShares("");
      setNewPrice("");
    }
  };

  const handleRemoveRow = (index: number) => {
    setEditorHoldings(editorHoldings.filter((_, i) => i !== index));
  };

  const handleSaveHoldings = async () => {
    setSaving(true);
    setError("");
    try {
      await api.post("/portfolio/update", {
        name: "My First Portfolio",
        holdings: editorHoldings
      });
      setShowEditor(false);
      setLoading(true);
      await fetchPortfolioAnalysis();
    } catch (err: any) {
      setError(err.message || "Failed to update holdings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center bg-[#04060d]">
        <div className="text-center space-y-3">
          <RefreshCw className="h-8 w-8 animate-spin text-indigo-500 mx-auto" />
          <p className="text-slate-400 text-sm">Evaluating sector diversification & portfolio Beta...</p>
        </div>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 bg-[#04060d]">
        <div className="glass p-8 rounded-2xl border-red-500/20 text-center max-w-lg mx-auto space-y-4">
          <ShieldAlert className="h-12 w-12 text-red-400 mx-auto" />
          <h3 className="text-lg font-bold text-white">Evaluation Failed</h3>
          <p className="text-slate-400 text-sm">{error || "Unable to retrieve user portfolio."}</p>
          <button
            onClick={() => { setLoading(true); fetchPortfolioAnalysis(); }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition-all cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const { total_value, holdings, diversification, sector_concentration, risk_exposure, suggestions } = analysis;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 bg-[#04060d] space-y-8 relative">
      <div className="glow-bg top-0 right-10" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0 relative z-10">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Portfolio Intelligence</h1>
          <p className="text-slate-400 text-sm mt-1">Diversification ratios, sector concentration, and automated rebalancing suggestions.</p>
        </div>
        <button
          onClick={() => setShowEditor(!showEditor)}
          className="px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold flex items-center space-x-1.5 transition-all cursor-pointer"
        >
          <Briefcase className="h-4.5 w-4.5" />
          <span>{showEditor ? "View Dashboard" : "Connect holdings"}</span>
        </button>
      </div>

      {showEditor ? (
        /* Holdings Editor Panel */
        <div className="glass p-8 rounded-2xl relative z-10 max-w-3xl mx-auto space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white">Manage Stock Holdings</h3>
            <p className="text-xs text-slate-400 mt-1">Update your assets details to run structural risk analysis checks.</p>
          </div>

          <div className="space-y-4">
            {/* Form list */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="text-slate-500 border-b border-[rgba(255,255,255,0.04)] font-semibold uppercase">
                    <th className="py-2">Symbol</th>
                    <th className="py-2">Qty Shares</th>
                    <th className="py-2">Buy Price (INR)</th>
                    <th className="py-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(255,255,255,0.04)]">
                  {editorHoldings.map((h, i) => (
                    <tr key={i}>
                      <td className="py-3 font-semibold text-slate-200">{h.symbol}</td>
                      <td className="py-3 text-slate-300 font-mono">{h.shares}</td>
                      <td className="py-3 text-slate-300 font-mono">₹{h.avg_price.toFixed(2)}</td>
                      <td className="py-3 text-center">
                        <button
                          onClick={() => handleRemoveRow(i)}
                          className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  
                  {/* Add New Input Row */}
                  <tr>
                    <td className="py-3 pr-2">
                      <input
                        type="text"
                        placeholder="RELIANCE"
                        value={newSymbol}
                        onChange={(e) => setNewSymbol(e.target.value)}
                        className="w-full bg-slate-900 border border-[rgba(255,255,255,0.08)] rounded p-1.5 text-xs text-white"
                      />
                    </td>
                    <td className="py-3 pr-2">
                      <input
                        type="number"
                        placeholder="10"
                        value={newShares}
                        onChange={(e) => setNewShares(e.target.value)}
                        className="w-full bg-slate-900 border border-[rgba(255,255,255,0.08)] rounded p-1.5 text-xs text-white font-mono"
                      />
                    </td>
                    <td className="py-3 pr-2">
                      <input
                        type="number"
                        placeholder="2450"
                        value={newPrice}
                        onChange={(e) => setNewPrice(e.target.value)}
                        className="w-full bg-slate-900 border border-[rgba(255,255,255,0.08)] rounded p-1.5 text-xs text-white font-mono"
                      />
                    </td>
                    <td className="py-3 text-center">
                      <button
                        onClick={handleAddRow}
                        className="p-1.5 rounded bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-600 hover:text-white cursor-pointer"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-[rgba(255,255,255,0.06)]">
              <button
                onClick={() => setShowEditor(false)}
                className="px-4 py-2 rounded-lg border border-[rgba(255,255,255,0.06)] hover:bg-slate-800 text-slate-300 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveHoldings}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
              >
                {saving ? "Saving Changes..." : "Save Holdings"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Dashboard Dashboard Display */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
          
          {/* Left Columns: Holdings and Suggestions */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Total Value overview */}
            <div className="glass p-6 rounded-2xl flex justify-between items-center h-28">
              <div>
                <span className="text-xs text-slate-400 font-semibold uppercase">Portfolio Asset Value</span>
                <h2 className="text-3xl font-extrabold text-white mt-1">
                  ₹{total_value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </h2>
              </div>
              <span className="h-12 w-12 rounded-xl bg-indigo-600/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                <PieChart className="h-6 w-6" />
              </span>
            </div>

            {/* Holdings list table */}
            <div className="glass p-6 rounded-2xl space-y-4">
              <h3 className="text-lg font-bold text-white border-b border-[rgba(255,255,255,0.06)] pb-2">
                Active Positions ({holdings.length})
              </h3>
              {holdings.length === 0 ? (
                <p className="text-slate-400 text-sm">You currently have no recorded assets. Click "Connect holdings" to get started.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="text-slate-500 border-b border-[rgba(255,255,255,0.04)] font-semibold uppercase tracking-wider">
                        <th className="py-2">Symbol</th>
                        <th className="py-2">Sector</th>
                        <th className="py-2 text-right">Shares</th>
                        <th className="py-2 text-right">Buy / Live Price</th>
                        <th className="py-2 text-right">Total Value</th>
                        <th className="py-2 text-right">Gain / Loss</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[rgba(255,255,255,0.04)]">
                      {holdings.map((h) => {
                        const isGain = h.pnl >= 0;
                        return (
                          <tr key={h.symbol} className="hover:bg-slate-800/10 transition-all font-mono">
                            <td className="py-3 font-semibold text-slate-200 font-sans">{h.symbol}</td>
                            <td className="py-3 text-slate-400 font-sans">{h.sector}</td>
                            <td className="py-3 text-right text-slate-300">{h.shares}</td>
                            <td className="py-3 text-right text-slate-300">
                              ₹{h.avg_price.toFixed(1)} / <span className="font-bold">₹{h.live_price.toFixed(1)}</span>
                            </td>
                            <td className="py-3 text-right text-slate-100">
                              ₹{h.current_value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                            </td>
                            <td className={`py-3 text-right font-bold ${isGain ? "text-emerald-400" : "text-red-400"}`}>
                              {isGain ? "+" : ""}₹{h.pnl.toLocaleString("en-IN", { maximumFractionDigits: 0 })} ({isGain ? "+" : ""}{h.pnl_percent}%)
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Rebalancing suggestions list */}
            <div className="glass p-6 rounded-2xl space-y-4">
              <h3 className="text-lg font-bold text-white border-b border-[rgba(255,255,255,0.06)] pb-2 flex items-center space-x-1.5">
                <AlertTriangle className="h-5 w-5 text-indigo-400" />
                <span>Rebalancing Suggestions</span>
              </h3>
              <div className="space-y-3">
                {suggestions.map((sug, i) => {
                  const isNeutral = sug.includes("well-balanced");
                  return (
                    <div key={i} className={`p-4 rounded-xl border flex items-start space-x-3 text-sm ${
                      isNeutral 
                        ? "bg-indigo-500/5 border-indigo-500/15 text-indigo-300"
                        : "bg-amber-500/5 border-amber-500/15 text-amber-300"
                    }`}>
                      {isNeutral ? (
                        <CheckCircle className="h-5 w-5 shrink-0 text-indigo-400" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400" />
                      )}
                      <span>{sug}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Diversification & Risk details */}
          <div className="space-y-8">
            {/* Risk profile card */}
            <div className="glass p-6 rounded-2xl space-y-3">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">PORTFOLIO RISK PROFILE</span>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-medium">Weighted Beta Coefficient</span>
                <span className="text-3xl font-extrabold text-white font-mono mt-0.5 block">{risk_exposure.beta.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-medium">Systemic Risk Rating</span>
                <span className="text-sm font-semibold text-indigo-400 mt-0.5 block">{risk_exposure.risk_rating}</span>
              </div>
              <p className="text-[10px] text-slate-500 pt-1 leading-normal">
                Beta coefficients verify exposure against the Nifty 50 benchmark index (Nifty 50 Beta = 1.0).
              </p>
            </div>

            {/* Asset Diversification */}
            <div className="glass p-6 rounded-2xl space-y-4">
              <h3 className="text-lg font-bold text-white border-b border-[rgba(255,255,255,0.06)] pb-2">
                Asset Diversification
              </h3>
              {diversification.length === 0 ? (
                <p className="text-slate-400 text-xs">No allocations calculated.</p>
              ) : (
                <div className="space-y-3 text-xs">
                  {diversification.map((item) => (
                    <div key={item.symbol} className="space-y-1">
                      <div className="flex justify-between items-center text-slate-300">
                        <span className="font-semibold">{item.symbol}</span>
                        <span className="font-mono font-medium">{item.allocation_percent}% (₹{item.current_value.toLocaleString(undefined, { maximumFractionDigits: 0 })})</span>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${item.allocation_percent}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sector concentrations */}
            <div className="glass p-6 rounded-2xl space-y-4">
              <h3 className="text-lg font-bold text-white border-b border-[rgba(255,255,255,0.06)] pb-2">
                Sector Concentration
              </h3>
              {sector_concentration.length === 0 ? (
                <p className="text-slate-400 text-xs">No allocations calculated.</p>
              ) : (
                <div className="space-y-3 text-xs">
                  {sector_concentration.map((item) => (
                    <div key={item.sector} className="space-y-1">
                      <div className="flex justify-between items-center text-slate-300">
                        <span className="font-semibold">{item.sector}</span>
                        <span className="font-mono font-medium">{item.allocation_percent}%</span>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-yellow-500 h-full rounded-full" style={{ width: `${item.allocation_percent}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
