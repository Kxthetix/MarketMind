import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from backend.app.core.database import get_db
from backend.app.api.deps import get_current_verified_user
from backend.app.models.user import User
from backend.app.models.watchlist import Watchlist, Alert
from backend.app.schemas.watchlist import WatchlistCreate, WatchlistResponse, AlertCreate, AlertResponse

router = APIRouter(prefix="/watchlists", tags=["Watchlists & Alerts"])

@router.get("/", response_model=List[WatchlistResponse])
async def get_watchlists(
    current_user: User = Depends(get_current_verified_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieves all watchlists created by the user."""
    query = select(Watchlist).where(Watchlist.user_id == current_user.id)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/create", response_model=WatchlistResponse, status_code=status.HTTP_201_CREATED)
async def create_watchlist(
    payload: WatchlistCreate,
    current_user: User = Depends(get_current_verified_user),
    db: AsyncSession = Depends(get_db)
):
    """Creates a new watchlist with symbols."""
    # Ensure symbols are clean and uppercase
    symbols_clean = [s.strip().upper() for s in payload.symbols]
    
    new_wl = Watchlist(
        user_id=current_user.id,
        name=payload.name,
        symbols=symbols_clean
    )
    db.add(new_wl)
    await db.commit()
    await db.refresh(new_wl)
    return new_wl


@router.delete("/{watchlist_id}", status_code=status.HTTP_200_OK)
async def delete_watchlist(
    watchlist_id: uuid.UUID,
    current_user: User = Depends(get_current_verified_user),
    db: AsyncSession = Depends(get_db)
):
    """Deletes a user watchlist."""
    query = select(Watchlist).where(
        Watchlist.id == watchlist_id,
        Watchlist.user_id == current_user.id
    )
    result = await db.execute(query)
    watchlist = result.scalar_one_or_none()
    
    if not watchlist:
        raise HTTPException(status_code=404, detail="Watchlist not found")
        
    await db.delete(watchlist)
    await db.commit()
    return {"message": "Watchlist deleted successfully"}


# Alerts Management APIs
@router.post("/alerts/create", response_model=AlertResponse, status_code=status.HTTP_201_CREATED)
async def create_alert(
    payload: AlertCreate,
    current_user: User = Depends(get_current_verified_user),
    db: AsyncSession = Depends(get_db)
):
    """Sets a price or technical threshold alert on a symbol."""
    new_alert = Alert(
        user_id=current_user.id,
        symbol=payload.symbol.strip().upper(),
        alert_type=payload.alert_type,
        condition=payload.condition,
        target_value=payload.target_value,
        is_active=True
    )
    db.add(new_alert)
    await db.commit()
    await db.refresh(new_alert)
    return new_alert


@router.get("/alerts", response_model=List[AlertResponse])
async def get_alerts(
    current_user: User = Depends(get_current_verified_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieves all active alerts set by the user."""
    query = select(Alert).where(Alert.user_id == current_user.id)
    result = await db.execute(query)
    return result.scalars().all()


@router.delete("/alerts/{alert_id}", status_code=status.HTTP_200_OK)
async def delete_alert(
    alert_id: uuid.UUID,
    current_user: User = Depends(get_current_verified_user),
    db: AsyncSession = Depends(get_db)
):
    """Removes an alert by ID."""
    query = select(Alert).where(
        Alert.id == alert_id,
        Alert.user_id == current_user.id
    )
    result = await db.execute(query)
    alert = result.scalar_one_or_none()
    
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
        
    await db.delete(alert)
    await db.commit()
    return {"message": "Alert deleted successfully"}
