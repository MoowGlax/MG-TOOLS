import { useEffect, useState } from 'react';
import { Home, Settings, Download, Search, Tv, PanelLeftClose, PanelLeftOpen, Youtube, Server, TerminalSquare } from 'lucide-react';

const DiscordIcon = ({ className }: { className?: string }) => (
  <svg 
    role="img" 
    viewBox="0 0 24 24" 
    xmlns="http://www.w3.org/2000/svg" 
    className={className}
    fill="currentColor"
  >
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
  </svg>
);

import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { ThemeToggle } from '../ThemeToggle';
import { useDownload } from '../../contexts/DownloadContext';
import { useServiceStatus } from '../../contexts/ServiceStatusContext';

const ALL_ITEMS = [
  { id: 'home', to: '/', icon: Home, label: 'Accueil' },
  { id: 'deluge', to: '/deluge', icon: Download, label: 'Deluge' },
  { id: 'prowlarr', to: '/prowlarr', icon: Search, label: 'Prowlarr' },
  { id: 'series', to: '/series', icon: Tv, label: 'Séries' },
  { id: 'synology', to: '/synology', icon: Server, label: 'Synology' },
  { id: 'ssh', to: '/ssh', icon: TerminalSquare, label: 'Terminal SSH' },
  { id: 'youtube', to: '/youtube', icon: Youtube, label: 'YouTube MP3' },
  { id: 'settings', to: '/settings', icon: Settings, label: 'Paramètres' },
];

export function Sidebar() {
  const { isDownloading } = useDownload();
  const { health, hasSeriesUpdates } = useServiceStatus();
  const [isCollapsed, setIsCollapsed] = useState(() => {
      return localStorage.getItem('sidebar_collapsed') === 'true';
  });
  const [config, setConfig] = useState<{order: string[], hidden: string[]}>({ 
      order: ALL_ITEMS.map(i => i.id), 
      hidden: [] 
  });

  useEffect(() => {
    // Load sidebar config
    const loadConfig = () => {
        const stored = localStorage.getItem('sidebar_config');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                // Ensure defaults if empty
                if (!parsed.order || parsed.order.length === 0) parsed.order = ALL_ITEMS.map(i => i.id);
                if (!parsed.hidden) parsed.hidden = [];

                // Check for new items that are not in the stored config
                const currentIds = new Set(parsed.order);
                const newItems = ALL_ITEMS.filter(i => !currentIds.has(i.id));
                
                if (newItems.length > 0) {
                    // Add new items before settings if possible
                    const settingsIndex = parsed.order.indexOf('settings');
                    if (settingsIndex !== -1) {
                        parsed.order.splice(settingsIndex, 0, ...newItems.map(i => i.id));
                    } else {
                        parsed.order.push(...newItems.map(i => i.id));
                    }
                }

                setConfig(parsed);
            } catch (e) { console.error(e); }
        }
    };
    loadConfig();

    const handleConfigChange = () => loadConfig();
    window.addEventListener('sidebar-config-changed', handleConfigChange);
    
    return () => {
        window.removeEventListener('sidebar-config-changed', handleConfigChange);
    };
  }, []);

  const toggleCollapse = () => {
      const newState = !isCollapsed;
      setIsCollapsed(newState);
      localStorage.setItem('sidebar_collapsed', String(newState));
  };

  const getDisplayItems = () => {
      // Start with Home (always first as per request)
      const items = [ALL_ITEMS.find(i => i.id === 'home')!];
      
      // Filter others based on order
      const otherIds = config.order.filter(id => id !== 'home' && id !== 'settings');
      
      otherIds.forEach(id => {
          // Skip if hidden
          if (config.hidden.includes(id)) return;
          
          const item = ALL_ITEMS.find(i => i.id === id);
          if (item) items.push(item);
      });

      return items;
  };

  const displayItems = getDisplayItems();
  const settingsItem = ALL_ITEMS.find(i => i.id === 'settings')!;

  return (
    <div className={cn(
        "flex h-full flex-col border-r bg-card/80 backdrop-blur-md text-card-foreground transition-all duration-300", 
        isCollapsed ? "w-[70px]" : "w-52"
    )}>
      {/* Logo Header */}
      <div className="flex flex-col items-center justify-center py-4 border-b shrink-0 titlebar-drag-region bg-gradient-to-b from-background/50 to-transparent">
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
          <img 
            src="logo.svg" 
            alt="MG Tools Logo" 
            className={cn(
              "relative transition-all duration-300 drop-shadow-lg",
              isCollapsed ? "w-8 h-8" : "w-10 h-10"
            )}
          />
        </div>
        {!isCollapsed && (
          <h1 className="mt-2 font-bold text-base bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent whitespace-nowrap tracking-wide">
            MG Tools
          </h1>
        )}
      </div>

      <nav className="flex-1 space-y-1 p-2 overflow-y-auto overflow-x-hidden">
        {displayItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground relative group no-drag",
                isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground",
                isCollapsed && "justify-center px-2"
              )
            }
            title={isCollapsed ? item.label : undefined}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span className={cn("flex-1 transition-all duration-300 overflow-hidden whitespace-nowrap", isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100")}>
                {item.label}
            </span>
            
            {/* Status Indicators */}
            {!isCollapsed && (
                <>
                    {(item.to === '/deluge' || item.to === '/prowlarr' || item.to === '/synology') && health[item.to] !== undefined && (
                        <div className={cn("h-2 w-2 rounded-full transition-colors", 
                            health[item.to] ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-red-500/50"
                        )} title={health[item.to] ? "Connecté" : "Déconnecté"} />
                    )}
                    {item.to === '/series' && hasSeriesUpdates && (
                        <div className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" title="Nouveaux changements de statut" />
                    )}
                    {item.to === '/youtube' && isDownloading && (
                         <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]" title="Téléchargement en cours" />
                    )}
                </>
            )}
            {isCollapsed && (
                 <>
                    {(item.to === '/deluge' || item.to === '/prowlarr' || item.to === '/synology') && health[item.to] !== undefined && (
                        <div className={cn("absolute top-1 right-1 h-2 w-2 rounded-full transition-colors border border-card", 
                            health[item.to] ? "bg-green-500" : "bg-red-500"
                        )} />
                    )}
                    {item.to === '/series' && hasSeriesUpdates && (
                        <div className="absolute top-1 right-1 h-2 w-2 rounded-full bg-blue-500 border border-card" />
                    )}
                    {item.to === '/youtube' && isDownloading && (
                        <div className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 animate-pulse border border-card" />
                    )}
                </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-2 border-t border-border/50 space-y-1">
        {/* Settings Link */}
        <NavLink
            to={settingsItem.to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground relative group no-drag",
                isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground",
                isCollapsed && "justify-center px-2"
              )
            }
            title={isCollapsed ? settingsItem.label : undefined}
        >
            <settingsItem.icon className="h-4 w-4 shrink-0" />
            {!isCollapsed && <span className="flex-1 overflow-hidden whitespace-nowrap">{settingsItem.label}</span>}
        </NavLink>

        {/* Discord Link */}
        <a
          href="https://discord.gg/XZE3jyS4ms"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-muted-foreground hover:bg-[#5865F2]/10 hover:text-[#5865F2] group",
            isCollapsed && "justify-center px-2"
          )}
          title={isCollapsed ? "Discord" : undefined}
        >
          <DiscordIcon className="h-5 w-5 transition-transform group-hover:scale-110 shrink-0" />
          {!isCollapsed && <span className="font-medium text-sm">Discord</span>}
        </a>
        
        {/* Controls */}
        <div className={cn(
          "flex items-center gap-3 px-3 py-2 mt-2",
          isCollapsed ? "justify-center flex-col" : "justify-between"
        )}>
          <ThemeToggle />
          {!isCollapsed && (
            <button
              onClick={toggleCollapse}
              className="p-1.5 hover:bg-muted rounded-md transition-colors"
            >
              <PanelLeftClose className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
          {isCollapsed && (
             <button
               onClick={toggleCollapse}
               className="p-1.5 hover:bg-muted rounded-md transition-colors"
             >
               <PanelLeftOpen className="h-4 w-4 text-muted-foreground" />
             </button>
          )}
        </div>
      </div>
    </div>
  );
}
