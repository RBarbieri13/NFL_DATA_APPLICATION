import React, { useState, useCallback } from 'react';
import { X, AlertTriangle, Users, BarChart3, GripVertical } from 'lucide-react';
import InjuryPanel from './InjuryPanel';

// Default tab configuration
const DEFAULT_TABS = [
  { id: 'injuries', label: 'Injuries', icon: AlertTriangle, color: 'text-yellow-400', bgColor: 'bg-yellow-500', borderColor: 'border-yellow-400' },
  { id: 'team-analysis', label: 'Team Analysis', icon: BarChart3, color: 'text-blue-400', bgColor: 'bg-blue-500', borderColor: 'border-blue-400' },
  { id: 'depth-chart', label: 'Depth Chart', icon: Users, color: 'text-green-400', bgColor: 'bg-green-500', borderColor: 'border-green-400' },
];

// Vertical tab button - styled like file folder tabs on the right edge with drag support
const TabButton = ({ tab, isActive, onClick, onDragStart, onDragOver, onDrop, onDragEnd, isDragging, isDragOver }) => {
  const Icon = tab.icon;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, tab.id)}
      onDragOver={(e) => onDragOver(e, tab.id)}
      onDrop={(e) => onDrop(e, tab.id)}
      onDragEnd={onDragEnd}
      className={`
        relative transition-all duration-200 cursor-grab active:cursor-grabbing
        ${isDragging ? 'opacity-50 scale-95' : ''}
        ${isDragOver ? 'transform -translate-y-2' : ''}
      `}
    >
      <button
        onClick={onClick}
        className={`
          relative flex items-center gap-2 px-3 py-4
          rounded-l-xl transition-all duration-200
          border-l-4 min-w-[52px]
          ${isActive
            ? `bg-white text-slate-800 shadow-xl -translate-x-2 ${tab.borderColor}`
            : `bg-gradient-to-r from-slate-700 to-slate-600 text-slate-200 hover:from-slate-600 hover:to-slate-500 hover:text-white hover:-translate-x-1 border-transparent hover:${tab.borderColor}`
          }
        `}
        style={{
          writingMode: 'vertical-rl',
          textOrientation: 'mixed',
        }}
        title={`${tab.label} (drag to reorder)`}
      >
        <GripVertical className="w-3 h-3 opacity-40" style={{ transform: 'rotate(90deg)' }} />
        <Icon className={`w-5 h-5 ${isActive ? tab.color : 'text-slate-300'}`}
              style={{ transform: 'rotate(90deg)' }} />
        <span className="text-sm font-bold whitespace-nowrap tracking-wide">
          {tab.label}
        </span>
      </button>
    </div>
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

// Placeholder for Depth Chart
const DepthChartPanel = ({ teamFilter, positionFilter }) => (
  <div className="p-4">
    <div className="text-center py-8 text-gray-500">
      <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
      <h3 className="font-semibold text-lg mb-2">Depth Chart</h3>
      <p className="text-sm">
        {teamFilter
          ? `Depth chart for ${teamFilter} coming soon...`
          : 'Select a team to view depth chart'
        }
      </p>
    </div>
  </div>
);

// Main Right Side Panel Component - Fixed to right edge of screen
const RightSidePanel = ({
  teamFilter = null,
  positionFilter = null,
  isOpen,
  activeTab,
  onTabClick,
  onClose
}) => {
  // State for tab order (allows drag-and-drop reordering)
  const [tabs, setTabs] = useState(DEFAULT_TABS);
  const [draggedTabId, setDraggedTabId] = useState(null);
  const [dragOverTabId, setDragOverTabId] = useState(null);

  const activeTabConfig = tabs.find(t => t.id === activeTab);
  const ActiveIcon = activeTabConfig?.icon || AlertTriangle;

  // Drag and drop handlers
  const handleDragStart = useCallback((e, tabId) => {
    setDraggedTabId(tabId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', tabId);
  }, []);

  const handleDragOver = useCallback((e, tabId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (tabId !== draggedTabId) {
      setDragOverTabId(tabId);
    }
  }, [draggedTabId]);

  const handleDrop = useCallback((e, targetTabId) => {
    e.preventDefault();
    const sourceTabId = draggedTabId;
    
    if (sourceTabId && sourceTabId !== targetTabId) {
      setTabs(prevTabs => {
        const newTabs = [...prevTabs];
        const sourceIndex = newTabs.findIndex(t => t.id === sourceTabId);
        const targetIndex = newTabs.findIndex(t => t.id === targetTabId);
        
        if (sourceIndex !== -1 && targetIndex !== -1) {
          const [removed] = newTabs.splice(sourceIndex, 1);
          newTabs.splice(targetIndex, 0, removed);
        }
        
        return newTabs;
      });
    }
    
    setDraggedTabId(null);
    setDragOverTabId(null);
  }, [draggedTabId]);

  const handleDragEnd = useCallback(() => {
    setDraggedTabId(null);
    setDragOverTabId(null);
  }, []);

  return (
    <>
      {/* Fixed position container on right edge */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-50 flex items-center">
        {/* Sliding Panel Content - slides from right */}
        <div
          className={`
            bg-white border border-gray-300 shadow-2xl rounded-l-xl
            transition-all duration-300 ease-in-out overflow-hidden
            ${isOpen ? 'w-96 opacity-100' : 'w-0 opacity-0'}
          `}
          style={{ height: '70vh', maxHeight: '700px' }}
        >
          {isOpen && (
            <div className="w-96 h-full flex flex-col">
              {/* Panel Header */}
              <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white px-4 py-3 flex items-center justify-between flex-shrink-0 rounded-tl-xl">
                <div className="flex items-center gap-2">
                  <ActiveIcon className={`w-5 h-5 ${activeTabConfig?.color}`} />
                  <span className="font-bold text-base">{activeTabConfig?.label}</span>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-slate-600 rounded-lg transition-colors"
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
                    maxHeight="calc(70vh - 50px)"
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
        <div className="flex flex-col gap-2 bg-gradient-to-b from-slate-800 to-slate-900 py-3 px-1.5 rounded-l-xl shadow-2xl border-l border-t border-b border-slate-600">
          {tabs.map(tab => (
            <TabButton
              key={tab.id}
              tab={tab}
              isActive={isOpen && activeTab === tab.id}
              onClick={() => onTabClick(tab.id)}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
              isDragging={draggedTabId === tab.id}
              isDragOver={dragOverTabId === tab.id}
            />
          ))}
        </div>
      </div>
    </>
  );
};

export default RightSidePanel;
