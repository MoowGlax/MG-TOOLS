import { app, shell } from 'electron';
import path from 'path';
import { spawn, execFile } from 'child_process';
import { promisify } from 'util';
import { BinariesManager } from './binaries';
import fs from 'fs-extra';

const execFileAsync = promisify(execFile);

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
    // Map to store active processes: downloadId -> { process, rejectPromise }
    private static processes = new Map<string, { process: any, reject: (err: Error) => void }>();

    static async getVideoInfo(url: string) {
        const paths = BinariesManager.getPaths();
        
        try {
            // First check if it's a playlist using flat-playlist for speed
            // Note: simple check, but yt-dlp handles it better
            const isPlaylist = url.includes('list=');
            
            if (isPlaylist) {
                 const { stdout } = await execFileAsync(paths.ytdlp, [
                    '--quiet',
                    '--no-warnings',
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
                const { stdout } = await execFileAsync(paths.ytdlp, [
                    '--quiet',
                    '--no-warnings',
                    '--dump-single-json',
                    '--no-playlist',
                    url
                ]);
                const jsonText = stdout.trim().split('\n').slice(-1)[0] ?? '';
                const data = JSON.parse(jsonText);
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

    static async downloadMedia(url: string, options: DownloadOptions, onProgress: (data: ProgressData) => void, id?: string) {
        const paths = BinariesManager.getPaths();
        const downloadDir = app.getPath('downloads');
        
        // Output template
        // For playlists, we want to ensure unique filenames if possible or rely on title
        // %(playlist_index)s is useful for ordering
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
            const subprocess = spawn(paths.ytdlp, args);
            
            // Store process if ID is provided
            if (id) {
                YoutubeService.processes.set(id, { process: subprocess, reject });
            }
            
            console.log(`[YoutubeService] Started process for ${id || 'unknown'}, PID:`, subprocess.pid);
            
            let currentItem = 1;
            let totalItems = 1;

            if (subprocess.stdout) {
                subprocess.stdout.on('data', (data: any) => {
                    const text = data.toString();
                    
                    // Check for item progress "Downloading item 1 of 3"
                    // Also support [download] Downloading video 1 of 3
                    const itemMatch = text.match(/Downloading (?:item|video) (\d+) of (\d+)/i);
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

            subprocess.on('close', (code) => {
                if (id) YoutubeService.processes.delete(id);
                
                if (code === 0) {
                    resolve();
                } else {
                    // Check if it was manually cancelled (we reject in cancelDownload)
                    // If we are here, it might be a crash or error
                    reject(new Error(`Process exited with code ${code}`));
                }
            });

            subprocess.on('error', (err) => {
                if (id) YoutubeService.processes.delete(id);
                reject(err);
            });
        });
    }

    static cancelDownload(id?: string) {
        console.log('[YoutubeService] Cancel requested for:', id);
        
        const cancelProcess = (pid: number, reject: (err: Error) => void) => {
                 // Immediately reject the promise to update UI
                reject(new Error('Téléchargement annulé par l\'utilisateur'));

                console.log('[YoutubeService] Killing PID:', pid);
                
                if (process.platform === 'win32') {
                    if (pid) {
                        try {
                            require('child_process').execSync(`taskkill /pid ${pid} /f /t`);
                        } catch (e: any) {
                            console.error('[YoutubeService] Error killing process with taskkill:', e.message);
                        }
                    }
                } else {
                    // macOS / Linux
                    if (pid) {
                        try {
                            // Since we spawned with detached: true, we can kill the process group
                            // by passing negative PID
                            process.kill(-pid, 'SIGKILL');
                        } catch (e: any) {
                            console.error('[YoutubeService] Error killing process group:', e.message);
                            // Fallback to normal kill if group kill fails
                            try {
                                process.kill(pid, 'SIGKILL');
                            } catch (e2) { /* ignore */ }
                            
                            // Last resort: pkill by parent PID
                            try {
                                require('child_process').execSync(`pkill -P ${pid}`);
                            } catch (e3) { /* ignore */ }
                        }
                    }
                }
            };

        if (id) {
            const data = YoutubeService.processes.get(id);
            if (data) {
                YoutubeService.processes.delete(id);
                cancelProcess(data.process.pid, data.reject);
                return true;
            }
        } else {
            // Cancel all
            let count = 0;
            for (const [key, data] of YoutubeService.processes.entries()) {
                YoutubeService.processes.delete(key);
                cancelProcess(data.process.pid, data.reject);
                count++;
            }
            return count > 0;
        }
        
        console.log('[YoutubeService] No active process found to cancel');
        return false;
    }

    static openDownloadsFolder() {
        return shell.openPath(app.getPath('downloads'));
    }
}
