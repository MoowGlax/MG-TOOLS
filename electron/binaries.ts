import path from 'path';
import fs from 'fs-extra';
import fetch from 'node-fetch';
import { app } from 'electron';
import { chmod } from 'fs/promises';
import ffbinaries from 'ffbinaries';
import execa from 'execa';

const BIN_DIR = path.join(app.getPath('userData'), 'bin');
const IS_WIN = process.platform === 'win32';

const YTDLP_NAME = IS_WIN ? 'yt-dlp.exe' : 'yt-dlp';
const FFMPEG_NAME = IS_WIN ? 'ffmpeg.exe' : 'ffmpeg';

const YTDLP_URL = IS_WIN 
    ? 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe'
    : 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos';

const removeQuarantine = async (targetPath: string) => {
    if (process.platform !== 'darwin') return;
    try {
        await execa('xattr', ['-dr', 'com.apple.quarantine', targetPath]);
    } catch {}
};

const findFileRecursive = async (dir: string, fileName: string): Promise<string | null> => {
    try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isFile() && entry.name === fileName) return fullPath;
            if (entry.isDirectory()) {
                const found = await findFileRecursive(fullPath, fileName);
                if (found) return found;
            }
        }
        return null;
    } catch {
        return null;
    }
};

export class BinariesManager {
    static getPaths() {
        const binDir = path.join(app.getPath('userData'), 'bin');
        return {
            ytdlp: path.join(binDir, YTDLP_NAME),
            ffmpeg: path.join(binDir, FFMPEG_NAME),
            dir: binDir
        };
    }

    static async ensureBinaries(onProgress: (status: string) => void) {
        const paths = this.getPaths();
        console.log('[BinariesManager] Target Binaries Directory:', paths.dir);
        await fs.ensureDir(paths.dir);

        // 1. Check yt-dlp
        if (!fs.existsSync(paths.ytdlp)) {
            onProgress('Téléchargement de yt-dlp...');
            await this.downloadFile(YTDLP_URL, paths.ytdlp);
            if (!IS_WIN) await chmod(paths.ytdlp, 0o755);
            await removeQuarantine(paths.ytdlp);
        }

        // 2. Check ffmpeg
        if (!fs.existsSync(paths.ffmpeg)) {
            onProgress('Téléchargement de ffmpeg...');
            await new Promise<void>((resolve, reject) => {
                ffbinaries.downloadBinaries(['ffmpeg'], { destination: paths.dir, quiet: true }, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
            if (!fs.existsSync(paths.ffmpeg)) {
                const found = await findFileRecursive(paths.dir, FFMPEG_NAME);
                if (found) {
                    await fs.copyFile(found, paths.ffmpeg);
                }
            }
            if (!IS_WIN && fs.existsSync(paths.ffmpeg)) await chmod(paths.ffmpeg, 0o755);
            await removeQuarantine(paths.dir);
            if (fs.existsSync(paths.ffmpeg)) await removeQuarantine(paths.ffmpeg);
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
