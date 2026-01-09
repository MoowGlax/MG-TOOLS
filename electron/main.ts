import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, Notification } from 'electron';
import path from 'path';
import { SecurityService } from './security';
import { StorageService } from './storage';
import { BinariesManager } from './binaries';
import { YoutubeService } from './youtube';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';

// Configure logging
log.transports.file.level = 'info';
autoUpdater.logger = log;

// Set App ID for Windows Notifications
app.setAppUserModelId('MG Tools');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow: BrowserWindow | null;
let splashWindow: BrowserWindow | null;
let tray: Tray | null = null;
let isQuitting = false;

const getIconPath = () => {
    const isDev = !!process.env.VITE_DEV_SERVER_URL;
    if (process.platform === 'win32') {
        return path.join(__dirname, isDev ? '../public/icon.ico' : '../dist/icon.ico');
    }
    // For macOS and Linux, use png
    return path.join(__dirname, isDev ? '../public/logo.png' : '../dist/logo.png');
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
      splashWindow.loadFile(path.join(__dirname, '../public/splash.html'));
  } else {
      splashWindow.loadFile(path.join(__dirname, '../dist/splash.html'));
  }

  // Create Main Window (Hidden)
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false, // Hide initially
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
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
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
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
  createWindow();
  createTray();

  // IPC handlers
  ipcMain.handle('ping', () => 'pong');

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
  ipcMain.handle('check-for-updates', () => {
    return autoUpdater.checkForUpdates();
  });

  ipcMain.handle('quit-and-install', () => {
    autoUpdater.quitAndInstall();
  });

  // Auto-updater events
  autoUpdater.on('checking-for-update', () => {
    mainWindow?.webContents.send('update-status', 'checking');
  });
  autoUpdater.on('update-available', (info) => {
    mainWindow?.webContents.send('update-status', 'available');
  });
  autoUpdater.on('update-not-available', (info) => {
    mainWindow?.webContents.send('update-status', 'not-available');
  });
  autoUpdater.on('error', (err) => {
    mainWindow?.webContents.send('update-status', 'error', err.message);
  });
  autoUpdater.on('download-progress', (progressObj) => {
    mainWindow?.webContents.send('update-download-progress', progressObj.percent);
  });
  autoUpdater.on('update-downloaded', (info) => {
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

ipcMain.handle('youtube:get-info', async (_, url) => {
    return YoutubeService.getVideoInfo(url);
});

ipcMain.handle('youtube:download', async (event, url, options) => {
    try {
        await YoutubeService.downloadMedia(url, options, (percent) => {
            event.sender.send('youtube:download-progress', percent);
        });
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

ipcMain.handle('youtube:cancel', async () => {
    return YoutubeService.cancelDownload();
});

ipcMain.handle('app:notify', async (_event, title, body) => {
    // Icon relative to the executable in dist/win-unpacked/ or dev
    const iconPath = path.join(__dirname, process.env.VITE_DEV_SERVER_URL ? '../public/icon.ico' : '../dist/icon.ico');
    new Notification({ title, body, icon: iconPath }).show();
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
