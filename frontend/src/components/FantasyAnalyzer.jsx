import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ChevronDown, ChevronRight, Settings, X, Star } from 'lucide-react';
import { getTeamLogo } from '../data/nflTeamLogos';
import { TrendBarCell } from './grid/trend';

// Helper function to get subtle blue background color for snap counts (relative to column)
const getSnapBackgroundColor = (value, allValues) => {
  if (!value || value <= 0 || !allValues || allValues.length === 0) return '';
  
  const validValues = allValues.filter(v => v && v > 0);
  if (validValues.length === 0) return '';
  
  const min = Math.min(...validValues);
  const max = Math.max(...validValues);
  const range = max - min;
  
  if (range === 0) return 'rgba(59, 130, 246, 0.15)'; // Light blue for all same values
  
  // Calculate relative position (0 to 1)
  const position = (value - min) / range;
  
  // Subtle blue scale: higher snaps = more blue, lower = more white
  if (position >= 0.8) return 'rgba(59, 130, 246, 0.25)'; // Stronger blue
  if (position >= 0.6) return 'rgba(59, 130, 246, 0.18)';
  if (position >= 0.4) return 'rgba(59, 130, 246, 0.12)';
  if (position >= 0.2) return 'rgba(59, 130, 246, 0.06)';
  return ''; // Very low = white/no color
};

// Helper function to get subtle green/red background color for fantasy points (relative to column)
const getFptsBackgroundColor = (value, allValues) => {
  if (!value || value <= 0 || !allValues || allValues.length === 0) return '';
  
  const validValues = allValues.filter(v => v && v > 0);
  if (validValues.length === 0) return '';
  
  const min = Math.min(...validValues);
  const max = Math.max(...validValues);
  const range = max - min;
  
  if (range === 0) return 'rgba(34, 197, 94, 0.15)'; // Light green for all same values
  
  // Calculate relative position (0 to 1)
  const position = (value - min) / range;
  
  // Subtle green/red scale: higher FPTS = more green, lower = more red
  if (position >= 0.8) return 'rgba(34, 197, 94, 0.25)'; // Strong green
  if (position >= 0.6) return 'rgba(34, 197, 94, 0.15)'; // Light green
  if (position >= 0.4) return 'rgba(234, 179, 8, 0.08)'; // Very subtle yellow
  if (position >= 0.2) return 'rgba(239, 68, 68, 0.10)'; // Light red
  return 'rgba(239, 68, 68, 0.18)'; // Stronger red for lowest
};

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

const NFL_TEAMS = [
  'All', 'ARI', 'ATL', 'BAL', 'BUF', 'CAR', 'CHI', 'CIN', 'CLE',
  'DAL', 'DEN', 'DET', 'GB', 'HOU', 'IND', 'JAX', 'KC',
  'LV', 'LAC', 'LAR', 'MIA', 'MIN', 'NE', 'NO', 'NYG', 'NYJ',
  'PHI', 'PIT', 'SF', 'SEA', 'TB', 'TEN', 'WAS'
];

// Default column widths
const DEFAULT_COL_WIDTHS = {
  player: 120,
  pos: 40,
  opp: 70,
  price: 60,
  proj: 50,
  trend: 105,
  num: 35,
  fpts: 45,
  cmpAtt: 55,
  passYds: 40,
  passTd: 35,
  int: 35,
  rushAtt: 35,
  rushYds: 40,
  rushTd: 35,
  tgts: 35,
  rec: 35,
  recYds: 40,
  recTd: 35
};

// Minimum column widths for auto-resize
const MIN_COL_WIDTHS = {
  num: 25,
  fpts: 35,
  cmpAtt: 45,
  passYds: 30,
  passTd: 25,
  int: 25,
  rushAtt: 25,
  rushYds: 30,
  rushTd: 25,
  tgts: 30,
  rec: 25,
  recYds: 30,
  recTd: 25
};

// Column definitions for visibility control
const COLUMN_CATEGORIES = {
  summary: {
    label: 'Summary',
    columns: [
      { key: 'num', label: '#' },
      { key: 'fpts', label: 'FPTS' }
    ]
  },
  passing: {
    label: 'Passing',
    columns: [
      { key: 'cmpAtt', label: 'Cmp-Att', dataKey: 'passing.cmpAtt' },
      { key: 'passYds', label: 'Yds', dataKey: 'passing.yds' },
      { key: 'passTd', label: 'TD', dataKey: 'passing.td' },
      { key: 'int', label: 'Int.', dataKey: 'passing.int' }
    ]
  },
  rushing: {
    label: 'Rushing',
    columns: [
      { key: 'rushAtt', label: 'Att', dataKey: 'rushing.att' },
      { key: 'rushYds', label: 'Yds', dataKey: 'rushing.yds' },
      { key: 'rushTd', label: 'TD', dataKey: 'rushing.td' }
    ]
  },
  receiving: {
    label: 'Receiving',
    columns: [
      { key: 'tgts', label: 'Tgts', dataKey: 'receiving.tgts' },
      { key: 'rec', label: 'Rec', dataKey: 'receiving.rec' },
      { key: 'recYds', label: 'Yds', dataKey: 'receiving.yds' },
      { key: 'recTd', label: 'TD', dataKey: 'receiving.td' }
    ]
  }
};

// Clickable Header Cell with optional sorting (no sort icons)
const ClickableHeaderCell = ({
  children,
  className = "",
  colSpan = 1,
  rowSpan = 1,
  onClick = null,
  width,
  style = {}
}) => (
  <th
    colSpan={colSpan}
    rowSpan={rowSpan}
    style={{ width: width ? `${width}px` : 'auto', minWidth: width ? `${width}px` : 'auto', ...style }}
    className={`border border-gray-400 px-1 py-0.5 text-xs font-bold text-center ${onClick ? 'cursor-pointer hover:brightness-95 active:brightness-90' : ''} ${className}`}
    onClick={onClick}
  >
    {children}
  </th>
);

// Resizable Header Cell Component with week resize capability
const ResizableHeaderCell = ({
  children,
  className = "",
  colSpan = 1,
  rowSpan = 1,
  onClick = null,
  width,
  onResize,
  columnKey,
  resizable = true,
  style = {}
}) => {
  const [isResizing, setIsResizing] = useState(false);

  const handleMouseDown = (e) => {
    if (!resizable || !onResize) return;
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    const startX = e.clientX;
    const startWidth = width || 50;

    const handleMouseMove = (moveEvent) => {
      const newWidth = Math.max(25, startWidth + (moveEvent.clientX - startX));
      onResize(columnKey, newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <th
      colSpan={colSpan}
      rowSpan={rowSpan}
      style={{ width: width ? `${width}px` : 'auto', minWidth: width ? `${width}px` : 'auto', position: 'relative', ...style }}
      className={`border border-gray-400 px-1 py-0.5 text-xs font-bold text-center ${onClick ? 'cursor-pointer hover:brightness-95 active:brightness-90' : ''} ${className}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-center gap-0.5">
        {children}
      </div>
      {resizable && onResize && (
        <div
          className={`absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400 ${isResizing ? 'bg-blue-500' : 'bg-transparent'}`}
          onMouseDown={handleMouseDown}
          onClick={(e) => e.stopPropagation()}
        />
      )}
    </th>
  );
};

// Week Group Resizable Header (for resizing entire week at once)
const WeekResizableHeader = ({
  children,
  className = "",
  colSpan = 1,
  onClick = null,
  onWeekResize,
  weekNum,
  style = {}
}) => {
  const [isResizing, setIsResizing] = useState(false);

  const handleMouseDown = (e) => {
    if (!onWeekResize) return;
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    const startX = e.clientX;

    const handleMouseMove = (moveEvent) => {
      const delta = moveEvent.clientX - startX;
      onWeekResize(weekNum, delta);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <th
      colSpan={colSpan}
      style={{ position: 'relative', ...style }}
      className={`border border-gray-400 px-1 py-0.5 text-xs font-bold text-white text-center ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
      {onWeekResize && (
        <div
          className={`absolute right-0 top-0 h-full w-2 cursor-col-resize hover:bg-yellow-400 ${isResizing ? 'bg-yellow-500' : 'bg-transparent'}`}
          onMouseDown={handleMouseDown}
          onClick={(e) => e.stopPropagation()}
          title="Drag to resize all columns in this week"
        />
      )}
    </th>
  );
};

const DataCell = ({ children, className = "", width, style = {} }) => (
  <td
    style={{ width: width ? `${width}px` : 'auto', minWidth: width ? `${width}px` : 'auto', ...style }}
    className={`border border-gray-300 px-1 py-0.5 text-xs text-center whitespace-nowrap ${className}`}
  >
    {children}
  </td>
);

// Multi-Select Position Selector Component
const PositionSelector = ({ selectedPositions, onToggle }) => {
  const positions = ['All', 'QB', 'RB', 'WR', 'TE', 'FLEX', 'DST'];

  return (
    <div className="flex items-center gap-0.5 bg-gray-100 p-1 rounded-lg">
      {positions.map((pos) => {
        const isSelected = selectedPositions.has(pos) ||
          (pos === 'All' && selectedPositions.size === 0);
        return (
          <button
            key={pos}
            onClick={() => onToggle(pos)}
            className={`
              px-3 py-1.5 rounded text-sm font-medium transition-all duration-150
              ${isSelected
                ? 'bg-blue-500 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
              }
            `}
          >
            {pos}
          </button>
        );
      })}
    </div>
  );
};

// Game Selector Bar Component - Shows weekly matchups
const GameSelectorBar = ({ games, selectedGame, onSelectGame }) => {
  if (!games || games.length === 0) {
    return null;
  }

  // Group games by weekday for visual separation
  const gamesByDay = games.reduce((acc, game) => {
    const day = game.weekday || 'Sunday';
    if (!acc[day]) acc[day] = [];
    acc[day].push(game);
    return acc;
  }, {});

  // Order days: Thursday, Friday, Saturday, Sunday, Monday
  const dayOrder = ['Thursday', 'Friday', 'Saturday', 'Sunday', 'Monday'];
  const orderedDays = dayOrder.filter(day => gamesByDay[day]);

  return (
    <div className="flex items-stretch gap-2 overflow-x-auto pb-2 scrollbar-thin">
      {orderedDays.map((day, dayIdx) => (
        <React.Fragment key={day}>
          {/* Day separator (except before first day) */}
          {dayIdx > 0 && (
            <div className="flex items-center px-1">
              <div className="h-8 w-px bg-gray-300" />
            </div>
          )}

          {/* Day label */}
          <div className="flex flex-col items-center justify-center px-1">
            <span className="text-[9px] text-gray-400 font-medium uppercase tracking-wide">
              {day.slice(0, 3)}
            </span>
          </div>

          {/* Games for this day */}
          {gamesByDay[day].map((game, idx) => {
            const isSelected = selectedGame?.id === game.id;
            return (
              <button
                key={game.id || `${day}-${idx}`}
                onClick={() => onSelectGame(isSelected ? null : game)}
                className={`
                  flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-lg border
                  transition-all duration-150 min-w-[85px]
                  ${isSelected
                    ? 'bg-blue-50 border-blue-400 shadow-sm'
                    : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }
                `}
              >
                {/* Game Time */}
                <span className="text-[10px] text-gray-500 font-medium mb-1">
                  {game.time}
                </span>

                {/* Away Team */}
                <div className="flex items-center gap-1 mb-0.5">
                  {game.awayLogo && (
                    <img src={game.awayLogo} alt={game.away} className="w-4 h-4 object-contain" />
                  )}
                  <span className={`text-xs font-semibold ${isSelected ? 'text-blue-700' : 'text-gray-700'}`}>
                    {game.away}
                  </span>
                </div>

                {/* Home Team */}
                <div className="flex items-center gap-1">
                  {game.homeLogo && (
                    <img src={game.homeLogo} alt={game.home} className="w-4 h-4 object-contain" />
                  )}
                  <span className={`text-xs font-semibold ${isSelected ? 'text-blue-700' : 'text-gray-700'}`}>
                    {game.home}
                  </span>
                </div>
              </button>
            );
          })}
        </React.Fragment>
      ))}
    </div>
  );
};

// Column Visibility Selector Component
const ColumnVisibilitySelector = ({ visibleColumns, setVisibleColumns, onClose }) => {
  const handleCategoryToggle = (categoryKey) => {
    const category = COLUMN_CATEGORIES[categoryKey];
    const allVisible = category.columns.every(col => visibleColumns[col.key]);

    setVisibleColumns(prev => {
      const newState = { ...prev };
      category.columns.forEach(col => {
        newState[col.key] = !allVisible;
      });
      return newState;
    });
  };

  const handleColumnToggle = (columnKey) => {
    setVisibleColumns(prev => ({
      ...prev,
      [columnKey]: !prev[columnKey]
    }));
  };

  return (
    <div className="absolute right-0 top-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 p-3 min-w-[200px]">
      <div className="flex justify-between items-center mb-2 pb-2 border-b">
        <span className="font-bold text-sm">Show Columns</span>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
          <X className="h-4 w-4" />
        </button>
      </div>

      {Object.entries(COLUMN_CATEGORIES).map(([catKey, category]) => (
        <div key={catKey} className="mb-2">
          <label className="flex items-center gap-2 font-semibold text-sm cursor-pointer hover:bg-gray-50 p-1 rounded">
            <input
              type="checkbox"
              checked={category.columns.every(col => visibleColumns[col.key])}
              onChange={() => handleCategoryToggle(catKey)}
              className="rounded"
            />
            {category.label}
          </label>
          <div className="ml-4 mt-1 space-y-1">
            {category.columns.map(col => (
              <label key={col.key} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-gray-50 p-1 rounded">
                <input
                  type="checkbox"
                  checked={visibleColumns[col.key]}
                  onChange={() => handleColumnToggle(col.key)}
                  className="rounded"
                />
                {col.label}
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

const FantasyAnalyzer = () => {
  // Filter state - multi-select positions
  const [selectedPositions, setSelectedPositions] = useState(new Set(['RB']));
  const [selectedTeam, setSelectedTeam] = useState('All');
  const [selectedSlate, setSelectedSlate] = useState('Main');
  const [weekFrom, setWeekFrom] = useState(1);
  const [weekTo, setWeekTo] = useState(4);
  const [season, setSeason] = useState(2025);
  const [salaryMin, setSalaryMin] = useState(0);
  const [salaryMax, setSalaryMax] = useState(15000);

  // Game selector state
  const [weeklyGames, setWeeklyGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);

  // Legacy single position for API compatibility
  const selectedPos = selectedPositions.size === 1
    ? Array.from(selectedPositions)[0]
    : selectedPositions.size === 0 || selectedPositions.has('All')
      ? 'All'
      : Array.from(selectedPositions).join(',');

  // Data state
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Collapsible state for each week (true = expanded, false = collapsed)
  const [expandedWeeks, setExpandedWeeks] = useState({});

  // Sorting state - now supports weekly stat sorting
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null, week: null });

  // Column widths state
  const [colWidths, setColWidths] = useState(DEFAULT_COL_WIDTHS);

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState({
    num: true,
    fpts: true,
    cmpAtt: true,
    passYds: true,
    passTd: true,
    int: true,
    rushAtt: true,
    rushYds: true,
    rushTd: true,
    tgts: true,
    rec: true,
    recYds: true,
    recTd: true
  });

  // Column selector visibility
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const columnSelectorRef = useRef(null);

  // Favorite players state - tracks player IDs that are favorited
  const [favoritePlayers, setFavoritePlayers] = useState(new Set());

  // Trend column config state
  const [trendStat, setTrendStat] = useState('fpts');
  const [trendWeeks, setTrendWeeks] = useState(4);

  // Toggle favorite status for a player
  const toggleFavorite = useCallback((playerId) => {
    setFavoritePlayers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(playerId)) {
        newSet.delete(playerId);
      } else {
        newSet.add(playerId);
      }
      return newSet;
    });
  }, []);

  // Toggle position selection (multi-select)
  const togglePosition = useCallback((pos) => {
    setSelectedPositions(prev => {
      const newSet = new Set(prev);

      if (pos === 'All') {
        // Clicking All clears other selections
        return new Set();
      }

      // Remove 'All' if it was selected and we're selecting a specific position
      newSet.delete('All');

      if (newSet.has(pos)) {
        newSet.delete(pos);
        // If nothing selected, default to All
        if (newSet.size === 0) {
          return new Set();
        }
      } else {
        newSet.add(pos);
      }
      return newSet;
    });
  }, []);

  // Handle game selection (filters to teams in that game)
  const handleGameSelect = useCallback((game) => {
    setSelectedGame(game);
    // If a game is selected, we could filter to those teams
    // For now, just track the selection
  }, []);

  // Close column selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (columnSelectorRef.current && !columnSelectorRef.current.contains(event.target)) {
        setShowColumnSelector(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle column resize
  const handleColumnResize = useCallback((columnKey, newWidth) => {
    setColWidths(prev => ({
      ...prev,
      [columnKey]: newWidth
    }));
  }, []);

  // Handle week-level resize (shrink all columns in a week proportionally)
  const handleWeekResize = useCallback((weekNum, delta) => {
    if (!expandedWeeks[weekNum]) {
      // Only summary columns visible
      setColWidths(prev => ({
        ...prev,
        num: Math.max(MIN_COL_WIDTHS.num, prev.num + delta * 0.5),
        fpts: Math.max(MIN_COL_WIDTHS.fpts, prev.fpts + delta * 0.5)
      }));
    } else {
      // All columns visible - distribute delta across all visible stat columns
      const visibleStatCols = ['num', 'fpts', 'cmpAtt', 'passYds', 'passTd', 'int', 'rushAtt', 'rushYds', 'rushTd', 'tgts', 'rec', 'recYds', 'recTd']
        .filter(key => visibleColumns[key]);
      const deltaPerCol = delta / visibleStatCols.length;

      setColWidths(prev => {
        const newWidths = { ...prev };
        visibleStatCols.forEach(key => {
          newWidths[key] = Math.max(MIN_COL_WIDTHS[key] || 25, prev[key] + deltaPerCol);
        });
        return newWidths;
      });
    }
  }, [expandedWeeks, visibleColumns]);

  // Toggle week expansion
  const toggleWeekExpansion = (week) => {
    setExpandedWeeks(prev => ({
      ...prev,
      [week]: !prev[week]
    }));
  };

  // Calculate visible stat columns count for expanded state
  const getVisibleStatColsCount = () => {
    let count = 0;
    if (visibleColumns.num) count++;
    if (visibleColumns.fpts) count++;
    if (visibleColumns.cmpAtt) count++;
    if (visibleColumns.passYds) count++;
    if (visibleColumns.passTd) count++;
    if (visibleColumns.int) count++;
    if (visibleColumns.rushAtt) count++;
    if (visibleColumns.rushYds) count++;
    if (visibleColumns.rushTd) count++;
    if (visibleColumns.tgts) count++;
    if (visibleColumns.rec) count++;
    if (visibleColumns.recYds) count++;
    if (visibleColumns.recTd) count++;
    return count;
  };

  // Calculate total columns for a week based on expansion state
  const getStatsPerWeekCols = (week) => {
    if (!expandedWeeks[week]) {
      // Just summary columns
      let count = 0;
      if (visibleColumns.num) count++;
      if (visibleColumns.fpts) count++;
      return Math.max(1, count);
    }
    return getVisibleStatColsCount();
  };

  // Calculate visible category columns
  const getVisiblePassingCols = () => ['cmpAtt', 'passYds', 'passTd', 'int'].filter(k => visibleColumns[k]).length;
  const getVisibleRushingCols = () => ['rushAtt', 'rushYds', 'rushTd'].filter(k => visibleColumns[k]).length;
  const getVisibleReceivingCols = () => ['tgts', 'rec', 'recYds', 'recTd'].filter(k => visibleColumns[k]).length;
  const getVisibleSummaryCols = () => ['num', 'fpts'].filter(k => visibleColumns[k]).length;

  // Calculate weeks to show
  const weeksToShow = useMemo(() => {
    const weeks = [];
    for (let i = weekFrom; i <= weekTo; i++) {
      weeks.push(i);
    }
    return weeks;
  }, [weekFrom, weekTo]);

  // Fetch data from API
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        season: season.toString(),
        week_start: weekFrom.toString(),
        week_end: weekTo.toString(),
        limit: '100'
      });

      if (selectedPos && selectedPos !== 'All') {
        params.append('position', selectedPos);
      }

      if (selectedTeam && selectedTeam !== 'All') {
        params.append('team', selectedTeam);
      }

      const response = await fetch(`${BACKEND_URL}/api/analyzer-data?${params}`);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();

      // Filter by salary if needed
      const filteredData = result.filter(player => {
        const price = player.price || 0;
        return price >= salaryMin && price <= salaryMax;
      });

      setData(filteredData);
    } catch (err) {
      console.error('Error fetching analyzer data:', err);
      setError(err.message);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [season, weekFrom, weekTo, selectedPos, selectedTeam, salaryMin, salaryMax]);

  // Fetch data on mount and when filters change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch weekly games for the game selector bar
  useEffect(() => {
    const formatGameTime = (gametime) => {
      if (!gametime) return 'TBD';
      // Convert 24h "20:20" to "8:20PM ET"
      const [hours, minutes] = gametime.split(':').map(Number);
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHour = hours % 12 || 12;
      return `${displayHour}:${minutes.toString().padStart(2, '0')}${period} ET`;
    };

    const fetchGames = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/weekly-games?season=${season}&week=${weekTo}`);
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.games) {
            // Format games with logos, time, and proper id
            const gamesWithLogos = result.games.map(game => ({
              id: game.game_id,
              away: game.away,
              home: game.home,
              time: formatGameTime(game.gametime),
              weekday: game.weekday,
              gameday: game.gameday,
              awayLogo: getTeamLogo(game.away),
              homeLogo: getTeamLogo(game.home),
              spread: game.spread_line,
              total: game.total_line
            }));
            setWeeklyGames(gamesWithLogos);
          }
        }
      } catch (err) {
        console.error('Error fetching weekly games:', err);
        // Don't set error - games are optional
      }
    };

    fetchGames();
  }, [season, weekTo]);

  const formatCurrency = (amount) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Handle sort column click - now supports weekly stats
  const handleSort = (key, week = null) => {
    let direction = 'desc'; // Start with desc for stats (highest first)
    const isSameSort = sortConfig.key === key && sortConfig.week === week;

    if (isSameSort && sortConfig.direction === 'desc') {
      direction = 'asc';
    } else if (isSameSort && sortConfig.direction === 'asc') {
      direction = null;
    }

    setSortConfig({
      key: direction ? key : null,
      direction,
      week: direction ? week : null
    });
  };

  // Helper to get nested value from object
  const getNestedValue = (obj, path) => {
    if (!path) return null;
    const parts = path.split('.');
    let value = obj;
    for (const part of parts) {
      if (value === null || value === undefined) return null;
      value = value[part];
    }
    return value;
  };

  // Sorted data with weekly stat support
  const sortedData = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) return data;

    return [...data].sort((a, b) => {
      let aVal, bVal;

      // Fixed columns sorting
      if (!sortConfig.week) {
        switch (sortConfig.key) {
          case 'name':
            aVal = a.name || '';
            bVal = b.name || '';
            break;
          case 'pos':
            aVal = a.pos || '';
            bVal = b.pos || '';
            break;
          case 'opp':
            aVal = a.opp || '';
            bVal = b.opp || '';
            break;
          case 'price':
            aVal = a.price || 0;
            bVal = b.price || 0;
            break;
          case 'proj':
            aVal = a.proj || 0;
            bVal = b.proj || 0;
            break;
          default:
            return 0;
        }
      } else {
        // Weekly stat sorting
        const aWeek = a.weeks?.find(w => w.weekNum === sortConfig.week);
        const bWeek = b.weeks?.find(w => w.weekNum === sortConfig.week);

        switch (sortConfig.key) {
          case 'num':
            aVal = aWeek?.misc?.num || 0;
            bVal = bWeek?.misc?.num || 0;
            break;
          case 'fpts':
            aVal = aWeek?.misc?.fpts || 0;
            bVal = bWeek?.misc?.fpts || 0;
            break;
          case 'passYds':
            aVal = aWeek?.passing?.yds || 0;
            bVal = bWeek?.passing?.yds || 0;
            break;
          case 'passTd':
            aVal = aWeek?.passing?.td || 0;
            bVal = bWeek?.passing?.td || 0;
            break;
          case 'int':
            aVal = aWeek?.passing?.int || 0;
            bVal = bWeek?.passing?.int || 0;
            break;
          case 'rushAtt':
            aVal = aWeek?.rushing?.att || 0;
            bVal = bWeek?.rushing?.att || 0;
            break;
          case 'rushYds':
            aVal = aWeek?.rushing?.yds || 0;
            bVal = bWeek?.rushing?.yds || 0;
            break;
          case 'rushTd':
            aVal = aWeek?.rushing?.td || 0;
            bVal = bWeek?.rushing?.td || 0;
            break;
          case 'tgts':
            aVal = aWeek?.receiving?.tgts || 0;
            bVal = bWeek?.receiving?.tgts || 0;
            break;
          case 'rec':
            aVal = aWeek?.receiving?.rec || 0;
            bVal = bWeek?.receiving?.rec || 0;
            break;
          case 'recYds':
            aVal = aWeek?.receiving?.yds || 0;
            bVal = bWeek?.receiving?.yds || 0;
            break;
          case 'recTd':
            aVal = aWeek?.receiving?.td || 0;
            bVal = bWeek?.receiving?.td || 0;
            break;
          default:
            return 0;
        }
      }

      // String comparison
      if (typeof aVal === 'string') {
        const comparison = aVal.localeCompare(bVal);
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      }

      // Numeric comparison
      if (sortConfig.direction === 'asc') {
        return aVal - bVal;
      }
      return bVal - aVal;
    });
  }, [data, sortConfig]);

  // Compute min/max values for snaps and FPTS per week for conditional formatting
  const weeklyStats = useMemo(() => {
    const stats = {};
    weeksToShow.forEach(weekNum => {
      const snapsValues = [];
      const fptsValues = [];
      
      data.forEach(player => {
        const weekData = player.weeks?.find(w => w.weekNum === weekNum);
        if (weekData) {
          if (weekData.misc?.num) snapsValues.push(weekData.misc.num);
          if (weekData.misc?.fpts) fptsValues.push(weekData.misc.fpts);
        }
      });
      
      stats[weekNum] = {
        snapsValues,
        fptsValues
      };
    });
    return stats;
  }, [data, weeksToShow]);

  // Helper to render the weekly data cells for a single player row
  const renderWeeklyRowData = (playerWeeks) => {
    return weeksToShow.map((weekNum, weekIndex) => {
      const weekData = playerWeeks?.find(w => w.weekNum === weekNum);
      const isExpanded = expandedWeeks[weekNum];
      const isLastWeek = weekIndex === weeksToShow.length - 1;

      // Border style for week separator
      const weekEndBorderStyle = !isLastWeek ? { borderRight: '3px solid white' } : {};

      if (!weekData) {
        const cells = [];
        // Summary columns
        if (visibleColumns.num) cells.push(<DataCell key={`empty-${weekNum}-num`} className="bg-gray-100">-</DataCell>);
        if (visibleColumns.fpts) {
          const style = !isExpanded && !isLastWeek ? weekEndBorderStyle : {};
          cells.push(<DataCell key={`empty-${weekNum}-fpts`} className="bg-gray-100" style={style}>-</DataCell>);
        }

        if (isExpanded) {
          // Passing
          if (visibleColumns.cmpAtt) cells.push(<DataCell key={`empty-${weekNum}-cmpAtt`}>-</DataCell>);
          if (visibleColumns.passYds) cells.push(<DataCell key={`empty-${weekNum}-passYds`}>-</DataCell>);
          if (visibleColumns.passTd) cells.push(<DataCell key={`empty-${weekNum}-passTd`}>-</DataCell>);
          if (visibleColumns.int) cells.push(<DataCell key={`empty-${weekNum}-int`}>-</DataCell>);
          // Rushing
          if (visibleColumns.rushAtt) cells.push(<DataCell key={`empty-${weekNum}-rushAtt`}>-</DataCell>);
          if (visibleColumns.rushYds) cells.push(<DataCell key={`empty-${weekNum}-rushYds`}>-</DataCell>);
          if (visibleColumns.rushTd) cells.push(<DataCell key={`empty-${weekNum}-rushTd`}>-</DataCell>);
          // Receiving
          if (visibleColumns.tgts) cells.push(<DataCell key={`empty-${weekNum}-tgts`}>-</DataCell>);
          if (visibleColumns.rec) cells.push(<DataCell key={`empty-${weekNum}-rec`}>-</DataCell>);
          if (visibleColumns.recYds) cells.push(<DataCell key={`empty-${weekNum}-recYds`}>-</DataCell>);
          // Last column of week gets border
          if (visibleColumns.recTd) {
            cells.push(<DataCell key={`empty-${weekNum}-recTd`} style={!isLastWeek ? weekEndBorderStyle : {}}>-</DataCell>);
          }
        }

        return cells;
      }

      const cells = [];

      // Get conditional formatting colors for this week
      const snapBgColor = getSnapBackgroundColor(weekData.misc?.num, weeklyStats[weekNum]?.snapsValues);
      const fptsBgColor = getFptsBackgroundColor(weekData.misc?.fpts, weeklyStats[weekNum]?.fptsValues);

      // Summary stats (always visible based on visibility settings)
      if (visibleColumns.num) {
        cells.push(
          <DataCell 
            key={`${weekNum}-num`} 
            className="font-semibold" 
            width={colWidths.num}
            style={{ backgroundColor: snapBgColor || '#f3f4f6' }}
          >
            {weekData.misc?.num || '-'}
          </DataCell>
        );
      }
      if (visibleColumns.fpts) {
        const baseStyle = !isExpanded && !isLastWeek ? weekEndBorderStyle : {};
        cells.push(
          <DataCell 
            key={`${weekNum}-fpts`} 
            className="font-bold" 
            width={colWidths.fpts} 
            style={{ ...baseStyle, backgroundColor: fptsBgColor || '#f3f4f6' }}
          >
            {weekData.misc?.fpts?.toFixed(1) || '-'}
          </DataCell>
        );
      }

      // Detailed stats (only when expanded)
      if (isExpanded) {
        // Passing
        if (visibleColumns.cmpAtt) cells.push(<DataCell key={`${weekNum}-cmpAtt`} width={colWidths.cmpAtt}>{weekData.passing?.cmpAtt || '-'}</DataCell>);
        if (visibleColumns.passYds) cells.push(<DataCell key={`${weekNum}-passYds`} width={colWidths.passYds}>{weekData.passing?.yds || '-'}</DataCell>);
        if (visibleColumns.passTd) cells.push(<DataCell key={`${weekNum}-passTd`} width={colWidths.passTd}>{weekData.passing?.td || '-'}</DataCell>);
        if (visibleColumns.int) cells.push(<DataCell key={`${weekNum}-int`} width={colWidths.int}>{weekData.passing?.int || '-'}</DataCell>);
        // Rushing
        if (visibleColumns.rushAtt) cells.push(<DataCell key={`${weekNum}-rushAtt`} width={colWidths.rushAtt}>{weekData.rushing?.att || '-'}</DataCell>);
        if (visibleColumns.rushYds) cells.push(<DataCell key={`${weekNum}-rushYds`} width={colWidths.rushYds}>{weekData.rushing?.yds || '-'}</DataCell>);
        if (visibleColumns.rushTd) cells.push(<DataCell key={`${weekNum}-rushTd`} width={colWidths.rushTd}>{weekData.rushing?.td || '-'}</DataCell>);
        // Receiving
        if (visibleColumns.tgts) cells.push(<DataCell key={`${weekNum}-tgts`} width={colWidths.tgts}>{weekData.receiving?.tgts || '-'}</DataCell>);
        if (visibleColumns.rec) cells.push(<DataCell key={`${weekNum}-rec`} width={colWidths.rec}>{weekData.receiving?.rec || '-'}</DataCell>);
        if (visibleColumns.recYds) cells.push(<DataCell key={`${weekNum}-recYds`} width={colWidths.recYds}>{weekData.receiving?.yds || '-'}</DataCell>);
        if (visibleColumns.recTd) {
          cells.push(
            <DataCell
              key={`${weekNum}-recTd`}
              width={colWidths.recTd}
              style={!isLastWeek ? weekEndBorderStyle : {}}
            >
              {weekData.receiving?.td || '-'}
            </DataCell>
          );
        }
      }

      return cells;
    });
  };

  return (
    <div className="p-4 bg-white min-w-[1400px] overflow-x-auto font-sans text-sm">
      {/* --- TOP CONTROLS SECTION --- */}
      <div className="flex flex-col gap-3 mb-4">
        {/* Game Selector Bar - Shows weekly matchups */}
        {weeklyGames.length > 0 && (
          <GameSelectorBar
            games={weeklyGames}
            selectedGame={selectedGame}
            onSelectGame={handleGameSelect}
          />
        )}

        {/* Position Selector - Multi-select */}
        <div className="flex items-center gap-4">
          <PositionSelector
            selectedPositions={selectedPositions}
            onToggle={togglePosition}
          />

          {/* Loading Indicator */}
          {loading && (
            <div className="flex items-center text-blue-600">
              <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              Loading...
            </div>
          )}
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-wrap gap-4">
          {/* Left Filter Box */}
          <div className="border border-black bg-[#F3EFE0] p-2 w-48">
            <div className="flex justify-between mb-1">
              <span className="font-bold">Team</span>
              <select
                className="border border-gray-400 text-xs p-0.5 rounded"
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
              >
                {NFL_TEAMS.map(team => (
                  <option key={team} value={team}>{team}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-between mb-1">
              <span className="font-bold">Season</span>
              <select
                className="border border-gray-400 text-xs p-0.5 rounded"
                value={season}
                onChange={(e) => setSeason(parseInt(e.target.value))}
              >
                <option value={2025}>2025</option>
                <option value={2024}>2024</option>
                <option value={2023}>2023</option>
              </select>
            </div>
            <div className="flex justify-between">
              <span className="font-bold">Slate</span>
              <select
                className="border border-gray-400 text-xs p-0.5 rounded"
                value={selectedSlate}
                onChange={(e) => setSelectedSlate(e.target.value)}
              >
                <option value="Main">Main</option>
                <option value="Showdown">Showdown</option>
              </select>
            </div>
          </div>

          {/* Middle Filter Box */}
          <div className="flex flex-col gap-2">
            <div>
              <div className="bg-[#1F4E79] text-white text-center text-xs font-bold py-1 border border-black">
                Select Weeks
              </div>
              <div className="border border-black border-t-0 p-2 flex gap-2 bg-white text-xs">
                <select
                  className="border p-1"
                  value={weekFrom}
                  onChange={(e) => setWeekFrom(parseInt(e.target.value))}
                >
                  {[...Array(18)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>From: Week {i + 1}</option>
                  ))}
                </select>
                <select
                  className="border p-1"
                  value={weekTo}
                  onChange={(e) => setWeekTo(parseInt(e.target.value))}
                >
                  {[...Array(18)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>To: Week {i + 1}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <div className="bg-[#1F4E79] text-white text-center text-xs font-bold py-1 border border-black">
                Set Salary Range
              </div>
              <div className="border border-black border-t-0 p-2 flex gap-2 bg-white text-xs items-center">
                <label>Min $</label>
                <input
                  type="number"
                  className="border w-16 p-0.5"
                  value={salaryMin}
                  onChange={(e) => setSalaryMin(parseInt(e.target.value) || 0)}
                />
                <label>Max $</label>
                <input
                  type="number"
                  className="border w-20 p-0.5"
                  value={salaryMax}
                  onChange={(e) => setSalaryMax(parseInt(e.target.value) || 15000)}
                />
              </div>
            </div>
          </div>

          {/* Column Visibility Selector */}
          <div className="relative" ref={columnSelectorRef}>
            <button
              onClick={() => setShowColumnSelector(!showColumnSelector)}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded text-sm font-medium"
            >
              <Settings className="h-4 w-4" />
              Columns
            </button>
            {showColumnSelector && (
              <ColumnVisibilitySelector
                visibleColumns={visibleColumns}
                setVisibleColumns={setVisibleColumns}
                onClose={() => setShowColumnSelector(false)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4">
          Error loading data: {error}
        </div>
      )}

      {/* --- DATA TABLE --- */}
      <div className="overflow-x-auto">
        <table className="border-collapse border border-gray-800" style={{ tableLayout: 'fixed' }}>
          <thead>
            {/* Header Row 1: Top Level Categories with Week Titles */}
            <tr>
              <ClickableHeaderCell colSpan={5} className="bg-gray-300 text-black">Matchup</ClickableHeaderCell>
              {weeksToShow.map((week, weekIndex) => {
                const isLastWeek = weekIndex === weeksToShow.length - 1;
                return (
                  <WeekResizableHeader
                    key={week}
                    colSpan={getStatsPerWeekCols(week)}
                    className="bg-slate-800 text-white border-b-0 text-lg"
                    onClick={() => toggleWeekExpansion(week)}
                    onWeekResize={handleWeekResize}
                    weekNum={week}
                    style={!isLastWeek ? { borderRight: '3px solid white' } : {}}
                  >
                    <div className="flex items-center justify-center gap-2">
                      {expandedWeeks[week] ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      Week {week}
                    </div>
                  </WeekResizableHeader>
                );
              })}
              {/* Trend column header - rightmost position, matches other headers */}
              <ClickableHeaderCell className="bg-gray-300 text-black text-lg">Trend</ClickableHeaderCell>
            </tr>

            {/* Header Row 2: Sub-Categories (Passing, Rushing, etc.) */}
            <tr>
              {/* Matchup Columns Fixed headers - Sortable & Resizable */}
              <ResizableHeaderCell
                rowSpan={2}
                className="bg-gray-700 text-white"
                onClick={() => handleSort('name')}
                width={colWidths.player}
                onResize={handleColumnResize}
                columnKey="player"
              >
                Player
              </ResizableHeaderCell>
              <ResizableHeaderCell
                rowSpan={2}
                className="bg-gray-700 text-white"
                onClick={() => handleSort('pos')}
                width={colWidths.pos}
                onResize={handleColumnResize}
                columnKey="pos"
              >
                Pos
              </ResizableHeaderCell>
              <ResizableHeaderCell
                rowSpan={2}
                className="bg-gray-700 text-white"
                onClick={() => handleSort('opp')}
                width={colWidths.opp}
                onResize={handleColumnResize}
                columnKey="opp"
              >
                Opp
              </ResizableHeaderCell>
              <ResizableHeaderCell
                rowSpan={2}
                className="bg-gray-700 text-white"
                onClick={() => handleSort('price')}
                width={colWidths.price}
                onResize={handleColumnResize}
                columnKey="price"
              >
                Price
              </ResizableHeaderCell>
              <ResizableHeaderCell
                rowSpan={2}
                className="bg-gray-700 text-white"
                onClick={() => handleSort('proj')}
                width={colWidths.proj}
                onResize={handleColumnResize}
                columnKey="proj"
              >
                Proj.
              </ResizableHeaderCell>

              {/* Repeated Week Headers */}
              {weeksToShow.map((week, weekIndex) => {
                const isLastWeek = weekIndex === weeksToShow.length - 1;
                const summaryCols = getVisibleSummaryCols();
                const passingCols = getVisiblePassingCols();
                const rushingCols = getVisibleRushingCols();
                const receivingCols = getVisibleReceivingCols();

                return (
                  <React.Fragment key={week}>
                    {summaryCols > 0 && (
                      <ClickableHeaderCell
                        colSpan={summaryCols}
                        className="bg-gray-600 text-white"
                        style={!expandedWeeks[week] && !isLastWeek ? { borderRight: '3px solid white' } : {}}
                      >
                        Summary
                      </ClickableHeaderCell>
                    )}
                    {expandedWeeks[week] && (
                      <>
                        {passingCols > 0 && (
                          <ClickableHeaderCell colSpan={passingCols} className="bg-[#dbeafe] text-[#1e40af] border-b-2 border-[#3b82f6]">
                            Passing
                          </ClickableHeaderCell>
                        )}
                        {rushingCols > 0 && (
                          <ClickableHeaderCell colSpan={rushingCols} className="bg-[#dcfce7] text-[#15803d] border-b-2 border-[#10b981]">
                            Rushing
                          </ClickableHeaderCell>
                        )}
                        {receivingCols > 0 && (
                          <ClickableHeaderCell
                            colSpan={receivingCols}
                            className="bg-[#f3e8ff] text-[#7c3aed] border-b-2 border-[#8b5cf6]"
                            style={!isLastWeek ? { borderRight: '3px solid white' } : {}}
                          >
                            Receiving
                          </ClickableHeaderCell>
                        )}
                      </>
                    )}
                  </React.Fragment>
                );
              })}
              {/* Trend Column Header - Summary row - matches Player/Pos/Opp styling */}
              <ClickableHeaderCell
                rowSpan={2}
                className="bg-gray-700 text-white"
                style={{
                  width: `${colWidths.trend}px`,
                  minWidth: `${colWidths.trend}px`,
                }}
              >
                <div className="flex flex-col items-center gap-0.5">
                  <div className="flex items-center justify-center gap-1">
                    <select
                      value={trendStat}
                      onChange={(e) => setTrendStat(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="bg-gray-600 text-white text-[9px] px-1 py-0.5 rounded border border-gray-400 cursor-pointer"
                      style={{ maxWidth: '55px' }}
                    >
                      <option value="fpts">FPTS</option>
                      <option value="snapPct">Snap%</option>
                      <option value="touches">Tch</option>
                      <option value="passYds">PaYd</option>
                      <option value="passTd">PaTD</option>
                      <option value="passInt">Int</option>
                      <option value="rushAtt">RuAtt</option>
                      <option value="rushYds">RuYd</option>
                      <option value="rushTd">RuTD</option>
                      <option value="tgts">Tgts</option>
                      <option value="rec">Rec</option>
                      <option value="recYds">ReYd</option>
                      <option value="recTd">ReTD</option>
                    </select>
                    <select
                      value={trendWeeks}
                      onChange={(e) => setTrendWeeks(parseInt(e.target.value))}
                      onClick={(e) => e.stopPropagation()}
                      className="bg-gray-600 text-white text-[9px] px-1 py-0.5 rounded border border-gray-400 cursor-pointer"
                      style={{ maxWidth: '36px' }}
                    >
                      <option value={2}>2W</option>
                      <option value={3}>3W</option>
                      <option value={4}>4W</option>
                      <option value={6}>6W</option>
                      <option value={8}>8W</option>
                    </select>
                  </div>
                </div>
              </ClickableHeaderCell>
            </tr>

            {/* Header Row 3: Specific Stats - All Sortable by Click */}
            <tr className="text-[10px]">
              {weeksToShow.map((week, weekIndex) => {
                const isLastWeek = weekIndex === weeksToShow.length - 1;
                const cells = [];

                // Summary columns
                if (visibleColumns.num) {
                  cells.push(
                    <ClickableHeaderCell
                      key={`${week}-num`}
                      className="bg-gray-500 text-white"
                      width={colWidths.num}
                      onClick={() => handleSort('num', week)}
                    >
                      #
                    </ClickableHeaderCell>
                  );
                }
                if (visibleColumns.fpts) {
                  cells.push(
                    <ClickableHeaderCell
                      key={`${week}-fpts`}
                      className="bg-gray-500 text-white"
                      width={colWidths.fpts}
                      onClick={() => handleSort('fpts', week)}
                      style={!expandedWeeks[week] && !isLastWeek ? { borderRight: '3px solid white' } : {}}
                    >
                      FPTS
                    </ClickableHeaderCell>
                  );
                }

                // Detailed stats (only when expanded)
                if (expandedWeeks[week]) {
                  // Passing
                  if (visibleColumns.cmpAtt) {
                    cells.push(
                      <ClickableHeaderCell key={`${week}-cmpAtt`} className="bg-[#dbeafe] text-[#1e40af]" width={colWidths.cmpAtt} onClick={() => handleSort('cmpAtt', week)}>
                        Cmp-Att
                      </ClickableHeaderCell>
                    );
                  }
                  if (visibleColumns.passYds) {
                    cells.push(
                      <ClickableHeaderCell key={`${week}-passYds`} className="bg-[#dbeafe] text-[#1e40af]" width={colWidths.passYds} onClick={() => handleSort('passYds', week)}>
                        Yds
                      </ClickableHeaderCell>
                    );
                  }
                  if (visibleColumns.passTd) {
                    cells.push(
                      <ClickableHeaderCell key={`${week}-passTd`} className="bg-[#dbeafe] text-[#1e40af]" width={colWidths.passTd} onClick={() => handleSort('passTd', week)}>
                        TD
                      </ClickableHeaderCell>
                    );
                  }
                  if (visibleColumns.int) {
                    cells.push(
                      <ClickableHeaderCell key={`${week}-int`} className="bg-[#dbeafe] text-[#1e40af]" width={colWidths.int} onClick={() => handleSort('int', week)}>
                        Int.
                      </ClickableHeaderCell>
                    );
                  }
                  // Rushing
                  if (visibleColumns.rushAtt) {
                    cells.push(
                      <ClickableHeaderCell key={`${week}-rushAtt`} className="bg-[#dcfce7] text-[#15803d]" width={colWidths.rushAtt} onClick={() => handleSort('rushAtt', week)}>
                        Att
                      </ClickableHeaderCell>
                    );
                  }
                  if (visibleColumns.rushYds) {
                    cells.push(
                      <ClickableHeaderCell key={`${week}-rushYds`} className="bg-[#dcfce7] text-[#15803d]" width={colWidths.rushYds} onClick={() => handleSort('rushYds', week)}>
                        Yds
                      </ClickableHeaderCell>
                    );
                  }
                  if (visibleColumns.rushTd) {
                    cells.push(
                      <ClickableHeaderCell key={`${week}-rushTd`} className="bg-[#dcfce7] text-[#15803d]" width={colWidths.rushTd} onClick={() => handleSort('rushTd', week)}>
                        TD
                      </ClickableHeaderCell>
                    );
                  }
                  // Receiving
                  if (visibleColumns.tgts) {
                    cells.push(
                      <ClickableHeaderCell key={`${week}-tgts`} className="bg-[#f3e8ff] text-[#7c3aed]" width={colWidths.tgts} onClick={() => handleSort('tgts', week)}>
                        Tgts
                      </ClickableHeaderCell>
                    );
                  }
                  if (visibleColumns.rec) {
                    cells.push(
                      <ClickableHeaderCell key={`${week}-rec`} className="bg-[#f3e8ff] text-[#7c3aed]" width={colWidths.rec} onClick={() => handleSort('rec', week)}>
                        Rec
                      </ClickableHeaderCell>
                    );
                  }
                  if (visibleColumns.recYds) {
                    cells.push(
                      <ClickableHeaderCell key={`${week}-recYds`} className="bg-[#f3e8ff] text-[#7c3aed]" width={colWidths.recYds} onClick={() => handleSort('recYds', week)}>
                        Yds
                      </ClickableHeaderCell>
                    );
                  }
                  if (visibleColumns.recTd) {
                    cells.push(
                      <ClickableHeaderCell
                        key={`${week}-recTd`}
                        className="bg-[#f3e8ff] text-[#7c3aed]"
                        width={colWidths.recTd}
                        onClick={() => handleSort('recTd', week)}
                        style={!isLastWeek ? { borderRight: '3px solid white' } : {}}
                      >
                        TD
                      </ClickableHeaderCell>
                    );
                  }
                }

                return cells;
              })}
              {/* Trend Column header spans from row 2, no cell needed here */}
            </tr>
          </thead>

          <tbody>
            {sortedData.length === 0 && !loading ? (
              <tr>
                <td colSpan={5 + weeksToShow.reduce((sum, week) => sum + getStatsPerWeekCols(week), 0) + 1} className="text-center py-8 text-gray-500">
                  No data available. Adjust filters or check API connection.
                </td>
              </tr>
            ) : (
              sortedData.map((player, index) => {
                return (
                  <tr
                    key={player.id || index}
                    className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-yellow-50 font-medium`}
                  >
                    {/* Fixed Matchup Columns */}
                    <DataCell className="text-left font-bold" width={colWidths.player}>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(player.id || player.name);
                          }}
                          className="flex-shrink-0 p-0.5 hover:scale-110 transition-transform"
                          title={favoritePlayers.has(player.id || player.name) ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          <Star
                            className={`w-3 h-3 ${
                              favoritePlayers.has(player.id || player.name)
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300 hover:text-gray-400'
                            }`}
                          />
                        </button>
                        <span className="truncate">{player.name}</span>
                        {getTeamLogo(player.team) && (
                          <img src={getTeamLogo(player.team)} alt={player.team} className="w-4 h-4 object-contain flex-shrink-0" />
                        )}
                      </div>
                    </DataCell>
                    <DataCell width={colWidths.pos}>{player.pos}</DataCell>
                    <DataCell className="text-[11px]" width={colWidths.opp}>
                      <div className="flex items-center gap-1 justify-center">
                        {getTeamLogo(player.opp) && (
                          <img src={getTeamLogo(player.opp)} alt={player.opp} className="w-4 h-4 object-contain" />
                        )}
                        <span>{player.opp}</span>
                      </div>
                    </DataCell>
                    <DataCell className="text-right" width={colWidths.price}>{formatCurrency(player.price)}</DataCell>
                    <DataCell className="font-bold" width={colWidths.proj}>{player.proj?.toFixed(1) || '-'}</DataCell>

                    {/* Weekly Data columns */}
                    {renderWeeklyRowData(player.weeks || [])}

                    {/* Trend Column - rightmost position, light background */}
                    <td
                      className="border border-gray-300"
                      style={{
                        width: `${colWidths.trend}px`,
                        minWidth: `${colWidths.trend}px`,
                        padding: 0,
                        backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9fafb',
                      }}
                    >
                      <TrendBarCell
                        player={player}
                        selectedStat={trendStat}
                        selectedWeeks={trendWeeks}
                        weeksToShow={weeksToShow}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FantasyAnalyzer;
