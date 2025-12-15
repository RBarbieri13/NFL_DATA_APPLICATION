"""
Data management API routes
"""
from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import List, Optional
import logging
from datetime import datetime, timezone

from app.services.etl_service import get_etl_service
from app.utils.cache import get_cache
from app.models.player import RefreshResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/data", tags=["data"])

@router.post("/refresh", response_model=RefreshResponse)
async def refresh_data(
    background_tasks: BackgroundTasks,
    seasons: Optional[List[int]] = None,
    include_current_extras: bool = True
):
    """
    Refresh NFL data for specified seasons
    
    Args:
        seasons: List of seasons to refresh (defaults to [2023, 2024, 2025])
        include_current_extras: Include snap counts and DK pricing for current season
    """
    try:
        if seasons is None:
            seasons = [2023, 2024, 2025]
        
        # Validate seasons
        current_year = datetime.now().year
        valid_seasons = [s for s in seasons if 2020 <= s <= current_year + 1]
        
        if not valid_seasons:
            raise HTTPException(
                status_code=400, 
                detail="No valid seasons specified. Must be between 2020 and current year + 1"
            )
        
        etl_service = get_etl_service()
        
        # Start background task for data loading
        background_tasks.add_task(
            _background_data_refresh,
            etl_service,
            valid_seasons,
            include_current_extras
        )
        
        return RefreshResponse(
            success=True,
            message=f"Data refresh started for seasons: {valid_seasons}",
            records_loaded=0,  # Will be updated by background task
            timestamp=datetime.now(timezone.utc)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting data refresh: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def _background_data_refresh(etl_service, seasons: List[int], include_current_extras: bool):
    """Background task for data refresh"""
    try:
        logger.info(f"Starting background data refresh for seasons: {seasons}")
        
        result = await etl_service.load_season_data(
            seasons=seasons,
            include_current_season_extras=include_current_extras
        )
        
        logger.info(f"Background data refresh completed: {result}")
        
        # Clear cache after successful refresh
        cache = get_cache()
        cache.clear()
        
    except Exception as e:
        logger.error(f"Background data refresh failed: {e}")

@router.post("/load-season/{season}")
async def load_season_data(
    season: int,
    background_tasks: BackgroundTasks,
    include_extras: bool = True
):
    """Load data for a specific season"""
    try:
        current_year = datetime.now().year
        if not (2020 <= season <= current_year + 1):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid season. Must be between 2020 and {current_year + 1}"
            )
        
        etl_service = get_etl_service()
        
        # Start background task
        background_tasks.add_task(
            _background_season_load,
            etl_service,
            season,
            include_extras
        )
        
        return {
            "success": True,
            "message": f"Season {season} data loading started",
            "season": season,
            "timestamp": datetime.now(timezone.utc)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting season load: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def _background_season_load(etl_service, season: int, include_extras: bool):
    """Background task for single season load"""
    try:
        logger.info(f"Starting background load for season {season}")
        
        result = await etl_service.load_season_data(
            seasons=[season],
            include_current_season_extras=include_extras
        )
        
        logger.info(f"Background season load completed: {result}")
        
        # Clear cache after successful load
        cache = get_cache()
        cache.clear()
        
    except Exception as e:
        logger.error(f"Background season load failed: {e}")

@router.get("/status")
async def get_data_status():
    """Get current data status and statistics"""
    try:
        from app.utils.database import get_db
        
        db = get_db()
        
        # Get data counts by season
        season_stats = db.execute_query("""
            SELECT season, COUNT(*) as weekly_records
            FROM weekly_stats 
            GROUP BY season 
            ORDER BY season DESC
        """)
        
        season_aggregates = db.execute_query("""
            SELECT season, COUNT(*) as season_records
            FROM season_stats 
            GROUP BY season 
            ORDER BY season DESC
        """)
        
        # Get cache statistics
        cache = get_cache()
        cache_stats = cache.stats()
        
        # Get latest update timestamps
        latest_updates = db.execute_query("""
            SELECT 
                'weekly_stats' as table_name,
                MAX(created_at) as last_updated
            FROM weekly_stats
            UNION ALL
            SELECT 
                'season_stats' as table_name,
                MAX(created_at) as last_updated
            FROM season_stats
        """)
        
        return {
            "success": True,
            "data": {
                "season_stats": season_stats,
                "season_aggregates": season_aggregates,
                "cache_stats": cache_stats,
                "latest_updates": latest_updates
            },
            "timestamp": datetime.now(timezone.utc)
        }
        
    except Exception as e:
        logger.error(f"Error getting data status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/cache")
async def clear_cache():
    """Clear application cache"""
    try:
        cache = get_cache()
        cache.clear()
        
        return {
            "success": True,
            "message": "Cache cleared successfully",
            "timestamp": datetime.now(timezone.utc)
        }
        
    except Exception as e:
        logger.error(f"Error clearing cache: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/seasons")
async def get_available_seasons():
    """Get list of available seasons in the database"""
    try:
        from app.utils.database import get_db
        
        db = get_db()
        
        weekly_seasons = db.execute_query("""
            SELECT DISTINCT season 
            FROM weekly_stats 
            ORDER BY season DESC
        """)
        
        season_seasons = db.execute_query("""
            SELECT DISTINCT season 
            FROM season_stats 
            ORDER BY season DESC
        """)
        
        return {
            "success": True,
            "data": {
                "weekly_data_seasons": [row['season'] for row in weekly_seasons],
                "season_data_seasons": [row['season'] for row in season_seasons]
            },
            "timestamp": datetime.now(timezone.utc)
        }
        
    except Exception as e:
        logger.error(f"Error getting available seasons: {e}")
        raise HTTPException(status_code=500, detail=str(e))