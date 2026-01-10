import React, { createContext, useContext, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { DownloadManagerService } from '../components/DownloadManager';

interface DownloadOptions {
    format: 'mp3' | 'mp4';
    quality: string;
}

interface ProgressData {
    percent: number;
    current?: number;
    total?: number;
    eta?: string;
}

interface VideoInfo {
    title: string;
    isPlaylist?: boolean;
    thumbnail?: string;
    duration?: string;
    author?: string;
    playlistCount?: number;
}

interface DownloadContextType {
    isDownloading: boolean;
    progress: ProgressData;
    videoInfo: VideoInfo | null;
    startDownload: (url: string, options: DownloadOptions, info: VideoInfo) => Promise<void>;
    cancelDownload: () => Promise<void>;
}

const DownloadContext = createContext<DownloadContextType | undefined>(undefined);

export function DownloadProvider({ children }: { children: React.ReactNode }) {
    const [isDownloading, setIsDownloading] = useState(false);
    const [progress, setProgress] = useState<ProgressData>({ percent: 0 });
    const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
    const [currentDownloadId, setCurrentDownloadId] = useState<string | null>(null);

    const startDownload = useCallback(async (url: string, options: DownloadOptions, info: VideoInfo) => {
        const filename = `${info.title}.${options.format}`; // Simple approximation

        if (DownloadManagerService.isDownloading(filename)) {
            toast.warning("Ce téléchargement est déjà en cours");
            return;
        }

        setIsDownloading(true);
        setVideoInfo(info);
        setProgress({ percent: 0 });

        // Register with DownloadManager
        const downloadId = DownloadManagerService.add(filename);
        setCurrentDownloadId(downloadId);

        let cleanup: (() => void) | undefined;
        try {
            cleanup = window.electronAPI.youtube.onDownloadProgress((data) => {
                setProgress(data);
                
                // Update DownloadManager with playlist info if available
                if (data.total && data.total > 1) { // Assuming total > 1 implies playlist or just tracking items
                    DownloadManagerService.update(downloadId, {
                        progress: data.percent,
                        playlistIndex: data.current,
                        playlistTotal: data.total
                    });
                }
            });

            const result = await window.electronAPI.youtube.download(url, options, downloadId);
            if (result && !result.success) {
                throw new Error((result as any).error || "Download failed");
            }
            
            toast.success("Téléchargement terminé !");
            
            // Notification système
            try {
                await window.electronAPI.notify("Téléchargement terminé", `${info.title} a été téléchargé avec succès.`);
            } catch (e) {
                console.error("Erreur notification", e);
            }
            
            setProgress({ percent: 100 });
            setTimeout(() => {
                setIsDownloading(false);
                setProgress({ percent: 0 });
                setVideoInfo(null);
            }, 3000);

        } catch (error: any) {
            console.error(error);
            // Mark as error in DownloadManager
            DownloadManagerService.update(downloadId, { status: 'error', error: error.message });

            // Si annulé, on ne veut pas forcément une erreur rouge effrayante
            if (error.message && error.message.includes('annulé')) {
                toast.info("Téléchargement annulé");
            } else {
                toast.error("Erreur lors du téléchargement : " + error.message);
                try {
                    await window.electronAPI.notify("Erreur de téléchargement", error.message || "Une erreur est survenue");
                } catch (e) { console.error(e); }
            }
            setIsDownloading(false);
        } finally {
            if (cleanup) cleanup();
        }
    }, []);

    const cancelDownload = useCallback(async () => {
        console.log("Cancelling download...", currentDownloadId);
        try {
            await window.electronAPI.youtube.cancel(currentDownloadId || undefined);
            console.log("Cancellation request sent");
            // L'état sera mis à jour via le catch du startDownload qui recevra l'erreur d'annulation
        } catch (error) {
            console.error("Erreur lors de l'annulation", error);
        }
    }, [currentDownloadId]);

    return (
        <DownloadContext.Provider value={{ isDownloading, progress, videoInfo, startDownload, cancelDownload }}>
            {children}
        </DownloadContext.Provider>
    );
}

export function useDownload() {
    const context = useContext(DownloadContext);
    if (context === undefined) {
        throw new Error('useDownload must be used within a DownloadProvider');
    }
    return context;
}
