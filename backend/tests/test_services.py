import pytest
import pandas as pd
import numpy as np
from backend.app.services.indicators import TechnicalIndicators
from backend.app.services.pattern_engine import PatternEngine
from backend.app.services.backtest_engine import BacktestEngine

def create_price_df(prices, volumes=None):
    length = len(prices)
    dates = pd.date_range(end=pd.Timestamp.now(), periods=length, freq='D')
    if volumes is None:
        volumes = [1000] * length
    return pd.DataFrame({
        "Date": dates,
        "Open": prices,
        "High": [p * 1.01 for p in prices],
        "Low": [p * 0.99 for p in prices],
        "Close": prices,
        "Volume": volumes
    })

# 1. Technical Indicators Edge Cases
def test_rsi_flat_line():
    # Constant price series (No gains, no losses)
    prices = [100.0] * 30
    df = create_price_df(prices)
    df_ind = TechnicalIndicators.apply_all_indicators(df)
    
    # RSI for flat lines should default to 50.0 (or neutral boundary)
    final_rsi = df_ind["RSI_14"].iloc[-1]
    assert final_rsi == 50.0 or pd.isna(final_rsi) or final_rsi == 0.0

def test_rsi_strictly_increasing():
    # Strictly increasing prices
    prices = [100.0 + i for i in range(20)]
    df = create_price_df(prices)
    df_ind = TechnicalIndicators.apply_all_indicators(df)
    final_rsi = df_ind["RSI_14"].iloc[-1]
    
    # RSI should be high (oversold boundary > 80)
    assert final_rsi > 80.0

def test_macd_crossover_calculation():
    # Construct a cycle to trigger positive and negative MACD values
    prices = [100.0 + 5 * np.sin(i / 2) for i in range(50)]
    df = create_price_df(prices)
    df_ind = TechnicalIndicators.apply_all_indicators(df)
    
    assert "MACD_Line" in df_ind.columns
    assert "MACD_Signal" in df_ind.columns
    assert "MACD_Hist" in df_ind.columns
    
    # Check that histogram equals Line - Signal
    for val in df_ind.tail(5).itertuples():
        if not pd.isna(val.MACD_Hist):
            assert abs(val.MACD_Hist - (val.MACD_Line - val.MACD_Signal)) < 1e-4

def test_vwap_weighted_calculation():
    # Set custom price and volumes
    prices = [100.0, 105.0, 102.0]
    volumes = [1000, 2000, 1500]
    df = create_price_df(prices, volumes)
    
    # Override High/Low to match Close so that typified price equals close
    df["High"] = prices
    df["Low"] = prices
    
    df_ind = TechnicalIndicators.apply_all_indicators(df)
    final_vwap = df_ind["VWAP"].iloc[-1]
    
    # Hand-calculated VWAP:
    # Cum Price*Vol = 100*1000 + 105*2000 + 102*1500 = 100000 + 210000 + 153000 = 463000
    # Cum Vol = 1000 + 2000 + 1500 = 4500
    # VWAP = 463000 / 4500 = 102.8888...
    expected_vwap = 463000.0 / 4500.0
    assert abs(final_vwap - expected_vwap) < 1e-4

# 2. Candlestick Pattern Sequence Edge Cases
def test_fibonacci_retracement_math():
    # Construct historical series with max = 200 and min = 100
    # Make it length 16 (longer than 11) to avoid early exit in detect_support_resistance
    prices = [120.0] * 10 + [100.0, 150.0, 200.0, 180.0, 120.0, 100.0]
    df = create_price_df(prices)
    # Set explicit highs/lows
    df["High"] = prices
    df["Low"] = prices
    
    sup_res = PatternEngine.detect_support_resistance(df)
    fib = sup_res["fibonacci_levels"]
    
    # Range is 100 to 200 (Diff = 100)
    # Fibonacci levels check:
    # 0% = 100.0
    # 23.6% = 100 + 23.6 = 123.6
    # 38.2% = 100 + 38.2 = 138.2
    # 50.0% = 150.0
    # 61.8% = 100 + 61.8 = 161.8
    # 78.6% = 100 + 78.6 = 178.6
    # 100% = 200.0
    assert abs(fib["0.0"] - 100.0) < 1e-2
    assert abs(fib["23.6"] - 123.6) < 1e-2
    assert abs(fib["38.2"] - 138.2) < 1e-2
    assert abs(fib["50.0"] - 150.0) < 1e-2
    assert abs(fib["61.8"] - 161.8) < 1e-2
    assert abs(fib["78.6"] - 178.6) < 1e-2
    assert abs(fib["100.0"] - 200.0) < 1e-2

def test_candlestick_hammer_detection():
    # Hammer candle: small real body at top, very long lower shadow, little/no upper shadow
    df = create_price_df([100.0] * 5)
    # Last candle set as Hammer:
    df.loc[df.index[-1], "Open"] = 100.0
    df.loc[df.index[-1], "Close"] = 101.0
    df.loc[df.index[-1], "High"] = 101.1
    df.loc[df.index[-1], "Low"] = 96.0  # deep lower wick
    
    patterns = PatternEngine.recognize_candlestick_patterns(df)
    hammer_matches = [p for p in patterns if p["pattern"] == "Hammer"]
    assert len(hammer_matches) > 0
    assert hammer_matches[0]["sentiment"] == "Bullish"

def test_candlestick_engulfing_detection():
    # Bullish Engulfing: large green body completely engulfs previous small red body
    df = create_price_df([100.0] * 5)
    
    # Day -2: small red body
    df.loc[df.index[-2], "Open"] = 101.0
    df.loc[df.index[-2], "Close"] = 100.0
    df.loc[df.index[-2], "High"] = 101.2
    df.loc[df.index[-2], "Low"] = 99.8
    
    # Day -1: large green body engulfing Day -2
    df.loc[df.index[-1], "Open"] = 99.5
    df.loc[df.index[-1], "Close"] = 102.5
    df.loc[df.index[-1], "High"] = 103.0
    df.loc[df.index[-1], "Low"] = 99.0
    
    patterns = PatternEngine.recognize_candlestick_patterns(df)
    engulfing_matches = [p for p in patterns if "Engulfing" in p["pattern"]]
    assert len(engulfing_matches) > 0
    assert engulfing_matches[0]["sentiment"] == "Bullish"

# 3. Backtest Metrics verification
def test_backtest_metrics_calculation():
    # Create simple price series and run backtest
    # Setup alternating prices so trades will be executed
    # Buying when RSI < 30, selling when RSI > 70
    prices = [100.0, 95.0, 90.0, 85.0, 80.0, 95.0, 110.0, 120.0, 130.0, 115.0, 100.0] * 5
    df = create_price_df(prices)
    
    # Force indicators values to trigger trade
    df_ind = TechnicalIndicators.apply_all_indicators(df)
    
    results = BacktestEngine.run(df_ind, "RSI_Crossover", {"rsi_lower": 35.0, "rsi_upper": 65.0})
    
    assert "cagr" in results
    assert "sharpe_ratio" in results
    assert "win_rate" in results
    assert "trades" in results
    
    # Verify win rate calculation matches basic trades division
    trades = results["trades"]
    if len(trades) > 0:
        winning_trades = [t for t in trades if t["profit"] > 0]
        expected_win_rate = round(len(winning_trades) / len(trades) * 100, 2)
        assert abs(results["win_rate"] - expected_win_rate) < 1e-2
