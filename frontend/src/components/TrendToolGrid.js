import React, { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { getTeamLogo } from '../data/nflTeamLogos';

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

const TrendToolGrid = ({ data, startWeek, endWeek, isPPR }) => {

  // Helper function to get subtle background color for snap counts
  const getSnapBackgroundColor = (value, allData, weekNum) => {
    if (!value || value <= 0) return '';
    
    // Get all snap values for this week to calculate relative position
    const allSnaps = allData
      .map(player => player.weeks?.[weekNum]?.snap_percentage)
      .filter(v => v && v > 0);
    
    if (allSnaps.length === 0) return '';
    
    const min = Math.min(...allSnaps);
    const max = Math.max(...allSnaps);
    const range = max - min;
    
    if (range === 0) return '';
    
    // Calculate relative position (0 to 1)
    const position = (value - min) / range;
    
    // Subtle green scale: higher snaps = more green
    if (position >= 0.7) return 'rgba(34, 197, 94, 0.15)'; // Light green
    if (position >= 0.4) return 'rgba(234, 179, 8, 0.1)';  // Very light yellow
    if (position < 0.3) return 'rgba(239, 68, 68, 0.1)';   // Very light red
    return '';
  };

  // Helper function to get subtle background color for fantasy points
  const getFptsBackgroundColor = (value, allData, weekNum) => {
    if (!value || value <= 0) return '';
    
    // Get all FPTS values for this week to calculate relative position
    const allFpts = allData
      .map(player => player.weeks?.[weekNum]?.fantasy_points)
      .filter(v => v && v > 0);
    
    if (allFpts.length === 0) return '';
    
    const min = Math.min(...allFpts);
    const max = Math.max(...allFpts);
    const range = max - min;
    
    if (range === 0) return '';
    
    // Calculate relative position (0 to 1)
    const position = (value - min) / range;
    
    // Subtle green/red scale: higher FPTS = more green
    if (position >= 0.7) return 'rgba(34, 197, 94, 0.15)'; // Light green
    if (position >= 0.4) return 'rgba(234, 179, 8, 0.1)';  // Very light yellow
    if (position < 0.3) return 'rgba(239, 68, 68, 0.1)';   // Very light red
    return '';
  };

  const columnDefs = useMemo(() => {
    const cols = [
      {
        headerName: 'Matchup',
        headerClass: 'matchup-header-group',
        children: [
          {
            headerName: 'Player',
            field: 'player_name',
            pinned: 'left',
            width: 140,
            cellClass: 'font-bold text-gray-800 flex items-center',
            cellRenderer: (params) => (
              <div className="truncate">{params.value}</div>
            )
          },
          {
            headerName: 'Pos',
            field: 'position',
            pinned: 'left',
            width: 50,
            cellClass: 'text-center font-semibold text-gray-600 flex items-center justify-center'
          },
          {
            headerName: 'Opp',
            field: 'opponent',
            pinned: 'left',
            width: 100,
            cellClass: 'text-xs flex items-center',
            cellRenderer: (params) => {
              const opponent = params.value;
              const opponentLogo = getTeamLogo(opponent);
              return (
                <div className="flex items-center gap-1">
                  {opponentLogo && (
                    <img src={opponentLogo} alt={opponent} className="w-4 h-4 object-contain" />
                  )}
                  <span>vs {opponent || '-'}</span>
                </div>
              );
            }
          },
          {
            headerName: 'Price',
            field: 'dk_salary',
            pinned: 'left',
            width: 70,
            cellClass: 'text-center text-xs flex items-center justify-center',
            valueFormatter: (params) => params.value ? `$${params.value}` : '-'
          },
          {
            headerName: 'Proj.',
            field: 'proj_points',
            pinned: 'left',
            width: 60,
            cellClass: 'text-center font-bold text-gray-700 flex items-center justify-center',
            valueFormatter: (params) => params.value ? params.value.toFixed(1) : '-'
          }
        ]
      }
    ];

    // Generate columns for each week
    for (let week = startWeek; week <= endWeek; week++) {
      cols.push({
        headerName: `Week ${week}`,
        headerClass: 'week-header-group',
        marryChildren: true,
        openByDefault: false,
        children: [
          // Summary Group (Visible when collapsed)
          {
            headerName: 'Summary',
            headerClass: 'misc-header',
            children: [
              {
                headerName: '#',
                field: `weeks.${week}.snap_percentage`,
                width: 50,
                cellClass: 'text-center text-xs flex items-center justify-center border-r border-gray-200',
                valueFormatter: (params) => params.value ? Math.round(params.value) : '-',
                cellStyle: (params) => {
                  const bgColor = getSnapBackgroundColor(params.value, data, week);
                  return bgColor ? { backgroundColor: bgColor } : {};
                }
              },
              {
                headerName: 'FPTS',
                field: `weeks.${week}.fantasy_points`,
                width: 60,
                cellClass: 'font-bold text-center border-r border-gray-200 flex items-center justify-center',
                valueFormatter: (params) => params.value ? params.value.toFixed(1) : '-',
                cellStyle: (params) => {
                  const bgColor = getFptsBackgroundColor(params.value, data, week);
                  return bgColor ? { backgroundColor: bgColor } : {};
                }
              }
            ]
          },
          // Passing Group (Hidden when collapsed)
          {
            headerName: 'Passing',
            headerClass: 'passing-header',
            columnGroupShow: 'open',
            children: [
              {
                headerName: 'Cmp-Att',
                width: 75,
                valueGetter: (params) => {
                  const p = params.data.weeks?.[week];
                  if (!p || (!p.passing_attempts && !p.passing_yards)) return '';
                  // Mock calculation if attempts missing but yards present
                  const att = p.passing_attempts || (p.passing_yards ? Math.ceil(p.passing_yards / 8.5) : 0);
                  const cmp = Math.ceil(att * 0.65);
                  return att > 0 ? `${cmp}-${att}` : '';
                },
                cellClass: 'text-center text-xs flex items-center justify-center'
              },
              {
                headerName: 'Yds',
                field: `weeks.${week}.passing_yards`,
                width: 50,
                cellClass: 'text-center text-xs flex items-center justify-center',
                valueFormatter: (params) => params.value || ''
              },
              {
                headerName: 'TD',
                field: `weeks.${week}.passing_tds`,
                width: 40,
                cellClass: 'text-center text-xs flex items-center justify-center',
                valueFormatter: (params) => params.value || ''
              },
              {
                headerName: 'Int.',
                field: `weeks.${week}.interceptions`,
                width: 40,
                cellClass: 'text-center text-xs text-red-600 flex items-center justify-center',
                valueFormatter: (params) => params.value || ''
              }
            ]
          },
          // Rushing Group (Hidden when collapsed)
          {
            headerName: 'Rushing',
            headerClass: 'rushing-header',
            columnGroupShow: 'open',
            children: [
              {
                headerName: 'Att',
                field: `weeks.${week}.rushing_attempts`,
                width: 40,
                cellClass: 'text-center text-xs flex items-center justify-center',
                valueFormatter: (params) => params.value || ''
              },
              {
                headerName: 'Yds',
                field: `weeks.${week}.rushing_yards`,
                width: 50,
                cellClass: 'text-center text-xs flex items-center justify-center',
                valueFormatter: (params) => params.value || ''
              },
              {
                headerName: 'TD',
                field: `weeks.${week}.rushing_tds`,
                width: 40,
                cellClass: 'text-center text-xs flex items-center justify-center',
                valueFormatter: (params) => params.value || ''
              }
            ]
          },
          // Receiving Group (Hidden when collapsed)
          {
            headerName: 'Receiving',
            headerClass: 'receiving-header',
            columnGroupShow: 'open',
            children: [
              {
                headerName: 'Tgts',
                field: `weeks.${week}.targets`,
                width: 40,
                cellClass: 'text-center text-xs flex items-center justify-center',
                valueFormatter: (params) => params.value || ''
              },
              {
                headerName: 'Rec',
                field: `weeks.${week}.receptions`,
                width: 40,
                cellClass: 'text-center text-xs flex items-center justify-center',
                valueFormatter: (params) => params.value || ''
              },
              {
                headerName: 'Yds',
                field: `weeks.${week}.receiving_yards`,
                width: 50,
                cellClass: 'text-center text-xs flex items-center justify-center',
                valueFormatter: (params) => params.value || ''
              },
              {
                headerName: 'TD',
                field: `weeks.${week}.receiving_tds`,
                width: 40,
                cellClass: 'text-center text-xs flex items-center justify-center',
                valueFormatter: (params) => params.value || ''
              }
            ]
          }
        ]
      });
    }

    return cols;
  }, [startWeek, endWeek]);

  const defaultColDef = useMemo(() => ({
    sortable: true,
    resizable: true,
    filter: true,
    floatingFilter: true,
    suppressMenu: false,
    cellStyle: { borderRight: '1px solid #e5e7eb' }
  }), []);

  return (
    <div className="ag-theme-alpine trend-grid" style={{ width: '100%', height: '100%', minHeight: '300px' }}>
      <style>{`
        .trend-grid .ag-header-cell {
          padding: 0 4px;
        }
        .trend-grid .ag-header-group-cell-label {
            justify-content: center;
            font-weight: bold;
        }
        
        /* Week Header Group */
        .trend-grid .week-header-group {
            border-right: 2px solid #000;
        }
        
        /* Category Headers */
        .trend-grid .misc-header {
            background-color: #4b5563 !important;
        }
        .trend-grid .misc-header .ag-header-group-cell-label {
            color: white !important;
        }
        
        .trend-grid .passing-header {
            background-color: #1e3a8a !important; /* Dark Blue */
        }
        .trend-grid .passing-header .ag-header-group-cell-label {
            color: white !important;
        }
        
        .trend-grid .rushing-header {
            background-color: #15803d !important; /* Green */
        }
        .trend-grid .rushing-header .ag-header-group-cell-label {
            color: white !important;
        }
        
        .trend-grid .receiving-header {
            background-color: #581c87 !important; /* Purple */
        }
        .trend-grid .receiving-header .ag-header-group-cell-label {
            color: white !important;
        }

        /* Borders */
        .trend-grid .ag-header-group-cell-with-group {
            border-right: 1px solid #e5e7eb;
        }
        
        /* Row Styling */
        .trend-grid .ag-row {
            border-bottom: 1px solid #f3f4f6;
        }
        .trend-grid .ag-row-hover {
            background-color: #f9fafb !important;
        }
      `}</style>
      <AgGridReact
        rowData={data}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        headerHeight={32}
        groupHeaderHeight={32}
        rowHeight={32}
        animateRows={true}
        suppressRowTransform={true} // Performance optimization
      />
    </div>
  );
};

export default TrendToolGrid;
