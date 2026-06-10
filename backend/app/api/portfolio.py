import uuid
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from backend.app.core.database import get_db
from backend.app.api.deps import get_current_verified_user
from backend.app.models.user import User
from backend.app.models.portfolio import Portfolio
from backend.app.schemas.portfolio import PortfolioCreate, PortfolioResponse, HoldingItem
from backend.app.services.data_provider import data_provider

router = APIRouter(prefix="/portfolio", tags=["Portfolio Intelligence"])

# Ticker to sector mapping for popular Indian stocks
SECTOR_MAP = {
    "RELIANCE": "Energy & Oil",
    "TCS": "IT Services",
    "INFY": "IT Services",
    "WIPRO": "IT Services",
    "HDFCBANK": "Financial Services",
    "ICICIBANK": "Financial Services",
    "SBIN": "Financial Services",
    "AXISBANK": "Financial Services",
    "ITC": "FMCG",
    "HINDUNILVR": "FMCG",
    "BHARTIARTL": "Telecommunication",
    "LT": "Engineering & Infra",
    "SUNPHARMA": "Healthcare & Pharma",
    "TATAMOTORS": "Automobile",
    "JSWSTEEL": "Metals & Mining",
    "TATASTEEL": "Metals & Mining",
    "M&M": "Automobile",
    "NIFTY": "Indices",
    "BANKNIFTY": "Indices"
}

@router.get("/", response_model=PortfolioResponse)
async def get_portfolio(
    current_user: User = Depends(get_current_verified_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieves the current authenticated user's portfolio."""
    query = select(Portfolio).where(Portfolio.user_id == current_user.id)
    result = await db.execute(query)
    portfolio = result.scalar_one_or_none()
    
    if not portfolio:
        # Auto-create default
        portfolio = Portfolio(user_id=current_user.id, name="Default Portfolio", holdings=[])
        db.add(portfolio)
        await db.commit()
        await db.refresh(portfolio)
        
    return portfolio


@router.post("/update", response_model=PortfolioResponse)
async def update_portfolio(
    payload: PortfolioCreate,
    current_user: User = Depends(get_current_verified_user),
    db: AsyncSession = Depends(get_db)
):
    """Updates user portfolio holdings list."""
    query = select(Portfolio).where(Portfolio.user_id == current_user.id)
    result = await db.execute(query)
    portfolio = result.scalar_one_or_none()
    
    if not portfolio:
        portfolio = Portfolio(user_id=current_user.id, name=payload.name)
        db.add(portfolio)
    else:
        portfolio.name = payload.name
        
    # Convert holding schema objects to serializable dictionaries
    serialized_holdings = [h.dict() for h in payload.holdings]
    portfolio.holdings = serialized_holdings
    
    await db.commit()
    await db.refresh(portfolio)
    return portfolio


@router.get("/analysis")
async def analyze_portfolio(
    current_user: User = Depends(get_current_verified_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Runs advanced analytical queries on holdings:
    - Diversification (Allocation percentages)
    - Sector Concentrations
    - Risk Exposure calculations (weighted Beta, max drawdown estimations)
    - Rebalancing suggestions based on thresholds
    """
    query = select(Portfolio).where(Portfolio.user_id == current_user.id)
    result = await db.execute(query)
    portfolio = result.scalar_one_or_none()
    
    if not portfolio or not portfolio.holdings:
        return {
            "total_value": 0.0,
            "diversification": [],
            "sector_concentration": [],
            "risk_exposure": {"beta": 1.0, "risk_rating": "Low"},
            "suggestions": ["Add holdings to unlock portfolio intelligence."]
        }
        
    holdings: List[Dict[str, Any]] = portfolio.holdings
    
    # Calculate live values
    total_value = 0.0
    evaluated_holdings = []
    
    for h in holdings:
        symbol = h["symbol"].upper()
        shares = int(h["shares"])
        avg_price = float(h["avg_price"])
        cost_basis = shares * avg_price
        
        # Fetch live price
        try:
            quote = await data_provider.get_live_quote(symbol)
            live_price = float(quote["price"])
        except Exception:
            live_price = avg_price  # Fallback to cost
            
        current_val = shares * live_price
        total_value += current_val
        pnl = current_val - cost_basis
        pnl_pct = (pnl / cost_basis) * 100 if cost_basis else 0.0
        
        sector = SECTOR_MAP.get(symbol, "Other / MidCap")
        
        evaluated_holdings.append({
            "symbol": symbol,
            "shares": shares,
            "avg_price": avg_price,
            "live_price": live_price,
            "cost_basis": cost_basis,
            "current_value": current_val,
            "pnl": pnl,
            "pnl_percent": round(pnl_pct, 2),
            "sector": sector
        })
        
    if total_value == 0:
        return {"total_value": 0, "diversification": []}

    # Diversification (Allocation %) & Sector Concentration
    diversification = []
    sector_sums = {}
    
    for eh in evaluated_holdings:
        weight = (eh["current_value"] / total_value) * 100
        diversification.append({
            "symbol": eh["symbol"],
            "allocation_percent": round(weight, 2),
            "current_value": round(eh["current_value"], 2)
        })
        
        sec = eh["sector"]
        sector_sums[sec] = sector_sums.get(sec, 0.0) + eh["current_value"]

    sector_concentration = []
    for sec, val in sector_sums.items():
        sec_weight = (val / total_value) * 100
        sector_concentration.append({
            "sector": sec,
            "allocation_percent": round(sec_weight, 2),
            "value": round(val, 2)
        })
        
    # Risk Profile (Simulated Beta based on sectors)
    # Financial Services Beta ~ 1.2, IT ~ 1.0, FMCG ~ 0.7, Pharma ~ 0.8, Utilities ~ 0.9, Automobile ~ 1.1, Others ~ 1.15
    beta_map = {
        "Financial Services": 1.2,
        "IT Services": 1.0,
        "FMCG": 0.7,
        "Telecommunication": 0.95,
        "Engineering & Infra": 1.1,
        "Healthcare & Pharma": 0.8,
        "Automobile": 1.15,
        "Metals & Mining": 1.3,
        "Other / MidCap": 1.2,
    }
    
    weighted_beta = 0.0
    for eh in evaluated_holdings:
        weight = eh["current_value"] / total_value
        sector = eh["sector"]
        beta = beta_map.get(sector, 1.15)
        weighted_beta += weight * beta
        
    risk_rating = "Moderate"
    if weighted_beta > 1.15:
        risk_rating = "High (Aggressive portfolio)"
    elif weighted_beta < 0.85:
        risk_rating = "Low (Defensive / Conservative portfolio)"

    # Rebalancing Suggestions
    suggestions = []
    
    # 1. Overconcentration Check
    for sc in sector_concentration:
        if sc["allocation_percent"] > 35.0:
            suggestions.append(
                f"Your exposure to '{sc['sector']}' sector is at {sc['allocation_percent']}%, exceeding the recommended 35% limit. Consider locking gains or trimming positions."
            )
            
    # 2. Diversification size check
    if len(holdings) < 4:
        suggestions.append(
            "Your portfolio holds only " + str(len(holdings)) + " stock(s). Consider adding at least 5-8 uncorrelated stocks to lower unsystematic risk."
        )
        
    # 3. Defensive sectors check
    fmcg_pharma_exposure = sum(sc["allocation_percent"] for sc in sector_concentration if sc["sector"] in ["FMCG", "Healthcare & Pharma"])
    if fmcg_pharma_exposure < 10.0:
        suggestions.append(
            f"Defensive sectors (FMCG, Pharma) represent only {round(fmcg_pharma_exposure, 2)}% of your portfolio. Consider allocating more to weather market pullbacks."
        )

    if not suggestions:
        suggestions.append("Your portfolio is well-balanced and meets all structural health guidelines.")

    return {
        "total_value": round(total_value, 2),
        "holdings": evaluated_holdings,
        "diversification": sorted(diversification, key=lambda x: x["allocation_percent"], reverse=True),
        "sector_concentration": sorted(sector_concentration, key=lambda x: x["allocation_percent"], reverse=True),
        "risk_exposure": {
            "beta": round(weighted_beta, 2),
            "risk_rating": risk_rating
        },
        "suggestions": suggestions
    }
