import React, { useState, useEffect, useCallback, useMemo } from 'react';
import AnalyzerFilters from './AnalyzerFilters';
import './WeeklyBoxScore.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:10000';

const WeeklyBoxScore = () => {
  // Filter state - matching AnalyzerFilters props
  const [selectedPos, setSelectedPos] = useState('RB');
  const [selectedTeam, setSelectedTeam] = useState('All');
  const [season, setSeason] = useState(2025);
  const [selectedSlate, setSelectedSlate] = useState('Main');
  const [weekFrom, setWeekFrom] = useState(1);
  const [weekTo, setWeekTo] = useState(4);
  const [salaryMin, setSalaryMin] = useState(0);
  const [salaryMax, setSalaryMax] = useState(15000);

  // Data state
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

      // Add team filter if not 'All'
      if (selectedTeam && selectedTeam !== 'All') {
        params.append('team', selectedTeam);
      }

      // Add position filter if not 'All'
      if (selectedPos && selectedPos !== 'All') {
        params.append('position', selectedPos);
      }

      const response = await fetch(`${BACKEND_URL}/api/analyzer-data?${params}`);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();

      // Filter by salary on client side
      const filteredData = result.filter(player => {
        const price = player.price || 0;
        return price >= salaryMin && price <= salaryMax;
      });

      setData(filteredData);
    } catch (err) {
      console.error('Error fetching weekly box score data:', err);
      setError(err.message);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [season, weekFrom, weekTo, selectedTeam, selectedPos, salaryMin, salaryMax]);

  // Fetch data on mount and when filters change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Get FPTS color class based on value
  const getFptsColor = (fpts) => {
    if (!fpts || fpts === 0) return '';
    if (fpts >= 20) return 'cf-green-dark';
    if (fpts >= 15) return 'cf-green-light';
    if (fpts >= 10) return 'cf-yellow';
    if (fpts >= 5) return 'cf-yellow';
    return 'cf-red-light';
  };

  // Format currency
  const formatPrice = (price) => {
    if (!price) return '-';
    return `$${(price / 1000).toFixed(1)}k`;
  };

  // Group players by position
  const groupedByPosition = useMemo(() => {
    const groups = {};
    data.forEach(player => {
      const pos = player.pos || 'OTHER';
      if (!groups[pos]) {
        groups[pos] = [];
      }
      groups[pos].push(player);
    });
    return groups;
  }, [data]);

  return (
    <div className="weekly-box-score-container">
      {/* Analyzer Filters */}
      <AnalyzerFilters
        selectedPos={selectedPos}
        selectedTeam={selectedTeam}
        season={season}
        selectedSlate={selectedSlate}
        weekFrom={weekFrom}
        weekTo={weekTo}
        salaryMin={salaryMin}
        salaryMax={salaryMax}
        onPosChange={setSelectedPos}
        onTeamChange={setSelectedTeam}
        onSeasonChange={setSeason}
        onSlateChange={setSelectedSlate}
        onWeekFromChange={setWeekFrom}
        onWeekToChange={setWeekTo}
        onSalaryMinChange={setSalaryMin}
        onSalaryMaxChange={setSalaryMax}
        playerCount={data.length}
        loading={loading}
      />

      {/* Error Message */}
      {error && (
        <div className="error-message">
          Error loading data: {error}
        </div>
      )}

      {/* Data Table */}
      <div className="table-container">
        <table className="weekly-box-score-table">
          <thead>
            <tr>
              <th rowSpan="3" className="col-fixed-left">Pos</th>
              <th rowSpan="3" className="col-fixed-left" style={{ left: '40px' }}>Player</th>
              <th rowSpan="3" className="col-fixed-left" style={{ left: '150px' }}>$</th>
              <th rowSpan="3" className="col-fixed-left" style={{ left: '200px' }}>Proj.</th>

              {weeksToShow.map(week => (
                <th
                  key={week}
                  colSpan={13}
                  className="header-week-top group-separator"
                >
                  Week {week}
                </th>
              ))}
            </tr>

            <tr className="header-category">
              {weeksToShow.map(week => (
                <React.Fragment key={week}>
                  <th rowSpan="2" className="group-separator">Misc.</th>
                  <th colSpan="4">Passing</th>
                  <th colSpan="3">Rushing</th>
                  <th colSpan="4">Receiving</th>
                  <th rowSpan="2">FPTS</th>
                </React.Fragment>
              ))}
            </tr>

            <tr className="header-stat">
              {weeksToShow.map(week => (
                <React.Fragment key={week}>
                  <th>Cmp</th><th>Att</th><th>Yds</th><th>Int</th>
                  <th>Att</th><th>Yds</th><th>TD</th>
                  <th>Tgt</th><th>Rec</th><th>Yds</th><th>TD</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(groupedByPosition).map(([position, players]) => (
              <React.Fragment key={position}>
                {players.map((player, idx) => (
                  <tr key={player.id || `${position}-${idx}`}>
                    {idx === 0 && (
                      <td rowSpan={players.length} className="col-fixed-left pos-label">
                        {position}
                      </td>
                    )}
                    <td className="col-fixed-left text-left" style={{ left: '40px' }}>
                      {player.name}
                    </td>
                    <td className="col-fixed-left" style={{ left: '150px' }}>
                      {formatPrice(player.price)}
                    </td>
                    <td className="col-fixed-left" style={{ left: '200px' }}>
                      {player.proj ? player.proj.toFixed(1) : '-'}
                    </td>

                    {weeksToShow.map(weekNum => {
                      const weekData = player.weeks?.find(w => w.weekNum === weekNum);
                      if (!weekData) {
                        return (
                          <React.Fragment key={weekNum}>
                            <td className="group-separator">-</td>
                            <td>-</td><td>-</td><td>-</td><td>-</td>
                            <td>-</td><td>-</td><td>-</td>
                            <td>-</td><td>-</td><td>-</td><td>-</td>
                            <td>-</td>
                          </React.Fragment>
                        );
                      }

                      return (
                        <React.Fragment key={weekNum}>
                          <td className="group-separator">{weekData.misc?.num || weekData.snaps || '-'}</td>
                          <td>{weekData.passing?.cmpAtt?.split('-')[0] || weekData.completions || '-'}</td>
                          <td>{weekData.passing?.cmpAtt?.split('-')[1] || weekData.passing_attempts || '-'}</td>
                          <td>{weekData.passing?.yds || weekData.passing_yards || '-'}</td>
                          <td>{weekData.passing?.int || weekData.interceptions || '-'}</td>
                          <td>{weekData.rushing?.att || weekData.rushing_attempts || '-'}</td>
                          <td>{weekData.rushing?.yds || weekData.rushing_yards || '-'}</td>
                          <td>{weekData.rushing?.td || weekData.rushing_tds || '-'}</td>
                          <td>{weekData.receiving?.tgt || weekData.targets || '-'}</td>
                          <td>{weekData.receiving?.rec || weekData.receptions || '-'}</td>
                          <td>{weekData.receiving?.yds || weekData.receiving_yards || '-'}</td>
                          <td>{weekData.receiving?.td || weekData.receiving_tds || '-'}</td>
                          <td className={getFptsColor(weekData.misc?.fpts || weekData.fantasy_points)}>
                            {(weekData.misc?.fpts || weekData.fantasy_points)?.toFixed(1) || '-'}
                          </td>
                        </React.Fragment>
                      );
                    })}
                  </tr>
                ))}
                {/* Spacer row between position groups */}
                <tr style={{ height: '20px', background: '#fdfdfd' }}>
                  <td colSpan={4 + (weeksToShow.length * 13)}></td>
                </tr>
              </React.Fragment>
            ))}

            {/* Empty state */}
            {!loading && data.length === 0 && (
              <tr>
                <td colSpan={4 + (weeksToShow.length * 13)} className="empty-state">
                  No data available. Adjust filters or check API connection.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default WeeklyBoxScore;
