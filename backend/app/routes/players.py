"""
Player API routes
"""
from fastapi import APIRouter, Query, HTTPException
from typing import Optional, List
import logging

from app.services.player_service import get_player_service
from app.models.player import PlayerStatsResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/players", tags=["players"])

@router.get("/weekly-stats", response_model=PlayerStatsResponse)
async def get_weekly_stats(
    season: int = Query(..., description="NFL season"),
    week: Optional[int] = Query(None, description="Specific week"),
    position: Optional[str] = Query(None, description="Player position (QB, RB, WR, TE)"),
    team: Optional[str] = Query(None, description="Team abbreviation"),
    player_name: Optional[str] = Query(None, description="Player name search"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(100, ge=1, le=500, description="Records per page")
):
    """Get weekly player statistics with filtering and pagination"""
    try:
        player_service = get_player_service()
        result = player_service.get_weekly_stats(
            season=season,
            week=week,
            position=position,
            team=team,
            player_name=player_name,
            page=page,
            page_size=page_size
        )
        
        if not result.success:
            raise HTTPException(status_code=500, detail="Failed to retrieve weekly stats")
        
        return result
        
    except Exception as e:
        logger.error(f"Error getting weekly stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/season-stats")
async def get_season_stats(
    season: int = Query(..., description="NFL season"),
    position: Optional[str] = Query(None, description="Player position (QB, RB, WR, TE)"),
    team: Optional[str] = Query(None, description="Team abbreviation"),
    player_name: Optional[str] = Query(None, description="Player name search"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(100, ge=1, le=500, description="Records per page")
):
    """Get season-long aggregated player statistics"""
    try:
        player_service = get_player_service()
        result = player_service.get_season_stats(
            season=season,
            position=position,
            team=team,
            player_name=player_name,
            page=page,
            page_size=page_size
        )
        
        if not result["success"]:
            raise HTTPException(status_code=500, detail="Failed to retrieve season stats")
        
        return result
        
    except Exception as e:
        logger.error(f"Error getting season stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/trend-data")
async def get_trend_data(
    player_names: List[str] = Query(..., description="List of player names"),
    season: int = Query(..., description="NFL season"),
    weeks: Optional[List[int]] = Query(None, description="Specific weeks to include")
):
    """Get trend data for specific players across weeks"""
    try:
        if not player_names:
            raise HTTPException(status_code=400, detail="At least one player name is required")
        
        player_service = get_player_service()
        result = player_service.get_player_trend_data(
            player_names=player_names,
            season=season,
            weeks=weeks
        )
        
        if not result["success"]:
            raise HTTPException(status_code=500, detail=result.get("message", "Failed to retrieve trend data"))
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting trend data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/top-performers")
async def get_top_performers(
    season: int = Query(..., description="NFL season"),
    position: Optional[str] = Query(None, description="Player position (QB, RB, WR, TE)"),
    stat_type: str = Query("fantasy_points", description="Stat to rank by"),
    limit: int = Query(20, ge=1, le=100, description="Number of top performers"),
    week: Optional[int] = Query(None, description="Specific week (otherwise season stats)")
):
    """Get top performers by specific statistic"""
    try:
        player_service = get_player_service()
        result = player_service.get_top_performers(
            season=season,
            position=position,
            stat_type=stat_type,
            limit=limit,
            week=week
        )
        
        if not result["success"]:
            raise HTTPException(status_code=500, detail=result.get("message", "Failed to retrieve top performers"))
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting top performers: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/search")
async def search_players(
    q: str = Query(..., min_length=2, description="Search query"),
    season: int = Query(..., description="NFL season"),
    limit: int = Query(20, ge=1, le=100, description="Maximum number of results")
):
    """Search for players by name"""
    try:
        player_service = get_player_service()
        result = player_service.search_players(
            query=q,
            season=season,
            limit=limit
        )
        
        if not result["success"]:
            raise HTTPException(status_code=500, detail=result.get("message", "Search failed"))
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error searching players: {e}")
        raise HTTPException(status_code=500, detail=str(e))