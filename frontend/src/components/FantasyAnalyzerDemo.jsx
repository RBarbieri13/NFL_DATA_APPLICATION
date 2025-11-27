import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import FantasyAnalyzer from './FantasyAnalyzer';
import MenuWiseSidebar from './layout/MenuWiseSidebar';

const FantasyAnalyzerDemo = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="flex h-screen bg-gray-50">
      {/* MenuWise Sidebar - No wrapper div, let sidebar control its own width */}
      <MenuWiseSidebar
        activeRoute={location.pathname}
        onNavigate={(path) => navigate(path)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 shadow-2xl border-b-4 border-blue-500">
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-black/20 bg-[radial-gradient(circle_at_20%_80%,_rgba(120,_119,_198,_0.3),_transparent_50%)]"></div>
            <div className="relative max-w-full mx-auto px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-500/20 rounded-lg shadow-lg border border-blue-400/30">
                      <img
                        src="https://static.vecteezy.com/system/resources/thumbnails/053/257/088/small/fantasy-football-logo-white-line-stars-and-shield-vector.jpg"
                        alt="Fantasy Football Logo"
                        className="h-8 w-8 object-contain filter brightness-0 invert"
                      />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-white tracking-tight">Fantasy Analyzer</h1>
                      <p className="text-blue-200 text-sm">Weekly Player Stats & Trends</p>
                    </div>
                  </div>
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
    </div>
  );
};

export default FantasyAnalyzerDemo;

