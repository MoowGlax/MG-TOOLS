import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Upload, Play, Pause, Trash2, Plus, AlertCircle, HardDrive, File, X } from 'lucide-react';
import { DelugeService } from '../services/deluge';
import type { DelugeTorrent } from '../services/deluge';

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function formatSpeed(bytesPerSec: number) {
  return `${formatBytes(bytesPerSec)}/s`;
}

function formatDuration(seconds: number) {
  if (seconds === 0) return '-';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function Deluge() {
  const navigate = useNavigate();
  const [torrents, setTorrents] = useState<DelugeTorrent[]>([]);
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [newMagnet, setNewMagnet] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkConfig = async () => {
      const configured = await window.electronAPI.getCredentials('deluge_configured');
      if (!configured) {
        setIsConfigured(false);
        setTimeout(() => {
          navigate('/settings', { state: { section: 'deluge' } });
        }, 2000);
      } else {
        setIsConfigured(true);
        // Initial load
        loadTorrents();
      }
    };
    checkConfig();
  }, [navigate]);

  useEffect(() => {
    if (!isConfigured) return;
    const interval = setInterval(loadTorrents, 2000);
    return () => clearInterval(interval);
  }, [isConfigured]);

  const loadTorrents = async () => {
    const data = await DelugeService.getTorrents();
    setTorrents(data);
  };

  const handleAction = async (action: 'pause' | 'resume' | 'remove', id: string) => {
    if (action === 'pause') await DelugeService.pauseTorrent(id);
    if (action === 'resume') await DelugeService.resumeTorrent(id);
    if (action === 'remove') {
      if (confirm('Voulez-vous vraiment supprimer ce torrent ?')) {
        await DelugeService.removeTorrent(id);
      }
    }
    loadTorrents();
  };

  const handleRemoveCompleted = async () => {
    if (confirm('Voulez-vous supprimer tous les torrents terminés (100%) ?')) {
      const completedTorrents = torrents.filter(t => t.progress === 100);
      for (const t of completedTorrents) {
        await DelugeService.removeTorrent(t.id);
      }
      loadTorrents();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      const droppedFiles = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.torrent'));
      setFiles(prev => [...prev, ...droppedFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddTorrent = async () => {
    let added = false;

    // Add magnet if present
    if (newMagnet) {
      await DelugeService.addMagnet(newMagnet);
      setNewMagnet('');
      added = true;
    }

    // Add files if present
    if (files.length > 0) {
      for (const file of files) {
        try {
          const reader = new FileReader();
          reader.onload = async () => {
             const base64 = (reader.result as string).split(',')[1];
             await DelugeService.addTorrentFile(file.name, base64);
          };
          reader.readAsDataURL(file);
        } catch (err) {
          console.error('Error reading file', file.name, err);
        }
      }
      setFiles([]);
      added = true;
    }

    if (added) {
      setShowAddModal(false);
      // Wait a bit for server to process
      setTimeout(loadTorrents, 500);
    }
  };

  if (isConfigured === false) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="mx-auto h-12 w-12 text-yellow-500" />
          <div>
            <h2 className="text-lg font-semibold">Module non configuré</h2>
            <p className="text-muted-foreground">Redirection vers les paramètres...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isConfigured === null) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
            <Download className="h-6 w-6" />
            Deluge
        </h1>
        <div className="flex gap-2">
            <button
            onClick={handleRemoveCompleted}
            className="flex items-center gap-2 rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
            title="Supprimer les torrents terminés"
            >
            <Trash2 className="h-4 w-4" /> Tout nettoyer
            </button>
            <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
            <Plus className="h-4 w-4" /> Ajouter
            </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Download className="h-4 w-4" /> Download
            </div>
            <div className="text-2xl font-bold">
                {formatSpeed(torrents.reduce((acc, t) => acc + t.download_payload_rate, 0))}
            </div>
        </div>
        <div className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Upload className="h-4 w-4" /> Upload
            </div>
            <div className="text-2xl font-bold">
                {formatSpeed(torrents.reduce((acc, t) => acc + t.upload_payload_rate, 0))}
            </div>
        </div>
        <div className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Play className="h-4 w-4" /> Actifs
            </div>
            <div className="text-2xl font-bold">
                {torrents.filter(t => t.state === 'Downloading' || t.state === 'Seeding').length}
            </div>
        </div>
        <div className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <HardDrive className="h-4 w-4" /> Total Size
            </div>
            <div className="text-2xl font-bold">
                {formatBytes(torrents.reduce((acc, t) => acc + t.total_size, 0))}
            </div>
        </div>
      </div>

      {/* Torrents List */}
      <div className="flex-1 rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase font-medium text-muted-foreground sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left">Nom</th>
                  <th className="px-4 py-3 text-left">Taille</th>
                  <th className="px-4 py-3 text-left">Progression</th>
                  <th className="px-4 py-3 text-left">Vitesse DL</th>
                  <th className="px-4 py-3 text-left">Vitesse UL</th>
                  <th className="px-4 py-3 text-left">ETA</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {torrents.map((torrent) => (
                  <tr key={torrent.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 font-medium">
                        <div className="truncate max-w-[200px] md:max-w-[300px]" title={torrent.name}>
                            {torrent.name}
                        </div>
                        <div className="text-xs text-muted-foreground">{torrent.state}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatBytes(torrent.total_size)}</td>
                    <td className="px-4 py-3">
                        <div className="flex items-center gap-2 w-32">
                            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-primary transition-all duration-500" 
                                    style={{ width: `${torrent.progress}%` }}
                                />
                            </div>
                            <span className="text-xs w-10 text-right">{torrent.progress.toFixed(1)}%</span>
                        </div>
                    </td>
                    <td className="px-4 py-3 text-green-600 dark:text-green-400 font-mono">
                        {torrent.download_payload_rate > 0 ? formatSpeed(torrent.download_payload_rate) : '-'}
                    </td>
                    <td className="px-4 py-3 text-blue-600 dark:text-blue-400 font-mono">
                        {torrent.upload_payload_rate > 0 ? formatSpeed(torrent.upload_payload_rate) : '-'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                        {formatDuration(torrent.eta)}
                    </td>
                    <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                            {torrent.state === 'Paused' ? (
                                <button 
                                    onClick={() => handleAction('resume', torrent.id)}
                                    className="p-1 hover:bg-muted rounded text-green-500" title="Reprendre"
                                >
                                    <Play className="h-4 w-4" />
                                </button>
                            ) : (
                                <button 
                                    onClick={() => handleAction('pause', torrent.id)}
                                    className="p-1 hover:bg-muted rounded text-yellow-500" title="Pause"
                                >
                                    <Pause className="h-4 w-4" />
                                </button>
                            )}
                            <button 
                                onClick={() => handleAction('remove', torrent.id)}
                                className="p-1 hover:bg-muted rounded text-destructive" title="Supprimer"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    </td>
                  </tr>
                ))}
                {torrents.length === 0 && (
                    <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                            Aucun torrent actif
                        </td>
                    </tr>
                )}
              </tbody>
            </table>
          </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-lg border bg-background p-6 shadow-lg">
            <h2 className="mb-4 text-xl font-bold">Ajouter des torrents</h2>
            
            <div className="space-y-4">
              {/* Magnet Link Input */}
              <div>
                <label className="text-sm font-medium">Lien Magnet</label>
                <input
                  type="text"
                  value={newMagnet}
                  onChange={(e) => setNewMagnet(e.target.value)}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="magnet:?xt=urn:btih:..."
                />
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">OU</span>
                </div>
              </div>

              {/* File Drop Zone */}
              <div 
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    isDragging ? 'border-primary bg-primary/10' : 'border-muted-foreground/25 hover:border-primary/50'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                    type="file" 
                    ref={fileInputRef}
                    className="hidden" 
                    multiple 
                    accept=".torrent"
                    onChange={handleFileChange}
                />
                <div className="flex flex-col items-center gap-2">
                    <File className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm font-medium">Glissez vos fichiers .torrent ici</p>
                    <p className="text-xs text-muted-foreground">ou cliquez pour parcourir</p>
                </div>
              </div>

              {/* Selected Files List */}
              {files.length > 0 && (
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                      {files.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm">
                              <div className="flex items-center gap-2 truncate">
                                  <File className="h-4 w-4 text-primary" />
                                  <span className="truncate">{file.name}</span>
                              </div>
                              <button 
                                onClick={() => removeFile(index)}
                                className="text-muted-foreground hover:text-destructive"
                              >
                                  <X className="h-4 w-4" />
                              </button>
                          </div>
                      ))}
                  </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => {
                    setShowAddModal(false);
                    setNewMagnet('');
                    setFiles([]);
                }}
                className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Annuler
              </button>
              <button
                onClick={handleAddTorrent}
                disabled={!newMagnet && files.length === 0}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
