import pandas as pd
import numpy as np
from typing import Dict, Any

class TechnicalIndicators:
    @staticmethod
    def calculate_sma(df: pd.DataFrame, period: int = 20, column: str = "Close") -> pd.Series:
        return df[column].rolling(window=period).mean()

    @staticmethod
    def calculate_ema(df: pd.DataFrame, period: int = 20, column: str = "Close") -> pd.Series:
        return df[column].ewm(span=period, adjust=False).mean()

    @staticmethod
    def calculate_rsi(df: pd.DataFrame, period: int = 14, column: str = "Close") -> pd.Series:
        delta = df[column].diff()
        gain = (delta.where(delta > 0, 0)).copy()
        loss = (-delta.where(delta < 0, 0)).copy()

        # Wilder's smoothing technique for RSI
        avg_gain = gain.rolling(window=period).mean()
        avg_loss = loss.rolling(window=period).mean()

        # Initial values
        for i in range(period, len(df)):
            avg_gain.iloc[i] = (avg_gain.iloc[i-1] * (period - 1) + gain.iloc[i]) / period
            avg_loss.iloc[i] = (avg_loss.iloc[i-1] * (period - 1) + loss.iloc[i]) / period

        # Handle division by zero math properly
        rsi = pd.Series(index=df.index, dtype=float)
        for i in range(len(df)):
            g = avg_gain.iloc[i]
            l = avg_loss.iloc[i]
            if pd.isna(g) or pd.isna(l):
                rsi.iloc[i] = np.nan
            elif l == 0 and g == 0:
                rsi.iloc[i] = 50.0
            elif l == 0:
                rsi.iloc[i] = 100.0
            elif g == 0:
                rsi.iloc[i] = 0.0
            else:
                rs = g / l
                rsi.iloc[i] = 100.0 - (100.0 / (1.0 + rs))
        return rsi.fillna(50)  # Default neutral

    @staticmethod
    def calculate_macd(df: pd.DataFrame, fast_period: int = 12, slow_period: int = 26, signal_period: int = 9, column: str = "Close") -> Dict[str, pd.Series]:
        fast_ema = TechnicalIndicators.calculate_ema(df, fast_period, column)
        slow_ema = TechnicalIndicators.calculate_ema(df, slow_period, column)
        
        macd_line = fast_ema - slow_ema
        signal_line = macd_line.ewm(span=signal_period, adjust=False).mean()
        histogram = macd_line - signal_line

        return {
            "macd_line": macd_line,
            "signal_line": signal_line,
            "histogram": histogram
        }

    @staticmethod
    def calculate_vwap(df: pd.DataFrame) -> pd.Series:
        typical_price = (df["High"] + df["Low"] + df["Close"]) / 3
        tp_v = typical_price * df["Volume"]
        cumulative_tp_v = tp_v.cumsum()
        cumulative_volume = df["Volume"].cumsum()
        
        # Avoid division by zero
        vwap = cumulative_tp_v / cumulative_volume.replace(0, np.nan)
        return vwap.ffill().fillna(df["Close"])

    @staticmethod
    def calculate_atr(df: pd.DataFrame, period: int = 14) -> pd.Series:
        high = df["High"]
        low = df["Low"]
        close_prev = df["Close"].shift(1)

        tr1 = high - low
        tr2 = (high - close_prev).abs()
        tr3 = (low - close_prev).abs()

        tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        atr = tr.rolling(window=period).mean()

        # Smooth ATR (Wilder's smoothing)
        for i in range(period, len(df)):
            atr.iloc[i] = (atr.iloc[i-1] * (period - 1) + tr.iloc[i]) / period

        return atr.bfill().fillna(0.0)

    @classmethod
    def apply_all_indicators(cls, df: pd.DataFrame) -> pd.DataFrame:
        """Applies all requested indicators to the dataframe."""
        if len(df) < 200:
            # Not enough data for long moving averages, but we calculate anyway on smaller sizes
            pass
            
        df = df.copy()
        
        # SMA / EMA
        df["SMA_20"] = cls.calculate_sma(df, 20)
        df["SMA_50"] = cls.calculate_sma(df, 50)
        df["SMA_200"] = cls.calculate_sma(df, 200)
        
        df["EMA_20"] = cls.calculate_ema(df, 20)
        df["EMA_50"] = cls.calculate_ema(df, 50)
        df["EMA_200"] = cls.calculate_ema(df, 200)
        
        # RSI
        df["RSI_14"] = cls.calculate_rsi(df, 14)
        
        # MACD
        macd_results = cls.calculate_macd(df)
        df["MACD_Line"] = macd_results["macd_line"]
        df["MACD_Signal"] = macd_results["signal_line"]
        df["MACD_Hist"] = macd_results["histogram"]
        
        # VWAP & ATR
        df["VWAP"] = cls.calculate_vwap(df)
        df["ATR_14"] = cls.calculate_atr(df, 14)
        
        return df

    @classmethod
    def get_latest_indicators_summary(cls, df: pd.DataFrame) -> Dict[str, Any]:
        """Extracts the latest row as a key-value dict of indicator states."""
        df_indicators = cls.apply_all_indicators(df)
        if df_indicators.empty:
            return {}
            
        latest = df_indicators.iloc[-1]
        
        # Determine trend based on SMA and EMA crossover
        close = float(latest["Close"])
        sma_20 = float(latest["SMA_20"]) if not pd.isna(latest["SMA_20"]) else close
        sma_50 = float(latest["SMA_50"]) if not pd.isna(latest["SMA_50"]) else close
        sma_200 = float(latest["SMA_200"]) if not pd.isna(latest["SMA_200"]) else close
        
        trend = "Neutral"
        if close > sma_50 and sma_50 > sma_200:
            trend = "Strong Bullish"
        elif close > sma_20 and close > sma_50:
            trend = "Bullish"
        elif close < sma_50 and sma_50 < sma_200:
            trend = "Strong Bearish"
        elif close < sma_20 and close < sma_50:
            trend = "Bearish"

        rsi = float(latest["RSI_14"])
        rsi_desc = "Neutral"
        if rsi >= 70:
            rsi_desc = "Overbought (Bearish reversal risk)"
        elif rsi <= 30:
            rsi_desc = "Oversold (Bullish reversal setup)"

        macd_val = float(latest["MACD_Line"])
        macd_sig = float(latest["MACD_Signal"])
        macd_desc = "Neutral"
        if macd_val > macd_sig:
            macd_desc = "Bullish Crossover"
        elif macd_val < macd_sig:
            macd_desc = "Bearish Crossover"

        return {
            "price": close,
            "open": float(latest["Open"]),
            "high": float(latest["High"]),
            "low": float(latest["Low"]),
            "volume": int(latest["Volume"]),
            "trend": trend,
            "rsi": {
                "value": rsi,
                "description": rsi_desc
            },
            "macd": {
                "line": macd_val,
                "signal": macd_sig,
                "histogram": float(latest["MACD_Hist"]),
                "description": macd_desc
            },
            "sma": {
                "sma_20": sma_20,
                "sma_50": sma_50,
                "sma_200": sma_200
            },
            "ema": {
                "ema_20": float(latest["EMA_20"]) if not pd.isna(latest["EMA_20"]) else close,
                "ema_50": float(latest["EMA_50"]) if not pd.isna(latest["EMA_50"]) else close,
                "ema_200": float(latest["EMA_200"]) if not pd.isna(latest["EMA_200"]) else close
            },
            "vwap": float(latest["VWAP"]),
            "atr": float(latest["ATR_14"])
        }
