from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from backend.app.core.config import settings

import socket
import logging
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

def check_postgres_available(url: str) -> bool:
    if "postgresql" not in url:
        return False
    try:
        clean_url = url.replace("postgresql+asyncpg://", "http://")
        parsed = urlparse(clean_url)
        host = parsed.hostname or "localhost"
        port = parsed.port or 5432
        with socket.create_connection((host, port), timeout=1.0):
            return True
    except Exception:
        return False

db_url = settings.DATABASE_URL
if "postgresql" in db_url and not check_postgres_available(db_url):
    logger.warning("PostgreSQL database is unavailable. Automatically switching to SQLite fallback database...")
    db_url = "sqlite+aiosqlite:///./marketmind.db"

# Create async engine and sessionmaker
if "sqlite" in db_url:
    engine = create_async_engine(
        db_url,
        future=True,
        echo=False,
    )
else:
    engine = create_async_engine(
        db_url,
        future=True,
        echo=False,
        pool_size=20,
        max_overflow=10,
    )

async_session_maker = async_sessionmaker(
    engine, 
    class_=AsyncSession, 
    expire_on_commit=False
)

# Declarative Base for 2.0 ORM models
class Base(DeclarativeBase):
    pass

# Dependency to get db session
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
