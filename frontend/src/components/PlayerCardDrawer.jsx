import React, { useEffect, useCallback } from 'react';
import PlayerCard from './PlayerCard';

/**
 * PlayerCardDrawer Component
 * A slide-over drawer that displays the PlayerCard component
 * Handles open/close animations, backdrop, and keyboard shortcuts
 */
const PlayerCardDrawer = ({ isOpen, onClose, playerData }) => {
  // Handle ESC key to close drawer
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape' && isOpen) {
      onClose();
    }
  }, [isOpen, onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/30 transition-opacity duration-300 z-40 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 right-0 w-full sm:w-[480px] md:w-[540px] bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Player Details"
      >
        <PlayerCard playerData={playerData} onClose={onClose} />
      </div>
    </>
  );
};

/**
 * Utility function to transform raw player data to PlayerCard format
 * This adapter converts the API data structure to what PlayerCard expects
 */
export const transformPlayerDataForCard = (player, gameHistory = []) => {
  if (!player) return null;

  const position = player.position || 'WR';
  const isQB = position === 'QB';

  // Build game logs from game history
  const gameLogs = gameHistory.map((game, index) => {
    const fpts = parseFloat(game.fantasy_points || game.fpts || 0);
    const avgFpts = gameHistory.reduce((sum, g) => sum + parseFloat(g.fantasy_points || g.fpts || 0), 0) / gameHistory.length;
    
    return {
      week: `WK${game.week}`,
      opp: game.opponent || game.opp || '-',
      fpts: fpts.toFixed(1),
      snpPct: game.snap_percentage || game.snpPct || null,
      result: game.result || '-',
      // Receiving stats
      tgt: game.targets || game.tgt || 0,
      rec: game.receptions || game.rec || 0,
      yds: game.receiving_yards || game.yds || 0,
      ypr: game.receiving_yards && game.receptions ? (game.receiving_yards / game.receptions).toFixed(1) : 0,
      td: game.receiving_tds || game.recTd || 0,
      // Rushing stats
      att: game.rushing_attempts || game.att || 0,
      rushYds: game.rushing_yards || game.rushYds || 0,
      rushTd: game.rushing_tds || game.rushTd || 0,
      // Passing stats (for QBs)
      passAtt: game.passing_attempts || game.passAtt || 0,
      passCmp: game.completions || game.passCmp || 0,
      passYds: game.passing_yards || game.passYds || 0,
      passTd: game.passing_tds || game.passTd || 0,
      passInt: game.interceptions || game.passInt || 0,
      // Highlight flags
      isLow: fpts < avgFpts * 0.5 && fpts < 5,
      isHigh: fpts > avgFpts * 1.5 && fpts > 10,
      isBye: game.isBye || false,
    };
  });

  // Calculate trends from game history
  const calculateTrend = (games, statKey, defaultKey) => {
    if (!games || games.length < 2) return null;
    
    const values = games.map(g => parseFloat(g[statKey] || g[defaultKey] || 0));
    const recentAvg = values.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, values.length);
    const overallAvg = values.reduce((a, b) => a + b, 0) / values.length;
    const diff = recentAvg - overallAvg;
    
    return {
      value: Math.abs(diff).toFixed(1),
      positive: diff >= 0,
      sparkline: values.slice(-14), // Last 14 games for sparkline
    };
  };

  const trends = {
    fpts: calculateTrend(gameHistory, 'fantasy_points', 'fpts'),
    snpPct: calculateTrend(gameHistory, 'snap_percentage', 'snpPct'),
    tgt: isQB ? null : calculateTrend(gameHistory, 'targets', 'tgt'),
    rec: isQB ? null : calculateTrend(gameHistory, 'receptions', 'rec'),
  };

  // Build season history (aggregate by season if we have multi-season data)
  const currentYear = new Date().getFullYear();
  const seasonHistory = [{
    year: currentYear.toString(),
    gp: gameHistory.length,
    fpts: gameHistory.reduce((sum, g) => sum + parseFloat(g.fantasy_points || g.fpts || 0), 0).toFixed(1),
    tgt: gameHistory.reduce((sum, g) => sum + (g.targets || g.tgt || 0), 0),
    rec: gameHistory.reduce((sum, g) => sum + (g.receptions || g.rec || 0), 0),
    yds: gameHistory.reduce((sum, g) => sum + (g.receiving_yards || g.yds || 0), 0),
    ypr: '-',
    td: gameHistory.reduce((sum, g) => sum + (g.receiving_tds || g.recTd || 0), 0),
    snpPct: gameHistory.length > 0 
      ? Math.round(gameHistory.reduce((sum, g) => sum + (g.snap_percentage || g.snpPct || 0), 0) / gameHistory.length) + '%'
      : '-',
    // QB stats
    passAtt: gameHistory.reduce((sum, g) => sum + (g.passing_attempts || g.passAtt || 0), 0),
    passCmp: gameHistory.reduce((sum, g) => sum + (g.completions || g.passCmp || 0), 0),
    passYds: gameHistory.reduce((sum, g) => sum + (g.passing_yards || g.passYds || 0), 0),
    passTd: gameHistory.reduce((sum, g) => sum + (g.passing_tds || g.passTd || 0), 0),
    passInt: gameHistory.reduce((sum, g) => sum + (g.interceptions || g.passInt || 0), 0),
  }];

  // Career totals (same as season for now, can be expanded with multi-season data)
  const career = {
    gp: seasonHistory.reduce((sum, s) => sum + s.gp, 0),
    fpts: seasonHistory.reduce((sum, s) => sum + parseFloat(s.fpts), 0).toFixed(1),
    tgt: seasonHistory.reduce((sum, s) => sum + s.tgt, 0),
    rec: seasonHistory.reduce((sum, s) => sum + s.rec, 0),
    yds: seasonHistory.reduce((sum, s) => sum + s.yds, 0),
    td: seasonHistory.reduce((sum, s) => sum + s.td, 0),
    passAtt: seasonHistory.reduce((sum, s) => sum + (s.passAtt || 0), 0),
    passCmp: seasonHistory.reduce((sum, s) => sum + (s.passCmp || 0), 0),
    passYds: seasonHistory.reduce((sum, s) => sum + (s.passYds || 0), 0),
    passTd: seasonHistory.reduce((sum, s) => sum + (s.passTd || 0), 0),
  };

  return {
    player: {
      name: player.player_name || player.name || 'Unknown Player',
      position: player.position || 'WR',
      team: player.team || '-',
      salary: player.dk_salary || player.salary || null,
    },
    trends,
    gameLogs,
    seasonHistory,
    career,
  };
};

export default PlayerCardDrawer;
