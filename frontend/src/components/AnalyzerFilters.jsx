import React from 'react';

const NFL_TEAMS = [
  'All', 'ARI', 'ATL', 'BAL', 'BUF', 'CAR', 'CHI', 'CIN', 'CLE',
  'DAL', 'DEN', 'DET', 'GB', 'HOU', 'IND', 'JAX', 'KC',
  'LV', 'LAC', 'LAR', 'MIA', 'MIN', 'NE', 'NO', 'NYG', 'NYJ',
  'PHI', 'PIT', 'SF', 'SEA', 'TB', 'TEN', 'WAS'
];

const AnalyzerFilters = ({
  // Filter values
  selectedPos,
  selectedTeam,
  season,
  selectedSlate,
  weekFrom,
  weekTo,
  salaryMin,
  salaryMax,
  // Callbacks
  onPosChange,
  onTeamChange,
  onSeasonChange,
  onSlateChange,
  onWeekFromChange,
  onWeekToChange,
  onSalaryMinChange,
  onSalaryMaxChange,
  // Optional: stats display
  playerCount,
  loading
}) => {
  return (
    <div className="flex flex-wrap gap-4 mb-4 p-4 bg-white">
      {/* Left Filter Box - Beige/Cream background */}
      <div className="border border-black bg-[#F3EFE0] p-3 w-52">
        <div className="flex justify-between items-center mb-2">
          <span className="font-bold text-sm">Pos</span>
          <select
            className="border border-gray-400 text-sm p-1 rounded w-24"
            value={selectedPos}
            onChange={(e) => onPosChange(e.target.value)}
          >
            <option value="All">All</option>
            <option value="QB">QB</option>
            <option value="RB">RB</option>
            <option value="WR">WR</option>
            <option value="TE">TE</option>
          </select>
        </div>
        <div className="flex justify-between items-center mb-2">
          <span className="font-bold text-sm">Team</span>
          <select
            className="border border-gray-400 text-sm p-1 rounded w-24"
            value={selectedTeam}
            onChange={(e) => onTeamChange(e.target.value)}
          >
            {NFL_TEAMS.map(team => (
              <option key={team} value={team}>{team}</option>
            ))}
          </select>
        </div>
        <div className="flex justify-between items-center mb-2">
          <span className="font-bold text-sm">Season</span>
          <select
            className="border border-gray-400 text-sm p-1 rounded w-24"
            value={season}
            onChange={(e) => onSeasonChange(parseInt(e.target.value))}
          >
            <option value={2025}>2025</option>
            <option value={2024}>2024</option>
            <option value={2023}>2023</option>
          </select>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-bold text-sm">Slate</span>
          <select
            className="border border-gray-400 text-sm p-1 rounded w-24"
            value={selectedSlate}
            onChange={(e) => onSlateChange(e.target.value)}
          >
            <option value="Main">Main</option>
            <option value="Showdown">Showdown</option>
          </select>
        </div>
      </div>

      {/* Middle Filter Boxes */}
      <div className="flex flex-col gap-3">
        {/* Select Weeks */}
        <div>
          <div className="bg-[#1F4E79] text-white text-center text-sm font-bold py-1.5 px-4 border border-black">
            Select Weeks
          </div>
          <div className="border border-black border-t-0 p-2.5 flex gap-3 bg-white">
            <select
              className="border border-gray-300 p-1.5 text-sm rounded"
              value={weekFrom}
              onChange={(e) => onWeekFromChange(parseInt(e.target.value))}
            >
              {[...Array(18)].map((_, i) => (
                <option key={i + 1} value={i + 1}>From: Week {i + 1}</option>
              ))}
            </select>
            <select
              className="border border-gray-300 p-1.5 text-sm rounded"
              value={weekTo}
              onChange={(e) => onWeekToChange(parseInt(e.target.value))}
            >
              {[...Array(18)].map((_, i) => (
                <option key={i + 1} value={i + 1}>To: Week {i + 1}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Set Salary Range */}
        <div>
          <div className="bg-[#1F4E79] text-white text-center text-sm font-bold py-1.5 px-4 border border-black">
            Set Salary Range
          </div>
          <div className="border border-black border-t-0 p-2.5 flex gap-3 bg-white items-center">
            <label className="text-sm">Min $</label>
            <input
              type="number"
              className="border border-gray-300 w-20 p-1.5 text-sm rounded"
              value={salaryMin}
              onChange={(e) => onSalaryMinChange(parseInt(e.target.value) || 0)}
            />
            <label className="text-sm">Max $</label>
            <input
              type="number"
              className="border border-gray-300 w-24 p-1.5 text-sm rounded"
              value={salaryMax}
              onChange={(e) => onSalaryMaxChange(parseInt(e.target.value) || 15000)}
            />
          </div>
        </div>
      </div>

      {/* Stats Summary (optional) */}
      {(playerCount !== undefined || loading) && (
        <div className="flex flex-col gap-2 ml-auto">
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white px-4 py-2 rounded-lg shadow">
            <div className="text-xs opacity-75">Players Loaded</div>
            <div className="text-2xl font-bold">{playerCount || 0}</div>
          </div>
          {loading && (
            <div className="flex items-center text-blue-600 text-sm">
              <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              <span>Loading...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AnalyzerFilters;
