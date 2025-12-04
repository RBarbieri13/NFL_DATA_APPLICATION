import React, { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronRight, Users, RefreshCw, AlertCircle } from 'lucide-react';
import { getTeamLogo } from '../data/nflTeamLogos';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

// Position order for display
const POSITION_ORDER = ['QB', 'RB', 'WR', 'TE'];

// Status badge component
const StatusBadge = ({ status }) => {
  const styles = {
    starter: 'bg-green-100 text-green-800 border-green-300',
    rotational: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    backup: 'bg-gray-100 text-gray-600 border-gray-300'
  };

  const labels = {
    starter: 'Starter',
    rotational: 'Rotation',
    backup: 'Backup'
  };

  return (
    <span className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ${styles[status] || styles.backup}`}>
      {labels[status] || status}
    </span>
  );
};

// Snap percentage bar
const SnapBar = ({ percentage }) => {
  const width = Math.min(100, Math.max(0, percentage));

  // Color based on percentage
  let barColor = 'bg-gray-300';
  if (percentage >= 70) barColor = 'bg-green-500';
  else if (percentage >= 30) barColor = 'bg-yellow-500';
  else if (percentage > 0) barColor = 'bg-red-400';

  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} transition-all duration-300`}
          style={{ width: `${width}%` }}
        />
      </div>
      <span className="text-[10px] text-gray-600 w-8 text-right">
        {percentage > 0 ? `${percentage}%` : '-'}
      </span>
    </div>
  );
};

// Player row in depth chart
const PlayerRow = ({ player, rank, isSelected, onSelect }) => {
  return (
    <div
      onClick={() => onSelect?.(player)}
      className={`
        flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer
        transition-colors duration-150
        ${isSelected ? 'bg-blue-100 border border-blue-300' : 'hover:bg-gray-50'}
      `}
    >
      {/* Rank indicator */}
      <div className={`
        w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold
        ${rank === 1 ? 'bg-green-500 text-white' :
          rank === 2 ? 'bg-yellow-500 text-white' :
          'bg-gray-300 text-gray-700'}
      `}>
        {rank}
      </div>

      {/* Player info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-gray-900 truncate">
            {player.name}
          </span>
          {player.jersey && (
            <span className="text-[10px] text-gray-400">#{player.jersey}</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <SnapBar percentage={player.snap_pct || 0} />
          <StatusBadge status={player.status} />
        </div>
      </div>

      {/* Snaps count */}
      {player.snaps > 0 && (
        <div className="text-right">
          <div className="text-[10px] text-gray-500">Snaps</div>
          <div className="text-xs font-medium text-gray-700">{player.snaps}</div>
        </div>
      )}
    </div>
  );
};

// Position group section
const PositionGroup = ({ position, players, expandedPositions, togglePosition, selectedPlayer, onSelectPlayer }) => {
  const isExpanded = expandedPositions[position] !== false; // Default to expanded
  const starterCount = players.filter(p => p.status === 'starter').length;

  return (
    <div className="border-b border-gray-200 last:border-b-0">
      {/* Position header */}
      <button
        onClick={() => togglePosition(position)}
        className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-500" />
          )}
          <span className="font-bold text-sm text-gray-800">{position}</span>
          <span className="text-xs text-gray-500">({players.length} players)</span>
        </div>
        <div className="flex items-center gap-1">
          {starterCount > 0 && (
            <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
              {starterCount} starter{starterCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </button>

      {/* Players list */}
      {isExpanded && (
        <div className="py-1 px-1 space-y-0.5">
          {players.map((player, idx) => (
            <PlayerRow
              key={`${position}-${player.name}-${idx}`}
              player={player}
              rank={player.rank || idx + 1}
              isSelected={selectedPlayer?.name === player.name}
              onSelect={onSelectPlayer}
            />
          ))}
          {players.length === 0 && (
            <div className="text-center py-2 text-xs text-gray-400">
              No players listed
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Team selector dropdown
const TeamSelector = ({ selectedTeam, teams, onChange, loading }) => {
  return (
    <div className="flex items-center gap-2">
      {selectedTeam && getTeamLogo(selectedTeam) && (
        <img
          src={getTeamLogo(selectedTeam)}
          alt={selectedTeam}
          className="w-6 h-6 object-contain"
        />
      )}
      <select
        value={selectedTeam || ''}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={loading}
        className="flex-1 text-sm border border-gray-300 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">Select Team...</option>
        {teams.map(team => (
          <option key={team} value={team}>{team}</option>
        ))}
      </select>
    </div>
  );
};

// Main DepthChartPanel component
const DepthChartPanel = ({ teamFilter = null, positionFilter = null, onPlayerSelect }) => {
  const [depthData, setDepthData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(teamFilter);
  const [expandedPositions, setExpandedPositions] = useState({});
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  // Update selected team when teamFilter prop changes
  useEffect(() => {
    if (teamFilter && teamFilter !== 'All') {
      setSelectedTeam(teamFilter);
    }
  }, [teamFilter]);

  // Fetch available teams on mount
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/depth-chart-enhanced`);
        const data = await response.json();
        if (data.teams) {
          setTeams(data.teams);
        }
      } catch (err) {
        console.error('Error fetching teams:', err);
        // Fallback team list
        setTeams([
          'ARI', 'ATL', 'BAL', 'BUF', 'CAR', 'CHI', 'CIN', 'CLE',
          'DAL', 'DEN', 'DET', 'GB', 'HOU', 'IND', 'JAX', 'KC',
          'LV', 'LAC', 'LAR', 'MIA', 'MIN', 'NE', 'NO', 'NYG', 'NYJ',
          'PHI', 'PIT', 'SF', 'SEA', 'TB', 'TEN', 'WAS'
        ]);
      }
    };
    fetchTeams();
  }, []);

  // Fetch depth chart data when team changes
  const fetchDepthChart = useCallback(async (team) => {
    if (!team) {
      setDepthData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ team });
      if (positionFilter && positionFilter !== 'All') {
        params.append('position', positionFilter);
      }

      const response = await fetch(`${BACKEND_URL}/api/depth-chart-enhanced?${params}`);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setDepthData(data);
        // Initialize all positions as expanded
        const expanded = {};
        POSITION_ORDER.forEach(pos => {
          expanded[pos] = true;
        });
        setExpandedPositions(expanded);
      } else {
        throw new Error(data.message || 'Failed to fetch depth chart');
      }
    } catch (err) {
      console.error('Error fetching depth chart:', err);
      setError(err.message);
      setDepthData(null);
    } finally {
      setLoading(false);
    }
  }, [positionFilter]);

  // Fetch when team changes
  useEffect(() => {
    fetchDepthChart(selectedTeam);
  }, [selectedTeam, fetchDepthChart]);

  // Toggle position expansion
  const togglePosition = (position) => {
    setExpandedPositions(prev => ({
      ...prev,
      [position]: !prev[position]
    }));
  };

  // Handle player selection
  const handleSelectPlayer = (player) => {
    setSelectedPlayer(prev => prev?.name === player.name ? null : player);
    if (onPlayerSelect) {
      onPlayerSelect(player);
    }
  };

  // Handle team change
  const handleTeamChange = (team) => {
    setSelectedTeam(team);
    setSelectedPlayer(null);
  };

  // Refresh handler
  const handleRefresh = () => {
    fetchDepthChart(selectedTeam);
  };

  // Get ordered positions
  const orderedPositions = POSITION_ORDER.filter(pos =>
    depthData?.positions?.[pos]?.length > 0
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header with team selector */}
      <div className="p-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2 mb-2">
          <TeamSelector
            selectedTeam={selectedTeam}
            teams={teams}
            onChange={handleTeamChange}
            loading={loading}
          />
          <button
            onClick={handleRefresh}
            disabled={loading || !selectedTeam}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
            title="Refresh depth chart"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Data info */}
        {depthData && (
          <div className="text-[10px] text-gray-500">
            Week {depthData.depth_chart_week} depth chart
            {depthData.snap_data_week !== depthData.depth_chart_week && (
              <span> (Week {depthData.snap_data_week} snaps)</span>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
            <span className="ml-2 text-sm text-gray-500">Loading depth chart...</span>
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="p-4">
            <div className="flex items-center gap-2 text-red-600 mb-2">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm font-medium">Error loading depth chart</span>
            </div>
            <p className="text-xs text-gray-500">{error}</p>
            <button
              onClick={handleRefresh}
              className="mt-2 text-xs text-blue-600 hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* No team selected */}
        {!selectedTeam && !loading && (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <Users className="w-12 h-12 text-gray-300 mb-3" />
            <h3 className="font-semibold text-gray-700 mb-1">Select a Team</h3>
            <p className="text-xs text-gray-500">
              Choose a team from the dropdown to view their depth chart
            </p>
          </div>
        )}

        {/* Depth chart content */}
        {depthData && !loading && !error && (
          <div>
            {orderedPositions.length > 0 ? (
              orderedPositions.map(position => (
                <PositionGroup
                  key={position}
                  position={position}
                  players={depthData.positions[position] || []}
                  expandedPositions={expandedPositions}
                  togglePosition={togglePosition}
                  selectedPlayer={selectedPlayer}
                  onSelectPlayer={handleSelectPlayer}
                />
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">No depth chart data available</p>
                <p className="text-xs mt-1">Data may not be loaded for this team yet</p>
              </div>
            )}

            {/* Season averages section */}
            {depthData.season_averages && Object.keys(depthData.season_averages).length > 0 && (
              <div className="mt-4 p-3 bg-gray-50 border-t border-gray-200">
                <h4 className="text-xs font-semibold text-gray-600 mb-2">Season Averages</h4>
                <div className="space-y-2">
                  {POSITION_ORDER.map(pos => {
                    const players = depthData.season_averages[pos];
                    if (!players || players.length === 0) return null;

                    return (
                      <div key={pos} className="text-[10px]">
                        <span className="font-medium text-gray-700">{pos}:</span>
                        <span className="text-gray-500 ml-1">
                          {players.slice(0, 3).map((p, i) => (
                            <span key={p.name}>
                              {i > 0 && ', '}
                              {p.name} ({p.avg_snap_pct}%)
                            </span>
                          ))}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DepthChartPanel;
