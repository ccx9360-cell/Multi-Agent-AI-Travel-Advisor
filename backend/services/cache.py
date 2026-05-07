"""
In-memory TTL cache for API responses.
Reduces duplicate upstream calls (same queries in quick succession).

Provides per-domain cache instances + a @cached decorator.
"""
import functools
import hashlib
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


# ── Per-domain cache instances ──────────────────────────────────

meituan_cache = TTLCache(default_ttl=600)       # 美团: 10 min
amap_poi_cache = TTLCache(default_ttl=3600)     # 高德POI: 1 hour
amap_route_cache = TTLCache(default_ttl=600)    # 高德路线: 10 min
weather_cache = TTLCache(default_ttl=1800)      # 天气: 30 min
train_cache = TTLCache(default_ttl=300)         # 火车票: 5 min
knowledge_cache = TTLCache(default_ttl=30)      # 知识库: 30秒


# ── Decorator ───────────────────────────────────────────────────

def cached(ttl_seconds: int = 300, cache: TTLCache = None):
    """
    Decorator: cache function results with TTL.

    Can be used with a specific cache instance or auto-creates one.
    Works with both sync and async functions.

    Usage:
        @cached(ttl_seconds=300)
        def my_func(arg): ...

        @cached(ttl_seconds=600, cache=meituan_cache)
        async def my_async(arg): ...
    """
    def decorator(func):
        _cache = cache or TTLCache(default_ttl=ttl_seconds)
        _ttl = ttl_seconds

        if hasattr(func, '__code__'):
            func_module = getattr(func, '__module__', 'unknown')
            func_name = f"{func_module}.{func.__name__}"

        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs):
            # Build cache key from args
            key_parts = [func_name] + [str(a) for a in args] + [f"{k}={v}" for k, v in sorted(kwargs.items())]
            cache_key = hashlib.md5("|".join(key_parts).encode()).hexdigest()

            cached_val = _cache.get(cache_key)
            if cached_val is not None:
                return cached_val

            result = func(*args, **kwargs)
            _cache.set(cache_key, result, ttl=_ttl)
            return result

        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs):
            key_parts = [func_name] + [str(a) for a in args] + [f"{k}={v}" for k, v in sorted(kwargs.items())]
            cache_key = hashlib.md5("|".join(key_parts).encode()).hexdigest()

            cached_val = _cache.get(cache_key)
            if cached_val is not None:
                return cached_val

            result = await func(*args, **kwargs)
            _cache.set(cache_key, result, ttl=_ttl)
            return result

        # Store the func name for key building
        func_name = f"{func.__module__}.{func.__name__}"

        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper

    return decorator
