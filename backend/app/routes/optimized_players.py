"""
Ultra-optimized player routes with preloaded data for instant responses
"""
import logging
from typing import Optional, List
from fastapi import APIRouter, Query, HTTPException
from app.services.optimized_player_service import get_optimized_player_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/players", tags=["players"])

# Get the optimized service
player_service = get_optimized_player_service()

@router.get("/weekly-stats")
async def get_weekly_stats(
    season: Optional[int] = Query(None, description="NFL season"),
    week: Optional[int] = Query(None, description="Week number"),
    position: Optional[str] = Query(None, description="Player position (QB, RB, WR, TE)"),
    team: Optional[str] = Query(None, description="Team abbreviation"),
    player_name: Optional[str] = Query(None, description="Player name (partial match)"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(100, ge=1, le=500, description="Records per page")
):
    """
    Get weekly player statistics with instant access from preloaded data
    
    Ultra-fast endpoint that returns data in sub-millisecond time from memory
    """
    try:
        result = player_service.get_weekly_stats(
            season=season,
            week=week,
            position=position,
            team=team,
            player_name=player_name,
            page=page,
            page_size=page_size
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Error getting weekly stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/season-stats")
async def get_season_stats(
    season: Optional[int] = Query(None, description="NFL season"),
    position: Optional[str] = Query(None, description="Player position (QB, RB, WR, TE)"),
    team: Optional[str] = Query(None, description="Team abbreviation"),
    player_name: Optional[str] = Query(None, description="Player name (partial match)"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(100, ge=1, le=500, description="Records per page")
):
    """
    Get season-long player statistics with instant access from preloaded data
    
    Returns aggregated season stats for 250+ players with sub-millisecond response time
    """
    try:
        result = player_service.get_season_stats(
            season=season,
            position=position,
            team=team,
            player_name=player_name,
            page=page,
            page_size=page_size
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Error getting season stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/top-performers")
async def get_top_performers(
    season: int = Query(..., description="NFL season"),
    position: Optional[str] = Query(None, description="Player position filter"),
    stat_type: str = Query("fantasy_points", description="Stat to rank by"),
    limit: int = Query(20, ge=1, le=100, description="Number of top performers")
):
    """
    Get top performers by specified statistic with instant access
    
    Lightning-fast rankings from preloaded data
    """
    try:
        result = player_service.get_top_performers(
            season=season,
            position=position,
            stat_type=stat_type,
            limit=limit
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Error getting top performers: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/search")
async def search_players(
    q: str = Query(..., min_length=2, description="Search query"),
    season: Optional[int] = Query(None, description="Filter by season"),
    limit: int = Query(20, ge=1, le=100, description="Maximum results")
):
    """
    Search players by name with instant results from preloaded data
    
    Real-time search with sub-millisecond response time
    """
    try:
        result = player_service.search_players(
            query=q,
            season=season,
            limit=limit
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Error searching players: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/trend-data")
async def get_trend_data(
    player_names: List[str] = Query(..., description="List of player names"),
    season: int = Query(..., description="NFL season"),
    weeks: Optional[List[int]] = Query(None, description="Specific weeks to include")
):
    """
    Get trend data for specific players across weeks
    
    Instant trend analysis from preloaded weekly data
    """
    try:
        result = player_service.get_player_trend_data(
            player_names=player_names,
            season=season,
            weeks=weeks
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Error getting trend data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/positions/{position}/leaders")
async def get_position_leaders(
    position: str,
    season: int = Query(..., description="NFL season"),
    stat_type: str = Query("fantasy_points", description="Stat to rank by"),
    limit: int = Query(50, ge=1, le=100, description="Number of leaders")
):
    """
    Get leaders for a specific position with instant access
    
    Position-specific rankings from preloaded data
    """
    try:
        # Validate position
        valid_positions = ['QB', 'RB', 'WR', 'TE']
        if position.upper() not in valid_positions:
            raise HTTPException(status_code=400, detail=f"Invalid position. Must be one of: {valid_positions}")
        
        result = player_service.get_top_performers(
            season=season,
            position=position.upper(),
            stat_type=stat_type,
            limit=limit
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting position leaders: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/compare")
async def compare_players(
    player_names: List[str] = Query(..., description="List of player names to compare"),
    season: int = Query(..., description="NFL season"),
    stat_types: Optional[List[str]] = Query(None, description="Specific stats to compare")
):
    """
    Compare multiple players side by side with instant data access
    
    Real-time player comparison from preloaded data
    """
    try:
        if len(player_names) < 2:
            raise HTTPException(status_code=400, detail="At least 2 players required for comparison")
        
        if len(player_names) > 10:
            raise HTTPException(status_code=400, detail="Maximum 10 players allowed for comparison")
        
        # Get season stats for all players
        comparison_data = []
        
        for player_name in player_names:
            player_result = player_service.get_season_stats(
                season=season,
                player_name=player_name,
                page_size=1
            )
            
            if player_result["success"] and player_result["data"]:
                player_data = player_result["data"][0]
                
                # Filter to requested stats if specified
                if stat_types:
                    filtered_data = {
                        "player_name": player_data["player_name"],
                        "position": player_data["position"],
                        "team": player_data["team"]
                    }
                    for stat in stat_types:
                        if stat in player_data:
                            filtered_data[stat] = player_data[stat]
                    comparison_data.append(filtered_data)
                else:
                    comparison_data.append(player_data)
        
        return {
            "success": True,
            "data": comparison_data,
            "season": season,
            "players_found": len(comparison_data),
            "players_requested": len(player_names)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error comparing players: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats-summary")
async def get_stats_summary(
    season: int = Query(..., description="NFL season")
):
    """
    Get comprehensive statistics summary with instant access
    
    Overview of all player data from preloaded memory
    """
    try:
        # Get data for all positions
        summary = {}
        
        for position in ['QB', 'RB', 'WR', 'TE']:
            position_data = player_service.get_season_stats(
                season=season,
                position=position,
                page_size=1000  # Get all players for this position
            )
            
            if position_data["success"]:
                players = position_data["data"]
                
                if players:
                    # Calculate summary stats
                    total_players = len(players)
                    total_fantasy_points = sum(p.get("fantasy_points", 0) for p in players)
                    avg_fantasy_points = total_fantasy_points / total_players if total_players > 0 else 0
                    
                    # Get top performer
                    top_performer = max(players, key=lambda p: p.get("fantasy_points", 0))
                    
                    summary[position] = {
                        "total_players": total_players,
                        "total_fantasy_points": round(total_fantasy_points, 1),
                        "avg_fantasy_points": round(avg_fantasy_points, 1),
                        "top_performer": {
                            "name": top_performer["player_name"],
                            "team": top_performer["team"],
                            "fantasy_points": top_performer.get("fantasy_points", 0)
                        }
                    }
        
        return {
            "success": True,
            "season": season,
            "summary": summary,
            "total_players": sum(pos_data["total_players"] for pos_data in summary.values())
        }
        
    except Exception as e:
        logger.error(f"Error getting stats summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))