import asyncio
import json
import logging
import pandas as pd
import yfinance as yf
from datetime import datetime, timedelta
from typing import Dict, List, Any
from backend.app.core.config import settings
from backend.app.core.redis import redis_client

logger = logging.getLogger(__name__)

class MarketDataProvider:
    @staticmethod
    def format_symbol(symbol: str) -> str:
        """Appends .NS for Indian markets if no exchange suffix is present."""
        sym = symbol.strip().upper()
        if sym in ["NIFTY", "NIFTY50", "NIFTY 50", "^NSEI"]:
            return "^NSEI"
        if sym in ["BANKNIFTY", "BANK NIFTY", "^NSEBANK"]:
            return "^NSEBANK"
        if not sym.endswith(".NS") and not sym.endswith(".BO"):
            return f"{sym}.NS"
        return sym

    async def get_historical_data(self, symbol: str, period: str = "1y", interval: str = "1d") -> pd.DataFrame:
        """
        Fetches historical price data.
        Tries to load from Redis cache first; otherwise fetches from yfinance and caches.
        """
        formatted = self.format_symbol(symbol)
        cache_key = f"hist:{formatted}:{period}:{interval}"
        
        # Try Cache
        cached = await redis_client.get(cache_key)
        if cached:
            try:
                data = json.loads(cached)
                df = pd.DataFrame(data)
                df["Date"] = pd.to_datetime(df["Date"])
                return df
            except Exception as e:
                logger.error(f"Failed parsing cached historical data: {e}")

        # Fetch live or generate mocks if specified
        df = pd.DataFrame()
        if not settings.MOCK_MODE:
            try:
                # Wrap yfinance blocking call in run_in_executor
                loop = asyncio.get_running_loop()
                ticker = yf.Ticker(formatted)
                hist = await loop.run_in_executor(None, lambda: ticker.history(period=period, interval=interval))
                
                if not hist.empty:
                    df = hist.reset_index()
                    df["Date"] = df["Date"].dt.strftime("%Y-%m-%d %H:%M:%S")
            except Exception as e:
                logger.error(f"Error fetching live data for {formatted} from yfinance: {e}")

        # Fallback to simulated data if yfinance failed or in mock mode
        if df.empty:
            df = self._generate_simulated_data(formatted, period)

        # Cache in Redis for 10 minutes (historical data is relatively stable)
        try:
            cache_data = df.to_dict(orient="records")
            await redis_client.set(cache_key, json.dumps(cache_data), expire=600)
        except Exception as e:
            logger.error(f"Failed to cache historical data for {formatted}: {e}")

        # Convert Date back to datetime for internal calculations
        df["Date"] = pd.to_datetime(df["Date"])
        return df

    async def get_live_quote(self, symbol: str) -> Dict[str, Any]:
        """Gets current quote details for a symbol."""
        formatted = self.format_symbol(symbol)
        cache_key = f"quote:{formatted}"
        
        cached = await redis_client.get(cache_key)
        if cached:
            return json.loads(cached)

        quote = {}
        if not settings.MOCK_MODE:
            try:
                loop = asyncio.get_running_loop()
                ticker = yf.Ticker(formatted)
                info = await loop.run_in_executor(None, lambda: ticker.info)
                if info and "regularMarketPrice" in info:
                    quote = {
                        "symbol": symbol.upper(),
                        "price": info.get("regularMarketPrice"),
                        "open": info.get("regularMarketOpen"),
                        "high": info.get("regularMarketDayHigh"),
                        "low": info.get("regularMarketDayLow"),
                        "volume": info.get("regularMarketVolume"),
                        "prev_close": info.get("regularMarketPreviousClose"),
                        "change": info.get("regularMarketPrice") - info.get("regularMarketPreviousClose", 0.0),
                        "change_percent": ((info.get("regularMarketPrice") - info.get("regularMarketPreviousClose", 0.0)) / info.get("regularMarketPreviousClose", 1.0)) * 100
                    }
            except Exception as e:
                logger.error(f"yfinance quote failed for {formatted}: {e}")

        if not quote:
            # Simulated current quote based on the last historical close
            hist_df = await self.get_historical_data(symbol, period="5d")
            if not hist_df.empty:
                last_row = hist_df.iloc[-1]
                prev_row = hist_df.iloc[-2] if len(hist_df) > 1 else last_row
                price = float(last_row["Close"])
                prev_close = float(prev_row["Close"])
                change = price - prev_close
                change_pct = (change / prev_close) * 100 if prev_close else 0.0
                quote = {
                    "symbol": symbol.upper(),
                    "price": price,
                    "open": float(last_row["Open"]),
                    "high": float(last_row["High"]),
                    "low": float(last_row["Low"]),
                    "volume": int(last_row["Volume"]),
                    "prev_close": prev_close,
                    "change": change,
                    "change_percent": change_pct
                }
            else:
                # Absolute hardcoded mock fallback
                quote = {
                    "symbol": symbol.upper(),
                    "price": 2450.0,
                    "open": 2440.0,
                    "high": 2480.0,
                    "low": 2435.0,
                    "volume": 1200000,
                    "prev_close": 2430.0,
                    "change": 20.0,
                    "change_percent": 0.82
                }

        # Cache quotes for 1 minute (semi-realtime)
        await redis_client.set(cache_key, json.dumps(quote), expire=60)
        return quote

    def _generate_simulated_data(self, formatted_symbol: str, period: str) -> pd.DataFrame:
        """Generates realistic synthetic data for testing and mock environments."""
        logger.info(f"Generating simulated data for {formatted_symbol} ({period})")
        
        # Decide how many days based on period
        days_map = {"5d": 5, "1mo": 30, "3mo": 90, "6mo": 180, "1y": 365, "2y": 730, "5y": 1825, "10y": 3650}
        days = days_map.get(period, 365)
        
        # Base price defaults depending on ticker name to make it look realistic
        base_prices = {
            "^NSEI": 22000.0,
            "^NSEBANK": 47000.0,
            "RELIANCE.NS": 2900.0,
            "TCS.NS": 3800.0,
            "INFY.NS": 1400.0,
            "HDFCBANK.NS": 1500.0,
            "ICICIBANK.NS": 1100.0,
            "SBIN.NS": 750.0
        }
        
        base_price = base_prices.get(formatted_symbol, 1000.0)
        
        dates = []
        current_date = datetime.now() - timedelta(days=days)
        
        # Generate calendar days but exclude weekends to simulate active market
        for _ in range(days * 2):  # iterate extra to ensure we get 'days' of weekday data
            if len(dates) >= days:
                break
            if current_date.weekday() < 5:  # Monday to Friday
                dates.append(current_date)
            current_date += timedelta(days=1)

        dates.sort()
        
        # Random walk generation
        import numpy as np
        np.random.seed(hash(formatted_symbol) % (2**32 - 1)) # consistent seed per symbol
        returns = np.random.normal(0.0003, 0.012, len(dates))  # slightly positive drift
        price_series = base_price * np.exp(np.cumsum(returns))
        
        data = []
        for i, date in enumerate(dates):
            close_p = float(price_series[i])
            open_p = float(close_p * (1 + np.random.normal(0, 0.005)))
            high_p = float(max(open_p, close_p) * (1 + abs(np.random.normal(0, 0.008))))
            low_p = float(min(open_p, close_p) * (1 - abs(np.random.normal(0, 0.008))))
            volume = int(np.random.lognormal(13.8, 0.8)) # typical market volume sizes
            
            data.append({
                "Date": date.strftime("%Y-%m-%d %H:%M:%S"),
                "Open": open_p,
                "High": high_p,
                "Low": low_p,
                "Close": close_p,
                "Volume": volume,
                "Dividends": 0.0,
                "Stock Splits": 0.0
            })
            
        return pd.DataFrame(data)

    async def get_dashboard_metrics(self) -> Dict[str, Any]:
        """Provides indices overview, top gainers, losers, and sector stats."""
        # Check cache
        cached = await redis_client.get("dashboard_metrics")
        if cached:
            return json.loads(cached)

        # Fetch index values
        nifty = await self.get_live_quote("^NSEI")
        banknifty = await self.get_live_quote("^NSEBANK")
        
        # Populate Gainers & Losers with active Indian stocks
        stock_list = ["RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK", "SBIN", "BHARTIARTL", "ITC", "LT", "HINDUNILVR"]
        quotes = []
        for sym in stock_list:
            try:
                q = await self.get_live_quote(sym)
                quotes.append(q)
            except Exception:
                pass
        
        # Sort for gainers & losers
        quotes_sorted = sorted(quotes, key=lambda x: x["change_percent"])
        
        top_losers = quotes_sorted[:4]
        top_gainers = quotes_sorted[-4:][::-1]

        # Simulating Sector Performance
        sectors = [
            {"name": "Nifty IT", "change": 1.45, "status": "bullish"},
            {"name": "Nifty Bank", "change": banknifty["change_percent"], "status": "bullish" if banknifty["change_percent"] >= 0 else "bearish"},
            {"name": "Nifty Auto", "change": -0.85, "status": "bearish"},
            {"name": "Nifty FMCG", "change": 0.22, "status": "neutral"},
            {"name": "Nifty Metal", "change": 2.10, "status": "bullish"},
            {"name": "Nifty Pharma", "change": -0.30, "status": "neutral"}
        ]

        metrics = {
            "indices": {
                "nifty": nifty,
                "banknifty": banknifty
            },
            "top_gainers": top_gainers,
            "top_losers": top_losers,
            "sector_performance": sectors,
            "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }

        # Cache dashboard metrics for 2 minutes
        await redis_client.set("dashboard_metrics", json.dumps(metrics), expire=120)
        return metrics

data_provider = MarketDataProvider()
