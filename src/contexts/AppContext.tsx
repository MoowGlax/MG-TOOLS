import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import { DelugeService } from '../services/deluge';
import { ProwlarrService } from '../services/prowlarr';

interface AppContextType {
  health: Record<string, boolean | undefined>;
  notify: (title: string, options?: { body?: string; type?: 'success' | 'error' | 'info' }) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  // undefined means unknown/loading, false means offline, true means online
  const [health, setHealth] = useState<Record<string, boolean | undefined>>({});
  
  // Track previous torrent states to detect completions
  const previousTorrentsRef = useRef<Map<string, string>>(new Map());

  // Smart notification helper
  const notify = (title: string, options: { body?: string; type?: 'success' | 'error' | 'info' } = {}) => {
    const { body, type = 'info' } = options;
    
    // Check if window has focus
    if (document.hasFocus()) {
      // In-app toast
      switch (type) {
        case 'success':
          toast.success(title, { description: body });
          break;
        case 'error':
          toast.error(title, { description: body });
          break;
        default:
          toast.info(title, { description: body });
      }
    } else {
      // System notification
      new Notification(title, {
        body: body,
        icon: '/vite.svg'
      });
    }
  };

  // Poll Health & Deluge Status
  useEffect(() => {
    const checkHealthAndStatus = async () => {
      // 1. Check Services Health
      const delugeHealth = await DelugeService.checkHealth();
      const prowlarrHealth = await ProwlarrService.checkHealth();
      
      setHealth(prev => {
        // Only update if changed to avoid unnecessary re-renders
        if (prev['/deluge'] === delugeHealth && prev['/prowlarr'] === prowlarrHealth) return prev;
        return { '/deluge': delugeHealth, '/prowlarr': prowlarrHealth };
      });

      // 2. Check Deluge Downloads (only if connected)
      if (delugeHealth) {
        try {
          const torrents = await DelugeService.getTorrents();
          const currentMap = new Map<string, string>();
          
          torrents.forEach(t => {
            currentMap.set(t.id, t.state);
            
            // Check for completion
            const prevState = previousTorrentsRef.current.get(t.id);
            if (prevState && prevState !== 'Seeding' && prevState !== 'Paused' && prevState !== 'Queued' && prevState !== 'Checking') {
                // If it was downloading (or other active state) and now is Seeding/Paused/Queued with 100% progress
                if ((t.state === 'Seeding' || t.state === 'Paused' || t.state === 'Queued') && t.progress === 100) {
                    notify('Téléchargement terminé', {
                        body: `${t.name} a fini de télécharger`,
                        type: 'success'
                    });
                }
            }
          });
          
          previousTorrentsRef.current = currentMap;
        } catch (e) {
          console.error('Error monitoring deluge', e);
        }
      }
    };

    // Initial check
    checkHealthAndStatus();
    
    // Poll every 10s (faster than 30s to catch downloads reasonably quickly)
    const interval = setInterval(checkHealthAndStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <AppContext.Provider value={{ health, notify }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
