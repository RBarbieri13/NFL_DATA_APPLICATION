import React from 'react';
import { X, AlertTriangle, Users, BarChart3 } from 'lucide-react';
import InjuryPanel from './InjuryPanel';
import DepthChartPanel from './DepthChartPanel';

// Tab configuration
const TABS = [
  { id: 'injuries', label: 'Injuries', icon: AlertTriangle, color: 'text-yellow-400', bgColor: 'bg-yellow-500' },
  { id: 'team-analysis', label: 'Team Analysis', icon: BarChart3, color: 'text-blue-400', bgColor: 'bg-blue-500' },
  { id: 'depth-chart', label: 'Depth Chart', icon: Users, color: 'text-green-400', bgColor: 'bg-green-500' },
];

// Vertical tab button - styled like file folder tabs on the right edge
const TabButton = ({ tab, isActive, onClick }) => {
  const Icon = tab.icon;

  return (
    <button
      onClick={onClick}
      className={`
        relative flex items-center gap-1.5 px-2 py-3
        rounded-l-lg transition-all duration-200
        ${isActive
          ? 'bg-white text-slate-800 shadow-lg -translate-x-1'
          : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white hover:-translate-x-0.5'
        }
      `}
      style={{
        writingMode: 'vertical-rl',
        textOrientation: 'mixed',
      }}
      title={tab.label}
    >
      <Icon className={`w-4 h-4 ${isActive ? tab.color.replace('text-', 'text-') : ''}`}
            style={{ transform: 'rotate(90deg)' }} />
      <span className="text-xs font-semibold whitespace-nowrap">
        {tab.label}
      </span>
    </button>
  );
};

// Placeholder for Team Analysis
const TeamAnalysisPanel = ({ teamFilter }) => (
  <div className="p-4">
    <div className="text-center py-8 text-gray-500">
      <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
      <h3 className="font-semibold text-lg mb-2">Team Analysis</h3>
      <p className="text-sm">
        {teamFilter
          ? `Analysis for ${teamFilter} coming soon...`
          : 'Select a team to view analysis'
        }
      </p>
    </div>
  </div>
);

// DepthChartPanel is now imported from ./DepthChartPanel

// Main Right Side Panel Component - Fixed to right edge of screen with resizable width
const RightSidePanel = ({
  teamFilter = null,
  positionFilter = null,
  isOpen,
  activeTab,
  onTabClick,
  onClose,
  width = 350  // Default width, can be controlled by parent for resizing
}) => {
  const activeTabConfig = TABS.find(t => t.id === activeTab);
  const ActiveIcon = activeTabConfig?.icon || AlertTriangle;

  return (
    <>
      {/* Fixed position container on right edge */}
      <div className="fixed right-0 top-0 bottom-0 z-40 flex items-stretch">
        {/* Sliding Panel Content - slides from right */}
        <div
          className={`
            bg-white border-l border-gray-300 shadow-2xl
            transition-opacity duration-200 ease-in-out overflow-hidden
            ${isOpen ? 'opacity-100' : 'w-0 opacity-0'}
          `}
          style={{ width: isOpen ? width : 0, height: '100vh' }}
        >
          {isOpen && (
            <div className="h-full flex flex-col" style={{ width }}>
              {/* Panel Header */}
              <div className="bg-slate-800 text-white px-3 py-2 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                  <ActiveIcon className={`w-4 h-4 ${activeTabConfig?.color}`} />
                  <span className="font-bold text-sm">{activeTabConfig?.label}</span>
                </div>
                <button
                  onClick={onClose}
                  className="p-1 hover:bg-slate-700 rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Panel Content */}
              <div className="flex-1 overflow-y-auto">
                {activeTab === 'injuries' && (
                  <InjuryPanel
                    teamFilter={teamFilter}
                    positionFilter={positionFilter}
                    compact={false}
                    maxHeight="calc(100vh - 50px)"
                    showHeader={false}
                    fantasyOnly={true}
                  />
                )}
                {activeTab === 'team-analysis' && (
                  <TeamAnalysisPanel teamFilter={teamFilter} />
                )}
                {activeTab === 'depth-chart' && (
                  <DepthChartPanel teamFilter={teamFilter} positionFilter={positionFilter} />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Vertical Tab Bar - file folder tabs stacked vertically on right edge */}
        <div className="flex flex-col justify-center gap-1 bg-slate-800 py-2 px-1 shadow-lg">
          {TABS.map(tab => (
            <TabButton
              key={tab.id}
              tab={tab}
              isActive={isOpen && activeTab === tab.id}
              onClick={() => onTabClick(tab.id)}
            />
          ))}
        </div>
      </div>
    </>
  );
};

export default RightSidePanel;
