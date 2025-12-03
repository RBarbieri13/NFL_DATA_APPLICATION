import React, { useState } from 'react';
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

  return (
    <div className="flex h-screen bg-gray-50">
      {/* MenuWise Sidebar - No wrapper div, let sidebar control its own width */}
      <MenuWiseSidebar
        activeRoute={location.pathname}
        onNavigate={(path) => navigate(path)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header with Rube Logo */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 shadow-2xl border-b-4 border-blue-500">
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-black/20 bg-[radial-gradient(circle_at_20%_80%,_rgba(120,_119,_198,_0.3),_transparent_50%)]"></div>
            <div className="relative max-w-full mx-auto px-6 py-1">
              <div className="flex items-center gap-4">
                <img
                  src="/logo.png"
                  alt="Rube"
                  className="h-40 object-contain"
                />
                <div>
                  <h1 className="text-3xl font-bold text-white tracking-tight">Fantasy Analyzer</h1>
                  <p className="text-blue-200 text-sm">Weekly Player Stats & Trends</p>
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

      {/* Right Side Panel with Injury Report and other tabs */}
      <RightSidePanel
        isOpen={isPanelOpen}
        activeTab={activeTab}
        onTabClick={handleTabClick}
        onClose={() => setIsPanelOpen(false)}
        teamFilter={null}
        positionFilter={null}
      />
    </div>
  );
};

export default FantasyAnalyzerDemo;

