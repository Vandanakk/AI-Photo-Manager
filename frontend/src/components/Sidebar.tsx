import React, { useEffect, useState } from 'react';
import { 
  Images, 
  Sparkles, 
  Users, 
  Copy, 
  FolderTree, 
  Settings, 
  CheckCircle2, 
  AlertCircle, 
  Loader2 
} from 'lucide-react';
import type { NavigationTab, HealthStatus } from '../types';
import { getHealth } from '../api';

interface SidebarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  onOpenSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  onOpenSettings,
}) => {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [healthLoading, setHealthLoading] = useState<boolean>(true);
  const [healthError, setHealthError] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const checkHealth = async () => {
      try {
        const data = await getHealth();
        if (isMounted) {
          setHealth(data);
          setHealthError(false);
          setHealthLoading(false);
        }
      } catch {
        if (isMounted) {
          setHealthError(true);
          setHealthLoading(false);
        }
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const navItems = [
    { id: 'photos' as NavigationTab, label: 'Photos', icon: Images },
    { id: 'search' as NavigationTab, label: 'AI Search', icon: Sparkles, badge: 'CLIP' },
    { id: 'people' as NavigationTab, label: 'People', icon: Users },
    { id: 'duplicates' as NavigationTab, label: 'Duplicates', icon: Copy },
    { id: 'categories' as NavigationTab, label: 'Categories', icon: FolderTree },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen select-none sticky top-0 shrink-0">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-slate-900 tracking-tight leading-none">PhotoAI</h1>
            <span className="text-[11px] font-medium text-slate-400 tracking-wide uppercase">Intelligent Library</span>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Library
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                isActive
                  ? 'bg-brand-50 text-brand-700 font-semibold shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-brand-600' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md ${
                  isActive ? 'bg-brand-200/60 text-brand-800' : 'bg-slate-100 text-slate-500'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Section: Backend Status & Settings */}
      <div className="p-3 border-t border-slate-100 space-y-2 bg-slate-50/50">
        {/* Backend Status Indicator */}
        <div className="px-3 py-2 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            {healthLoading ? (
              <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin" />
            ) : healthError ? (
              <span className="relative flex h-2.5 w-2.5">
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
              </span>
            ) : (
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            )}
            <div className="flex flex-col">
              <span className="text-xs font-medium text-slate-800 leading-tight">
                {healthLoading ? 'Connecting...' : healthError ? 'Backend Offline' : 'Backend Online'}
              </span>
              <span className="text-[10px] text-slate-400 leading-tight">
                {health?.database ? `DB: ${health.database} • v${health.version}` : 'FastAPI + Celery'}
              </span>
            </div>
          </div>
          {!healthLoading && !healthError && (
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          )}
          {healthError && (
            <AlertCircle className="w-4 h-4 text-rose-500" />
          )}
        </div>

        {/* Settings Placeholder Button */}
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-white border border-transparent hover:border-slate-200 transition-all duration-150"
        >
          <Settings className="w-4 h-4 text-slate-400" />
          <span>System & Settings</span>
        </button>
      </div>
    </aside>
  );
};
