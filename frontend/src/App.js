import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import axios from 'axios';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Badge } from './components/ui/badge';
import { Input } from './components/ui/input';
import { RefreshCw, TrendingUp, Users, Calendar, Search, Filter, Star, BarChart3, Settings, Download, DollarSign, Database, Clock, Activity, Heart, Copy, Eye, Zap } from 'lucide-react';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';
import OptimizerFilter from './components/OptimizerFilter';
import MenuWiseSidebar from './components/layout/MenuWiseSidebar';
import TrendToolGrid from './components/TrendToolGrid';
import FantasyAnalyzerDemo from './components/FantasyAnalyzerDemo';
import Admin from './components/Admin';
import AnalyzerFilters from './components/AnalyzerFilters';
import { getTeamLogo } from './data/nflTeamLogos';
import '@/App.css';

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// All NFL Teams
const NFL_TEAMS = {
  'ARI': 'Arizona Cardinals',
  'ATL': 'Atlanta Falcons',
  'BAL': 'Baltimore Ravens',
  'BUF': 'Buffalo Bills',
  'CAR': 'Carolina Panthers',
  'CHI': 'Chicago Bears',
  'CIN': 'Cincinnati Bengals',
  'CLE': 'Cleveland Browns',
  'DAL': 'Dallas Cowboys',
  'DEN': 'Denver Broncos',
  'DET': 'Detroit Lions',
  'GB': 'Green Bay Packers',
  'HOU': 'Houston Texans',
  'IND': 'Indianapolis Colts',
  'JAX': 'Jacksonville Jaguars',
  'KC': 'Kansas City Chiefs',
  'LV': 'Las Vegas Raiders',
  'LAC': 'Los Angeles Chargers',
  'LAR': 'Los Angeles Rams',
  'MIA': 'Miami Dolphins',
  'MIN': 'Minnesota Vikings',
  'NE': 'New England Patriots',
  'NO': 'New Orleans Saints',
  'NYG': 'New York Giants',
  'NYJ': 'New York Jets',
  'PHI': 'Philadelphia Eagles',
  'PIT': 'Pittsburgh Steelers',
  'SF': 'San Francisco 49ers',
  'SEA': 'Seattle Seahawks',
  'TB': 'Tampa Bay Buccaneers',
  'TEN': 'Tennessee Titans',
  'WAS': 'Washington Commanders'
};

const FantasyDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [gridApi, setGridApi] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState({
    season: '2025',
    week: '4',  // Single week selection (for backward compatibility)
    weekStart: null,  // Start of week range
    weekEnd: null,    // End of week range
    position: 'QB',
    team: 'all',
    minSalary: '',
    minSnaps: ''
  });

  // New state for enhanced features
  const [isPPR, setIsPPR] = useState(true); // true = full PPR, false = half PPR
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [playerDetailOpen, setPlayerDetailOpen] = useState(false);
  const [playerGameHistory, setPlayerGameHistory] = useState([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'fantasy_points', direction: 'desc' });
  const [lastUpdated, setLastUpdated] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [activeTab, setActiveTab] = useState(() => {
    // Initialize from URL path
    const pathToTab = {
      '/trend-tool': 'trend-tool',
      '/weekly-box-score': 'weekly-box-score',
      '/data-table': 'data-table'
    };
    return pathToTab[location.pathname] || 'data-table';
  });

  // Trend Tool state
  const [trendFilters, setTrendFilters] = useState({
    team: 'All',
    position: 'RB',
    startWeek: 1,
    endWeek: 4,
    season: 2025,
    slate: 'Main',
    salaryMin: 0,
    salaryMax: 15000
  });
  const [trendData, setTrendData] = useState([]);
  const [trendLoading, setTrendLoading] = useState(false);

  const [showOptimizerFilter, setShowOptimizerFilter] = useState(false);

  // Sync activeTab with URL - only listen to pathname changes
  useEffect(() => {
    const pathToTab = {
      '/trend-tool': 'trend-tool',
      '/weekly-box-score': 'weekly-box-score',
      '/data-table': 'data-table',
      '/': 'data-table'
    };

    const expectedTab = pathToTab[location.pathname];
    if (expectedTab && activeTab !== expectedTab) {
      setActiveTab(expectedTab);
    }

    // Redirect root to data-table
    if (location.pathname === '/') {
      navigate('/data-table', { replace: true });
    }
  }, [location.pathname]); // Only depend on pathname to avoid loops

  // Calculate fantasy points based on PPR setting
  const calculateFantasyPoints = (player) => {
    let points = 0;

    // Passing
    points += (player.passing_yards || 0) * 0.04;
    points += (player.passing_tds || 0) * 4;
    points += (player.interceptions || 0) * -1;

    // Rushing
    points += (player.rushing_yards || 0) * 0.1;
    points += (player.rushing_tds || 0) * 6;

    // Receiving
    points += (player.receiving_yards || 0) * 0.1;
    points += (player.receiving_tds || 0) * 6;
    points += (player.receptions || 0) * (isPPR ? 1 : 0.5); // Full PPR vs Half PPR

    // Fumbles
    points += (player.fumbles_lost || 0) * -1;

    return points.toFixed(1);
  };

  // Get performance color based on value and position
  const getPerformanceColor = (value, type, position) => {
    if (!value || value === 0) return 'text-gray-400';

    // Different thresholds based on stat type and position
    const thresholds = {
      fantasy_points: { good: 15, average: 8 },
      snap_percentage: { good: 60, average: 30 },
      passing_yards: { good: 250, average: 150 },
      rushing_yards: { good: 80, average: 40 },
      receiving_yards: { good: 80, average: 40 },
      receptions: { good: 6, average: 3 }
    };

    const threshold = thresholds[type];
    if (!threshold) return 'text-gray-700';

    if (value >= threshold.good) return 'text-green-600 font-semibold';
    if (value >= threshold.average) return 'text-yellow-600';
    return 'text-red-500';
  };

  // Get position color for badges
  const getPositionColor = (position) => {
    const colors = {
      'QB': 'bg-purple-100 text-purple-800 border-purple-300',
      'RB': 'bg-green-100 text-green-800 border-green-300',
      'WR': 'bg-blue-100 text-blue-800 border-blue-300',
      'TE': 'bg-orange-100 text-orange-800 border-orange-300'
    };
    return colors[position] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  // Handle player click to open detail panel
  const handlePlayerClick = async (player) => {
    setSelectedPlayer(player);
    setPlayerDetailOpen(true);
    await fetchPlayerGameHistory(player);
  };

  // Fetch last 5 games for selected player with DK pricing and snaps
  const fetchPlayerGameHistory = async (player) => {
    try {
      const currentWeek = filters.week === 'all' ? 18 : parseInt(filters.week);
      const season = filters.season;

      const response = await axios.get(`${API}/players`, {
        params: {
          season: season,
          limit: 50,
          player_name: player.player_name
        }
      });

      // Filter and sort to get last 5 games from current week backwards
      const games = response.data
        .filter(game =>
          game.player_name === player.player_name &&
          (filters.week === 'all' || game.week <= currentWeek)
        )
        .sort((a, b) => b.week - a.week)
        .slice(0, 5); // Changed to 5 games

      setPlayerGameHistory(games);
    } catch (error) {
      console.error('Error fetching player game history:', error);
      setPlayerGameHistory([]);
    }
  };

  // Column definitions with grouped headers
  const columnDefs = useMemo(() => [
    // Player Info Group (Pinned Left)
    {
      headerName: 'PLAYER INFO',
      headerClass: 'player-info-group-header',
      children: [
        {
          headerName: 'Player',
          field: 'player_name',
          pinned: 'left',
          width: 140,
          cellRenderer: (params) => (
            <div className="flex items-center justify-between py-1 px-2 group">
              <div
                className="cursor-pointer hover:text-blue-600 transition-colors flex-1"
                onClick={() => handlePlayerClick(params.data)}
              >
                <div className="font-medium text-gray-900 text-sm">{params.value}</div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-5 w-5"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(params.data.player_id);
                }}
              >
                <Heart
                  className={`h-3 w-3 ${favorites.includes(params.data.player_id)
                    ? 'fill-red-500 text-red-500'
                    : 'text-gray-400 hover:text-red-500'
                    }`}
                />
              </Button>
            </div>
          )
        },
        {
          headerName: 'Game',
          field: 'opponent',
          pinned: 'left',
          width: 120,
          cellRenderer: (params) => {
            const opponent = params.value;
            const playerTeam = params.data.team;
            const week = params.data.week;
            const playerTeamLogo = getTeamLogo(playerTeam);
            const opponentLogo = getTeamLogo(opponent);

            return (
              <div className="py-1 px-1 flex items-center gap-1">
                <div className="flex items-center gap-1">
                  {playerTeamLogo && (
                    <img src={playerTeamLogo} alt={playerTeam} className="w-5 h-5 object-contain" />
                  )}
                  <span className="text-xs text-gray-500">vs</span>
                  {opponentLogo && (
                    <img src={opponentLogo} alt={opponent} className="w-5 h-5 object-contain" />
                  )}
                </div>
                <div className="text-xs text-gray-500 ml-1">
                  Wk {week}
                </div>
              </div>
            );
          }
        }]
    },

    // Basic Stats Group
    {
      headerName: 'BASIC STATS',
      headerClass: 'basic-stats-group-header',
      children: [
        {
          headerName: 'Pos',
          field: 'position',
          width: 50,
          cellRenderer: (params) => (
            <div className="py-1 px-2">
              <span className="text-sm font-medium text-blue-600">{params.value}</span>
            </div>
          )
        },
        {
          headerName: 'DK $',
          field: 'dk_salary',
          width: 70,
          type: 'numericColumn',
          cellRenderer: (params) => {
            const salary = params.value;
            // Only show DK salary for 2025 data
            if (params.data.season !== '2025') {
              return <div className="py-1 px-2 text-sm text-gray-400">-</div>;
            }
            if (salary && salary > 0) {
              return (
                <div className="py-1 px-2">
                  <span className="text-sm font-semibold text-green-700">
                    ${(salary / 1000).toFixed(1)}k
                  </span>
                </div>
              );
            }
            return <div className="py-1 px-2 text-sm text-gray-400">-</div>;
          }
        },
        {
          headerName: '# Snaps',
          field: 'snap_percentage',
          width: 70,
          type: 'numericColumn',
          cellRenderer: (params) => (
            <div className="py-1 px-2">
              <span className="text-sm font-medium text-gray-800">
                {params.value && params.value > 0 ? Math.round(params.value) : '-'}
              </span>
            </div>
          )
        },
        {
          headerName: 'FPTS',
          field: 'fantasy_points',
          width: 80,
          type: 'numericColumn',
          valueGetter: (params) => calculateFantasyPoints(params.data),
          cellRenderer: (params) => {
            const points = parseFloat(params.value) || 0;
            const maxPoints = 35; // Max scale for progress bar
            const percentage = Math.min((points / maxPoints) * 100, 100);

            // Color coding based on performance
            let barColor = 'bg-red-400';
            let textColor = 'text-red-700';
            if (points >= 20) {
              barColor = 'bg-green-400';
              textColor = 'text-green-700';
            } else if (points >= 15) {
              barColor = 'bg-yellow-400';
              textColor = 'text-yellow-700';
            } else if (points >= 10) {
              barColor = 'bg-orange-400';
              textColor = 'text-orange-700';
            }

            return (
              <div className="py-1 px-2 w-full">
                <div className="relative">
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${barColor}`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <div className={`text-xs font-bold ${textColor}`}>
                    {points.toFixed(1)}
                  </div>
                </div>
              </div>
            );
          },
          sort: 'desc'
        }]
    },

    // Passing Stats Group
    {
      headerName: 'PASSING',
      headerClass: 'passing-group-header',
      children: [
        {
          headerName: 'Cmp-Att',
          field: 'passing_attempts',
          width: 75,
          type: 'numericColumn',
          cellClass: 'passing-group-cell',
          valueGetter: (params) => {
            const att = params.data.passing_yards > 0 ? Math.ceil(params.data.passing_yards / 8.5) : 0;
            const cmp = Math.ceil(att * 0.65); // Estimate completion rate
            return att > 0 ? `${cmp}-${att}` : '-';
          },
          cellRenderer: (params) => (
            <div className="py-1 px-2">
              <span className="text-sm">{params.value}</span>
            </div>
          )
        },
        {
          headerName: 'Yds',
          field: 'passing_yards',
          width: 60,
          type: 'numericColumn',
          cellClass: 'passing-group-cell',
          cellRenderer: (params) => (
            <div className="py-1 px-2">
              <span className="text-sm font-medium">{params.value || '-'}</span>
            </div>
          )
        },
        {
          headerName: 'TD',
          field: 'passing_tds',
          width: 50,
          type: 'numericColumn',
          cellClass: 'passing-group-cell',
          cellRenderer: (params) => (
            <div className="py-1 px-2">
              <span className="text-sm font-medium">{params.value || '-'}</span>
            </div>
          )
        },
        {
          headerName: 'Int.',
          field: 'interceptions',
          width: 50,
          type: 'numericColumn',
          cellClass: 'passing-group-cell',
          cellRenderer: (params) => (
            <div className="py-1 px-2">
              <span className="text-sm">{params.value || '-'}</span>
            </div>
          )
        }]
    },
    // Rushing Stats Group
    {
      headerName: 'RUSHING',
      headerClass: 'rushing-group-header',
      children: [
        {
          headerName: 'Att',
          field: 'rushing_attempts',
          width: 50,
          type: 'numericColumn',
          cellClass: 'rushing-group-cell',
          valueGetter: (params) => params.data.rushing_yards > 0 ? Math.ceil(params.data.rushing_yards / 4.5) : 0,
          cellRenderer: (params) => (
            <div className="py-1 px-2">
              <span className="text-sm">{params.value || '-'}</span>
            </div>
          )
        },
        {
          headerName: 'Yds',
          field: 'rushing_yards',
          width: 60,
          type: 'numericColumn',
          cellClass: 'rushing-group-cell',
          cellRenderer: (params) => (
            <div className="py-1 px-2">
              <span className="text-sm font-medium">{params.value || '-'}</span>
            </div>
          )
        },
        {
          headerName: 'TD',
          field: 'rushing_tds',
          width: 50,
          type: 'numericColumn',
          cellClass: 'rushing-group-cell',
          cellRenderer: (params) => (
            <div className="py-1 px-2">
              <span className="text-sm font-medium">{params.value || '-'}</span>
            </div>
          )
        }]
    },
    // Receiving Stats Group
    {
      headerName: 'RECEIVING',
      headerClass: 'receiving-group-header',
      children: [
        {
          headerName: 'Tgt',
          field: 'targets',
          width: 50,
          type: 'numericColumn',
          cellClass: 'receiving-group-cell',
          cellRenderer: (params) => (
            <div className="py-1 px-2">
              <span className="text-sm">{params.value || '-'}</span>
            </div>
          )
        },
        {
          headerName: 'Rec',
          field: 'receptions',
          width: 50,
          type: 'numericColumn',
          cellClass: 'receiving-group-cell',
          cellRenderer: (params) => (
            <div className="py-1 px-2">
              <span className="text-sm font-medium">{params.value || '-'}</span>
            </div>
          )
        },
        {
          headerName: 'Yds',
          field: 'receiving_yards',
          width: 60,
          type: 'numericColumn',
          cellClass: 'receiving-group-cell',
          cellRenderer: (params) => (
            <div className="py-1 px-2">
              <span className="text-sm font-medium">{params.value || '-'}</span>
            </div>
          )
        },
        {
          headerName: 'TD',
          field: 'receiving_tds',
          width: 50,
          type: 'numericColumn',
          cellClass: 'receiving-group-cell',
          cellRenderer: (params) => (
            <div className="py-1 px-2">
              <span className="text-sm font-medium">{params.value || '-'}</span>
            </div>
          )
        }]
    }
  ], [isPPR, calculateFantasyPoints, getPerformanceColor, handlePlayerClick, favorites]);

  // Default column configuration with filtering and sorting enabled on all columns
  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: true,
    floatingFilter: true,
    resizable: true,
    minWidth: 40,
    cellStyle: { padding: '4px 6px' },
    suppressMenu: false
  }), []);

  // Grid options for clean layout
  const gridOptions = useMemo(() => ({
    theme: 'legacy',
    rowHeight: 32,
    headerHeight: 36,
    rowSelection: 'none',
    pagination: true,
    paginationPageSize: 50,
    animateRows: false
  }), []);


  // Fetch players data
  const fetchPlayers = async () => {
    try {
      setLoading(true);

      // Build params based on whether we're using week range or single week
      const params = {
        season: filters.season,
        position: filters.position !== 'all' ? filters.position : undefined,
        team: filters.team !== 'all' ? filters.team : undefined,
        limit: 1000
      };

      // Add week parameters based on selection
      if (filters.weekStart && filters.weekEnd) {
        // Week range mode
        params.week_start = filters.weekStart;
        params.week_end = filters.weekEnd;
      } else if (filters.week && filters.week !== 'all') {
        // Single week mode
        params.week = filters.week;
      }
      // If week is 'all' or not set, don't add any week parameter

      const response = await axios.get(`${API}/players`, { params });

      const playersData = response.data || [];
      setPlayers(playersData);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching players:', error);
      setPlayers([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter and search functionality
  const filteredPlayers = useMemo(() => {
    let filtered = players;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(player =>
        player.player_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.team.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.position.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [players, searchTerm]);

  // Get active filters for display
  const getActiveFilters = () => {
    const active = [];
    if (filters.season !== '2024') active.push({ key: 'season', value: filters.season, label: `Season: ${filters.season}` });
    if (filters.week !== 'all') active.push({ key: 'week', value: filters.week, label: `Week: ${filters.week}` });
    if (filters.position !== 'all') active.push({ key: 'position', value: filters.position, label: `Position: ${filters.position}` });
    if (filters.team !== 'all') active.push({ key: 'team', value: filters.team, label: `Team: ${filters.team}` });
    if (filters.minSalary) active.push({ key: 'minSalary', value: filters.minSalary, label: `Min Salary: $${filters.minSalary}` });
    if (filters.minSnaps) active.push({ key: 'minSnaps', value: filters.minSnaps, label: `Min Snaps: ${filters.minSnaps}` });
    if (searchTerm) active.push({ key: 'search', value: searchTerm, label: `Search: "${searchTerm}"` });
    return active;
  };

  // Clear specific filter
  const clearFilter = (key) => {
    if (key === 'search') {
      setSearchTerm('');
    } else {
      const defaultValues = {
        season: '2024',
        week: 'all',
        position: 'all',
        team: 'all',
        minSalary: '',
        minSnaps: ''
      };
      handleFilterChange(key, defaultValues[key] || '');
    }
  };

  // Toggle favorite player
  const toggleFavorite = (playerId) => {
    setFavorites(prev => {
      const newFavorites = prev.includes(playerId)
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId];

      toast.success(
        newFavorites.includes(playerId)
          ? 'Player added to favorites!'
          : 'Player removed from favorites!'
      );

      return newFavorites;
    });
  };

  // Keyboard shortcuts
  const handleKeyboardShortcuts = useCallback((event) => {
    // Cmd/Ctrl + K for search focus
    if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
      event.preventDefault();
      document.querySelector('input[placeholder*="Search"]')?.focus();
    }

    // Cmd/Ctrl + R for refresh (prevent browser refresh, use our refresh)
    if ((event.metaKey || event.ctrlKey) && event.key === 'r') {
      event.preventDefault();
      refreshData();
    }

    // Cmd/Ctrl + E for export
    if ((event.metaKey || event.ctrlKey) && event.key === 'e') {
      event.preventDefault();
      exportData();
    }

    // Escape to clear search
    if (event.key === 'Escape') {
      setSearchTerm('');
      setPlayerDetailOpen(false);
    }
  }, []);

  // Export data functionality
  const exportData = useCallback(() => {
    const csvData = filteredPlayers.map(player => ({
      Player: player.player_name,
      Team: player.team,
      Position: player.position,
      Fantasy_Points: calculateFantasyPoints(player),
      Snaps: player.snap_percentage,
      Rushing_Yards: player.rushing_yards || 0,
      Receiving_Yards: player.receiving_yards || 0,
      Passing_Yards: player.passing_yards || 0,
      DK_Salary: player.dk_salary || 0
    }));

    const csvString = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `nfl-fantasy-data-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);

    toast.success('Data exported successfully!');
  }, [filteredPlayers, calculateFantasyPoints]);

  // Add keyboard event listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyboardShortcuts);
    return () => document.removeEventListener('keydown', handleKeyboardShortcuts);
  }, [handleKeyboardShortcuts]);


  // Refresh data from NFL sources
  const refreshData = async () => {
    try {
      setRefreshing(true);

      // Fetch player data
      await fetchPlayersWithFilters();

      toast.success('Data refreshed successfully', { duration: 2000 });
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Failed to refresh data', { duration: 3000 });
    } finally {
      setRefreshing(false);
    }
  };

  // Initial data load
  useEffect(() => {
    fetchPlayersWithFilters();
  }, []);

  // PPR change handler
  useEffect(() => {
    if (players.length > 0) {
      // Re-trigger grid update when PPR changes since fantasy points are calculated
      setLastUpdated(new Date());
    }
  }, [isPPR]);

  // Refetch when filters change
  useEffect(() => {
    fetchPlayersWithFilters();
  }, [filters]);

  // Fetch trend data
  const fetchTrendData = async () => {
    try {
      setTrendLoading(true);
      const promises = [];

      // Fetch data for each week in the range
      for (let week = trendFilters.startWeek; week <= trendFilters.endWeek; week++) {
        const params = {
          season: trendFilters.season,
          week: week,
          position: trendFilters.position !== 'All' ? trendFilters.position : undefined,
          limit: 100
        };
        // Only add team filter if not 'All'
        if (trendFilters.team !== 'All') {
          params.team = trendFilters.team;
        }
        const response = axios.get(`${API}/players`, { params });
        promises.push(response);
      }

      const results = await Promise.all(promises);

      // Process and combine the data
      const processedData = [];
      const playerMap = new Map();

      results.forEach((response, index) => {
        const weekNum = trendFilters.startWeek + index;
        const weekData = response.data || [];

        weekData.forEach(player => {
          const key = `${player.player_name}-${player.position}`;
          if (!playerMap.has(key)) {
            playerMap.set(key, {
              player_name: player.player_name,
              position: player.position,
              team: player.team,
              weeks: {}
            });
          }
          playerMap.get(key).weeks[weekNum] = {
            ...player,
            fantasy_points: parseFloat(calculateFantasyPoints(player)) || 0
          };
        });
      });

      // Convert to array and sort by position and name
      const trendArray = Array.from(playerMap.values()).sort((a, b) => {
        if (a.position !== b.position) {
          const posOrder = ['QB', 'RB', 'WR', 'TE'];
          return posOrder.indexOf(a.position) - posOrder.indexOf(b.position);
        }
        return a.player_name.localeCompare(b.player_name);
      });

      setTrendData(trendArray);

    } catch (error) {
      console.error('Error fetching trend data:', error);
      toast.error('Error loading trend data');
    } finally {
      setTrendLoading(false);
    }
  };

  // Fetch trend data when filters change
  useEffect(() => {
    if (activeTab === 'trend-tool') {
      fetchTrendData();
    }
  }, [trendFilters, activeTab]);

  // Column resize handler
  const handleColumnResize = (e, columnKey) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = parseInt(columnWidths[columnKey] || '50px');

    const handleMouseMove = (e) => {
      const newWidth = Math.max(25, startWidth + (e.clientX - startX));
      const newWidths = { ...columnWidths, [columnKey]: `${newWidth}px` };
      setColumnWidths(newWidths);
      localStorage.setItem('trendToolColumnWidths', JSON.stringify(newWidths));
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const onGridReady = (params) => {
    setGridApi(params.api);
    params.api.sizeColumnsToFit();
  };

  // Handle filter changes with auto-apply
  const handleFilterChange = (filterType, value) => {
    const newFilters = { ...filters, [filterType]: value };
    setFilters(newFilters);

    // Auto-apply filters after a short delay
    setTimeout(() => {
      fetchPlayersWithFilters(newFilters);
    }, 300);
  };

  // Separate function for fetching with specific filters
  const fetchPlayersWithFilters = async (filterParams = filters) => {
    try {
      setLoading(true);

      // Prepare clean parameters for backend
      const cleanParams = {
        season: filterParams.season,
        limit: 1000
      };

      // Add week parameters based on selection mode
      if (filterParams.weekStart && filterParams.weekEnd) {
        // Week range mode
        cleanParams.week_start = filterParams.weekStart;
        cleanParams.week_end = filterParams.weekEnd;
      } else if (filterParams.week && filterParams.week !== 'all') {
        // Single week mode
        cleanParams.week = filterParams.week;
      }
      // If week is 'all' or not set, don't add any week parameter

      // Add position if not 'all'
      if (filterParams.position && filterParams.position !== 'all') {
        cleanParams.position = filterParams.position;
      }

      // Add team if not 'all' 
      if (filterParams.team && filterParams.team !== 'all') {
        cleanParams.team = filterParams.team;
      }

      // Add salary filter if specified
      if (filterParams.minSalary) {
        cleanParams.minSalary = filterParams.minSalary;
      }

      // Add snaps filter if specified
      if (filterParams.minSnaps) {
        cleanParams.minSnaps = filterParams.minSnaps;
      }

      console.log('Fetching with params:', cleanParams);

      const response = await axios.get(`${API}/players`, {
        params: cleanParams
      });

      const playersData = response.data || [];
      setPlayers(playersData);
      setLastUpdated(new Date());

      if (playersData.length === 0) {
        toast.info(`No players found for selected filters`, { duration: 2000 });
      } else {
        toast.success(`Loaded ${playersData.length} players`, { duration: 1500 });
      }
    } catch (error) {
      console.error('Error fetching players:', error);
      setPlayers([]);
      toast.error('Error loading player data', { duration: 3000 });
    } finally {
      setLoading(false);
    }
  };

  const PlayerTypeButton = ({ type, label, active, onClick }) => (
    <Button
      variant={active ? "default" : "outline"}
      size="sm"
      onClick={() => onClick(type)}
      className={`text-xs px-3 py-1.5 h-8 ${active ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
        }`}
      data-testid={`player-type-${type}`}
    >
      {label}
    </Button>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      <Toaster position="top-right" />

      {/* MenuWise Sidebar - Resizable dark sidebar */}
      <MenuWiseSidebar
        activeRoute={location.pathname}
        onNavigate={(path) => navigate(path)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Professional Header with Texture */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 shadow-2xl border-b-4 border-blue-500">
          <div className="relative overflow-hidden">
            {/* Texture overlay */}
            <div className="absolute inset-0 bg-black/20 bg-[radial-gradient(circle_at_20%_80%,_rgba(120,_119,_198,_0.3),_transparent_50%)]"></div>
            <div className="absolute inset-0 bg-[linear-gradient(45deg,_transparent_25%,_rgba(255,255,255,0.02)_25%,_rgba(255,255,255,0.02)_50%,_transparent_50%,_transparent_75%,_rgba(255,255,255,0.02)_75%)] bg-[length:4px_4px]"></div>

            <div className="relative max-w-full mx-auto px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-500/20 rounded-lg shadow-lg border border-blue-400/30">
                      <img
                        src="https://static.vecteezy.com/system/resources/thumbnails/053/257/088/small/fantasy-football-logo-white-line-stars-and-shield-vector.jpg"
                        alt="Fantasy Football Logo"
                        className="h-8 w-8 object-contain filter brightness-0 invert"
                      />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-white tracking-tight">NFL DK DASHBOARD</h1>
                      <p className="text-blue-200 text-sm">DraftKings Analytics & Player Stats</p>
                    </div>
                  </div>
                  <div className="hidden md:flex items-center space-x-2">
                    <Badge className="bg-blue-500/20 text-blue-100 border-blue-400 text-xs px-3 py-1">
                      DraftKings PPR
                    </Badge>
                    <Badge className="bg-green-500/20 text-green-100 border-green-400 text-xs px-3 py-1">
                      Live Data
                    </Badge>
                    <Badge
                      className="bg-purple-500/20 text-purple-100 border-purple-400 text-xs px-3 py-1 cursor-pointer hover:bg-purple-500/30 transition-colors"
                      onClick={() => setShowOptimizerFilter(!showOptimizerFilter)}
                    >
                      Optimizer {showOptimizerFilter ? '✓' : '(Beta)'}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-lg text-xs h-9"
                    onClick={() => {
                      refreshData();
                      toast.success('Refreshing data...', { duration: 1500 });
                    }}
                    disabled={refreshing}
                  >
                    <RefreshCw className={`h-3 w-3 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                    {refreshing ? 'Syncing...' : 'Sync Data (⌘R)'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
          {/* Top Navigation Bar */}
          <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 shrink-0 z-10">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-gray-800">
                {activeTab === 'trend-tool' ? 'Trend Tool' : activeTab === 'weekly-box-score' ? 'Weekly Box Score' : 'Player Optimizer'}
              </h1>
              {activeTab === 'data-table' && (
                <div className="flex items-center bg-gray-100 rounded-md px-3 py-1.5 w-64">
                  <Search className="h-4 w-4 text-gray-500 mr-2" />
                  <input
                    type="text"
                    placeholder="Search players, teams..."
                    className="bg-transparent border-none focus:outline-none text-sm w-full"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <button onClick={() => setSearchTerm('')} className="text-gray-400 hover:text-gray-600">
                      <span className="sr-only">Clear</span>
                      &times;
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg mr-2">
                <button
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${isPPR ? 'bg-white shadow-sm text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
                  onClick={() => setIsPPR(true)}
                >
                  PPR
                </button>
                <button
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${!isPPR ? 'bg-white shadow-sm text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
                  onClick={() => setIsPPR(false)}
                >
                  Half PPR
                </button>
              </div>

              <Button variant="outline" size="sm" onClick={refreshData} disabled={refreshing}>
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>

              {activeTab === 'data-table' && (
                <Button variant="outline" size="sm" onClick={exportData}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              )}
            </div>
          </header>

          {/* Content Area */}
          <main className="flex-1 overflow-hidden relative flex flex-col">
            {activeTab === 'trend-tool' ? (
              <div className="flex flex-col h-full w-full bg-white">
                {/* Trend Tool Filters - Using AnalyzerFilters component */}
                <AnalyzerFilters
                  selectedPos={trendFilters.position}
                  selectedTeam={trendFilters.team}
                  season={trendFilters.season}
                  selectedSlate={trendFilters.slate}
                  weekFrom={trendFilters.startWeek}
                  weekTo={trendFilters.endWeek}
                  salaryMin={trendFilters.salaryMin}
                  salaryMax={trendFilters.salaryMax}
                  onPosChange={(val) => setTrendFilters({...trendFilters, position: val})}
                  onTeamChange={(val) => setTrendFilters({...trendFilters, team: val})}
                  onSeasonChange={(val) => setTrendFilters({...trendFilters, season: val})}
                  onSlateChange={(val) => setTrendFilters({...trendFilters, slate: val})}
                  onWeekFromChange={(val) => setTrendFilters({...trendFilters, startWeek: val})}
                  onWeekToChange={(val) => setTrendFilters({...trendFilters, endWeek: val})}
                  onSalaryMinChange={(val) => setTrendFilters({...trendFilters, salaryMin: val})}
                  onSalaryMaxChange={(val) => setTrendFilters({...trendFilters, salaryMax: val})}
                  playerCount={trendData.length}
                  loading={trendLoading}
                />

                {/* Grid Container - AG Grid requires explicit pixel height */}
                <div className="flex-1 overflow-hidden p-4 bg-gray-50">
                  <div style={{ height: 'calc(100vh - 350px)', minHeight: '400px', width: '100%' }}>
                    <TrendToolGrid
                      data={trendData}
                      startWeek={trendFilters.startWeek}
                      endWeek={trendFilters.endWeek}
                      isPPR={isPPR}
                    />
                  </div>
                </div>
              </div>
            ) : activeTab === 'weekly-box-score' ? (
              <div className="flex-1 overflow-auto bg-white">
                <WeeklyBoxScore />
              </div>
            ) : (
              <div className="flex h-full">
                {/* Filter Sidebar */}
                <div className={`border-r border-gray-200 bg-white transition-all duration-300 ease-in-out flex flex-col ${showOptimizerFilter ? 'w-80' : 'w-0 overflow-hidden'}`}>
                  <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <h3 className="font-semibold text-gray-700 flex items-center">
                      <Filter className="h-4 w-4 mr-2" />
                      Filters
                    </h3>
                    <Button variant="ghost" size="sm" onClick={() => setShowOptimizerFilter(false)} className="h-8 w-8 p-0">
                      &times;
                    </Button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4">
                    <OptimizerFilter
                      filters={filters}
                      setFilters={setFilters}
                      onClearFilter={clearFilter}
                      activeFilters={getActiveFilters()}
                    />
                  </div>
                </div>

                {/* Data Grid */}
                <div className="flex-1 flex flex-col overflow-hidden bg-white">
                  {/* Filter Toggle Bar */}
                  <div className="flex items-center justify-between p-2 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center gap-2">
                      <Button
                        variant={showOptimizerFilter ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => setShowOptimizerFilter(!showOptimizerFilter)}
                        className="flex items-center gap-2"
                      >
                        <Filter className="h-4 w-4" />
                        {showOptimizerFilter ? 'Hide Filters' : 'Show Filters'}
                        {getActiveFilters().length > 0 && (
                          <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                            {getActiveFilters().length}
                          </Badge>
                        )}
                      </Button>

                      <div className="h-4 w-px bg-gray-300 mx-2"></div>

                      {/* Active Filters Display */}
                      <div className="flex flex-wrap gap-1 items-center">
                        {getActiveFilters().map((filter) => (
                          <Badge key={filter.key} variant="outline" className="bg-white text-xs font-normal flex items-center gap-1 pl-2 pr-1 py-0.5 h-6">
                            {filter.label}
                            <button
                              onClick={() => clearFilter(filter.key)}
                              className="ml-1 hover:bg-gray-100 rounded-full p-0.5"
                            >
                              <span className="sr-only">Remove</span>
                              &times;
                            </button>
                          </Badge>
                        ))}
                        {getActiveFilters().length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setFilters({
                                season: '2024',
                                week: 'all',
                                position: 'all',
                                team: 'all',
                                minSalary: '',
                                minSnaps: ''
                              });
                              setSearchTerm('');
                            }}
                            className="text-xs h-6 px-2 text-gray-500 hover:text-gray-900"
                          >
                            Clear all
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="text-xs text-gray-500">
                      {filteredPlayers.length} players found
                    </div>
                  </div>

                  <div className="flex-1 ag-theme-alpine w-full" style={{ height: 'calc(100vh - 280px)', minHeight: '400px' }}>
                    <AgGridReact
                      ref={setGridApi}
                      rowData={filteredPlayers}
                      columnDefs={columnDefs}
                      defaultColDef={defaultColDef}
                      gridOptions={gridOptions}
                      pagination={true}
                      paginationPageSize={50}
                    />
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>

        {/* Player Detail Slide-over */}
        {selectedPlayer && (
          <div className={`fixed inset-y-0 right-0 w-96 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 ${playerDetailOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="h-full flex flex-col">
              <div className="p-4 bg-gray-900 text-white flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold">{selectedPlayer.player_name}</h2>
                  <div className="flex items-center gap-2 mt-1 text-gray-300 text-sm">
                    <span className="font-semibold">{selectedPlayer.position}</span>
                    <span>•</span>
                    <span>{selectedPlayer.team}</span>
                  </div>
                </div>
                <button onClick={() => setPlayerDetailOpen(false)} className="text-gray-400 hover:text-white">
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Season Stats</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-xs text-gray-500">Fantasy Points</div>
                      <div className="text-2xl font-bold text-blue-600">{calculateFantasyPoints(selectedPlayer)}</div>
                      <div className="text-xs text-gray-400 mt-1">Avg: {(calculateFantasyPoints(selectedPlayer) / 17).toFixed(1)}/g</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-xs text-gray-500">Snap %</div>
                      <div className="text-2xl font-bold text-gray-800">{selectedPlayer.snap_percentage || 0}%</div>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Recent Games</h3>
                  <div className="space-y-2">
                    {playerGameHistory.length > 0 ? (
                      playerGameHistory.map((game, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-lg shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="bg-gray-100 rounded-md w-8 h-8 flex items-center justify-center text-xs font-bold text-gray-600">
                              W{game.week}
                            </div>
                            <div>
                              <div className="text-sm font-medium">vs {game.opponent}</div>
                              <div className="text-xs text-gray-500">${(game.dk_salary || 0).toLocaleString()}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-blue-600">{calculateFantasyPoints(game)}</div>
                            <div className="text-xs text-gray-400">FPTS</div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-gray-500 text-sm">No recent game data available</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<FantasyDashboard />} />
          <Route path="/data-table" element={<FantasyDashboard />} />
          <Route path="/trend-tool" element={<FantasyDashboard />} />
          <Route path="/fantasy-analyzer" element={<FantasyAnalyzerDemo />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
