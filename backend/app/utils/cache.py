"""
In-memory caching utilities for improved performance
"""
import time
import logging
from typing import Any, Optional, Dict, Callable
from functools import wraps
from app.config.settings import CACHE_CONFIG

logger = logging.getLogger(__name__)

class SimpleCache:
    """Simple in-memory cache with TTL support"""
    
    def __init__(self, default_ttl: int = CACHE_CONFIG["default_ttl"], 
                 max_size: int = CACHE_CONFIG["max_size"]):
        self.default_ttl = default_ttl
        self.max_size = max_size
        self._cache: Dict[str, Dict[str, Any]] = {}
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        if key not in self._cache:
            return None
        
        entry = self._cache[key]
        
        # Check if expired
        if time.time() > entry['expires_at']:
            del self._cache[key]
            return None
        
        entry['last_accessed'] = time.time()
        return entry['value']
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """Set value in cache"""
        if ttl is None:
            ttl = self.default_ttl
        
        # Evict oldest entries if cache is full
        if len(self._cache) >= self.max_size:
            self._evict_oldest()
        
        self._cache[key] = {
            'value': value,
            'expires_at': time.time() + ttl,
            'last_accessed': time.time(),
            'created_at': time.time()
        }
    
    def delete(self, key: str) -> bool:
        """Delete key from cache"""
        if key in self._cache:
            del self._cache[key]
            return True
        return False
    
    def clear(self) -> None:
        """Clear all cache entries"""
        self._cache.clear()
    
    def _evict_oldest(self) -> None:
        """Evict oldest entries to make room"""
        if not self._cache:
            return
        
        # Remove 10% of oldest entries
        entries_to_remove = max(1, len(self._cache) // 10)
        
        # Sort by last accessed time
        sorted_entries = sorted(
            self._cache.items(),
            key=lambda x: x[1]['last_accessed']
        )
        
        for i in range(entries_to_remove):
            key = sorted_entries[i][0]
            del self._cache[key]
    
    def stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        now = time.time()
        expired_count = sum(
            1 for entry in self._cache.values()
            if now > entry['expires_at']
        )
        
        return {
            'total_entries': len(self._cache),
            'expired_entries': expired_count,
            'max_size': self.max_size,
            'default_ttl': self.default_ttl
        }

# Global cache instance
cache = SimpleCache()

def cached(ttl: Optional[int] = None, key_prefix: str = ""):
    """Decorator for caching function results"""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Generate cache key
            cache_key = f"{key_prefix}{func.__name__}:{hash(str(args) + str(sorted(kwargs.items())))}"
            
            # Try to get from cache
            result = cache.get(cache_key)
            if result is not None:
                logger.debug(f"Cache hit for {cache_key}")
                return result
            
            # Execute function and cache result
            logger.debug(f"Cache miss for {cache_key}")
            result = func(*args, **kwargs)
            cache.set(cache_key, result, ttl)
            
            return result
        return wrapper
    return decorator

def cache_key_for_player_stats(season: int, week: Optional[int] = None, 
                              position: Optional[str] = None, 
                              team: Optional[str] = None) -> str:
    """Generate cache key for player stats queries"""
    key_parts = [f"player_stats:season_{season}"]
    
    if week is not None:
        key_parts.append(f"week_{week}")
    if position:
        key_parts.append(f"pos_{position}")
    if team:
        key_parts.append(f"team_{team}")
    
    return ":".join(key_parts)

def cache_key_for_season_stats(season: int, position: Optional[str] = None) -> str:
    """Generate cache key for season stats queries"""
    key_parts = [f"season_stats:season_{season}"]
    
    if position:
        key_parts.append(f"pos_{position}")
    
    return ":".join(key_parts)

def invalidate_player_cache(player_id: str, season: int):
    """Invalidate cache entries for a specific player and season"""
    # This is a simple implementation - in production you might want
    # more sophisticated cache invalidation
    cache.clear()  # For now, clear all cache
    logger.info(f"Invalidated cache for player {player_id}, season {season}")

def get_cache() -> SimpleCache:
    """Get cache instance"""
    return cache