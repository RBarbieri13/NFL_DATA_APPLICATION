import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import FantasyAnalyzer from './FantasyAnalyzer';
import MenuWiseSidebar from './layout/MenuWiseSidebar';
import RightSidePanel from './RightSidePanel';

const FantasyAnalyzerDemo = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Right side panel state
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('injuries');

  // Resizable panel width (in pixels)
  const [panelWidth, setPanelWidth] = useState(350);
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef(null);

  // Handle tab click - toggle panel or switch tabs
  const handleTabClick = (tabId) => {
    if (isPanelOpen && activeTab === tabId) {
      // Clicking same tab closes panel
      setIsPanelOpen(false);
    } else {
      // Open panel and switch to tab
      setActiveTab(tabId);
      setIsPanelOpen(true);
    }
  };

  // Handle resize drag
  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isResizing) return;

    // Calculate new width based on mouse position from right edge
    const newWidth = window.innerWidth - e.clientX;
    // Clamp between min and max widths
    const clampedWidth = Math.min(Math.max(newWidth, 250), 600);
    setPanelWidth(clampedWidth);
  }, [isResizing]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  // Add and remove event listeners for resize
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* MenuWise Sidebar - No wrapper div, let sidebar control its own width */}
      <MenuWiseSidebar
        activeRoute={location.pathname}
        onNavigate={(path) => navigate(path)}
      />

      {/* Main Content Area - flex to fill remaining space */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ marginRight: isPanelOpen ? panelWidth : 0 }}>
        {/* Compact Header with Rube Logo */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 shadow-md border-b-2 border-blue-500">
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-black/20"></div>
            <div className="relative max-w-full mx-auto px-4 py-1">
              <div className="flex items-center gap-3">
                <img
                  src="/logo.png"
                  alt="Rube"
                  className="h-10 object-contain"
                />
                <div>
                  <h1 className="text-lg font-bold text-white tracking-tight">Fantasy Analyzer</h1>
                  <p className="text-blue-200 text-[10px]">Weekly Player Stats & Trends</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area - No extra padding wrapper */}
        <main className="flex-1 overflow-auto bg-white">
          <FantasyAnalyzer />
        </main>
      </div>

      {/* Resizable Right Side Panel with Injury Report and other tabs */}
      {isPanelOpen && (
        <>
          {/* Resize Handle */}
          <div
            ref={resizeRef}
            onMouseDown={handleMouseDown}
            className="fixed top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 active:bg-blue-500 transition-colors z-50"
            style={{
              right: panelWidth,
              backgroundColor: isResizing ? '#3b82f6' : 'transparent'
            }}
          >
            {/* Visual grip indicator */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-12 rounded-full bg-gray-300 opacity-50 hover:opacity-100" />
          </div>
        </>
      )}

      <RightSidePanel
        isOpen={isPanelOpen}
        activeTab={activeTab}
        onTabClick={handleTabClick}
        onClose={() => setIsPanelOpen(false)}
        teamFilter={null}
        positionFilter={null}
        width={panelWidth}
      />
    </div>
  );
};

export default FantasyAnalyzerDemo;

