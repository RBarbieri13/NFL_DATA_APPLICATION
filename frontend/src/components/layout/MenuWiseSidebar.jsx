import React, { useState, useRef, useCallback, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { BarChart3, TrendingUp, Table2, Settings, ChevronLeft, ChevronRight, GripVertical } from 'lucide-react';

const MIN_WIDTH = 60;  // Collapsed (icons only)
const DEFAULT_WIDTH = 240;
const MAX_WIDTH = 320;

const MenuWiseSidebar = ({ activeRoute, onNavigate }) => {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef(null);

  const isCollapsed = width <= MIN_WIDTH + 20;

  // Handle mouse resize
  const startResizing = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback((e) => {
    if (isResizing && sidebarRef.current) {
      const newWidth = e.clientX - sidebarRef.current.getBoundingClientRect().left;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setWidth(newWidth);
      } else if (newWidth < MIN_WIDTH) {
        setWidth(MIN_WIDTH);
      } else if (newWidth > MAX_WIDTH) {
        setWidth(MAX_WIDTH);
      }
    }
  }, [isResizing]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
    }
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing, resize, stopResizing]);

  // Toggle collapse
  const toggleCollapse = () => {
    setWidth(isCollapsed ? DEFAULT_WIDTH : MIN_WIDTH);
  };

  const navItems = [
    { to: '/data-table', icon: BarChart3, label: 'Data Table' },
    { to: '/trend-tool', icon: TrendingUp, label: 'Trend Tool' },
    { to: '/fantasy-analyzer', icon: Table2, label: 'Fantasy Analyzer' },
  ];

  return (
    <aside
      ref={sidebarRef}
      className="h-full flex flex-col relative select-none"
      style={{
        width: `${width}px`,
        minWidth: `${MIN_WIDTH}px`,
        maxWidth: `${MAX_WIDTH}px`,
        backgroundColor: '#1e293b', // Dark slate
        transition: isResizing ? 'none' : 'width 0.2s ease-in-out'
      }}
    >
      {/* Sidebar Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50 flex-shrink-0"></div>
          {!isCollapsed && (
            <span className="font-semibold text-slate-200 text-sm whitespace-nowrap overflow-hidden">
              MenuWise
            </span>
          )}
        </div>
        <button
          onClick={toggleCollapse}
          className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Primary Navigation */}
      <nav className="px-2 py-4 flex-1">
        <div className="space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                } ${isCollapsed ? 'justify-center' : ''}`
              }
              title={isCollapsed ? label : ''}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {!isCollapsed && (
                <span className="whitespace-nowrap overflow-hidden">{label}</span>
              )}
            </NavLink>
          ))}

          {/* Admin Section */}
          <div className={`mt-4 pt-4 border-t border-slate-700 ${isCollapsed ? '' : ''}`}>
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                } ${isCollapsed ? 'justify-center' : ''}`
              }
              title={isCollapsed ? 'Admin' : ''}
            >
              <Settings className="h-4 w-4 flex-shrink-0" />
              {!isCollapsed && <span>Admin</span>}
            </NavLink>
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-slate-700 bg-slate-800/50">
        {!isCollapsed && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">NFL Dashboard v1.0</span>
          </div>
        )}
      </div>

      {/* Resize Handle */}
      <div
        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 transition-colors group"
        onMouseDown={startResizing}
        style={{ backgroundColor: isResizing ? '#3b82f6' : 'transparent' }}
      >
        <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="h-6 w-6 text-slate-500" />
        </div>
      </div>
    </aside>
  );
};

export default MenuWiseSidebar;
