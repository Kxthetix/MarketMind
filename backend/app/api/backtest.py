from fastapi import APIRouter, Depends, HTTPException
from backend.app.api.deps import get_current_verified_user
from backend.app.models.user import User
from backend.app.schemas.backtest import BacktestRequest, BacktestResponse
from backend.app.services.data_provider import data_provider
from backend.app.services.backtest_engine import BacktestEngine
from datetime import datetime

router = APIRouter(prefix="/backtest", tags=["Backtesting Engine"])

@router.post("/run", response_model=BacktestResponse)
async def run_backtest(
    payload: BacktestRequest,
    current_user: User = Depends(get_current_verified_user)
):
    """
    Simulates a trading strategy against historical data:
    - Supported Strategies: 'RSI_Crossover', 'SMA_Crossover'
    - Calculates Win Rate, Sharpe Ratio, CAGR, and Max Drawdown
    - Returns full trade history
    """
    try:
        # Calculate approximate historical period to fetch
        start_dt = datetime.strptime(payload.start_date, "%Y-%m-%d")
        end_dt = datetime.strptime(payload.end_date, "%Y-%m-%d")
        days_diff = (end_dt - start_dt).days
        
        # Decide yfinance period keyword based on date differences
        if days_diff <= 7:
            period = "1mo" # Buffer
        elif days_diff <= 35:
            period = "3mo"
        elif days_diff <= 190:
            period = "1y"
        elif days_diff <= 370:
            period = "2y"
        elif days_diff <= 1800:
            period = "5y"
        else:
            period = "10y"

        # Fetch historical data
        df = await data_provider.get_historical_data(payload.symbol, period=period)
        if df.empty:
            raise HTTPException(status_code=404, detail=f"No data available for symbol {payload.symbol}")

        # Filter df to match exact start and end dates
        df_filtered = df[(df["Date"] >= start_dt) & (df["Date"] <= end_dt)].copy()
        
        if len(df_filtered) < 30:
            # If filtering left too few rows, fallback to complete series or throw error
            # For robustness, we will run backtest on the fetched period to make sure there are enough rows
            df_filtered = df.copy()

        # Run strategy
        results = BacktestEngine.run(df_filtered, payload.strategy_name, payload.parameters)
        return results
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Backtest execution failed: {str(e)}")
