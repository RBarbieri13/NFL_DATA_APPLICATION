import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronDown, Settings, X, Star } from 'lucide-react';
import { getTeamLogo } from '../data/nflTeamLogos';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

const NFL_TEAMS = [
  'All', 'ARI', 'ATL', 'BAL', 'BUF', 'CAR', 'CHI', 'CIN', 'CLE',
  'DAL', 'DEN', 'DET', 'GB', 'HOU', 'IND', 'JAX', 'KC',
  'LV', 'LAC', 'LAR', 'MIA', 'MIN', 'NE', 'NO', 'NYG', 'NYJ',
  'PHI', 'PIT', 'SF', 'SEA', 'TB', 'TEN', 'WAS'
];

// Default column widths
const DEFAULT_COL_WIDTHS = {
  player: 140,
  pos: 45,
  team: 60,
  games: 50,
  avgFpts: 55,
  totalFpts: 60,
  avgSnaps: 50,
  // Passing
  cmpAtt: 60,
  passYds: 50,
  passTd: 40,
  int: 40,
  // Rushing
  rushAtt: 45,
  rushYds: 50,
  rushTd: 40,
  // Receiving
  tgts: 45,
  rec: 45,
  recYds: 50,
  recTd: 40
};

// Helper function for FPTS background color
const getFptsBackgroundColor = (value, allValues) => {
  if (!value || value <= 0 || !allValues || allValues.length === 0) return '';
  const validValues = allValues.filter(v => v && v > 0);
  if (validValues.length === 0) return '';
  const min = Math.min(...validValues);
  const max = Math.max(...validValues);
  const range = max - min;
  if (range === 0) return 'rgba(34, 197, 94, 0.15)';
  const position = (value - min) / range;
  if (position >= 0.8) return 'rgba(34, 197, 94, 0.25)';
  if (position >= 0.6) return 'rgba(34, 197, 94, 0.15)';
  if (position >= 0.4) return 'rgba(234, 179, 8, 0.08)';
  if (position >= 0.2) return 'rgba(239, 68, 68, 0.10)';
  return 'rgba(239, 68, 68, 0.18)';
};

// Clickable Header Cell
const ClickableHeaderCell = ({ children, className = "", colSpan = 1, rowSpan = 1, onClick = null, width, style = {} }) => (
  <th
    colSpan={colSpan}
    rowSpan={rowSpan}
    onClick={onClick}
    className={`border border-gray-300 px-2 py-1 text-center text-xs font-semibold ${onClick ? 'cursor-pointer hover:bg-opacity-80' : ''} ${className}`}
    style={{ width: width ? `${width}px` : 'auto', minWidth: width ? `${width}px` : 'auto', ...style }}
  >
    {children}
  </th>
);

// Data Cell
const DataCell = ({ children, className = "", width, style = {} }) => (
  <td
    className={`border border-gray-200 px-2 py-1 text-center text-xs ${className}`}
    style={{ width: width ? `${width}px` : 'auto', minWidth: width ? `${width}px` : 'auto', ...style }}
  >
    {children}
  </td>
);

const AggregateDataTable = () => {
  // State
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPos, setSelectedPos] = useState('RB');
  const [selectedTeam, setSelectedTeam] = useState('All');
  const [season, setSeason] = useState(2025);
  const [weekFrom, setWeekFrom] = useState(1);
  const [weekTo, setWeekTo] = useState(12);
  const [sortConfig, setSortConfig] = useState({ key: 'avgFpts', direction: 'desc' });
  const [colWidths] = useState(DEFAULT_COL_WIDTHS);
  const [favoritePlayers, setFavoritePlayers] = useState(new Set());

  // Visible columns state
  const [visibleColumns, setVisibleColumns] = useState({
    games: true, avgFpts: true, totalFpts: true, avgSnaps: true,
    cmpAtt: true, passYds: true, passTd: true, int: true,
    rushAtt: true, rushYds: true, rushTd: true,
    tgts: true, rec: true, recYds: true, recTd: true
  });
  const [showColumnSettings, setShowColumnSettings] = useState(false);

  // Generate week options
  const weekOptions = useMemo(() => Array.from({ length: 18 }, (_, i) => i + 1), []);

  // Fetch aggregate data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const weeks = [];
      for (let w = weekFrom; w <= weekTo; w++) weeks.push(w);

      const params = new URLSearchParams({
        position: selectedPos,
        season: season.toString(),
        weeks: weeks.join(',')
      });
      if (selectedTeam !== 'All') params.append('team', selectedTeam);

      const response = await fetch(`${BACKEND_URL}/api/fantasy-analyzer?${params}`);
      const rawData = await response.json();

      // Aggregate the week-by-week data
      const aggregated = rawData.map(player => {
        const weeks = player.weeks || [];
        const gamesPlayed = weeks.filter(w => w && (w.misc?.fpts > 0 || w.rushing?.yds > 0 || w.receiving?.yds > 0 || w.passing?.yds > 0)).length;

        // Sum up all stats
        let totalFpts = 0, totalSnaps = 0;
        let totalPassYds = 0, totalPassTd = 0, totalInt = 0, totalCmp = 0, totalAtt = 0;
        let totalRushAtt = 0, totalRushYds = 0, totalRushTd = 0;
        let totalTgts = 0, totalRec = 0, totalRecYds = 0, totalRecTd = 0;

        weeks.forEach(week => {
          if (!week) return;
          totalFpts += week.misc?.fpts || 0;
          totalSnaps += week.misc?.num || 0;
          // Passing
          totalPassYds += week.passing?.yds || 0;
          totalPassTd += week.passing?.td || 0;
          totalInt += week.passing?.int || 0;
          // Parse cmpAtt if it's a string like "20-30"
          if (week.passing?.cmpAtt && typeof week.passing.cmpAtt === 'string') {
            const [cmp, att] = week.passing.cmpAtt.split('-').map(Number);
            totalCmp += cmp || 0;
            totalAtt += att || 0;
          }
          // Rushing
          totalRushAtt += week.rushing?.att || 0;
          totalRushYds += week.rushing?.yds || 0;
          totalRushTd += week.rushing?.td || 0;
          // Receiving
          totalTgts += week.receiving?.tgts || 0;
          totalRec += week.receiving?.rec || 0;
          totalRecYds += week.receiving?.yds || 0;
          totalRecTd += week.receiving?.td || 0;
        });

        return {
          id: player.id,
          name: player.name,
          pos: player.pos,
          team: player.team,
          games: gamesPlayed,
          avgFpts: gamesPlayed > 0 ? totalFpts / gamesPlayed : 0,
          totalFpts,
          avgSnaps: gamesPlayed > 0 ? totalSnaps / gamesPlayed : 0,
          // Passing totals
          cmpAtt: totalAtt > 0 ? `${totalCmp}-${totalAtt}` : '-',
          passYds: totalPassYds,
          passTd: totalPassTd,
          int: totalInt,
          // Rushing totals
          rushAtt: totalRushAtt,
          rushYds: totalRushYds,
          rushTd: totalRushTd,
          // Receiving totals
          tgts: totalTgts,
          rec: totalRec,
          recYds: totalRecYds,
          recTd: totalRecTd
        };
      });

      setData(aggregated);
    } catch (error) {
      console.error('Error fetching aggregate data:', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [selectedPos, selectedTeam, season, weekFrom, weekTo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return data;
    return [...data].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      if (typeof aVal === 'string' && aVal.includes('-')) aVal = 0;
      if (typeof bVal === 'string' && bVal.includes('-')) bVal = 0;
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const toggleFavorite = (playerId) => {
    setFavoritePlayers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(playerId)) newSet.delete(playerId);
      else newSet.add(playerId);
      return newSet;
    });
  };

  // Get all avgFpts values for color scaling
  const allAvgFpts = useMemo(() => data.map(p => p.avgFpts), [data]);

  // Count visible columns per category
  const getVisiblePassingCols = () => [visibleColumns.cmpAtt, visibleColumns.passYds, visibleColumns.passTd, visibleColumns.int].filter(Boolean).length;
  const getVisibleRushingCols = () => [visibleColumns.rushAtt, visibleColumns.rushYds, visibleColumns.rushTd].filter(Boolean).length;
  const getVisibleReceivingCols = () => [visibleColumns.tgts, visibleColumns.rec, visibleColumns.recYds, visibleColumns.recTd].filter(Boolean).length;
  const getVisibleSummaryCols = () => [visibleColumns.games, visibleColumns.avgFpts, visibleColumns.totalFpts, visibleColumns.avgSnaps].filter(Boolean).length;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Filters Bar - matching FantasyAnalyzer style */}
      <div className="bg-gray-100 border-b border-gray-200 px-4 py-3">
        <div className="flex flex-wrap items-center gap-4">
          {/* Position */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-600">Pos</label>
            <select
              value={selectedPos}
              onChange={(e) => setSelectedPos(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
            >
              <option value="QB">QB</option>
              <option value="RB">RB</option>
              <option value="WR">WR</option>
              <option value="TE">TE</option>
            </select>
          </div>

          {/* Team */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-600">Team</label>
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
            >
              {NFL_TEAMS.map(team => (
                <option key={team} value={team}>{team}</option>
              ))}
            </select>
          </div>

          {/* Season */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-600">Season</label>
            <select
              value={season}
              onChange={(e) => setSeason(parseInt(e.target.value))}
              className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
            >
              <option value={2025}>2025</option>
              <option value={2024}>2024</option>
              <option value={2023}>2023</option>
            </select>
          </div>

          {/* Week Range */}
          <div className="flex items-center gap-2 bg-white border border-gray-300 rounded px-3 py-1">
            <span className="text-xs font-medium text-gray-600">Weeks</span>
            <select
              value={weekFrom}
              onChange={(e) => setWeekFrom(parseInt(e.target.value))}
              className="border-0 text-sm bg-transparent focus:outline-none"
            >
              {weekOptions.map(w => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
            <span className="text-gray-400">to</span>
            <select
              value={weekTo}
              onChange={(e) => setWeekTo(parseInt(e.target.value))}
              className="border-0 text-sm bg-transparent focus:outline-none"
            >
              {weekOptions.map(w => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
          </div>

          {/* Column Settings */}
          <button
            onClick={() => setShowColumnSettings(!showColumnSettings)}
            className="flex items-center gap-1 px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
          >
            <Settings className="h-4 w-4" />
            Columns
          </button>

          {/* Player Count */}
          <div className="ml-auto text-sm text-gray-500">
            {loading ? 'Loading...' : `${data.length} players`}
          </div>
        </div>

        {/* Column Settings Panel */}
        {showColumnSettings && (
          <div className="mt-3 p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Visible Columns</span>
              <button onClick={() => setShowColumnSettings(false)}>
                <X className="h-4 w-4 text-gray-400" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-4 text-xs">
              <div>
                <div className="font-medium text-gray-700 mb-1">Summary</div>
                {['games', 'avgFpts', 'totalFpts', 'avgSnaps'].map(col => (
                  <label key={col} className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={visibleColumns[col]}
                      onChange={() => setVisibleColumns(prev => ({ ...prev, [col]: !prev[col] }))}
                    />
                    {col === 'games' ? 'GP' : col === 'avgFpts' ? 'Avg FPTS' : col === 'totalFpts' ? 'Total FPTS' : 'Avg Snaps'}
                  </label>
                ))}
              </div>
              <div>
                <div className="font-medium text-gray-700 mb-1">Passing</div>
                {['cmpAtt', 'passYds', 'passTd', 'int'].map(col => (
                  <label key={col} className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={visibleColumns[col]}
                      onChange={() => setVisibleColumns(prev => ({ ...prev, [col]: !prev[col] }))}
                    />
                    {col === 'cmpAtt' ? 'Cmp-Att' : col === 'passYds' ? 'Yds' : col === 'passTd' ? 'TD' : 'Int'}
                  </label>
                ))}
              </div>
              <div>
                <div className="font-medium text-gray-700 mb-1">Rushing</div>
                {['rushAtt', 'rushYds', 'rushTd'].map(col => (
                  <label key={col} className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={visibleColumns[col]}
                      onChange={() => setVisibleColumns(prev => ({ ...prev, [col]: !prev[col] }))}
                    />
                    {col === 'rushAtt' ? 'Att' : col === 'rushYds' ? 'Yds' : 'TD'}
                  </label>
                ))}
              </div>
              <div>
                <div className="font-medium text-gray-700 mb-1">Receiving</div>
                {['tgts', 'rec', 'recYds', 'recTd'].map(col => (
                  <label key={col} className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={visibleColumns[col]}
                      onChange={() => setVisibleColumns(prev => ({ ...prev, [col]: !prev[col] }))}
                    />
                    {col === 'tgts' ? 'Tgts' : col === 'rec' ? 'Rec' : col === 'recYds' ? 'Yds' : 'TD'}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Table Container */}
      <div className="flex-1 overflow-auto">
        <table className="border-collapse border border-gray-800" style={{ tableLayout: 'fixed' }}>
          <thead>
            {/* Header Row 1: Top Level Categories */}
            <tr>
              <ClickableHeaderCell colSpan={3} className="bg-gray-300 text-black">Player</ClickableHeaderCell>
              {getVisibleSummaryCols() > 0 && (
                <ClickableHeaderCell colSpan={getVisibleSummaryCols()} className="bg-slate-800 text-white text-lg">
                  Summary (Wk {weekFrom}-{weekTo})
                </ClickableHeaderCell>
              )}
              {getVisiblePassingCols() > 0 && (
                <ClickableHeaderCell colSpan={getVisiblePassingCols()} className="bg-[#dbeafe] text-[#1e40af] border-b-2 border-[#3b82f6]">
                  Passing
                </ClickableHeaderCell>
              )}
              {getVisibleRushingCols() > 0 && (
                <ClickableHeaderCell colSpan={getVisibleRushingCols()} className="bg-[#dcfce7] text-[#15803d] border-b-2 border-[#10b981]">
                  Rushing
                </ClickableHeaderCell>
              )}
              {getVisibleReceivingCols() > 0 && (
                <ClickableHeaderCell colSpan={getVisibleReceivingCols()} className="bg-[#f3e8ff] text-[#7c3aed] border-b-2 border-[#8b5cf6]">
                  Receiving
                </ClickableHeaderCell>
              )}
            </tr>

            {/* Header Row 2: Specific Stats */}
            <tr className="text-[10px]">
              {/* Player Info */}
              <ClickableHeaderCell className="bg-gray-700 text-white" width={colWidths.player} onClick={() => handleSort('name')}>
                Player
              </ClickableHeaderCell>
              <ClickableHeaderCell className="bg-gray-700 text-white" width={colWidths.pos} onClick={() => handleSort('pos')}>
                Pos
              </ClickableHeaderCell>
              <ClickableHeaderCell className="bg-gray-700 text-white" width={colWidths.team} onClick={() => handleSort('team')}>
                Team
              </ClickableHeaderCell>

              {/* Summary */}
              {visibleColumns.games && (
                <ClickableHeaderCell className="bg-gray-500 text-white" width={colWidths.games} onClick={() => handleSort('games')}>
                  GP
                </ClickableHeaderCell>
              )}
              {visibleColumns.avgFpts && (
                <ClickableHeaderCell className="bg-gray-500 text-white" width={colWidths.avgFpts} onClick={() => handleSort('avgFpts')}>
                  Avg FPTS
                </ClickableHeaderCell>
              )}
              {visibleColumns.totalFpts && (
                <ClickableHeaderCell className="bg-gray-500 text-white" width={colWidths.totalFpts} onClick={() => handleSort('totalFpts')}>
                  Tot FPTS
                </ClickableHeaderCell>
              )}
              {visibleColumns.avgSnaps && (
                <ClickableHeaderCell className="bg-gray-500 text-white" width={colWidths.avgSnaps} onClick={() => handleSort('avgSnaps')}>
                  Avg #
                </ClickableHeaderCell>
              )}

              {/* Passing */}
              {visibleColumns.cmpAtt && (
                <ClickableHeaderCell className="bg-[#dbeafe] text-[#1e40af]" width={colWidths.cmpAtt}>
                  Cmp-Att
                </ClickableHeaderCell>
              )}
              {visibleColumns.passYds && (
                <ClickableHeaderCell className="bg-[#dbeafe] text-[#1e40af]" width={colWidths.passYds} onClick={() => handleSort('passYds')}>
                  Yds
                </ClickableHeaderCell>
              )}
              {visibleColumns.passTd && (
                <ClickableHeaderCell className="bg-[#dbeafe] text-[#1e40af]" width={colWidths.passTd} onClick={() => handleSort('passTd')}>
                  TD
                </ClickableHeaderCell>
              )}
              {visibleColumns.int && (
                <ClickableHeaderCell className="bg-[#dbeafe] text-[#1e40af]" width={colWidths.int} onClick={() => handleSort('int')}>
                  Int
                </ClickableHeaderCell>
              )}

              {/* Rushing */}
              {visibleColumns.rushAtt && (
                <ClickableHeaderCell className="bg-[#dcfce7] text-[#15803d]" width={colWidths.rushAtt} onClick={() => handleSort('rushAtt')}>
                  Att
                </ClickableHeaderCell>
              )}
              {visibleColumns.rushYds && (
                <ClickableHeaderCell className="bg-[#dcfce7] text-[#15803d]" width={colWidths.rushYds} onClick={() => handleSort('rushYds')}>
                  Yds
                </ClickableHeaderCell>
              )}
              {visibleColumns.rushTd && (
                <ClickableHeaderCell className="bg-[#dcfce7] text-[#15803d]" width={colWidths.rushTd} onClick={() => handleSort('rushTd')}>
                  TD
                </ClickableHeaderCell>
              )}

              {/* Receiving */}
              {visibleColumns.tgts && (
                <ClickableHeaderCell className="bg-[#f3e8ff] text-[#7c3aed]" width={colWidths.tgts} onClick={() => handleSort('tgts')}>
                  Tgts
                </ClickableHeaderCell>
              )}
              {visibleColumns.rec && (
                <ClickableHeaderCell className="bg-[#f3e8ff] text-[#7c3aed]" width={colWidths.rec} onClick={() => handleSort('rec')}>
                  Rec
                </ClickableHeaderCell>
              )}
              {visibleColumns.recYds && (
                <ClickableHeaderCell className="bg-[#f3e8ff] text-[#7c3aed]" width={colWidths.recYds} onClick={() => handleSort('recYds')}>
                  Yds
                </ClickableHeaderCell>
              )}
              {visibleColumns.recTd && (
                <ClickableHeaderCell className="bg-[#f3e8ff] text-[#7c3aed]" width={colWidths.recTd} onClick={() => handleSort('recTd')}>
                  TD
                </ClickableHeaderCell>
              )}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={20} className="text-center py-8 text-gray-500">Loading...</td>
              </tr>
            ) : sortedData.length === 0 ? (
              <tr>
                <td colSpan={20} className="text-center py-8 text-gray-500">No data available</td>
              </tr>
            ) : (
              sortedData.map((player, index) => (
                <tr
                  key={player.id || index}
                  className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-yellow-50 font-medium`}
                >
                  {/* Player Name */}
                  <DataCell className="text-left font-bold" width={colWidths.player}>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleFavorite(player.id)}
                        className="text-gray-300 hover:text-yellow-500"
                      >
                        <Star className={`h-3 w-3 ${favoritePlayers.has(player.id) ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                      </button>
                      <span className="truncate">{player.name}</span>
                    </div>
                  </DataCell>

                  {/* Position */}
                  <DataCell width={colWidths.pos}>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      player.pos === 'QB' ? 'bg-red-100 text-red-700' :
                      player.pos === 'RB' ? 'bg-green-100 text-green-700' :
                      player.pos === 'WR' ? 'bg-blue-100 text-blue-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {player.pos}
                    </span>
                  </DataCell>

                  {/* Team */}
                  <DataCell width={colWidths.team}>
                    <div className="flex items-center gap-1 justify-center">
                      {getTeamLogo(player.team) && (
                        <img src={getTeamLogo(player.team)} alt={player.team} className="w-4 h-4 object-contain" />
                      )}
                      <span className="text-[10px]">{player.team}</span>
                    </div>
                  </DataCell>

                  {/* Games Played */}
                  {visibleColumns.games && (
                    <DataCell width={colWidths.games}>{player.games}</DataCell>
                  )}

                  {/* Avg FPTS */}
                  {visibleColumns.avgFpts && (
                    <DataCell
                      width={colWidths.avgFpts}
                      className="font-bold"
                      style={{ backgroundColor: getFptsBackgroundColor(player.avgFpts, allAvgFpts) }}
                    >
                      {player.avgFpts.toFixed(1)}
                    </DataCell>
                  )}

                  {/* Total FPTS */}
                  {visibleColumns.totalFpts && (
                    <DataCell width={colWidths.totalFpts} className="font-bold">
                      {player.totalFpts.toFixed(1)}
                    </DataCell>
                  )}

                  {/* Avg Snaps */}
                  {visibleColumns.avgSnaps && (
                    <DataCell width={colWidths.avgSnaps}>
                      {player.avgSnaps > 0 ? Math.round(player.avgSnaps) : '-'}
                    </DataCell>
                  )}

                  {/* Passing Stats */}
                  {visibleColumns.cmpAtt && <DataCell width={colWidths.cmpAtt}>{player.cmpAtt}</DataCell>}
                  {visibleColumns.passYds && <DataCell width={colWidths.passYds}>{player.passYds || '-'}</DataCell>}
                  {visibleColumns.passTd && <DataCell width={colWidths.passTd}>{player.passTd || '-'}</DataCell>}
                  {visibleColumns.int && <DataCell width={colWidths.int}>{player.int || '-'}</DataCell>}

                  {/* Rushing Stats */}
                  {visibleColumns.rushAtt && <DataCell width={colWidths.rushAtt}>{player.rushAtt || '-'}</DataCell>}
                  {visibleColumns.rushYds && <DataCell width={colWidths.rushYds}>{player.rushYds || '-'}</DataCell>}
                  {visibleColumns.rushTd && <DataCell width={colWidths.rushTd}>{player.rushTd || '-'}</DataCell>}

                  {/* Receiving Stats */}
                  {visibleColumns.tgts && <DataCell width={colWidths.tgts}>{player.tgts || '-'}</DataCell>}
                  {visibleColumns.rec && <DataCell width={colWidths.rec}>{player.rec || '-'}</DataCell>}
                  {visibleColumns.recYds && <DataCell width={colWidths.recYds}>{player.recYds || '-'}</DataCell>}
                  {visibleColumns.recTd && <DataCell width={colWidths.recTd}>{player.recTd || '-'}</DataCell>}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AggregateDataTable;
