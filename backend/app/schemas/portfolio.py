import uuid
from datetime import datetime
from typing import List
from pydantic import BaseModel, Field

class HoldingItem(BaseModel):
    symbol: str = Field(..., description="Stock symbol, e.g. RELIANCE")
    shares: int = Field(..., gt=0, description="Number of shares owned")
    avg_price: float = Field(..., gt=0, description="Average buying price per share")

class PortfolioCreate(BaseModel):
    name: str = Field("Default Portfolio", min_length=1, max_length=100)
    holdings: List[HoldingItem] = Field(default_factory=list)

class PortfolioResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    holdings: List[HoldingItem]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
