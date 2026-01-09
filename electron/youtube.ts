import { app, shell } from 'electron';
import path from 'path';
import execa from 'execa';
import { BinariesManager } from './binaries';
import fs from 'fs-extra';

export interface DownloadOptions {
    format: 'mp3' | 'mp4';
    quality: 'best' | 'high' | 'medium' | 'low';
}

export interface ProgressData {
    percent: number;
    current?: number;
    total?: number;
    eta?: string;
}

export class YoutubeService {
    private static activeProcess: any = null;
    private static isCancelled = false;
    private static cancelCallback: ((err: Error) => void) | null = null;

    static async getVideoInfo(url: string) {
        const paths = BinariesManager.getPaths();
        
        try {
            // First check if it's a playlist using flat-playlist for speed
            // Note: simple check, but yt-dlp handles it better
            const isPlaylist = url.includes('list=');
            
            if (isPlaylist) {
                 const { stdout } = await execa(paths.ytdlp, [
                    '--dump-single-json',
                    '--flat-playlist',
                    url
                ]);
                const data = JSON.parse(stdout);
                // For playlists, thumbnail might be in thumbnails array or not present in flat-playlist
                // We try to get one
                let thumbnail = '';
                if (data.thumbnails && data.thumbnails.length > 0) {
                    thumbnail = data.thumbnails[data.thumbnails.length - 1].url;
                }

                return {
                    title: data.title,
                    thumbnail: thumbnail,
                    duration: 'Playlist',
                    author: data.uploader || data.channel,
                    isPlaylist: true,
                    playlistCount: data.playlist_count || data.entries?.length || 0
                };
            } else {
                const { stdout } = await execa(paths.ytdlp, [
                    '--dump-json',
                    '--no-playlist',
                    url
                ]);
                const data = JSON.parse(stdout);
                return {
                    title: data.title,
                    thumbnail: data.thumbnail,
                    duration: data.duration_string,
                    author: data.uploader,
                    isPlaylist: false
                };
            }
        } catch (error: any) {
            console.error('Info Error:', error);
            throw new Error(`Impossible de récupérer les infos: ${error.message}`);
        }
    }

    static async downloadMedia(url: string, options: DownloadOptions, onProgress: (data: ProgressData) => void) {
        const paths = BinariesManager.getPaths();
        const downloadDir = app.getPath('downloads');
        
        // Output template
        const outputTemplate = path.join(downloadDir, '%(title)s.%(ext)s');

        const args = [
            '--ffmpeg-location', paths.ffmpeg,
            '-o', outputTemplate,
            '--newline',
            '--no-mtime' // Don't preserve mtime
        ];

        // Format selection
        if (options.format === 'mp3') {
            args.push('-x', '--audio-format', 'mp3');
            
            // Audio quality
            switch(options.quality) {
                case 'low': args.push('--audio-quality', '9'); break; // ~64k
                case 'medium': args.push('--audio-quality', '5'); break; // ~128k
                case 'high': args.push('--audio-quality', '2'); break; // ~192k
                case 'best': default: args.push('--audio-quality', '0'); break; // ~320k
            }
        } else {
            // Video (MP4)
            // We want mp4 container. 
            args.push('--format', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best');
        }

        // Add URL at the end
        args.push(url);

        return new Promise<void>((resolve, reject) => {
            YoutubeService.isCancelled = false;
            YoutubeService.cancelCallback = reject;
            
            const subprocess = execa(paths.ytdlp, args);
            YoutubeService.activeProcess = subprocess;
            console.log('[YoutubeService] Started process, PID:', subprocess.pid);
            
            let currentItem = 1;
            let totalItems = 1;

            if (subprocess.stdout) {
                subprocess.stdout.on('data', (data: any) => {
                    const text = data.toString();
                    
                    // Check for item progress "Downloading item 1 of 3"
                    const itemMatch = text.match(/Downloading item (\d+) of (\d+)/);
                    if (itemMatch) {
                        currentItem = parseInt(itemMatch[1]);
                        totalItems = parseInt(itemMatch[2]);
                    }

                    const match = text.match(/\[download\]\s+(\d+\.?\d*)%/);
                    const etaMatch = text.match(/ETA\s+(\d{2}:\d{2}(?::\d{2})?)/);

                    if (match && match[1]) {
                        onProgress({
                            percent: parseFloat(match[1]),
                            current: currentItem,
                            total: totalItems,
                            eta: etaMatch ? etaMatch[1] : undefined
                        });
                    }
                });
            }

            subprocess.then(() => {
                YoutubeService.activeProcess = null;
                YoutubeService.cancelCallback = null;
                resolve();
            }).catch((err: any) => {
                YoutubeService.activeProcess = null;
                YoutubeService.cancelCallback = null;
                // Check for SIGTERM or SIGKILL (cancellation) or explicit cancellation flag
                if (YoutubeService.isCancelled || err.signal === 'SIGTERM' || err.signal === 'SIGKILL' || err.isCanceled) {
                    reject(new Error('Téléchargement annulé par l\'utilisateur'));
                } else {
                    reject(err);
                }
            });
        });
    }

    static cancelDownload() {
        console.log('[YoutubeService] Cancel requested');
        if (YoutubeService.activeProcess) {
            YoutubeService.isCancelled = true;
            
            // Immediately reject the promise to update UI
            if (YoutubeService.cancelCallback) {
                YoutubeService.cancelCallback(new Error('Téléchargement annulé par l\'utilisateur'));
                YoutubeService.cancelCallback = null;
            }

            const pid = YoutubeService.activeProcess.pid;
            console.log('[YoutubeService] Active process found, PID:', pid);
            
            if (process.platform === 'win32' && pid) {
                try {
                    console.log('[YoutubeService] Attempting taskkill on PID:', pid);
                    // Use taskkill to kill the process tree
                    require('child_process').execSync(`taskkill /pid ${pid} /f /t`);
                    console.log('[YoutubeService] Taskkill successful');
                } catch (e: any) {
                    console.error('[YoutubeService] Error killing process with taskkill:', e.message);
                }
            }
            
            // Still call kill() as a fallback and to ensure the object state is updated
            try {
                YoutubeService.activeProcess.kill('SIGKILL');
            } catch (e: any) {
                console.log('[YoutubeService] Error calling .kill():', e.message);
            }
            
            YoutubeService.activeProcess = null;
            return true;
        }
        console.log('[YoutubeService] No active process to cancel');
        return false;
    }

    static openDownloadsFolder() {
        return shell.openPath(app.getPath('downloads'));
    }
}
