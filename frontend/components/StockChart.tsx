"use client";

import React, { useEffect, useRef } from "react";
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickSeries, LineSeries, HistogramSeries } from "lightweight-charts";

interface ChartDataItem {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface MovingAverageItem {
  time: number;
  value: number;
}

interface StockChartProps {
  data: ChartDataItem[];
  sma20?: MovingAverageItem[];
  sma50?: MovingAverageItem[];
  sma200?: MovingAverageItem[];
}

export default function StockChart({ data, sma20 = [], sma50 = [], sma200 = [] }: StockChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Initialize Chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#0b0f19" },
        textColor: "#94a3b8",
      },
      grid: {
        vertLines: { color: "rgba(255, 255, 255, 0.03)" },
        horzLines: { color: "rgba(255, 255, 255, 0.03)" },
      },
      width: chartContainerRef.current.clientWidth,
      height: 450,
      timeScale: {
        borderColor: "rgba(255, 255, 255, 0.06)",
        timeVisible: true,
      },
    });

    chartRef.current = chart;

    // Add Candlestick Series
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#10b981",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#10b981",
      wickDownColor: "#ef4444",
    });
    candlestickSeries.setData(data as any);

    // Overlay moving averages if data present
    let sma20Series: ISeriesApi<"Line"> | null = null;
    if (sma20.length > 0) {
      sma20Series = chart.addSeries(LineSeries, {
        color: "#6366f1",
        lineWidth: 2,
        title: "SMA 20",
      });
      sma20Series.setData(sma20 as any);
    }

    let sma50Series: ISeriesApi<"Line"> | null = null;
    if (sma50.length > 0) {
      sma50Series = chart.addSeries(LineSeries, {
        color: "#eab308",
        lineWidth: 2,
        title: "SMA 50",
      });
      sma50Series.setData(sma50 as any);
    }

    let sma200Series: ISeriesApi<"Line"> | null = null;
    if (sma200.length > 0) {
      sma200Series = chart.addSeries(LineSeries, {
        color: "#ec4899",
        lineWidth: 2,
        title: "SMA 200",
      });
      sma200Series.setData(sma200 as any);
    }

    // Add Volume series on a separate pane/scale
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: "rgba(99, 102, 241, 0.25)",
      priceFormat: {
        type: "volume",
      },
      priceScaleId: "", // overlay pane
    });
    
    // Scale volume to sit at the bottom of the chart
    const volumeData = data.map((d) => ({
      time: d.time,
      value: d.volume,
      color: d.close >= d.open ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)",
    }));
    volumeSeries.setData(volumeData as any);

    // Fit content
    chart.timeScale().fitContent();

    // Resize handler
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.resize(chartContainerRef.current.clientWidth, 450);
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [data, sma20, sma50, sma200]);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-[rgba(255,255,255,0.06)] bg-[#0b0f19] p-4">
      {/* Chart container */}
      <div ref={chartContainerRef} className="w-full" />
    </div>
  );
}
