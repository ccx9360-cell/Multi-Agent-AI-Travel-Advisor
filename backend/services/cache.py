"""
In-memory TTL cache for API responses.
Reduces duplicate upstream calls (same city queries in quick succession).
"""

import time
import logging
from typing import Any, Optional, Callable, Awaitable

logger = logging.getLogger(__name__)


class TTLCache:
    """Simple TTL cache with automatic expiration."""

    def __init__(self, default_ttl: int = 300):
        self._store: dict[str, tuple[float, Any]] = {}
        self.default_ttl = default_ttl

    def get(self, key: str) -> Optional[Any]:
        """Get cached value if still valid."""
        entry = self._store.get(key)
        if entry is None:
            return None
        expires_at, value = entry
        if time.monotonic() > expires_at:
            del self._store[key]
            return None
        return value

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """Set cached value with optional TTL override."""
        ttl = ttl if ttl is not None else self.default_ttl
        self._store[key] = (time.monotonic() + ttl, value)

    def invalidate(self, key: str) -> None:
        """Remove a specific cache entry."""
        self._store.pop(key, None)

    def clear(self) -> None:
        """Clear all cached entries."""
        self._store.clear()

    async def get_or_fetch(
        self, key: str, fetcher: Callable[[], Awaitable[Any]], ttl: Optional[int] = None
    ) -> Any:
        """Cache-aside: return cached value or fetch + cache."""
        cached = self.get(key)
        if cached is not None:
            logger.debug(f"Cache HIT: {key}")
            return cached
        logger.debug(f"Cache MISS: {key} — fetching...")
        value = await fetcher()
        self.set(key, value, ttl=ttl)
        return value

    @property
    def size(self) -> int:
        return len(self._store)


# Global cache instances by domain
meituan_cache = TTLCache(default_ttl=600)      # Meituan results: 10 min
amap_poi_cache = TTLCache(default_ttl=3600)    # Amap POI: 1 hour (stable)
amap_route_cache = TTLCache(default_ttl=600)   # Amap routes: 10 min
weather_cache = TTLCache(default_ttl=1800)     # Weather: 30 min
country_cache = TTLCache(default_ttl=86400)    # Country info: 24 hours
flight_cache = TTLCache(default_ttl=300)       # Flight prices: 5 min
hotel_cache = TTLCache(default_ttl=600)        # Hotel prices: 10 min
