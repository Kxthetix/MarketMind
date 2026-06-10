import uuid
from datetime import datetime
from typing import List
from pydantic import BaseModel, Field

class WatchlistCreate(BaseModel):
    name: str = Field("My Watchlist", min_length=1, max_length=100)
    symbols: List[str] = Field(default_factory=list)

class WatchlistResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    symbols: List[str]
    created_at: datetime

    model_config = {"from_attributes": True}

class AlertCreate(BaseModel):
    symbol: str = Field(..., description="Stock symbol, e.g. TCS")
    alert_type: str = Field(..., description="Type of alert: 'price' or 'technical'")
    condition: str = Field(..., description="Trigger condition: 'above', 'below', or 'crossover'")
    target_value: float = Field(..., description="Target price or value threshold")

class AlertResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    symbol: str
    alert_type: str
    condition: str
    target_value: float
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
