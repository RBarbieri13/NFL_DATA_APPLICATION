"""
Player data models and schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class PlayerBase(BaseModel):
    player_name: str
    position: str
    team: str

class Player(PlayerBase):
    player_id: str
    created_at: Optional[datetime] = None

class PlayerStats(BaseModel):
    player_id: str
    player_name: str
    position: str
    team: str
    season: int
    week: Optional[int] = None
    opponent: Optional[str] = None
    passing_yards: Optional[float] = 0
    passing_tds: Optional[int] = 0
    interceptions: Optional[int] = 0
    rushing_yards: Optional[float] = 0
    rushing_tds: Optional[int] = 0
    receptions: Optional[int] = 0
    receiving_yards: Optional[float] = 0
    receiving_tds: Optional[int] = 0
    targets: Optional[int] = 0
    fumbles_lost: Optional[int] = 0
    fantasy_points: Optional[float] = 0
    snap_percentage: Optional[float] = None
    snap_count: Optional[int] = None
    dk_salary: Optional[int] = None

class SeasonStats(BaseModel):
    player_id: str
    player_name: str
    position: str
    team: str
    season: int
    games_played: int = 0
    passing_yards: float = 0
    passing_tds: int = 0
    interceptions: int = 0
    rushing_yards: float = 0
    rushing_tds: int = 0
    receptions: int = 0
    receiving_yards: float = 0
    receiving_tds: int = 0
    targets: int = 0
    fumbles_lost: int = 0
    fantasy_points: float = 0

class PlayerStatsResponse(BaseModel):
    success: bool
    data: List[PlayerStats]
    total_count: int
    page: int = 1
    page_size: int = 100

class RefreshResponse(BaseModel):
    success: bool
    message: str
    records_loaded: int
    timestamp: datetime
    snap_records_loaded: Optional[int] = 0

class DraftKingsResponse(BaseModel):
    success: bool
    data: Optional[dict] = None
    message: str
    timestamp: datetime
    records_processed: Optional[int] = 0