import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, X } from 'lucide-react';

/**
 * Mini Sparkline Component
 * Renders a small bar chart visualization for trend data
 */
const Sparkline = ({ data, isPositive }) => {
  if (!data || data.length === 0) return null;
  
  const maxVal = Math.max(...data);
  const minVal = Math.min(...data);
  const range = maxVal - minVal || 1;
  
  return (
    <div className="flex items-end gap-[2px] h-[20px]">
      {data.map((value, index) => {
        const height = ((value - minVal) / range) * 16 + 4;
        const isLastFew = index >= data.length - 3;
        return (
          <div
            key={index}
            className={`w-[4px] rounded-[1px] transition-all ${
              isLastFew
                ? isPositive
                  ? 'bg-emerald-500'
                  : 'bg-red-500'
                : 'bg-slate-300'
            }`}
            style={{ height: `${height}px` }}
          />
        );
      })}
    </div>
  );
};

/**
 * Trend Card Component
 * Displays individual trend metric with sparkline
 */
const TrendCard = ({ label, value, positive, sparkline }) => {
  return (
    <div className="flex items-center gap-3 px-4 py-2 flex-1">
      <div className="flex flex-col">
        <span className="text-xs font-semibold text-slate-600 tracking-wide">
          {label}
        </span>
        <Sparkline data={sparkline} isPositive={positive} />
      </div>
      <span
        className={`text-sm font-bold ${
          positive ? 'text-emerald-500' : 'text-red-500'
        }`}
      >
        {positive ? '+' : ''}{value}{label === 'SNP%' ? '%' : ''}
      </span>
    </div>
  );
};

/**
 * Game Log Table Row Component
 * Renders individual game data with conditional styling
 */
const GameLogRow = ({ game, position }) => {
  const getRowStyle = () => {
    if (game.isBye) return 'bg-slate-50';
    if (game.isLow) return 'bg-red-50';
    if (game.isHigh) return 'bg-emerald-50';
    return 'bg-white';
  };

  const getFptsStyle = () => {
    if (game.isLow) return 'text-red-600 font-semibold';
    if (game.isHigh) return 'text-emerald-600 font-semibold';
    return 'text-slate-900';
  };

  const formatValue = (val) => {
    if (val === null || val === undefined || val === '-') return '-';
    return val;
  };

  // Determine which stats to show based on position
  const isQB = position === 'QB';
  const isRB = position === 'RB';

  return (
    <tr className={`${getRowStyle()} border-b border-slate-100 hover:bg-slate-50 transition-colors`}>
      <td className="py-2 px-2 text-xs font-medium text-slate-600">
        {game.week}
      </td>
      <td className="py-2 px-2 text-xs font-medium text-slate-900">
        {game.opp}
      </td>
      <td className={`py-2 px-2 text-xs ${getFptsStyle()}`}>
        {formatValue(game.fpts)}
      </td>
      <td className="py-2 px-2 text-xs text-slate-700">
        {game.snpPct !== null && game.snpPct !== undefined ? `${game.snpPct}%` : '-'}
      </td>
      <td className="py-2 px-2 text-xs text-slate-700">
        {game.result || '-'}
      </td>
      {isQB ? (
        <>
          <td className="py-2 px-2 text-xs text-slate-700 text-center">{formatValue(game.passAtt)}</td>
          <td className="py-2 px-2 text-xs text-slate-700 text-center">{formatValue(game.passCmp)}</td>
          <td className="py-2 px-2 text-xs text-slate-700 text-center">{formatValue(game.passYds)}</td>
          <td className="py-2 px-2 text-xs text-slate-700 text-center">{formatValue(game.passTd)}</td>
          <td className="py-2 px-2 text-xs text-slate-700 text-center">{formatValue(game.passInt)}</td>
        </>
      ) : isRB ? (
        <>
          <td className="py-2 px-2 text-xs text-slate-700 text-center">{formatValue(game.att)}</td>
          <td className="py-2 px-2 text-xs text-slate-700 text-center">{formatValue(game.rushYds)}</td>
          <td className="py-2 px-2 text-xs text-slate-700 text-center">{formatValue(game.rushTd)}</td>
          <td className="py-2 px-2 text-xs text-slate-700 text-center">{formatValue(game.tgt)}</td>
          <td className="py-2 px-2 text-xs text-slate-700 text-center">{formatValue(game.rec)}</td>
          <td className="py-2 px-2 text-xs text-slate-700 text-center">{formatValue(game.recYds)}</td>
          <td className="py-2 px-2 text-xs text-slate-700 text-center">{formatValue(game.recTd)}</td>
        </>
      ) : (
        <>
          <td className="py-2 px-2 text-xs text-slate-700 text-center">{formatValue(game.tgt)}</td>
          <td className="py-2 px-2 text-xs text-slate-700 text-center">{formatValue(game.rec)}</td>
          <td className="py-2 px-2 text-xs text-slate-700 text-center">{formatValue(game.yds)}</td>
          <td className="py-2 px-2 text-xs text-slate-700 text-center">{formatValue(game.ypr)}</td>
          <td className="py-2 px-2 text-xs text-slate-700 text-center">{formatValue(game.td)}</td>
          <td className="py-2 px-2 text-xs text-slate-700 text-center">{formatValue(game.att)}</td>
          <td className="py-2 px-2 text-xs text-slate-700 text-center">{formatValue(game.rushYds)}</td>
          <td className="py-2 px-2 text-xs text-slate-700 text-center">{formatValue(game.rushTd)}</td>
        </>
      )}
    </tr>
  );
};

/**
 * Main PlayerCard Component
 * Displays comprehensive NFL player statistics for fantasy analytics
 */
const PlayerCard = ({ playerData, onClose }) => {
  const [isGameLogsExpanded, setIsGameLogsExpanded] = useState(true);

  if (!playerData) return null;

  const { player, trends, gameLogs, seasonHistory, career } = playerData;
  const position = player?.position || 'WR';
  const isQB = position === 'QB';
  const isRB = position === 'RB';

  // Memoize career stats calculation
  const careerStats = useMemo(() => career || {}, [career]);

  return (
    <div className="w-full h-full flex flex-col bg-slate-50 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 p-4 flex-shrink-0">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-white">{player?.name || 'Player'}</h2>
            <div className="flex items-center gap-2 mt-1 text-blue-200 text-sm">
              <span className="font-semibold">{player?.position}</span>
              <span>|</span>
              <span>{player?.team}</span>
              {player?.salary && (
                <>
                  <span>|</span>
                  <span className="text-emerald-300">${player.salary.toLocaleString()}</span>
                </>
              )}
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-white transition-colors p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Trend Sparklines Section */}
        {trends && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 mb-4">
            <div className="flex flex-wrap items-center justify-between divide-x divide-slate-200">
              {trends.fpts && (
                <TrendCard
                  label="FPTS"
                  value={trends.fpts.value}
                  positive={trends.fpts.positive}
                  sparkline={trends.fpts.sparkline}
                />
              )}
              {trends.snpPct && (
                <TrendCard
                  label="SNP%"
                  value={trends.snpPct.value}
                  positive={trends.snpPct.positive}
                  sparkline={trends.snpPct.sparkline}
                />
              )}
              {trends.tgt && (
                <TrendCard
                  label="TGT"
                  value={trends.tgt.value}
                  positive={trends.tgt.positive}
                  sparkline={trends.tgt.sparkline}
                />
              )}
              {trends.rec && (
                <TrendCard
                  label="REC"
                  value={trends.rec.value}
                  positive={trends.rec.positive}
                  sparkline={trends.rec.sparkline}
                />
              )}
            </div>
          </div>
        )}

        {/* Game Logs Section */}
        {gameLogs && gameLogs.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 mb-4 overflow-hidden">
            <button
              onClick={() => setIsGameLogsExpanded(!isGameLogsExpanded)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors focus:outline-none"
              aria-expanded={isGameLogsExpanded}
            >
              <h2 className="text-base font-bold text-slate-900">
                {new Date().getFullYear()} Game Logs
              </h2>
              {isGameLogsExpanded ? (
                <ChevronUp className="w-5 h-5 text-slate-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-500" />
              )}
            </button>
            {isGameLogsExpanded && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="py-2 px-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">WK</th>
                      <th className="py-2 px-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">OPP</th>
                      <th className="py-2 px-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">FPTS</th>
                      <th className="py-2 px-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">SNP%</th>
                      <th className="py-2 px-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">FIN</th>
                      {isQB ? (
                        <>
                          <th className="py-2 px-2 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider">ATT</th>
                          <th className="py-2 px-2 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider">CMP</th>
                          <th className="py-2 px-2 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider">YDS</th>
                          <th className="py-2 px-2 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider">TD</th>
                          <th className="py-2 px-2 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider">INT</th>
                        </>
                      ) : isRB ? (
                        <>
                          <th className="py-2 px-2 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider">ATT</th>
                          <th className="py-2 px-2 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider">YDS</th>
                          <th className="py-2 px-2 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider">TD</th>
                          <th className="py-2 px-2 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider">TGT</th>
                          <th className="py-2 px-2 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider">REC</th>
                          <th className="py-2 px-2 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider">YDS</th>
                          <th className="py-2 px-2 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider">TD</th>
                        </>
                      ) : (
                        <>
                          <th className="py-2 px-2 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider">TGT</th>
                          <th className="py-2 px-2 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider">REC</th>
                          <th className="py-2 px-2 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider">YDS</th>
                          <th className="py-2 px-2 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Y/R</th>
                          <th className="py-2 px-2 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider">TD</th>
                          <th className="py-2 px-2 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider">ATT</th>
                          <th className="py-2 px-2 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider">YDS</th>
                          <th className="py-2 px-2 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider">TD</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {gameLogs.map((game, index) => (
                      <GameLogRow key={`${game.week}-${index}`} game={game} position={position} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Season History Section */}
        {seasonHistory && seasonHistory.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">
                Season History
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="py-2 px-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">YEAR</th>
                    <th className="py-2 px-3 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider">GP</th>
                    <th className="py-2 px-3 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider">FPTS</th>
                    {isQB ? (
                      <>
                        <th className="py-2 px-3 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider">ATT</th>
                        <th className="py-2 px-3 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider">CMP</th>
                        <th className="py-2 px-3 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider">YDS</th>
                        <th className="py-2 px-3 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider">TD</th>
                        <th className="py-2 px-3 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider">INT</th>
                      </>
                    ) : (
                      <>
                        <th className="py-2 px-3 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider">TGT</th>
                        <th className="py-2 px-3 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider">REC</th>
                        <th className="py-2 px-3 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider">YDS</th>
                        <th className="py-2 px-3 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Y/R</th>
                        <th className="py-2 px-3 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider">TD</th>
                      </>
                    )}
                    <th className="py-2 px-3 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider">SNP%</th>
                  </tr>
                </thead>
                <tbody>
                  {seasonHistory.map((season, index) => (
                    <tr
                      key={season.year}
                      className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                        index === 0 ? 'bg-sky-50/50' : 'bg-white'
                      }`}
                    >
                      <td className="py-2.5 px-3 text-sm font-semibold text-slate-900">{season.year}</td>
                      <td className="py-2.5 px-3 text-sm text-slate-700 text-center">{season.gp}</td>
                      <td className="py-2.5 px-3 text-sm text-slate-700 text-center font-medium">{season.fpts}</td>
                      {isQB ? (
                        <>
                          <td className="py-2.5 px-3 text-sm text-slate-700 text-center">{season.passAtt || '-'}</td>
                          <td className="py-2.5 px-3 text-sm text-slate-700 text-center">{season.passCmp || '-'}</td>
                          <td className="py-2.5 px-3 text-sm text-slate-700 text-center">{season.passYds || '-'}</td>
                          <td className="py-2.5 px-3 text-sm text-slate-700 text-center">{season.passTd || '-'}</td>
                          <td className="py-2.5 px-3 text-sm text-slate-700 text-center">{season.passInt || '-'}</td>
                        </>
                      ) : (
                        <>
                          <td className="py-2.5 px-3 text-sm text-slate-700 text-center">{season.tgt || '-'}</td>
                          <td className="py-2.5 px-3 text-sm text-slate-700 text-center">{season.rec || '-'}</td>
                          <td className="py-2.5 px-3 text-sm text-slate-700 text-center">{season.yds || '-'}</td>
                          <td className="py-2.5 px-3 text-sm text-slate-700 text-center">{season.ypr || '-'}</td>
                          <td className="py-2.5 px-3 text-sm text-slate-700 text-center">{season.td || '-'}</td>
                        </>
                      )}
                      <td className="py-2.5 px-3 text-sm text-slate-700 text-center">{season.snpPct || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Career Totals Footer */}
            {careerStats && Object.keys(careerStats).length > 0 && (
              <div className="px-4 py-3 bg-slate-100 border-t border-slate-200">
                <p className="text-sm font-bold text-slate-700">
                  <span className="text-slate-900">CAREER:</span>{' '}
                  {careerStats.gp} GP | {careerStats.fpts} FPTS | {careerStats.tgt || careerStats.passAtt || 0} {isQB ? 'ATT' : 'TGT'} | {careerStats.rec || careerStats.passCmp || 0} {isQB ? 'CMP' : 'REC'} | {careerStats.yds || careerStats.passYds || 0} YDS | {careerStats.td || careerStats.passTd || 0} TD
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerCard;
