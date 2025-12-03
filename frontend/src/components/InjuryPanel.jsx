import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import { getTeamLogo } from '../data/nflTeamLogos';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

// Status badge colors
const STATUS_COLORS = {
  'Out': 'bg-red-500 text-white',
  'Doubtful': 'bg-orange-500 text-white',
  'Questionable': 'bg-yellow-500 text-black',
  'Probable': 'bg-green-500 text-white',
  'IR': 'bg-gray-600 text-white',
  'PUP': 'bg-purple-500 text-white',
  'Suspended': 'bg-gray-800 text-white',
};

const getStatusColor = (status) => {
  if (!status) return 'bg-gray-400 text-white';

  // Check for partial matches
  const statusUpper = status.toUpperCase();
  if (statusUpper.includes('OUT')) return STATUS_COLORS['Out'];
  if (statusUpper.includes('DOUBT')) return STATUS_COLORS['Doubtful'];
  if (statusUpper.includes('QUEST')) return STATUS_COLORS['Questionable'];
  if (statusUpper.includes('PROB')) return STATUS_COLORS['Probable'];
  if (statusUpper.includes('IR')) return STATUS_COLORS['IR'];
  if (statusUpper.includes('PUP')) return STATUS_COLORS['PUP'];
  if (statusUpper.includes('SUSP')) return STATUS_COLORS['Suspended'];

  return 'bg-gray-400 text-white';
};

// Status Badge Component
const StatusBadge = ({ status }) => (
  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getStatusColor(status)}`}>
    {status || 'Unknown'}
  </span>
);

// Position Badge Component
const PositionBadge = ({ position }) => {
  const posColors = {
    'QB': 'bg-red-100 text-red-700',
    'RB': 'bg-blue-100 text-blue-700',
    'WR': 'bg-green-100 text-green-700',
    'TE': 'bg-purple-100 text-purple-700',
    'K': 'bg-yellow-100 text-yellow-700',
  };

  return (
    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${posColors[position] || 'bg-gray-100 text-gray-700'}`}>
      {position}
    </span>
  );
};

// Individual Injury Row
const InjuryRow = ({ injury, compact }) => (
  <div className={`flex items-center gap-2 py-1.5 px-2 hover:bg-gray-50 border-b border-gray-100 ${compact ? 'text-xs' : 'text-sm'}`}>
    {/* Team Logo */}
    <div className="w-6 h-6 flex-shrink-0">
      {getTeamLogo(injury.team) ? (
        <img src={getTeamLogo(injury.team)} alt={injury.team} className="w-6 h-6 object-contain" />
      ) : (
        <span className="text-xs font-medium text-gray-500">{injury.team}</span>
      )}
    </div>

    {/* Player Name */}
    <div className="flex-1 min-w-0">
      <span className="font-medium truncate block">{injury.player_name}</span>
      {!compact && injury.injury && (
        <span className="text-gray-500 text-xs truncate block">{injury.injury}</span>
      )}
    </div>

    {/* Position */}
    <PositionBadge position={injury.position} />

    {/* Status */}
    <StatusBadge status={injury.status} />
  </div>
);

// Team Group Header
const TeamGroupHeader = ({ team, count, isExpanded, onToggle }) => (
  <button
    onClick={onToggle}
    className="w-full flex items-center gap-2 py-2 px-2 bg-gray-100 hover:bg-gray-200 transition-colors"
  >
    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
    <div className="w-6 h-6 flex-shrink-0">
      {getTeamLogo(team) ? (
        <img src={getTeamLogo(team)} alt={team} className="w-6 h-6 object-contain" />
      ) : null}
    </div>
    <span className="font-semibold text-sm">{team}</span>
    <span className="text-gray-500 text-xs">({count} {count === 1 ? 'player' : 'players'})</span>
  </button>
);

// Main Injury Panel Component
const InjuryPanel = ({
  teamFilter = null,
  positionFilter = null,
  compact = false,
  maxHeight = '400px',
  showHeader = true,
  showRefresh = true,
  fantasyOnly = true
}) => {
  const [injuries, setInjuries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [groupByTeam, setGroupByTeam] = useState(false);
  const [expandedTeams, setExpandedTeams] = useState(new Set());

  // Fetch injuries from API
  const fetchInjuries = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);

    try {
      const endpoint = fantasyOnly ? '/api/injuries/fantasy' : '/api/injuries';
      const params = new URLSearchParams();

      if (teamFilter) params.append('team', teamFilter);
      if (positionFilter) params.append('position', positionFilter);
      if (forceRefresh) params.append('refresh', 'true');

      const url = `${BACKEND_URL}${endpoint}${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      setInjuries(data);
      setLastUpdated(new Date());

      // Auto-expand all teams if filtering by team
      if (teamFilter && data.length > 0) {
        setExpandedTeams(new Set([teamFilter]));
      }
    } catch (err) {
      console.error('Error fetching injuries:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [teamFilter, positionFilter, fantasyOnly]);

  // Initial fetch
  useEffect(() => {
    fetchInjuries();
  }, [fetchInjuries]);

  // Group injuries by team
  const injuriesByTeam = React.useMemo(() => {
    const groups = {};
    injuries.forEach(injury => {
      const team = injury.team || 'Unknown';
      if (!groups[team]) groups[team] = [];
      groups[team].push(injury);
    });

    // Sort teams alphabetically
    return Object.keys(groups)
      .sort()
      .reduce((acc, team) => {
        acc[team] = groups[team];
        return acc;
      }, {});
  }, [injuries]);

  // Toggle team expansion
  const toggleTeam = (team) => {
    setExpandedTeams(prev => {
      const newSet = new Set(prev);
      if (newSet.has(team)) {
        newSet.delete(team);
      } else {
        newSet.add(team);
      }
      return newSet;
    });
  };

  // Handle refresh
  const handleRefresh = () => {
    fetchInjuries(true);
  };

  if (loading && injuries.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-500">
        <RefreshCw className="w-5 h-5 animate-spin mr-2" />
        Loading injuries...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <div className="text-red-500 mb-2">Error loading injuries: {error}</div>
        <button
          onClick={() => fetchInjuries()}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white">
      {/* Header */}
      {showHeader && (
        <div className="flex items-center justify-between px-3 py-2 border-b bg-slate-800 text-white">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            <span className="font-bold text-sm">Injury Report</span>
            <span className="text-xs text-slate-300">({injuries.length} players)</span>
          </div>
          <div className="flex items-center gap-2">
            {showRefresh && (
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="p-1 hover:bg-slate-700 rounded transition-colors disabled:opacity-50"
                title="Refresh injuries"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            )}
            <button
              onClick={() => setGroupByTeam(!groupByTeam)}
              className={`px-2 py-0.5 text-xs rounded ${groupByTeam ? 'bg-blue-500' : 'bg-slate-600 hover:bg-slate-500'}`}
            >
              Group by Team
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div style={{ maxHeight, overflowY: 'auto' }}>
        {injuries.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            No injuries reported
            {teamFilter && ` for ${teamFilter}`}
            {positionFilter && ` at ${positionFilter}`}
          </div>
        ) : groupByTeam ? (
          // Grouped by team view
          <div>
            {Object.entries(injuriesByTeam).map(([team, teamInjuries]) => (
              <div key={team}>
                <TeamGroupHeader
                  team={team}
                  count={teamInjuries.length}
                  isExpanded={expandedTeams.has(team)}
                  onToggle={() => toggleTeam(team)}
                />
                {expandedTeams.has(team) && (
                  <div className="pl-4">
                    {teamInjuries.map((injury, idx) => (
                      <InjuryRow key={`${injury.player_id || idx}`} injury={injury} compact={compact} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          // Flat list view
          <div>
            {injuries.map((injury, idx) => (
              <InjuryRow key={`${injury.player_id || idx}`} injury={injury} compact={compact} />
            ))}
          </div>
        )}
      </div>

      {/* Footer with last updated */}
      {lastUpdated && (
        <div className="px-3 py-1 text-xs text-gray-400 border-t bg-gray-50">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
};

export default InjuryPanel;
