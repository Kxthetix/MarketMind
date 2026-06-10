import logging
import asyncio
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.database import get_db
from backend.app.api.deps import get_current_verified_user
from backend.app.models.user import User
from backend.app.models.logs import AIUsageLog
from backend.app.agents.graph import agent_graph
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/analysis", tags=["AI Analyst Agents"])

class ResearchRequest(BaseModel):
    symbol: str = Field(..., description="Ticker symbol to analyze, e.g. RELIANCE")

class ResearchResponse(BaseModel):
    symbol: str
    report_markdown: str

@router.get("/rankings")
async def get_opportunity_rankings(
    current_user: User = Depends(get_current_verified_user)
):
    """
    Ranks top trading opportunities by executing the AI ranking node
    across multiple high-liquid Indian stocks:
    - Scoring weights: 40% Technical, 20% Sentiment, 20% Trend, 10% Volume, 10% Risk.
    """
    stock_candidates = ["RELIANCE", "TCS", "INFY", "HDFCBANK", "SBIN", "TATAMOTORS", "ITC"]
    
    async def evaluate_stock(symbol: str) -> Dict[str, Any] | None:
        try:
            initial_state = {
                "symbol": symbol,
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
            # Execute LangGraph up to the ranking node
            result = await agent_graph.ainvoke(initial_state)
            
            # Extract quote price
            price = result["market_data"]["quote"]["price"]
            change_pct = result["market_data"]["quote"]["change_percent"]
            
            score_data = result["opportunity_score"]
            return {
                "symbol": symbol,
                "price": price,
                "change_percent": round(change_pct, 2),
                "score": score_data["score"],
                "rating": score_data["rating"],
                "breakdown": score_data["weights"]
            }
        except Exception as e:
            logger.error(f"Failed to rank stock {symbol}: {e}")
            return None

    # Execute all evaluations concurrently
    tasks = [evaluate_stock(sym) for sym in stock_candidates]
    rankings_results = await asyncio.gather(*tasks)
    
    # Filter out failures
    valid_rankings = [r for r in rankings_results if r is not None]
    
    # Sort by score descending
    ranked_opportunities = sorted(valid_rankings, key=lambda x: x["score"], reverse=True)
    return ranked_opportunities


@router.post("/research", response_model=ResearchResponse)
async def generate_ai_research_report(
    payload: ResearchRequest,
    current_user: User = Depends(get_current_verified_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Executes the complete multi-agent LangGraph workflow for a symbol
    to generate an evidence-based Stock Intelligence Report:
    - Logs AI usage tokens and token pricing costs in the DB for usage dashboards.
    """
    symbol = payload.symbol.upper().strip()
    
    try:
        initial_state = {
            "symbol": symbol,
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
        
        # Invoke LangGraph
        result = await agent_graph.ainvoke(initial_state)
        report_data = result["research_report"]
        
        # Log AI Usage (assumes mock token usage costs for logging audit trails)
        prompt_cost = 0.0015  # Mock OpenAI input pricing
        tokens = 450
        cost = tokens * (prompt_cost / 1000)
        
        usage_log = AIUsageLog(
            user_id=current_user.id,
            agent_name="ResearchAgent",
            prompt=f"Analyze {symbol}",
            token_count=tokens,
            cost=cost
        )
        db.add(usage_log)
        await db.commit()
        
        return ResearchResponse(
            symbol=report_data["symbol"],
            report_markdown=report_data["report_markdown"]
        )
    except Exception as e:
        logger.error(f"Failed to run AI agents report: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"LangGraph execution failed: {str(e)}"
        )
