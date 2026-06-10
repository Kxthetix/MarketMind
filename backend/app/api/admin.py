import uuid
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from backend.app.core.database import get_db
from backend.app.api.deps import check_admin
from backend.app.models.user import User
from backend.app.models.payment import PaymentSubscription
from backend.app.models.logs import AIUsageLog, AuditLog

router = APIRouter(prefix="/admin", tags=["Admin Panel"], dependencies=[Depends(check_admin)])

@router.get("/users")
async def get_all_users(db: AsyncSession = Depends(get_db)):
    """Lists all users registered in the system (Admin only)."""
    query = select(User).order_by(User.created_at.desc())
    result = await db.execute(query)
    users = result.scalars().all()
    
    # Exclude password hashes from response
    user_list = []
    for u in users:
        user_list.append({
            "id": u.id,
            "email": u.email,
            "role": u.role,
            "is_verified": u.is_verified,
            "created_at": u.created_at
        })
    return user_list


@router.post("/users/{user_id}/role")
async def update_user_role(
    user_id: uuid.UUID,
    role: str,
    db: AsyncSession = Depends(get_db)
):
    """Overrides a user's subscription or system role (Admin only)."""
    if role not in ["free", "premium", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid role. Must be free, premium, or admin.")
        
    query = select(User).where(User.id == user_id)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.role = role
    await db.commit()
    return {"message": f"Successfully updated user role to {role}"}


@router.get("/analytics/ai")
async def get_ai_analytics(db: AsyncSession = Depends(get_db)):
    """Aggregates AI usage analytics: token expenditure and cost tracking (Admin only)."""
    # Total calls
    calls_query = select(func.count(AIUsageLog.id))
    calls_res = await db.execute(calls_query)
    total_calls = calls_res.scalar() or 0
    
    # Token sum
    tokens_query = select(func.sum(AIUsageLog.token_count))
    tokens_res = await db.execute(tokens_query)
    total_tokens = tokens_res.scalar() or 0
    
    # Cost sum
    cost_query = select(func.sum(AIUsageLog.cost))
    cost_res = await db.execute(cost_query)
    total_cost = cost_res.scalar() or 0.0
    
    # Group by Agent name
    agent_query = select(AIUsageLog.agent_name, func.count(AIUsageLog.id), func.sum(AIUsageLog.token_count)).group_by(AIUsageLog.agent_name)
    agent_res = await db.execute(agent_query)
    
    agent_breakdown = []
    for row in agent_res.all():
        agent_breakdown.append({
            "agent": row[0],
            "calls": row[1],
            "tokens": row[2]
        })

    return {
        "total_api_calls": total_calls,
        "total_tokens_consumed": total_tokens,
        "total_costs_incurred_usd": round(total_cost, 4),
        "agent_breakdown": agent_breakdown
    }


@router.get("/analytics/revenue")
async def get_revenue_analytics(db: AsyncSession = Depends(get_db)):
    """Computes subscription revenue and active subscriber metrics (Admin only)."""
    # Total subscribers
    subs_query = select(func.count(PaymentSubscription.id)).where(PaymentSubscription.status == "active")
    subs_res = await db.execute(subs_query)
    active_subscribers = subs_res.scalar() or 0
    
    # Mock MRR (assuming 999 INR per active premium subscription)
    mrr = active_subscribers * 999
    
    return {
        "active_subscribers": active_subscribers,
        "monthly_recurring_revenue_inr": mrr,
        "pricing_tiers": {
            "free": "0 INR",
            "premium": "999 INR / Month"
        }
    }


@router.get("/audit-logs")
async def get_audit_logs(limit: int = 100, db: AsyncSession = Depends(get_db)):
    """Retrieves chronological security audit trails (Admin only)."""
    query = select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit)
    result = await db.execute(query)
    logs = result.scalars().all()
    
    return [
        {
            "id": l.id,
            "user_id": l.user_id,
            "action": l.action,
            "ip_address": l.ip_address,
            "details": l.details,
            "timestamp": l.created_at
        }
        for l in logs
    ]
