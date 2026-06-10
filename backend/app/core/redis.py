import logging
import redis.asyncio as aioredis
from backend.app.core.config import settings

logger = logging.getLogger(__name__)

class RedisClient:
    def __init__(self):
        self.redis: aioredis.Redis | None = None

    async def initialize(self):
        try:
            self.redis = aioredis.from_url(
                settings.REDIS_URL, 
                encoding="utf-8", 
                decode_responses=True
            )
            # Test connection
            await self.redis.ping()
            logger.info("Connected to Redis successfully.")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            self.redis = None

    async def close(self):
        if self.redis:
            await self.redis.close()
            logger.info("Redis connection closed.")

    async def get(self, key: str) -> str | None:
        if not self.redis:
            return None
        try:
            return await self.redis.get(key)
        except Exception as e:
            logger.error(f"Redis get error: {e}")
            return None

    async def set(self, key: str, value: str, expire: int = None) -> bool:
        if not self.redis:
            return False
        try:
            return await self.redis.set(key, value, ex=expire)
        except Exception as e:
            logger.error(f"Redis set error: {e}")
            return False

    async def delete(self, key: str) -> bool:
        if not self.redis:
            return False
        try:
            return await self.redis.delete(key) > 0
        except Exception as e:
            logger.error(f"Redis delete error: {e}")
            return False

    async def is_rate_limited(self, key: str, limit: int, period: int) -> bool:
        """
        Implements a simple sliding window rate limiter in Redis.
        """
        if not self.redis:
            return False  # Fail-open if Redis is down (or log error)
        try:
            current = await self.redis.get(key)
            if current is not None:
                if int(current) >= limit:
                    return True
                await self.redis.incr(key)
            else:
                await self.redis.set(key, 1, ex=period)
            return False
        except Exception as e:
            logger.error(f"Redis rate limiting error: {e}")
            return False

redis_client = RedisClient()
