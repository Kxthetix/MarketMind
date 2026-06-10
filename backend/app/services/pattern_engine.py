import pandas as pd
import numpy as np
from typing import Dict, List, Any

class PatternEngine:
    @staticmethod
    def detect_support_resistance(df: pd.DataFrame, window: int = 5) -> Dict[str, Any]:
        """
        Detects support and resistance levels using:
        1. Swing Highs & Swing Lows (local extrema)
        2. Volume Profile Zones (high volume price areas)
        3. Fibonacci Retracement Levels
        """
        if len(df) < window * 2 + 1:
            return {"supports": [], "resistances": [], "fibonacci_levels": {}}

        highs = df["High"].values
        lows = df["Low"].values
        closes = df["Close"].values
        volumes = df["Volume"].values

        swing_highs = []
        swing_lows = []

        # 1. Swing Highs & Lows Detection
        for i in range(window, len(df) - window):
            # Swing High
            is_high = True
            for j in range(i - window, i + window + 1):
                if highs[i] < highs[j]:
                    is_high = False
                    break
            if is_high:
                swing_highs.append((float(highs[i]), float(volumes[i])))

            # Swing Low
            is_low = True
            for j in range(i - window, i + window + 1):
                if lows[i] > lows[j]:
                    is_low = False
                    break
            if is_low:
                swing_lows.append((float(lows[i]), float(volumes[i])))

        # 2. Volume Profile Zones (horizontal support/resistance by volume concentration)
        price_min = float(df["Low"].min())
        price_max = float(df["High"].max())
        
        bins = np.linspace(price_min, price_max, 10)
        volume_profile, bin_edges = np.histogram(closes, bins=bins, weights=volumes)
        
        # Find local peaks in volume profile
        volume_zones = []
        for i in range(len(volume_profile)):
            mid_price = float((bin_edges[i] + bin_edges[i+1]) / 2)
            volume_zones.append({
                "price_level": mid_price,
                "volume_weight": float(volume_profile[i])
            })
            
        # Sort volume zones by weight
        volume_zones = sorted(volume_zones, key=lambda x: x["volume_weight"], reverse=True)

        # 3. Fibonacci Levels (based on 6-month high and low)
        recent_df = df.tail(126)  # ~6 months of trading days
        recent_high = float(recent_df["High"].max())
        recent_low = float(recent_df["Low"].min())
        diff = recent_high - recent_low
        
        fib_levels = {
            "0.0": recent_low,
            "23.6": recent_low + 0.236 * diff,
            "38.2": recent_low + 0.382 * diff,
            "50.0": recent_low + 0.500 * diff,
            "61.8": recent_low + 0.618 * diff,
            "78.6": recent_low + 0.786 * diff,
            "100.0": recent_high
        }

        # Select top 3 supports and resistances from Swing points & volume points
        current_price = float(df["Close"].iloc[-1])
        
        # Candidate supports (below current price)
        supports_cand = [p for p, _ in swing_lows if p < current_price]
        # Candidate resistances (above current price)
        resistances_cand = [p for p, _ in swing_highs if p > current_price]

        # Consolidate nearby levels
        def cluster_levels(levels: List[float], current: float, is_support: bool) -> List[Dict[str, Any]]:
            if not levels:
                return []
            levels = sorted(levels)
            clusters = []
            tolerance = current * 0.015  # 1.5% clustering tolerance
            
            while levels:
                pivot = levels[0]
                cluster = [p for p in levels if abs(p - pivot) <= tolerance]
                levels = [p for p in levels if abs(p - pivot) > tolerance]
                avg_level = float(np.mean(cluster))
                
                # Confidence score based on number of hits
                confidence = min(1.0, 0.4 + (len(cluster) - 1) * 0.2)
                clusters.append({
                    "price": round(avg_level, 2),
                    "confidence_score": confidence,
                    "strength": "Strong" if confidence >= 0.8 else "Medium" if confidence >= 0.6 else "Weak"
                })
            
            # Sort by proximity to current price
            if is_support:
                clusters = sorted(clusters, key=lambda x: x["price"], reverse=True)
            else:
                clusters = sorted(clusters, key=lambda x: x["price"])
                
            return clusters[:3]

        supports = cluster_levels(supports_cand, current_price, is_support=True)
        resistances = cluster_levels(resistances_cand, current_price, is_support=False)

        # If supports or resistances list is empty, append volume profile midpoints or fib points as backup
        if not supports:
            supports = [{"price": round(fib_levels["38.2"], 2), "confidence_score": 0.5, "strength": "Medium"}]
        if not resistances:
            resistances = [{"price": round(fib_levels["61.8"], 2), "confidence_score": 0.5, "strength": "Medium"}]

        return {
            "supports": supports,
            "resistances": resistances,
            "fibonacci_levels": {k: round(v, 2) for k, v in fib_levels.items()},
            "volume_profile": volume_zones[:5]
        }

    @staticmethod
    def recognize_candlestick_patterns(df: pd.DataFrame) -> List[Dict[str, Any]]:
        """
        Recognizes candlestick patterns on the most recent candles.
        Returns a list of patterns found on the last 3 days.
        """
        patterns = []
        if len(df) < 5:
            return patterns

        # Make a copy and calculate metrics
        df = df.copy()
        df["body"] = (df["Close"] - df["Open"]).abs()
        df["candle_range"] = df["High"] - df["Low"]
        df["upper_shadow"] = df["High"] - df[["Open", "Close"]].max(axis=1)
        df["lower_shadow"] = df[["Open", "Close"]].min(axis=1) - df["Low"]
        df["is_green"] = df["Close"] >= df["Open"]

        # Helper to check if a candle is a Doji
        def is_doji(row):
            return row["body"] <= 0.1 * row["candle_range"] if row["candle_range"] > 0 else False

        # Helper to check if a candle is a Hammer
        def is_hammer(row):
            # Body is in the upper part, lower shadow is long
            body_upper_half = min(row["Open"], row["Close"]) > row["Low"] + 0.5 * row["candle_range"]
            long_lower_shadow = row["lower_shadow"] >= 2 * row["body"]
            short_upper_shadow = row["upper_shadow"] <= 0.2 * row["candle_range"]
            return body_upper_half and long_lower_shadow and short_upper_shadow and row["candle_range"] > 0

        # Helper to check if a candle is a Shooting Star
        def is_shooting_star(row):
            # Body is in the lower part, upper shadow is long
            body_lower_half = max(row["Open"], row["Close"]) < row["High"] - 0.5 * row["candle_range"]
            long_upper_shadow = row["upper_shadow"] >= 2 * row["body"]
            short_lower_shadow = row["lower_shadow"] <= 0.2 * row["candle_range"]
            return body_lower_half and long_upper_shadow and short_lower_shadow and row["candle_range"] > 0

        # Loop through the last 3 days to detect patterns
        for idx in [-1, -2, -3]:
            # Day index mapping
            day_str = "Latest Day" if idx == -1 else f"{abs(idx) - 1} Day(s) Ago"
            row = df.iloc[idx]
            prev_row = df.iloc[idx - 1]
            prev_prev_row = df.iloc[idx - 2] if len(df) >= abs(idx) + 2 else None

            # Doji Detection
            if is_doji(row):
                patterns.append({
                    "day": day_str,
                    "pattern": "Doji",
                    "sentiment": "Neutral",
                    "explanation": "Open and close prices are nearly identical. Indicates extreme indecision between buyers and sellers, often warning of a potential trend reversal."
                })

            # Hammer Detection
            elif is_hammer(row):
                patterns.append({
                    "day": day_str,
                    "pattern": "Hammer",
                    "sentiment": "Bullish",
                    "explanation": "A small body near the top of the candle with a long lower shadow. Suggests sellers drove prices down, but buyers pushed them back up, indicating a strong support zone."
                })

            # Shooting Star Detection
            elif is_shooting_star(row):
                patterns.append({
                    "day": day_str,
                    "pattern": "Shooting Star",
                    "sentiment": "Bearish",
                    "explanation": "A small body near the bottom of the candle with a long upper shadow. Shows buyers drove prices high, but sellers took control, signaling potential exhaustion of the uptrend."
                })

            # Engulfing Detection
            # Bullish Engulfing
            if not row["is_green"] and prev_row["is_green"] == False and row["body"] > prev_row["body"]:
                # Wait, standard engulfing is: green candle body engulfs previous red candle body
                pass
            if row["is_green"] and not prev_row["is_green"] and row["Close"] >= prev_row["Open"] and row["Open"] <= prev_row["Close"] and row["body"] > prev_row["body"]:
                patterns.append({
                    "day": day_str,
                    "pattern": "Bullish Engulfing",
                    "sentiment": "Bullish",
                    "explanation": "A green candle fully engulfs the body of the previous day's red candle. Indicates a powerful shift in momentum from sellers to buyers, representing a potential reversal."
                })
            # Bearish Engulfing
            elif not row["is_green"] and prev_row["is_green"] and row["Close"] <= prev_row["Open"] and row["Open"] >= prev_row["Close"] and row["body"] > prev_row["body"]:
                patterns.append({
                    "day": day_str,
                    "pattern": "Bearish Engulfing",
                    "sentiment": "Bearish",
                    "explanation": "A red candle fully engulfs the body of the previous day's green candle. Indicates sellers have completely overwhelmed buyers, alerting to a downward momentum shift."
                })

            # Morning / Evening Star (3-candle patterns)
            if prev_prev_row is not None:
                # Morning Star (Bullish Reversal)
                # Candle 1 (prev_prev): Long Red
                # Candle 2 (prev): Small body (Doji or tiny star) with gap down
                # Candle 3 (row): Long Green closing > 50% of Candle 1
                c1_red = not prev_prev_row["is_green"]
                c2_small = prev_row["body"] <= 0.3 * prev_prev_row["body"]
                c3_green = row["is_green"]
                c3_close_high = row["Close"] >= prev_prev_row["Close"] + 0.5 * prev_prev_row["body"]
                
                if c1_red and c2_small and c3_green and c3_close_high:
                    patterns.append({
                        "day": day_str,
                        "pattern": "Morning Star",
                        "sentiment": "Bullish",
                        "explanation": "A three-candle bullish reversal pattern. A large red candle is followed by a small-bodied star that gaps down, followed by a large green candle. Indicates sellers are exhausted and buyers are taking charge."
                    })

                # Evening Star (Bearish Reversal)
                # Candle 1 (prev_prev): Long Green
                # Candle 2 (prev): Small body with gap up
                # Candle 3 (row): Long Red closing > 50% of Candle 1
                c1_green = prev_prev_row["is_green"]
                c2_small_eve = prev_row["body"] <= 0.3 * prev_prev_row["body"]
                c3_red = not row["is_green"]
                c3_close_low = row["Close"] <= prev_prev_row["Close"] - 0.5 * prev_prev_row["body"]

                if c1_green and c2_small_eve and c3_red and c3_close_low:
                    patterns.append({
                        "day": day_str,
                        "pattern": "Evening Star",
                        "sentiment": "Bearish",
                        "explanation": "A three-candle bearish reversal pattern. A large green candle is followed by a small-bodied star that gaps up, followed by a large red candle. Indicates buyers are exhausted and sellers are driving prices down."
                    })

        return patterns
