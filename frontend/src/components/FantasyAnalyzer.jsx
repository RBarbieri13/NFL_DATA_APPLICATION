import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:10000';

const NFL_TEAMS = [
  'All', 'ARI', 'ATL', 'BAL', 'BUF', 'CAR', 'CHI', 'CIN', 'CLE',
  'DAL', 'DEN', 'DET', 'GB', 'HOU', 'IND', 'JAX', 'KC',
  'LV', 'LAC', 'LAR', 'MIA', 'MIN', 'NE', 'NO', 'NYG', 'NYJ',
  'PHI', 'PIT', 'SF', 'SEA', 'TB', 'TEN', 'WAS'
];

// Helper Components for Styles
const HeaderCell = ({ children, className = "", colSpan = 1, rowSpan = 1, onClick = null }) => (
  <th
    colSpan={colSpan}
    rowSpan={rowSpan}
    className={`border border-gray-600 px-1 py-1 text-xs font-bold text-white text-center ${onClick ? 'cursor-pointer hover:bg-opacity-80' : ''} ${className}`}
    onClick={onClick}
  >
    {children}
  </th>
);

const DataCell = ({ children, className = "" }) => (
  <td className={`border border-gray-300 px-1 py-0.5 text-xs text-center whitespace-nowrap ${className}`}>
    {children}
  </td>
);

const FantasyAnalyzer = () => {
  // Filter state
  const [selectedPos, setSelectedPos] = useState('RB');
  const [selectedTeam, setSelectedTeam] = useState('All');
  const [selectedSlate, setSelectedSlate] = useState('Main');
  const [weekFrom, setWeekFrom] = useState(1);
  const [weekTo, setWeekTo] = useState(4);
  const [season, setSeason] = useState(2025);
  const [salaryMin, setSalaryMin] = useState(0);
  const [salaryMax, setSalaryMax] = useState(15000);

  // Data state
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Collapsible state for each week (true = expanded, false = collapsed)
  const [expandedWeeks, setExpandedWeeks] = useState({});

  // Toggle week expansion
  const toggleWeekExpansion = (week) => {
    setExpandedWeeks(prev => ({
      ...prev,
      [week]: !prev[week]
    }));
  };

  // Number of columns per week when expanded vs collapsed
  const statsPerWeekColsExpanded = 13;
  const statsPerWeekColsCollapsed = 2; // Just # and FPTS

  // Calculate total columns for a week based on expansion state
  const getStatsPerWeekCols = (week) => {
    return expandedWeeks[week] ? statsPerWeekColsExpanded : statsPerWeekColsCollapsed;
  };

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

  const formatCurrency = (amount) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Calculate trend (avg fantasy points change)
  const calculateTrend = (weeks) => {
    if (!weeks || weeks.length < 2) return null;
    const sorted = [...weeks].sort((a, b) => a.weekNum - b.weekNum);
    const firstHalf = sorted.slice(0, Math.floor(sorted.length / 2));
    const secondHalf = sorted.slice(Math.floor(sorted.length / 2));

    const firstAvg = firstHalf.reduce((sum, w) => sum + (w.misc?.fpts || 0), 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, w) => sum + (w.misc?.fpts || 0), 0) / secondHalf.length;

    return secondAvg - firstAvg;
  };

  // Helper to render the weekly data cells for a single player row
  const renderWeeklyRowData = (playerWeeks) => {
    return weeksToShow.map((weekNum) => {
      const weekData = playerWeeks?.find(w => w.weekNum === weekNum);
      const isExpanded = expandedWeeks[weekNum];
      
      if (!weekData) {
        const colCount = isExpanded ? statsPerWeekColsExpanded : statsPerWeekColsCollapsed;
        return Array(colCount).fill(0).map((_, idx) => (
          <DataCell key={`empty-${weekNum}-${idx}`}>-</DataCell>
        ));
      }

      return (
        <React.Fragment key={weekNum}>
          {/* Summary stats (always visible) */}
          <DataCell className="bg-gray-100 font-semibold">{weekData.misc?.num || '-'}</DataCell>
          <DataCell className="bg-gray-100 font-bold">{weekData.misc?.fpts?.toFixed(1) || '-'}</DataCell>
          {/* Detailed stats (only when expanded) */}
          {isExpanded && (
            <>
              {/* Passing */}
              <DataCell>{weekData.passing?.cmpAtt || '-'}</DataCell>
              <DataCell>{weekData.passing?.yds || '-'}</DataCell>
              <DataCell>{weekData.passing?.td || '-'}</DataCell>
              <DataCell>{weekData.passing?.int || '-'}</DataCell>
              {/* Rushing */}
              <DataCell>{weekData.rushing?.att || '-'}</DataCell>
              <DataCell>{weekData.rushing?.yds || '-'}</DataCell>
              <DataCell>{weekData.rushing?.td || '-'}</DataCell>
              {/* Receiving */}
              <DataCell>{weekData.receiving?.tgts || '-'}</DataCell>
              <DataCell>{weekData.receiving?.rec || '-'}</DataCell>
              <DataCell>{weekData.receiving?.yds || '-'}</DataCell>
              <DataCell>{weekData.receiving?.td || '-'}</DataCell>
            </>
          )}
        </React.Fragment>
      );
    });
  };

  return (
    <div className="p-4 bg-white min-w-[1400px] overflow-x-auto font-sans text-sm">
      {/* --- TOP CONTROLS SECTION --- */}
      <div className="flex flex-wrap gap-4 mb-4">
        {/* Left Filter Box */}
        <div className="border border-black bg-[#F3EFE0] p-2 w-48">
          <div className="flex justify-between mb-1">
            <span className="font-bold">Pos</span>
            <select
              className="border border-gray-400 text-xs p-0.5 rounded"
              value={selectedPos}
              onChange={(e) => setSelectedPos(e.target.value)}
            >
              <option value="All">All</option>
              <option value="QB">QB</option>
              <option value="RB">RB</option>
              <option value="WR">WR</option>
              <option value="TE">TE</option>
            </select>
          </div>
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

        {/* Stats Summary */}
        <div className="flex flex-col gap-2 ml-auto">
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white px-4 py-2 rounded-lg shadow">
            <div className="text-xs opacity-75">Players Loaded</div>
            <div className="text-2xl font-bold">{data.length}</div>
          </div>
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
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4">
          Error loading data: {error}
        </div>
      )}

      {/* --- DATA TABLE --- */}
      <div className="overflow-x-auto">
        <table className="border-collapse w-full border border-gray-800">
          <thead>
            {/* Header Row 1: Top Level Categories with Week Titles */}
            <tr>
              <HeaderCell colSpan={6} className="bg-gray-300 text-black">Matchup</HeaderCell>
              {weeksToShow.map(week => (
                <HeaderCell
                  key={week}
                  colSpan={getStatsPerWeekCols(week)}
                  className="bg-slate-800 text-white border-b-0 text-lg"
                  onClick={() => toggleWeekExpansion(week)}
                >
                  <div className="flex items-center justify-center gap-2">
                    {expandedWeeks[week] ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    Week {week}
                  </div>
                </HeaderCell>
              ))}
            </tr>

            {/* Header Row 2: Sub-Categories (Passing, Rushing, etc.) */}
            <tr className="text-white">
              {/* Matchup Columns Fixed headers */}
              <HeaderCell rowSpan={2} className="bg-gray-700">Player</HeaderCell>
              <HeaderCell rowSpan={2} className="bg-gray-700">Pos</HeaderCell>
              <HeaderCell rowSpan={2} className="bg-gray-700">Opp</HeaderCell>
              <HeaderCell rowSpan={2} className="bg-gray-700">Price</HeaderCell>
              <HeaderCell rowSpan={2} className="bg-gray-700">Proj.</HeaderCell>
              <HeaderCell rowSpan={2} className="bg-gray-700">Trend</HeaderCell>

              {/* Repeated Week Headers */}
              {weeksToShow.map(week => (
                <React.Fragment key={week}>
                  <HeaderCell colSpan={2} className="bg-gray-600">Summary</HeaderCell>
                  {expandedWeeks[week] && (
                    <>
                      <HeaderCell colSpan={4} className="bg-[#0F4C81]">Passing</HeaderCell>
                      <HeaderCell colSpan={3} className="bg-[#2E7D32]">Rushing</HeaderCell>
                      <HeaderCell colSpan={4} className="bg-[#4A148C]">Receiving</HeaderCell>
                    </>
                  )}
                </React.Fragment>
              ))}
            </tr>

            {/* Header Row 3: Specific Stats */}
            <tr className="text-[10px]">
              {weeksToShow.map(week => (
                <React.Fragment key={week}>
                  {/* Summary (always visible) */}
                  <HeaderCell className="bg-gray-500">#</HeaderCell>
                  <HeaderCell className="bg-gray-500">FPTS</HeaderCell>
                  {/* Detailed stats (only when expanded) */}
                  {expandedWeeks[week] && (
                    <>
                      {/* Passing */}
                      <HeaderCell className="bg-[#1F5E91]">Cmp-Att</HeaderCell>
                      <HeaderCell className="bg-[#1F5E91]">Yds</HeaderCell>
                      <HeaderCell className="bg-[#1F5E91]">TD</HeaderCell>
                      <HeaderCell className="bg-[#1F5E91]">Int.</HeaderCell>
                      {/* Rushing */}
                      <HeaderCell className="bg-[#3E8D42]">Att</HeaderCell>
                      <HeaderCell className="bg-[#3E8D42]">Yds</HeaderCell>
                      <HeaderCell className="bg-[#3E8D42]">TD</HeaderCell>
                      {/* Receiving */}
                      <HeaderCell className="bg-[#5A249C]">Tgts</HeaderCell>
                      <HeaderCell className="bg-[#5A249C]">Rec</HeaderCell>
                      <HeaderCell className="bg-[#5A249C]">Yds</HeaderCell>
                      <HeaderCell className="bg-[#5A249C]">TD</HeaderCell>
                    </>
                  )}
                </React.Fragment>
              ))}
            </tr>
          </thead>

          <tbody>
            {data.length === 0 && !loading ? (
              <tr>
                <td colSpan={6 + weeksToShow.reduce((sum, week) => sum + getStatsPerWeekCols(week), 0)} className="text-center py-8 text-gray-500">
                  No data available. Adjust filters or check API connection.
                </td>
              </tr>
            ) : (
              data.map((player, index) => {
                const trend = calculateTrend(player.weeks);
                return (
                  <tr
                    key={player.id || index}
                    className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-yellow-50 font-medium`}
                  >
                    {/* Fixed Matchup Columns */}
                    <DataCell className="text-left font-bold">{player.name}</DataCell>
                    <DataCell>{player.pos}</DataCell>
                    <DataCell className="text-[11px]">{player.opp}</DataCell>
                    <DataCell className="text-right">{formatCurrency(player.price)}</DataCell>
                    <DataCell className="font-bold">{player.proj?.toFixed(1) || '-'}</DataCell>
                    <DataCell className={`font-bold ${trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : ''}`}>
                      {trend !== null ? (trend > 0 ? '+' : '') + trend.toFixed(1) : '-'}
                    </DataCell>

                    {/* Scrollable Weekly Data columns */}
                    {renderWeeklyRowData(player.weeks || [])}
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
