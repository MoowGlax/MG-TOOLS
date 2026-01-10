import React, { useState, useEffect } from 'react';
import { Youtube, Search, Download, Music, Video, FolderOpen, Loader2, ListVideo, Settings2, X, BarChart3, HardDrive, Clock, History, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useDownload } from '../contexts/DownloadContext';
import { DownloadManagerService, type DownloadItem } from '../components/DownloadManager';

interface VideoInfo {
  title: string;
  thumbnail: string;
  duration: string;
  author: string;
  isPlaylist?: boolean;
  playlistCount?: number;
}

export default function YoutubeToMP3() {
  const { startDownload } = useDownload();
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [localVideoInfo, setLocalVideoInfo] = useState<VideoInfo | null>(null);
  const [binaryStatus, setBinaryStatus] = useState<string | null>('Vérification des composants...');
  const [showHistory, setShowHistory] = useState(false);
  const [stats, setStats] = useState({ total: 0, completed: 0 });

  // Options
  const [format, setFormat] = useState<'mp3' | 'mp4'>('mp3');
  const [quality, setQuality] = useState('best');

  useEffect(() => {
    // Check binaries on mount
    const check = async () => {
        try {
            const cleanup = window.electronAPI.youtube.onBinaryProgress((status) => {
                setBinaryStatus(status);
            });
            
            await window.electronAPI.youtube.checkBinaries();
            const path = await window.electronAPI.youtube.getBinariesPath();
            console.log('Binaries path:', path);
            setBinaryStatus(null);
            cleanup();
        } catch (error) {
            console.error(error);
            setBinaryStatus('Erreur lors du chargement des composants.');
            toast.error("Impossible de charger les composants nécessaires.");
        }
    };
    check();

    // Stats subscription
    const updateStats = () => {
        setStats(DownloadManagerService.getStats());
    };
    updateStats();
    const unsubscribe = DownloadManagerService.subscribeToHistory(() => updateStats());
    return unsubscribe;
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsLoading(true);
    setLocalVideoInfo(null);
    
    try {
        const info = await window.electronAPI.youtube.getInfo(url);
        setLocalVideoInfo(info);
    } catch (error: any) {
        console.error(error);
        toast.error("Impossible de récupérer les infos de la vidéo.");
    } finally {
        setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!localVideoInfo) return;
    
    // Start download
    await startDownload(url, { format, quality }, localVideoInfo);
    
    // Reset UI immediately as requested
    setLocalVideoInfo(null);
    setUrl('');
  };

  const openFolder = () => {
      window.electronAPI.youtube.openDownloads().catch(console.error);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 relative">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
            <div className="p-3 bg-red-500/10 rounded-xl">
            <Youtube className="w-8 h-8 text-red-500" />
            </div>
            <div>
            <h1 className="text-3xl font-bold text-white">YouTube Downloader</h1>
            <p className="text-gray-400">MP3, MP4 et Playlists</p>
            {binaryStatus && (
                <div className="flex items-center gap-2 mt-2 text-sm text-yellow-500 animate-pulse">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {binaryStatus}
                </div>
            )}
            </div>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={() => setShowHistory(true)}
                className="p-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl transition-colors flex items-center gap-2 border border-gray-700"
                title="Historique"
            >
                <History className="w-5 h-5" />
                <span className="hidden sm:inline">Historique</span>
            </button>
            <button 
                onClick={openFolder}
                className="p-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl transition-colors flex items-center gap-2 border border-gray-700"
                title="Ouvrir le dossier de téléchargement"
            >
                <FolderOpen className="w-5 h-5" />
                <span className="hidden sm:inline">Dossier</span>
            </button>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-800/50 flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-lg">
                <BarChart3 className="w-6 h-6 text-blue-500" />
            </div>
            <div>
                <p className="text-sm text-gray-400">Total Téléchargé</p>
                <p className="text-xl font-bold text-white">{stats.completed}</p>
            </div>
        </div>
        <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-800/50 flex items-center gap-4">
            <div className="p-3 bg-purple-500/10 rounded-lg">
                <HardDrive className="w-6 h-6 text-purple-500" />
            </div>
            <div>
                <p className="text-sm text-gray-400">Qualité</p>
                <p className="text-xl font-bold text-white">Max (320k)</p>
            </div>
        </div>
        <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-800/50 flex items-center gap-4">
            <div className="p-3 bg-green-500/10 rounded-lg">
                <Clock className="w-6 h-6 text-green-500" />
            </div>
            <div>
                <p className="text-sm text-gray-400">Historique</p>
                <p className="text-xl font-bold text-white">{stats.total} items</p>
            </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-gray-900/50 p-6 rounded-2xl border border-gray-800 shadow-xl backdrop-blur-sm">
        <form onSubmit={handleSearch} className="relative flex gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-500" />
            </div>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="block w-full pl-11 pr-4 py-4 bg-gray-950 border border-gray-800 rounded-xl text-gray-100 placeholder-gray-500 focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 focus:outline-none transition-all"
              placeholder="Collez un lien YouTube (Vidéo ou Playlist)..."
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !url || !!binaryStatus}
            className="px-8 py-4 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors flex items-center gap-2 min-w-[140px] justify-center shadow-lg shadow-red-900/20"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Rechercher'}
          </button>
        </form>
      </div>

      {/* Video Preview & Options */}
      {localVideoInfo && (
        <div className="bg-gray-800/40 rounded-2xl border border-gray-700/50 overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col md:flex-row">
            {/* Thumbnail */}
            <div className="md:w-80 h-56 relative group bg-black/50 flex-shrink-0">
              {localVideoInfo.thumbnail ? (
                  <img 
                    src={localVideoInfo.thumbnail} 
                    alt={localVideoInfo.title} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
              ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600">
                      <Music className="w-16 h-16" />
                  </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                <span className="text-white text-sm font-medium bg-red-600 px-2 py-1 rounded">
                    {localVideoInfo.duration}
                </span>
              </div>
              {localVideoInfo.isPlaylist && (
                  <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2 border border-white/10">
                      <ListVideo className="w-3 h-3" />
                      Playlist ({localVideoInfo.playlistCount})
                  </div>
              )}
            </div>

            {/* Info & Controls */}
            <div className="p-6 flex flex-col justify-between flex-1 gap-6">
              <div>
                <h2 className="text-2xl font-bold text-white line-clamp-2 mb-2 leading-tight">
                  {localVideoInfo.title}
                </h2>
                <p className="text-gray-400 font-medium flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs">
                    {localVideoInfo.author.substring(0, 2).toUpperCase()}
                  </span>
                  {localVideoInfo.author}
                </p>
              </div>

              <div className="space-y-6">
                  {/* Options */}
                  <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                          <label className="text-xs text-gray-500 font-medium uppercase tracking-wider flex items-center gap-1">
                              <Settings2 className="w-3 h-3" /> Format
                          </label>
                          <div className="flex bg-gray-900/50 p-1 rounded-lg border border-gray-700/50">
                              <button 
                                  onClick={() => setFormat('mp3')}
                                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${format === 'mp3' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                              >
                                  <Music className="w-4 h-4" /> MP3
                              </button>
                              <button 
                                  onClick={() => setFormat('mp4')}
                                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${format === 'mp4' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                              >
                                  <Video className="w-4 h-4" /> MP4
                              </button>
                          </div>
                      </div>

                      <div className="space-y-2">
                          <label className="text-xs text-gray-500 font-medium uppercase tracking-wider flex items-center gap-1">
                              Qualité
                          </label>
                          <select 
                              value={quality}
                              onChange={(e) => setQuality(e.target.value)}
                              className="w-full bg-gray-900/50 border border-gray-700/50 text-gray-200 text-sm rounded-lg focus:ring-red-500 focus:border-red-500 block p-2.5 outline-none"
                          >
                              <option value="best">Meilleure (320k / HD)</option>
                              <option value="high">Haute (192k / 720p)</option>
                              <option value="medium">Moyenne (128k / 480p)</option>
                              <option value="low">Basse (64k / 360p)</option>
                          </select>
                      </div>
                  </div>

                  {/* Download Button */}
                  <button
                      onClick={handleDownload}
                      className="w-full py-4 bg-white hover:bg-gray-50 text-gray-900 font-bold rounded-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl hover:shadow-2xl active:scale-[0.99]"
                  >
                      <Download className="w-5 h-5" />
                      <span>Télécharger {localVideoInfo.isPlaylist ? 'la playlist' : 'maintenant'}</span>
                  </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistory && <HistoryModal onClose={() => setShowHistory(false)} />}
    </div>
  );
}

function HistoryModal({ onClose }: { onClose: () => void }) {
    const [history, setHistory] = useState<DownloadItem[]>([]);
    
    useEffect(() => {
        return DownloadManagerService.subscribeToHistory(setHistory);
    }, []);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
             <div className="bg-gray-950 border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
                 <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/50 rounded-t-2xl">
                     <h3 className="text-xl font-bold text-white flex items-center gap-2">
                         <History className="w-5 h-5 text-red-500" /> Historique
                     </h3>
                     <div className="flex gap-2">
                        {/* <button onClick={clearHistory} className="text-xs text-red-400 hover:text-red-300 px-2">Tout effacer</button> */}
                        <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                     </div>
                 </div>
                 <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                     {history.length === 0 ? (
                         <div className="text-center py-10 text-gray-500">
                             <History className="w-12 h-12 mx-auto mb-3 opacity-20" />
                             <p>Aucun historique</p>
                         </div>
                     ) : (
                         history.map((item) => (
                             <div key={item.id} className="bg-gray-900/50 border border-gray-800/50 p-3 rounded-lg flex items-center justify-between hover:bg-gray-800/50 transition-colors group">
                                 <div className="flex items-center gap-3 overflow-hidden">
                                     <div className={`p-2 rounded-full shrink-0 ${
                                         item.status === 'completed' ? 'bg-green-500/10 text-green-500' :
                                         item.status === 'error' ? 'bg-red-500/10 text-red-500' :
                                         'bg-blue-500/10 text-blue-500'
                                     }`}>
                                         {item.status === 'completed' ? <CheckCircle2 className="w-4 h-4" /> :
                                          item.status === 'error' ? <AlertCircle className="w-4 h-4" /> :
                                          <Loader2 className="w-4 h-4 animate-spin" />}
                                     </div>
                                     <div className="flex flex-col min-w-0">
                                         <span className="font-medium text-gray-200 truncate pr-4 text-sm" title={item.filename}>
                                             {item.filename}
                                         </span>
                                         <span className="text-xs text-gray-500">
                                             {item.status === 'completed' ? 'Terminé' :
                                              item.status === 'error' ? (item.error || 'Erreur') :
                                              `${Math.round(item.progress)}%`}
                                         </span>
                                     </div>
                                 </div>
                                 <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {/* Actions could go here */}
                                 </div>
                             </div>
                         ))
                     )}
                 </div>
             </div>
        </div>
    );
}
