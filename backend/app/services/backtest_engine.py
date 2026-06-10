import pandas as pd
import numpy as np
from datetime import datetime
from typing import Dict, Any, List
from backend.app.services.indicators import TechnicalIndicators

class BacktestEngine:
    @classmethod
    def run(cls, df: pd.DataFrame, strategy_name: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """
        Runs a backtest simulation on a historical dataframe.
        """
        if df.empty or len(df) < 50:
            raise ValueError("Insufficient data for backtesting. Minimum 50 historical periods required.")

        # Default capital
        initial_capital = float(parameters.get("initial_capital", 100000.0))
        capital = initial_capital
        position = 0
        buy_price = 0.0
        trades: List[Dict[str, Any]] = []
        
        # Calculate indicators needed
        df = TechnicalIndicators.apply_all_indicators(df)
        
        # Track daily equity for Sharpe and Drawdown calculations
        equity_curve = []
        dates = df["Date"].dt.strftime("%Y-%m-%d").tolist()
        closes = df["Close"].values
        highs = df["High"].values
        lows = df["Low"].values

        # Strategy specific columns
        if strategy_name == "RSI_Crossover":
            rsi_lower = float(parameters.get("rsi_lower", 30.0))
            rsi_upper = float(parameters.get("rsi_upper", 70.0))
            rsi = df["RSI_14"].values
            
            for i in range(1, len(df)):
                current_price = closes[i]
                current_date = dates[i]
                
                # Buy signal: RSI crossed below rsi_lower (oversold) and is turning up or we buy immediately
                # Let's say RSI enters oversold area
                if position == 0 and rsi[i-1] >= rsi_lower and rsi[i] < rsi_lower:
                    shares_to_buy = int(capital // current_price)
                    if shares_to_buy > 0:
                        position = shares_to_buy
                        buy_price = current_price
                        capital -= position * buy_price
                        trades.append({
                            "type": "buy",
                            "date": current_date,
                            "price": buy_price,
                            "shares": position,
                            "profit": 0.0
                        })
                
                # Sell signal: RSI crossed above rsi_upper (overbought)
                elif position > 0 and rsi[i-1] <= rsi_upper and rsi[i] > rsi_upper:
                    sell_price = current_price
                    revenue = position * sell_price
                    profit = (sell_price - buy_price) * position
                    capital += revenue
                    trades.append({
                        "type": "sell",
                        "date": current_date,
                        "price": sell_price,
                        "shares": position,
                        "profit": float(profit)
                    })
                    position = 0
                
                # Track daily equity
                current_equity = capital + (position * current_price)
                equity_curve.append(current_equity)
                
        elif strategy_name == "SMA_Crossover":
            fast_period = int(parameters.get("fast_period", 20))
            slow_period = int(parameters.get("slow_period", 50))
            
            # Recalculate if custom windows are supplied
            fast_sma = TechnicalIndicators.calculate_sma(df, fast_period).values
            slow_sma = TechnicalIndicators.calculate_sma(df, slow_period).values
            
            for i in range(1, len(df)):
                current_price = closes[i]
                current_date = dates[i]
                
                # Skip if SMA values are NaN
                if np.isnan(fast_sma[i-1]) or np.isnan(slow_sma[i-1]) or np.isnan(fast_sma[i]) or np.isnan(slow_sma[i]):
                    equity_curve.append(capital)
                    continue
                
                # Buy signal: Fast SMA crosses above Slow SMA (Golden Cross)
                if position == 0 and fast_sma[i-1] <= slow_sma[i-1] and fast_sma[i] > slow_sma[i]:
                    shares_to_buy = int(capital // current_price)
                    if shares_to_buy > 0:
                        position = shares_to_buy
                        buy_price = current_price
                        capital -= position * buy_price
                        trades.append({
                            "type": "buy",
                            "date": current_date,
                            "price": buy_price,
                            "shares": position,
                            "profit": 0.0
                        })
                
                # Sell signal: Fast SMA crosses below Slow SMA (Death Cross)
                elif position > 0 and fast_sma[i-1] >= slow_sma[i-1] and fast_sma[i] < slow_sma[i]:
                    sell_price = current_price
                    revenue = position * sell_price
                    profit = (sell_price - buy_price) * position
                    capital += revenue
                    trades.append({
                        "type": "sell",
                        "date": current_date,
                        "price": sell_price,
                        "shares": position,
                        "profit": float(profit)
                    })
                    position = 0
                
                # Track daily equity
                current_equity = capital + (position * current_price)
                equity_curve.append(current_equity)
                
        else:
            raise ValueError(f"Unknown strategy: {strategy_name}")

        # Final closeout of open position (for metric integrity)
        if position > 0:
            final_price = closes[-1]
            revenue = position * final_price
            profit = (final_price - buy_price) * position
            capital += revenue
            trades.append({
                "type": "sell",
                "date": dates[-1],
                "price": final_price,
                "shares": position,
                "profit": float(profit)
            })
            position = 0
            if equity_curve:
                equity_curve[-1] = capital

        # Metrics calculations
        final_equity = capital
        total_trades = len(trades) // 2  # Buy/Sell pairs
        
        # Returns
        equity_series = pd.Series(equity_curve)
        daily_returns = equity_series.pct_change().dropna()
        
        # Sharpe Ratio (daily standard dev annualized, assume 0% risk free rate)
        if len(daily_returns) > 1 and daily_returns.std() > 0:
            sharpe_ratio = float((daily_returns.mean() / daily_returns.std()) * np.sqrt(252))
        else:
            sharpe_ratio = 0.0

        # Max Drawdown
        running_max = equity_series.cummax()
        drawdown = (equity_series - running_max) / running_max
        max_drawdown = float(drawdown.min() * 100) if not drawdown.empty else 0.0

        # CAGR
        days = (df["Date"].iloc[-1] - df["Date"].iloc[0]).days
        years = max(days / 365.25, 0.1) # prevent division by zero or negative
        cagr = float(((final_equity / initial_capital) ** (1 / years) - 1) * 100)

        # Win Rate
        sell_trades = [t for t in trades if t["type"] == "sell"]
        profitable_trades = sum(1 for t in sell_trades if t["profit"] > 0)
        win_rate = float((profitable_trades / len(sell_trades)) * 100) if sell_trades else 0.0

        return {
            "win_rate": round(win_rate, 2),
            "sharpe_ratio": round(sharpe_ratio, 2),
            "cagr": round(cagr, 2),
            "max_drawdown": round(abs(max_drawdown), 2),
            "total_trades": total_trades,
            "initial_capital": initial_capital,
            "final_equity": round(final_equity, 2),
            "trades": trades
        }
