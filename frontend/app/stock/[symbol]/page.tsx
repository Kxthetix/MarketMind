"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import StockChart from "@/components/StockChart";
import { 
  RefreshCw, Search, ArrowUpRight, ArrowDownRight, Compass, 
  ShieldAlert, BarChart3, HelpCircle, Sparkles, Brain, Check, Copy, X 
} from "lucide-react";

interface IndicatorItem {
  value: number;
  description: string;
}

interface MovingAveragesSummary {
  sma_20: number;
  sma_50: number;
  sma_200: number;
}

interface EMAMovingAveragesSummary {
  ema_20: number;
  ema_50: number;
  ema_200: number;
}

interface AnalysisData {
  symbol: string;
  indicators: {
    price: number;
    open: number;
    high: number;
    low: number;
    volume: number;
    trend: string;
    rsi: IndicatorItem;
    macd: {
      line: number;
      signal: number;
      histogram: number;
      description: string;
    };
    sma: MovingAveragesSummary;
    ema: EMAMovingAveragesSummary;
    vwap: number;
    atr: number;
  };
  support_resistance: {
    supports: { price: number; confidence_score: number; strength: string }[];
    resistances: { price: number; confidence_score: number; strength: string }[];
    fibonacci_levels: Record<string, number>;
  };
  candlestick_patterns: {
    day: string;
    pattern: string;
    sentiment: string;
    explanation: string;
  }[];
}

interface QuoteData {
  price: number;
  change: number;
  change_percent: number;
}

interface ChartItem {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface ResearchResponse {
  symbol: string;
  report_markdown: string;
}

// Custom parser to format and render stock reports beautifully in obsidian theme
export function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split("\n");
  let inList = false;
  const listItems: string[] = [];
  const renderedElements: React.ReactNode[] = [];

  const parseInline = (text: string) => {
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return <strong key={i} className="text-white font-bold">{part}</strong>;
      }
      return part;
    });
  };

  const flushList = (key: number) => {
    if (listItems.length > 0) {
      renderedElements.push(
        <ul key={`list-${key}`} className="list-disc pl-5 space-y-1.5 my-3 text-slate-300">
          {listItems.map((item, idx) => (
            <li key={idx} className="text-sm leading-relaxed">{parseInline(item)}</li>
          ))}
        </ul>
      );
      listItems.length = 0;
    }
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      inList = true;
      listItems.push(trimmed.substring(2));
    } else {
      if (inList) {
        flushList(idx);
        inList = false;
      }
      
      if (trimmed.startsWith("### ")) {
        renderedElements.push(
          <h4 key={idx} className="text-sm font-bold text-slate-200 mt-4 mb-2 flex items-center uppercase tracking-wider">
            {parseInline(trimmed.substring(4))}
          </h4>
        );
      } else if (trimmed.startsWith("## ")) {
        renderedElements.push(
          <h3 key={idx} className="text-base font-bold text-indigo-400 mt-6 mb-3 border-b border-slate-800 pb-1.5">
            {parseInline(trimmed.substring(3))}
          </h3>
        );
      } else if (trimmed.startsWith("# ")) {
        renderedElements.push(
          <h2 key={idx} className="text-lg font-extrabold text-white mt-6 mb-4 border-b border-indigo-500/20 pb-2">
            {parseInline(trimmed.substring(2))}
          </h2>
        );
      } else if (trimmed === "") {
        // Empty space separator
      } else {
        renderedElements.push(
          <p key={idx} className="text-sm text-slate-300 leading-relaxed my-2">
            {parseInline(trimmed)}
          </p>
        );
      }
    }
  });

  if (inList) {
    flushList(lines.length);
  }

  return <div className="space-y-1">{renderedElements}</div>;
}

export default function StockAnalysisPage({ params }: { params: Promise<{ symbol: string }> }) {
  const resolvedParams = use(params);
  const currentSymbol = resolvedParams.symbol.toUpperCase();
  const router = useRouter();

  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [chartData, setChartData] = useState<ChartItem[]>([]);
  const [searchVal, setSearchVal] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // AI Report States
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportStep, setReportStep] = useState(1);
  const [reportContent, setReportContent] = useState("");
  const [reportError, setReportError] = useState("");
  const [copied, setCopied] = useState(false);

  const loadStockData = async () => {
    setError("");
    try {
      const [analysisRes, quoteRes, chartRes] = await Promise.all([
        api.get<AnalysisData>(`/stock/${currentSymbol}/analysis`),
        api.get<QuoteData>(`/stock/${currentSymbol}/quote`),
        api.get<ChartItem[]>(`/stock/${currentSymbol}/historical?period=1y&interval=1d`),
      ]);

      setAnalysis(analysisRes);
      setQuote(quoteRes);
      setChartData(chartRes);
    } catch (e: any) {
      setError(e.message || "Failed to retrieve stock analysis");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadStockData();
  }, [currentSymbol]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchVal.trim()) {
      router.push(`/stock/${searchVal.trim().toUpperCase()}`);
      setSearchVal("");
    }
  };

  const generateReport = async () => {
    setIsReportOpen(true);
    setReportLoading(true);
    setReportStep(1);
    setReportContent("");
    setReportError("");
    setCopied(false);

    // Increment loading steps sequentially to mimic multi-agent workflow nodes
    const stepInterval = setInterval(() => {
      setReportStep((prev) => (prev < 5 ? prev + 1 : 5));
    }, 1500);

    try {
      const response = await api.post<ResearchResponse>("/analysis/research", {
        symbol: currentSymbol,
      });
      setReportContent(response.report_markdown);
    } catch (e: any) {
      setReportError(e.message || "Failed to generate AI intelligence report");
    } finally {
      clearInterval(stepInterval);
      setReportLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (reportContent) {
      navigator.clipboard.writeText(reportContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Helper to calculate SMA for TradingView Chart overlay
  const getSMAOverlay = (period: number) => {
    if (chartData.length === 0) return [];
    const sma = [];
    for (let i = 0; i < chartData.length; i++) {
      if (i < period - 1) continue;
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += chartData[i - j].close;
      }
      sma.push({ time: chartData[i].time, value: sum / period });
    }
    return sma;
  };

  if (loading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center bg-[#04060d]">
        <div className="text-center space-y-3">
          <RefreshCw className="h-8 w-8 animate-spin text-indigo-500 mx-auto" />
          <p className="text-slate-400 text-sm">Computing moving averages & support zones...</p>
        </div>
      </div>
    );
  }

  if (error || !analysis || !quote) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 bg-[#04060d]">
        <div className="glass p-8 rounded-2xl border-red-500/20 text-center max-w-lg mx-auto space-y-4">
          <ShieldAlert className="h-12 w-12 text-red-400 mx-auto" />
          <h3 className="text-lg font-bold text-white">Stock Lookup Failed</h3>
          <p className="text-slate-400 text-sm">{error || "Unable to fetch requested asset indicators."}</p>
          <div className="flex justify-center space-x-3">
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-lg text-sm font-semibold transition-all"
            >
              Dashboard
            </Link>
            <button
              onClick={() => { setLoading(true); loadStockData(); }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition-all cursor-pointer"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { indicators, support_resistance, candlestick_patterns } = analysis;
  const isBullish = quote.change >= 0;

  // Multi-agent workflow descriptions
  const agentSteps = [
    { label: "Market Data Agent", desc: "Crawling historical price feed & indexing news headlines..." },
    { label: "Technical Analyst Agent", desc: "Running SMA/EMA momentum models and calculating oscillators..." },
    { label: "Sentiment Agent", desc: "Reading sentiment scores & evaluating social broker updates..." },
    { label: "Risk Auditor Agent", desc: "Running volatility simulations & calculating position allocations..." },
    { label: "Research compiler Agent", desc: "Synthesizing full multi-agent summary and generating scenario reports..." },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 bg-[#04060d] space-y-8 relative">
      <div className="glow-bg top-0 right-10" />

      {/* Toolbar Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0 relative z-10 gap-4">
        {/* Quote detail */}
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">{currentSymbol}</h1>
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">NSE / BSE India</span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-white">
              ₹{quote.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
            <span className={`inline-flex items-center text-sm font-semibold ${isBullish ? "text-emerald-400" : "text-red-400"}`}>
              {isBullish ? <ArrowUpRight className="h-4 w-4 mr-0.5" /> : <ArrowDownRight className="h-4 w-4 mr-0.5" />}
              <span>{isBullish ? "+" : ""}{quote.change.toFixed(2)} ({isBullish ? "+" : ""}{quote.change_percent.toFixed(2)}%)</span>
            </span>
          </div>
        </div>

        {/* Actions (AI Report & Search) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          {/* AI Report Trigger */}
          <button
            onClick={generateReport}
            className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-semibold text-sm shadow-[0_0_15px_rgba(99,102,241,0.25)] hover:shadow-[0_0_25px_rgba(6,182,212,0.4)] border border-indigo-400/20 active:scale-95 transition-all cursor-pointer"
          >
            <Sparkles className="h-4 w-4 text-cyan-200 animate-pulse" />
            <span>AI Intelligence Report</span>
          </button>

          {/* Search */}
          <form onSubmit={handleSearch} className="w-full sm:w-80">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-5 w-5 text-slate-500" />
              </div>
              <input
                type="text"
                placeholder="Search ticker (e.g. TCS, INFY)"
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                className="block w-full rounded-lg border border-[rgba(255,255,255,0.08)] bg-slate-900/40 py-2.5 pl-10 pr-3 text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm transition-all"
              />
            </div>
          </form>
        </div>
      </div>

      {/* Main Grid Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
        
        {/* Left 2 Columns: Chart and Pattern analysis */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Chart */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs text-slate-400 px-1">
              <span>INTERACTIVE PRICE & VOLUME CHART</span>
              <span className="flex items-center space-x-1.5">
                <span className="h-2 w-2 rounded-full bg-indigo-500" /> <span>SMA 20</span>
                <span className="h-2 w-2 rounded-full bg-yellow-500" /> <span>SMA 50</span>
                <span className="h-2 w-2 rounded-full bg-pink-500" /> <span>SMA 200</span>
              </span>
            </div>
            <StockChart
              data={chartData}
              sma20={getSMAOverlay(20)}
              sma50={getSMAOverlay(50)}
              sma200={getSMAOverlay(200)}
            />
          </div>

          {/* Support and Resistance card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass p-6 rounded-2xl space-y-4">
              <h3 className="text-lg font-bold text-white border-b border-[rgba(255,255,255,0.06)] pb-2 flex items-center space-x-1.5">
                <Compass className="h-5 w-5 text-indigo-400" />
                <span>Support & Resistance Zones</span>
              </h3>
              <div className="space-y-3">
                <div className="space-y-2">
                  <span className="text-xs text-slate-400 font-semibold uppercase">Resistances (Ceilings)</span>
                  {support_resistance.resistances.map((lvl, index) => (
                    <div key={index} className="flex justify-between items-center bg-red-500/5 border border-red-500/10 p-2.5 rounded-lg text-sm">
                      <span className="font-semibold text-slate-200">R{index+1}: ₹{lvl.price}</span>
                      <span className="text-xs text-red-400 font-medium">Confidence: {Math.round(lvl.confidence_score * 100)}% ({lvl.strength})</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-2 pt-2">
                  <span className="text-xs text-slate-400 font-semibold uppercase">Supports (Floors)</span>
                  {support_resistance.supports.map((lvl, index) => (
                    <div key={index} className="flex justify-between items-center bg-emerald-500/5 border border-emerald-500/10 p-2.5 rounded-lg text-sm">
                      <span className="font-semibold text-slate-200">S{index+1}: ₹{lvl.price}</span>
                      <span className="text-xs text-emerald-400 font-medium">Confidence: {Math.round(lvl.confidence_score * 100)}% ({lvl.strength})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Fibonacci levels */}
            <div className="glass p-6 rounded-2xl space-y-4">
              <h3 className="text-lg font-bold text-white border-b border-[rgba(255,255,255,0.06)] pb-2">
                Fibonacci Levels (6M Range)
              </h3>
              <div className="space-y-2 text-sm">
                {Object.entries(support_resistance.fibonacci_levels).map(([ratio, price]) => (
                  <div key={ratio} className="flex justify-between items-center py-1.5 border-b border-[rgba(255,255,255,0.03)] last:border-0">
                    <span className="text-slate-400">{ratio}% Retracement</span>
                    <span className="font-mono text-slate-200 font-semibold">₹{price.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Candlestick recognition */}
          <div className="glass p-6 rounded-2xl space-y-4">
            <h3 className="text-lg font-bold text-white border-b border-[rgba(255,255,255,0.06)] pb-2">
              Recognized Candlestick Patterns (Last 3 Days)
            </h3>
            {candlestick_patterns.length === 0 ? (
              <p className="text-slate-400 text-sm">No significant patterns identified in the immediate sessions.</p>
            ) : (
              <div className="space-y-4">
                {candlestick_patterns.map((pat, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-900/40 border border-[rgba(255,255,255,0.06)] space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{pat.day}</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                        pat.sentiment === "Bullish" ? "bg-emerald-500/10 text-emerald-400" : pat.sentiment === "Bearish" ? "bg-red-500/10 text-red-400" : "bg-slate-500/10 text-slate-400"
                      }`}>
                        {pat.pattern} ({pat.sentiment})
                      </span>
                    </div>
                    <p className="text-slate-300 text-sm font-medium">{pat.explanation}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Column: Sidebar Metrics, MA and Oscillators */}
        <div className="space-y-8">
          
          {/* Trend Summary */}
          <div className="glass p-6 rounded-2xl space-y-3">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">TREND RATING</span>
            <div className="flex items-baseline space-x-2">
              <span className={`text-2xl font-extrabold ${
                indicators.trend.includes("Bullish") ? "text-emerald-400" : indicators.trend.includes("Bearish") ? "text-red-400" : "text-yellow-400"
              }`}>
                {indicators.trend}
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed pt-1">
              Derived from SMA and EMA momentum crossovers. Moving averages help filters minor price fluctuations.
            </p>
          </div>

          {/* moving averages details */}
          <div className="glass p-6 rounded-2xl space-y-4">
            <h3 className="text-lg font-bold text-white border-b border-[rgba(255,255,255,0.06)] pb-2">
              Moving Averages Detail
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">SMA 20 (Short-term)</span>
                <span className="font-semibold text-slate-200 font-mono">₹{indicators.sma.sma_20.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">SMA 50 (Mid-term)</span>
                <span className="font-semibold text-slate-200 font-mono">₹{indicators.sma.sma_50.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">SMA 200 (Long-term)</span>
                <span className="font-semibold text-slate-200 font-mono">₹{indicators.sma.sma_200.toFixed(2)}</span>
              </div>
              <hr className="border-[rgba(255,255,255,0.06)] my-2" />
              <div className="flex justify-between items-center">
                <span className="text-slate-400">EMA 20</span>
                <span className="font-semibold text-slate-200 font-mono">₹{indicators.ema.ema_20.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">EMA 50</span>
                <span className="font-semibold text-slate-200 font-mono">₹{indicators.ema.ema_50.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">EMA 200</span>
                <span className="font-semibold text-slate-200 font-mono">₹{indicators.ema.ema_200.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Technical Oscillators details */}
          <div className="glass p-6 rounded-2xl space-y-4">
            <h3 className="text-lg font-bold text-white border-b border-[rgba(255,255,255,0.06)] pb-2 flex items-center space-x-1.5">
              <BarChart3 className="h-5 w-5 text-indigo-400" />
              <span>Technical Oscillators</span>
            </h3>
            <div className="space-y-4 text-sm">
              {/* RSI */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">RSI (14 Days)</span>
                  <span className="font-bold text-slate-200 font-mono">{indicators.rsi.value.toFixed(2)}</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-[rgba(255,255,255,0.04)]">
                  <div
                    className={`h-full rounded-full ${
                      indicators.rsi.value >= 70 ? "bg-red-500" : indicators.rsi.value <= 30 ? "bg-emerald-500" : "bg-indigo-500"
                    }`}
                    style={{ width: `${indicators.rsi.value}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-500 block uppercase font-medium">{indicators.rsi.description}</span>
              </div>

              {/* MACD */}
              <div className="space-y-1.5 pt-2 border-t border-[rgba(255,255,255,0.03)]">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">MACD Histogram</span>
                  <span className={`font-semibold font-mono ${indicators.macd.histogram >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {indicators.macd.histogram.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Line: {indicators.macd.line.toFixed(2)}</span>
                  <span>Signal: {indicators.macd.signal.toFixed(2)}</span>
                </div>
                <span className="text-[10px] text-slate-500 block uppercase font-medium">{indicators.macd.description}</span>
              </div>

              {/* VWAP */}
              <div className="flex justify-between items-center pt-2.5 border-t border-[rgba(255,255,255,0.03)]">
                <span className="text-slate-400">VWAP (Daily cumulative)</span>
                <span className="font-semibold text-slate-200 font-mono">₹{indicators.vwap.toFixed(2)}</span>
              </div>

              {/* ATR */}
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Average True Range (ATR)</span>
                <span className="font-semibold text-slate-200 font-mono">₹{indicators.atr.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Research Report Glass Modal */}
      {isReportOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="glass w-full max-w-3xl max-h-[85vh] rounded-2xl border-[rgba(255,255,255,0.1)] overflow-hidden shadow-2xl flex flex-col relative animate-in fade-in zoom-in duration-200">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-[rgba(255,255,255,0.06)] bg-slate-900/40">
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                  <Brain className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">AI Intelligence Report</h3>
                  <p className="text-[10px] text-indigo-300 font-semibold tracking-wider uppercase">{currentSymbol} • NSE / BSE</p>
                </div>
              </div>
              <button 
                onClick={() => setIsReportOpen(false)}
                className="p-1 rounded-lg border border-[rgba(255,255,255,0.06)] text-slate-400 hover:text-white hover:bg-slate-800/40 transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-grow overflow-y-auto p-6 space-y-6 bg-slate-950/20">
              {reportLoading ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-6">
                  {/* Glowing Orbit Spinner */}
                  <div className="relative flex items-center justify-center h-16 w-16">
                    <div className="absolute h-16 w-16 rounded-full border-4 border-indigo-500/10 border-t-indigo-500 animate-spin" />
                    <Sparkles className="h-6 w-6 text-cyan-400 animate-pulse" />
                  </div>
                  
                  {/* Step Indicators */}
                  <div className="w-full max-w-md space-y-3">
                    <p className="text-center text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2">Executing LangGraph Orchestration</p>
                    {agentSteps.map((step, idx) => {
                      const stepNum = idx + 1;
                      const isCompleted = reportStep > stepNum;
                      const isActive = reportStep === stepNum;
                      return (
                        <div 
                          key={idx} 
                          className={`flex items-center space-x-3 p-3 rounded-lg border transition-all duration-300 ${
                            isActive 
                              ? "bg-indigo-500/5 border-indigo-500/30 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.05)]" 
                              : isCompleted 
                              ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-400" 
                              : "bg-slate-900/10 border-transparent text-slate-500"
                          }`}
                        >
                          <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all ${
                            isActive 
                              ? "border-indigo-400 bg-indigo-500/20" 
                              : isCompleted 
                              ? "border-emerald-500 bg-emerald-500/20" 
                              : "border-slate-800 bg-slate-900"
                          }`}>
                            {isCompleted ? <Check className="h-3.5 w-3.5" /> : stepNum}
                          </div>
                          <div className="flex-grow">
                            <span className="text-xs font-bold block leading-none">{step.label}</span>
                            {isActive && <span className="text-[10px] text-indigo-400/90 block mt-0.5 animate-pulse">{step.desc}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : reportError ? (
                <div className="flex flex-col items-center justify-center py-10 space-y-3 text-center">
                  <ShieldAlert className="h-12 w-12 text-red-400" />
                  <h4 className="text-sm font-bold text-white">Execution Failure</h4>
                  <p className="text-xs text-slate-400 max-w-md">{reportError}</p>
                  <button
                    onClick={generateReport}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer mt-2"
                  >
                    Retry Execution
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Action Bar */}
                  <div className="flex justify-between items-center bg-slate-900/40 px-4 py-2.5 rounded-lg border border-[rgba(255,255,255,0.04)] mb-4">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Stock Intelligence Draft</span>
                    <button
                      onClick={copyToClipboard}
                      className="flex items-center space-x-1.5 px-3 py-1 rounded-md border border-[rgba(255,255,255,0.06)] hover:bg-slate-800/60 text-xs text-slate-300 hover:text-white transition-all cursor-pointer"
                    >
                      {copied ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                          <span className="text-emerald-400 font-medium">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copy Markdown</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Rendered content */}
                  <div className="prose prose-invert max-w-none prose-sm">
                    <MarkdownRenderer content={reportContent} />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-[rgba(255,255,255,0.06)] bg-slate-950/60">
              <div className="flex flex-col space-y-2">
                <span className="text-[9px] text-amber-500 font-bold uppercase tracking-wider block leading-none">Regulatory Notice</span>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  MarketMind AI is an automated multi-agent simulation platform. All reports, scores, and ratings are for educational purposes only. They do not constitute financial advice, buy/sell recommendations, or guaranteed predictions. Invest at your own risk.
                </p>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

