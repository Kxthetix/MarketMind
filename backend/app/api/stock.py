from fastapi import APIRouter, Depends, HTTPException
from backend.app.services.data_provider import data_provider
from backend.app.services.indicators import TechnicalIndicators
from backend.app.services.pattern_engine import PatternEngine

router = APIRouter(prefix="/stock", tags=["Stock Analysis"])

@router.get("/{symbol}/quote")
async def get_stock_quote(symbol: str):
    """Retrieves live price, open, high, low, volume, and daily percentage change."""
    try:
        quote = await data_provider.get_live_quote(symbol)
        return quote
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{symbol}/historical")
async def get_stock_historical(symbol: str, period: str = "1y", interval: str = "1d"):
    """Retrieves historical prices suitable for client charting (e.g. TradingView Lightweight Charts)."""
    try:
        df = await data_provider.get_historical_data(symbol, period=period, interval=interval)
        if df.empty:
            raise HTTPException(status_code=404, detail="Symbol historical data not found.")
        
        # Format for charting: list of {time: timestamp, open: val, high: val, low: val, close: val, volume: val}
        chart_data = []
        for _, row in df.iterrows():
            chart_data.append({
                "time": int(row["Date"].timestamp()), # Unix timestamp
                "date": row["Date"].strftime("%Y-%m-%d"),
                "open": float(row["Open"]),
                "high": float(row["High"]),
                "low": float(row["Low"]),
                "close": float(row["Close"]),
                "volume": int(row["Volume"])
            })
        return chart_data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{symbol}/analysis")
async def analyze_stock(symbol: str):
    """
    Computes and aggregates full quantitative analytical data:
    - Latest Price & Volume
    - Technical Indicators (RSI, MACD, EMA, SMA, VWAP, ATR)
    - Support & Resistance Levels (Confidence scores, Fibonacci retracts)
    - Candlestick Recognition (Hammer, Doji, Engulfing patterns on last 3 days)
    """
    try:
        # 1. Fetch historical data (minimum 1 year to calculate 200 SMA)
        df = await data_provider.get_historical_data(symbol, period="1y")
        if df.empty:
            raise HTTPException(status_code=404, detail="Symbol not found")
        
        # 2. Compute Indicators
        summary = TechnicalIndicators.get_latest_indicators_summary(df)
        
        # 3. Compute Support and Resistance
        sup_res = PatternEngine.detect_support_resistance(df)
        
        # 4. Compute Candlestick Patterns
        patterns = PatternEngine.recognize_candlestick_patterns(df)
        
        return {
            "symbol": symbol.upper(),
            "indicators": summary,
            "support_resistance": sup_res,
            "candlestick_patterns": patterns
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to analyze symbol: {str(e)}")
