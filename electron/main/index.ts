import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, Notification, shell, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { SecurityService } from '../services/security';
import { StorageService } from '../services/storage';
import { BinariesManager } from '../services/binaries';
import { YoutubeService } from '../services/youtube';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';

// Configure logging
log.transports.file.level = 'info';
autoUpdater.logger = log;
autoUpdater.disableWebInstaller = false;
autoUpdater.autoDownload = true;
autoUpdater.allowPrerelease = true;

// Force dev update config if in development
if (process.env.VITE_DEV_SERVER_URL) {
    autoUpdater.forceDevUpdateConfig = true;
}

// Set App ID for Windows Notifications
app.setAppUserModelId('MG Tools');

let mainWindow: BrowserWindow | null;
let splashWindow: BrowserWindow | null;
let tray: Tray | null = null;
let isQuitting = false;

const getIconPath = () => {
    const isDev = !!process.env.VITE_DEV_SERVER_URL;
    if (process.platform === 'win32') {
        return path.join(__dirname, isDev ? '../../public/icon.ico' : '../../dist/icon.ico');
    }
    // For macOS and Linux, use png
    return path.join(__dirname, isDev ? '../../public/logo.png' : '../../dist/logo.png');
};

const createTray = () => {
    const iconPath = getIconPath();
    try {
        const icon = nativeImage.createFromPath(iconPath);
        // Resize for macOS tray (usually 16x16 or 22x22) if the image is large
        if (process.platform === 'darwin') {
            icon.resize({ width: 16, height: 16 });
        }
        tray = new Tray(icon);
    } catch (error) {
        console.error('Failed to create tray icon:', error);
        return;
    }
    
    const contextMenu = Menu.buildFromTemplate([
        { label: 'Ouvrir MG Tools', click: () => mainWindow?.show() },
        { type: 'separator' },
        { label: 'Quitter', click: () => {
            isQuitting = true;
            app.quit();
        }}
    ]);
    tray.setToolTip('MG Tools');
    tray.setContextMenu(contextMenu);
    
    tray.on('click', () => {
        if (mainWindow?.isVisible()) {
            mainWindow.hide();
        } else {
            mainWindow?.show();
            mainWindow?.focus();
        }
    });
};

const createWindow = () => {
  const iconPath = getIconPath();
  
  // Create Splash Window
  splashWindow = new BrowserWindow({
    width: 400,
    height: 400,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    icon: iconPath,
    center: true,
    resizable: false,
    webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
    }
  });

  if (process.env.VITE_DEV_SERVER_URL) {
      splashWindow.loadFile(path.join(__dirname, '../../public/splash.html'));
  } else {
      splashWindow.loadFile(path.join(__dirname, '../../dist/splash.html'));
  }

  // Create Main Window (Hidden)
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false, // Hide initially
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#00000000',
      symbolColor: '#74b1be',
      height: 30
    }
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  // Show main window when ready and close splash
  mainWindow.once('ready-to-show', () => {
      // Small delay to ensure smooth transition
      setTimeout(() => {
          splashWindow?.destroy();
          mainWindow?.show();
          mainWindow?.focus();
      }, 3000);
  });

  // Handle Close to Tray
  mainWindow.on('close', (event) => {
      if (!isQuitting) {
          event.preventDefault();
          mainWindow?.hide();
          return false;
      }
      return true;
  });
};

app.on('before-quit', () => {
    isQuitting = true;
});

app.on('ready', () => {
  console.log('[Main] UserData Path:', app.getPath('userData'));
  createWindow();
  createTray();

  // Check for updates on startup
  setTimeout(() => {
    autoUpdater.checkForUpdates();
  }, 3000);

  // Check for updates every 24 hours
  setInterval(() => {
      autoUpdater.checkForUpdates();
  }, 24 * 60 * 60 * 1000);

  // IPC handlers
  ipcMain.handle('ping', () => 'pong');

  ipcMain.handle('get-app-version', () => app.getVersion());

  ipcMain.handle('save-credentials', async (_event, key: string, value: string) => {
    return SecurityService.saveCredentials(key, value);
  });

  ipcMain.handle('get-credentials', async (_event, key: string) => {
    return SecurityService.getCredentials(key);
  });

  // Storage Handlers
  ipcMain.handle('save-data', async (_event, key: string, value: any) => {
    return StorageService.saveData(key, value);
  });

  ipcMain.handle('get-data', async (_event, key: string) => {
    return StorageService.getData(key);
  });

  // Update Handlers
  ipcMain.handle('check-for-updates', async () => {
    try {
        const result = await autoUpdater.checkForUpdates();
        // Return only serializable data
        return result?.updateInfo;
    } catch (error: any) {
        log.error('Error checking for updates:', error);
        throw error;
    }
  });

  ipcMain.handle('quit-and-install', () => {
    autoUpdater.quitAndInstall();
  });

  // Auto-updater events
  autoUpdater.on('checking-for-update', () => {
    log.info('Checking for update...');
    mainWindow?.webContents.send('update-status', 'checking');
  });
  autoUpdater.on('update-available', (info) => {
    log.info('Update available:', info);
    mainWindow?.webContents.send('update-status', 'available');
  });
  autoUpdater.on('update-not-available', (info) => {
    log.info('Update not available:', info);
    mainWindow?.webContents.send('update-status', 'not-available');
  });
  autoUpdater.on('error', (err) => {
    log.error('Error in auto-updater:', err);
    mainWindow?.webContents.send('update-status', 'error', err.message);
  });
  autoUpdater.on('download-progress', (progressObj) => {
    mainWindow?.webContents.send('update-progress', progressObj.percent);
  });
  autoUpdater.on('update-downloaded', (info) => {
    log.info('Update downloaded:', info);
    mainWindow?.webContents.send('update-status', 'downloaded');
  });

  ipcMain.handle('proxy-request', async (_event, url: string, options: RequestInit) => {
    try {
      const response = await fetch(url, options);
      const data = await response.json();
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => { headers[key] = value; });
      
      return { 
        ok: response.ok, 
        status: response.status, 
        data,
        headers
      };
    } catch (error: any) {
      return { ok: false, status: 500, error: error.message };
    }
  });
});

// Youtube IPC Handlers
ipcMain.handle('youtube:check-binaries', async (event) => {
    return BinariesManager.ensureBinaries((status) => {
        event.sender.send('youtube:binary-progress', status);
    });
});

ipcMain.handle('youtube:get-binaries-path', () => {
    return path.join(app.getPath('userData'), 'bin');
});

ipcMain.handle('youtube:get-info', async (_, url) => {
    return YoutubeService.getVideoInfo(url);
});

ipcMain.handle('youtube:download', async (event, url, options, id?: string) => {
    try {
        await YoutubeService.downloadMedia(url, options, (data) => {
            // Keep existing event for specific UI (if needed)
            event.sender.send('youtube:download-progress', data);

            // Send generic event for DownloadManager if ID is provided
            if (id) {
                event.sender.send('download-progress', {
                    id,
                    progress: data.percent,
                    total: data.total, // This might be item count, not bytes, for playlists. 
                    // YoutubeService sends { percent, current, total, eta }
                    // DownloadManager expects { id, progress, total?, downloaded? }
                    // Since we don't always have bytes total from yt-dlp output in this service (it parses text),
                    // we stick to percentage.
                    downloaded: undefined 
                });
            }
        });
        
        // If successful, update status to completed in DownloadManager
        if (id) {
             event.sender.send('download-progress', {
                id,
                progress: 100,
                status: 'completed' // Wait, DownloadManager handles status based on progress? 
                // No, DownloadManager updates props. It doesn't infer status 'completed' automatically unless progress is 100?
                // Actually DownloadManagerService.update just merges data.
                // But the component displays 'completed' if status is 'completed'.
                // The generic listener in DownloadManager sets status to 'downloading'.
                // So we might need to send a final update or let the frontend handle completion.
            });
        }

        return { success: true };
    } catch (error: any) {
        // Return error object instead of throwing to avoid Electron error logging for cancellations
        return { 
            success: false, 
            error: error.message, 
            isCancelled: error.message.includes('annulé') 
        };
    }
});

ipcMain.handle('youtube:open-downloads', async () => {
    return YoutubeService.openDownloadsFolder();
});

ipcMain.handle('youtube:cancel', async (_, id?: string) => {
    return YoutubeService.cancelDownload(id);
});

ipcMain.handle('app:notify', async (_event, title, body) => {
    // Icon relative to the executable in dist/win-unpacked/ or dev
    const iconPath = path.join(__dirname, process.env.VITE_DEV_SERVER_URL ? '../public/icon.ico' : '../dist/icon.ico');
    new Notification({ title, body, icon: iconPath }).show();
});

ipcMain.handle('open-external', async (_event, url: string) => {
    await shell.openExternal(url);
});

ipcMain.handle('download-file', async (_event, url: string, fileName: string, id: string, options?: any) => {
        try {
            const downloadPath = path.join(app.getPath('downloads'), fileName);
            const win = BrowserWindow.getAllWindows()[0];
            
            const response = await fetch(url, options);
            if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
            
            const total = Number(response.headers.get('content-length')) || 0;
            let downloaded = 0;

            if (!response.body) throw new Error('No response body');

            const fileStream = fs.createWriteStream(downloadPath);
            // @ts-ignore - response.body is a ReadableStream in global fetch
            const reader = response.body.getReader();

            const pump = async () => {
                let lastUpdate = 0;
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    downloaded += value.length;
                    fileStream.write(Buffer.from(value));
                    
                    const now = Date.now();
                    if (now - lastUpdate > 100 || downloaded === total) {
                        win.webContents.send('download-progress', {
                            id,
                            progress: total ? (downloaded / total) * 100 : 0,
                            total,
                            downloaded
                        });
                        lastUpdate = now;
                    }
                }
                fileStream.end();
            };

            await pump();
            
            // Show file in folder
            // shell.showItemInFolder(downloadPath); // Optional: maybe too annoying if many files
            
            return { success: true, path: downloadPath };
        } catch (error: any) {
            console.error('Download error:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('copy-local-file', async (_event, sourcePath: string, fileName: string, id: string) => {
        try {
            const destPath = path.join(app.getPath('downloads'), fileName);
            const win = BrowserWindow.getAllWindows()[0];
            
            const stat = await fs.promises.stat(sourcePath);
            const total = stat.size;
            let copied = 0;

            const readStream = fs.createReadStream(sourcePath);
            const writeStream = fs.createWriteStream(destPath);
            let lastUpdate = 0;

            readStream.on('data', (chunk) => {
                copied += chunk.length;
                const now = Date.now();
                if (now - lastUpdate > 100 || copied === total) {
                    win.webContents.send('download-progress', {
                        id,
                        progress: (copied / total) * 100,
                        total,
                        downloaded: copied
                    });
                    lastUpdate = now;
                }
            });

            await new Promise((resolve, reject) => {
                readStream.pipe(writeStream);
                writeStream.on('finish', () => resolve(undefined));
                readStream.on('error', reject);
                writeStream.on('error', reject);
            });

            return { success: true, path: destPath };
        } catch (error: any) {
            console.error('Copy file error:', error);
            return { success: false, error: error.message };
        }
    });

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // On Windows/Linux, we might want to keep it running in tray, 
    // but typically window-all-closed happens when we actually close windows.
    // Since we prevent close in 'close' event, this might not be reached easily unless explicit quit.
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  } else {
    mainWindow?.show();
  }
});
