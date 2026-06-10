from datetime import datetime
from typing import Dict, Any, List
from pydantic import BaseModel, Field

class BacktestRequest(BaseModel):
    strategy_name: str = Field(..., description="Name of strategy: 'RSI_Crossover' or 'SMA_Crossover'")
    symbol: str = Field(..., description="Stock ticker symbol, e.g. RELIANCE")
    start_date: str = Field("2020-01-01", description="Start date in YYYY-MM-DD format")
    end_date: str = Field(..., description="End date in YYYY-MM-DD format")
    parameters: Dict[str, Any] = Field(
        default_factory=dict, 
        description="Strategy specific parameters, e.g., {'rsi_lower': 30, 'rsi_upper': 70}"
    )

class TradeLogItem(BaseModel):
    type: str  # buy, sell
    date: str
    price: float
    shares: int
    profit: float = 0.0

class BacktestResponse(BaseModel):
    win_rate: float
    sharpe_ratio: float
    cagr: float
    max_drawdown: float
    total_trades: int
    initial_capital: float
    final_equity: float
    trades: List[TradeLogItem]
