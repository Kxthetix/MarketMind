import pytest
import pandas as pd
import numpy as np
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient

from backend.app.services.indicators import TechnicalIndicators
from backend.app.services.pattern_engine import PatternEngine
from backend.app.services.backtest_engine import BacktestEngine
from backend.app.agents.graph import agent_graph
from backend.app.main import app

client = TestClient(app)

# Helper to generate dummy historical dataframe
def get_dummy_df(length=250):
    np.random.seed(42)
    dates = pd.date_range(end=pd.Timestamp.now(), periods=length, freq='D')
    close = 1000.0 * np.exp(np.cumsum(np.random.normal(0.0002, 0.01, length)))
    open_p = close * (1 + np.random.normal(0, 0.002, length))
    high = np.maximum(open_p, close) * (1 + np.abs(np.random.normal(0, 0.005, length)))
    low = np.minimum(open_p, close) * (1 - np.abs(np.random.normal(0, 0.005, length)))
    volume = np.random.randint(100000, 1000000, length)
    
    return pd.DataFrame({
        "Date": dates,
        "Open": open_p,
        "High": high,
        "Low": low,
        "Close": close,
        "Volume": volume
    })

# 1. Test Technical Indicators calculations
def test_technical_indicators():
    df = get_dummy_df(220)
    df_ind = TechnicalIndicators.apply_all_indicators(df)
    
    assert "SMA_20" in df_ind.columns
    assert "SMA_50" in df_ind.columns
    assert "SMA_200" in df_ind.columns
    assert "EMA_20" in df_ind.columns
    assert "RSI_14" in df_ind.columns
    assert "MACD_Line" in df_ind.columns
    assert "VWAP" in df_ind.columns
    assert "ATR_14" in df_ind.columns
    
    summary = TechnicalIndicators.get_latest_indicators_summary(df)
    assert "price" in summary
    assert "trend" in summary
    assert "rsi" in summary
    assert "macd" in summary
    assert "vwap" in summary
    assert "atr" in summary

# 2. Test Support and Resistance
def test_support_resistance():
    df = get_dummy_df(50)
    sup_res = PatternEngine.detect_support_resistance(df)
    
    assert "supports" in sup_res
    assert "resistances" in sup_res
    assert "fibonacci_levels" in sup_res
    assert len(sup_res["supports"]) > 0
    assert len(sup_res["resistances"]) > 0
    
    # Fibonacci levels should contain standard values
    assert "38.2" in sup_res["fibonacci_levels"]
    assert "61.8" in sup_res["fibonacci_levels"]

# 3. Test Candlestick Recognition
def test_candlestick_patterns():
    # Construct a dataframe with a clear Doji candle at the end
    df = get_dummy_df(10)
    df.loc[df.index[-1], "Open"] = 1500.0
    df.loc[df.index[-1], "Close"] = 1500.1
    df.loc[df.index[-1], "High"] = 1520.0
    df.loc[df.index[-1], "Low"] = 1480.0
    
    patterns = PatternEngine.recognize_candlestick_patterns(df)
    
    doji_found = False
    for p in patterns:
        if p["pattern"] == "Doji":
            doji_found = True
            break
    assert doji_found, "Failed to recognize custom Doji candle layout"

# 4. Test Backtesting Engine
def test_backtesting_engine():
    df = get_dummy_df(100)
    
    # RSI Strategy Run
    rsi_params = {"rsi_lower": 30.0, "rsi_upper": 70.0}
    results = BacktestEngine.run(df, "RSI_Crossover", rsi_params)
    
    assert "win_rate" in results
    assert "sharpe_ratio" in results
    assert "cagr" in results
    assert "max_drawdown" in results
    assert "trades" in results
    
    # SMA Strategy Run
    sma_params = {"fast_period": 10, "slow_period": 30}
    results_sma = BacktestEngine.run(df, "SMA_Crossover", sma_params)
    assert "final_equity" in results_sma

# 5. Test Router Status Health Checks
@patch("backend.app.core.redis.redis_client.redis", new_callable=MagicMock)
def test_health_check_endpoint(mock_redis):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"

# 6. Test Dashboard endpoint with mock cache response
@patch("backend.app.core.redis.redis_client.get")
@patch("backend.app.services.data_provider.data_provider.get_dashboard_metrics")
def test_dashboard_metrics_endpoint(mock_get_metrics, mock_redis_get):
    mock_redis_get.return_value = None
    mock_get_metrics.return_value = {
        "indices": {"nifty": {"price": 22000.0, "change_percent": 0.5}},
        "top_gainers": [],
        "top_losers": []
    }
    response = client.get("/api/v1/dashboard/metrics")
    assert response.status_code == 200
    data = response.json()
    assert "indices" in data

# 7. Test LangGraph Workflow execution
@pytest.mark.asyncio
async def test_agent_graph_execution():
    initial_state = {
        "symbol": "RELIANCE",
        "portfolio": [],
        "market_data": {},
        "technical_analysis": {},
        "sentiment_analysis": {},
        "patterns": {},
        "risk_assessment": {},
        "portfolio_analysis": {},
        "opportunity_score": {},
        "research_report": {}
    }
    result = await agent_graph.ainvoke(initial_state)
    assert result["symbol"] == "RELIANCE"
    assert "opportunity_score" in result
    assert "score" in result["opportunity_score"]
    assert "research_report" in result
    assert "report_markdown" in result["research_report"]
