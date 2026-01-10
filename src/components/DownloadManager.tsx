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
}

// Global store (simple implementation for this use case)
let listeners: ((items: DownloadItem[]) => void)[] = [];
let items: DownloadItem[] = [];

export const DownloadManagerService = {
    add: (filename: string): string => {
        const id = Math.random().toString(36).substring(7);
        items = [...items, {
            id,
            filename,
            progress: 0,
            status: 'pending'
        }];
        notifyListeners();
        
        // Show notification
        toast.info(`Téléchargement lancé : ${filename}`);
        
        return id;
    },
    
    update: (id: string, data: Partial<DownloadItem>) => {
        items = items.map(item => item.id === id ? { ...item, ...data } : item);
        notifyListeners();
    },
    
    remove: (id: string) => {
        items = items.filter(item => item.id !== id);
        notifyListeners();
    },

    subscribe: (listener: (items: DownloadItem[]) => void) => {
        listeners.push(listener);
        listener(items);
        return () => {
            listeners = listeners.filter(l => l !== listener);
        };
    }
};

const notifyListeners = () => {
    listeners.forEach(l => l(items));
};

export function DownloadManager() {
    const [downloads, setDownloads] = useState<DownloadItem[]>([]);

    useEffect(() => {
        const unsubscribe = DownloadManagerService.subscribe(setDownloads);
        
        // Listen to Electron progress events
        const removeProgressListener = window.electronAPI.onDownloadProgress((data) => {
            DownloadManagerService.update(data.id, {
                progress: data.progress,
                downloaded: data.downloaded,
                total: data.total,
                status: 'downloading'
            });
        });

        return () => {
            unsubscribe();
            removeProgressListener();
        };
    }, []);

    if (downloads.length === 0) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80">
            {downloads.map(item => (
                <div key={item.id} className="bg-card border rounded-lg shadow-lg p-3 animate-in slide-in-from-right fade-in duration-300">
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
                                     `${Math.round(item.progress)}%`}
                                </span>
                                {item.total && (
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
    );
}
