import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { DelugeService } from '../services/deluge';
import { ProwlarrService } from '../services/prowlarr';
import { SeriesService } from '../services/series';
import { SynologyService } from '../services/synology';

interface ServiceStatusContextType {
  health: Record<string, boolean>;
  hasSeriesUpdates: boolean;
  refreshStatus: () => Promise<void>;
}

const ServiceStatusContext = createContext<ServiceStatusContextType | undefined>(undefined);

export function ServiceStatusProvider({ children }: { children: ReactNode }) {
  const [health, setHealth] = useState<Record<string, boolean>>({});
  const [hasSeriesUpdates, setHasSeriesUpdates] = useState(false);

  const check = async () => {
    try {
      // Run checks in parallel
      const [deluge, prowlarr, synology, seriesUpdates] = await Promise.all([
        DelugeService.checkHealth().catch(() => false),
        ProwlarrService.checkHealth().catch(() => false),
        SynologyService.checkHealth().catch(() => false),
        SeriesService.hasUpdates()
      ]);

      setHealth({ 
        '/deluge': deluge, 
        '/prowlarr': prowlarr, 
        '/synology': synology 
      });
      setHasSeriesUpdates(seriesUpdates);
    } catch (e) {
      console.error('Failed to check service status:', e);
    }
  };

  useEffect(() => {
    // Initial check
    check();
    
    // Check series status on mount
    SeriesService.checkStatusChanges().then(() => check()).catch(console.error);
    
    // Poll every 30s
    const interval = setInterval(check, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <ServiceStatusContext.Provider value={{ health, hasSeriesUpdates, refreshStatus: check }}>
      {children}
    </ServiceStatusContext.Provider>
  );
}

export function useServiceStatus() {
  const context = useContext(ServiceStatusContext);
  if (context === undefined) {
    throw new Error('useServiceStatus must be used within a ServiceStatusProvider');
  }
  return context;
}
