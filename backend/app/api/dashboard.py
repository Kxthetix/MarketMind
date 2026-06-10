from fastapi import APIRouter, Depends
from backend.app.services.data_provider import data_provider

router = APIRouter(prefix="/dashboard", tags=["Market Dashboard"])

@router.get("/metrics")
async def get_dashboard_metrics():
    """
    Returns high-level statistics:
    - Nifty 50 / Bank Nifty indices
    - Top Gainers & Top Losers (NSE/BSE)
    - Sector Performances
    """
    metrics = await data_provider.get_dashboard_metrics()
    return metrics
