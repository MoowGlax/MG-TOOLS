import path from 'path';
import fs from 'fs-extra';
import fetch from 'node-fetch';
import { app } from 'electron';
import { chmod } from 'fs/promises';
import ffbinaries from 'ffbinaries';

const BIN_DIR = path.join(app.getPath('userData'), 'bin');
const IS_WIN = process.platform === 'win32';

const YTDLP_NAME = IS_WIN ? 'yt-dlp.exe' : 'yt-dlp';
const FFMPEG_NAME = IS_WIN ? 'ffmpeg.exe' : 'ffmpeg';

const YTDLP_URL = IS_WIN 
    ? 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe'
    : 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos';

export class BinariesManager {
    static getPaths() {
        return {
            ytdlp: path.join(BIN_DIR, YTDLP_NAME),
            ffmpeg: path.join(BIN_DIR, FFMPEG_NAME)
        };
    }

    static async ensureBinaries(onProgress: (status: string) => void) {
        await fs.ensureDir(BIN_DIR);
        const paths = this.getPaths();

        // 1. Check yt-dlp
        if (!fs.existsSync(paths.ytdlp)) {
            onProgress('Téléchargement de yt-dlp...');
            await this.downloadFile(YTDLP_URL, paths.ytdlp);
            if (!IS_WIN) await chmod(paths.ytdlp, 0o755);
        }

        // 2. Check ffmpeg
        if (!fs.existsSync(paths.ffmpeg)) {
            onProgress('Téléchargement de ffmpeg...');
            await new Promise<void>((resolve, reject) => {
                ffbinaries.downloadBinaries(['ffmpeg'], { destination: BIN_DIR, quiet: true }, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        }
        
        onProgress('Prêt');
        return paths;
    }

    private static async downloadFile(url: string, dest: string) {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to download ${url}: ${res.statusText}`);
        
        const fileStream = fs.createWriteStream(dest);
        return new Promise<void>((resolve, reject) => {
            res.body.pipe(fileStream);
            res.body.on('error', reject);
            fileStream.on('finish', () => resolve());
        });
    }
}
