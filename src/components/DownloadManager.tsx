import { useState, useEffect } from 'react';
import { X, File, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export interface DownloadItem {
    id: string;
    filename: string;
    progress: number;
    total?: number;
    downloaded?: number;
    status: 'pending' | 'downloading' | 'completed' | 'error';
    error?: string;
    playlistIndex?: number;
    playlistTotal?: number;
}

// Global store
let listeners: ((items: DownloadItem[]) => void)[] = [];
let historyListeners: ((items: DownloadItem[]) => void)[] = [];
let items: DownloadItem[] = []; // Active/Visible items
let history: DownloadItem[] = []; // All history

// Load history from localStorage
try {
    const saved = localStorage.getItem('download_history');
    if (saved) {
        history = JSON.parse(saved);
        // Clean up any "downloading" status in history to "error" or "interrupted" if app was closed
        history = history.map(h => 
            (h.status === 'downloading' || h.status === 'pending') 
            ? { ...h, status: 'error', error: 'Interrompu' } 
            : h
        );
    }
} catch (e) {
    console.error("Failed to load history", e);
}

const saveHistory = () => {
    try {
        localStorage.setItem('download_history', JSON.stringify(history));
    } catch (e) {
        console.error("Failed to save history", e);
    }
};

export const DownloadManagerService = {
    add: (filename: string): string => {
        const id = Math.random().toString(36).substring(7);
        const newItem: DownloadItem = {
            id,
            filename,
            progress: 0,
            status: 'pending'
        };
        items = [...items, newItem];
        history = [newItem, ...history]; // Newest first
        saveHistory();
        notifyListeners();
        notifyHistoryListeners();
        
        // Show notification
        toast.info(`Téléchargement lancé : ${filename}`);
        
        return id;
    },
    
    update: (id: string, data: Partial<DownloadItem>) => {
        // Update in items
        items = items.map(item => item.id === id ? { ...item, ...data } : item);
        // Update in history
        history = history.map(item => item.id === id ? { ...item, ...data } : item);
        
        if (data.status === 'completed' || data.status === 'error') {
            saveHistory();
        }

        notifyListeners();
        notifyHistoryListeners();

        // Auto-remove completed from active list after 5 seconds
        if (data.status === 'completed') {
             setTimeout(() => {
                DownloadManagerService.removeFromActive(id);
             }, 5000);
        }
    },
    
    removeFromActive: (id: string) => {
        items = items.filter(item => item.id !== id);
        notifyListeners();
    },

    remove: (id: string) => {
        // Find item to check status
        const item = items.find(i => i.id === id);
        if (item && (item.status === 'downloading' || item.status === 'pending')) {
             try {
                 window.electronAPI.youtube.cancel(id);
             } catch (e) {
                 console.error("Failed to cancel download via IPC", e);
             }
        }

        items = items.filter(item => item.id !== id);
        history = history.filter(item => item.id !== id); // Remove from history too if manually deleted? Or just active?
        // Usually X on a download manager cancels/removes it.
        // Let's say X removes from active. 
        // But if I want to delete from history, I need another action.
        // For now, let's keep it simple: Remove from active.
        notifyListeners();
        notifyHistoryListeners();
    },
    
    getStats: () => {
        const total = history.length;
        const completed = history.filter(i => i.status === 'completed').length;
        return { total, completed };
    },

    subscribe: (listener: (items: DownloadItem[]) => void) => {
        listeners.push(listener);
        listener(items);
        return () => {
            listeners = listeners.filter(l => l !== listener);
        };
    },

    subscribeToHistory: (listener: (items: DownloadItem[]) => void) => {
        historyListeners.push(listener);
        listener(history);
        return () => {
            historyListeners = historyListeners.filter(l => l !== listener);
        };
    },

    isDownloading: (filename: string) => {
        return items.some(item => item.filename === filename && (item.status === 'downloading' || item.status === 'pending'));
    }
};

const notifyListeners = () => {
    listeners.forEach(l => l(items));
};

const notifyHistoryListeners = () => {
    historyListeners.forEach(l => l(history));
};

export function DownloadManager() {
    const [downloads, setDownloads] = useState<DownloadItem[]>([]);
    const [isCollapsed, setIsCollapsed] = useState(false);

    useEffect(() => {
        const unsubscribe = DownloadManagerService.subscribe(setDownloads);
        
        // Listen to Electron progress events
        const removeProgressListener = window.electronAPI.onDownloadProgress((data) => {
            DownloadManagerService.update(data.id, {
                progress: data.progress,
                downloaded: data.downloaded,
                total: data.total,
                status: (data.status as any) || 'downloading'
            });
        });

        return () => {
            unsubscribe();
            removeProgressListener();
        };
    }, []);

    if (downloads.length === 0) return null;

    const activeDownloads = downloads.filter(d => d.status === 'downloading' || d.status === 'pending').length;
    const completedDownloads = downloads.filter(d => d.status === 'completed').length;

    if (isCollapsed) {
        return (
            <div 
                className="fixed bottom-4 right-4 z-50 bg-card border rounded-lg shadow-lg p-3 cursor-pointer hover:bg-accent/50 transition-colors flex items-center gap-3 animate-in slide-in-from-bottom-4"
                onClick={() => setIsCollapsed(false)}
            >
                <div className="relative">
                    <File className="h-5 w-5 text-primary" />
                    {activeDownloads > 0 && (
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                            {activeDownloads}
                        </span>
                    )}
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-medium">Téléchargements</span>
                    <span className="text-xs text-muted-foreground">
                        {activeDownloads > 0 ? `${activeDownloads} en cours` : `${completedDownloads} terminé(s)`}
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80 max-h-[60vh]">
            <div className="bg-card border rounded-lg shadow-lg overflow-hidden flex flex-col">
                <div 
                    className="p-3 bg-muted/50 border-b flex items-center justify-between cursor-pointer hover:bg-muted/70 transition-colors"
                    onClick={() => setIsCollapsed(true)}
                >
                    <span className="text-sm font-medium flex items-center gap-2">
                        <File className="h-4 w-4" />
                        Téléchargements ({downloads.length})
                    </span>
                    <span className="text-xs text-muted-foreground hover:text-foreground">
                        Réduire
                    </span>
                </div>
                
                <div className="p-2 flex flex-col gap-2 overflow-y-auto max-h-[50vh]">
                    {downloads.map(item => (
                        <div key={item.id} className="bg-background border rounded-md p-3 animate-in slide-in-from-right fade-in duration-300">
                            <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 overflow-hidden">
                            <div className="p-1.5 bg-primary/10 rounded-full shrink-0">
                                <File className="h-4 w-4 text-primary" />
                            </div>
                            <span className="text-sm font-medium truncate" title={item.filename}>
                                {item.filename}
                            </span>
                        </div>
                        <button 
                            onClick={() => DownloadManagerService.remove(item.id)}
                            className="text-muted-foreground hover:text-foreground shrink-0"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                    
                    {item.status === 'error' ? (
                        <div className="flex items-center gap-2 text-destructive text-xs">
                            <AlertCircle className="h-3 w-3" />
                            {item.error || 'Erreur de téléchargement'}
                        </div>
                    ) : (
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>
                                    {item.status === 'completed' ? 'Terminé' : 
                                     item.status === 'pending' ? 'En attente...' : 
                                     item.playlistTotal ? `Item ${item.playlistIndex || 1}/${item.playlistTotal}` :
                                     `${Math.round(item.progress)}%`}
                                </span>
                                {item.total && !item.playlistTotal && (
                                    <span>{(item.total / 1024 / 1024).toFixed(1)} MB</span>
                                )}
                            </div>
                            <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                                <div 
                                    className={`h-full transition-all duration-300 ${
                                        item.status === 'completed' ? 'bg-green-500' : 'bg-primary'
                                    }`}
                                    style={{ width: `${item.progress}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            ))}
                </div>
            </div>
        </div>
    );
}
