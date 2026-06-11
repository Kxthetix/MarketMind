"use client";

import React, { useEffect, useRef } from "react";

interface TradingViewChartProps {
  symbol: string;
}

export default function TradingViewChart({ symbol }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Remove any existing widget script/container to prevent duplicate embeds
    containerRef.current.innerHTML = "";

    const widgetContainerId = `tradingview_widget_${symbol}`;
    const widgetDiv = document.createElement("div");
    widgetDiv.id = widgetContainerId;
    widgetDiv.style.height = "100%";
    widgetDiv.style.width = "100%";
    containerRef.current.appendChild(widgetDiv);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/tv.js";
    script.type = "text/javascript";
    script.async = true;
    script.onload = () => {
      if (typeof window !== "undefined" && (window as any).TradingView) {
        new (window as any).TradingView.widget({
          autosize: true,
          symbol: `NSE:${symbol.toUpperCase()}`,
          interval: "D",
          timezone: "Asia/Kolkata",
          theme: "dark",
          style: "1",
          locale: "en",
          toolbar_bg: "#04060d",
          enable_publishing: false,
          hide_side_toolbar: false,
          allow_symbol_change: true,
          container_id: widgetContainerId,
          studies: [
            "RSI@tv-basicstudies",
            "MASimple@tv-basicstudies",
            "MACD@tv-basicstudies"
          ],
        });
      }
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup script from head on unmount
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [symbol]);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-[rgba(255,255,255,0.06)] bg-[#04060d] p-1 h-[450px]">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
