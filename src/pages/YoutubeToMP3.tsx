import React, { useState, useEffect } from 'react';
import { Youtube, Search, Download, Music, Video, FolderOpen, Loader2, ListVideo, Settings2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useDownload } from '../contexts/DownloadContext';

interface VideoInfo {
  title: string;
  thumbnail: string;
  duration: string;
  author: string;
  isPlaylist?: boolean;
  playlistCount?: number;
}

export default function YoutubeToMP3() {
  const { isDownloading, progress: downloadProgress, videoInfo: downloadVideoInfo, startDownload, cancelDownload } = useDownload();
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [localVideoInfo, setLocalVideoInfo] = useState<VideoInfo | null>(null);
  const [binaryStatus, setBinaryStatus] = useState<string | null>('Vérification des composants...');

  // Options
  const [format, setFormat] = useState<'mp3' | 'mp4'>('mp3');
  const [quality, setQuality] = useState('best');

  // Use local video info (search result) or active download info
  const videoInfo = isDownloading && downloadVideoInfo ? (downloadVideoInfo as VideoInfo) : localVideoInfo;

  useEffect(() => {
    // Check binaries on mount
    const check = async () => {
        try {
            const cleanup = window.electronAPI.youtube.onBinaryProgress((status) => {
                setBinaryStatus(status);
            });
            
            await window.electronAPI.youtube.checkBinaries();
            setBinaryStatus(null);
            cleanup();
        } catch (error) {
            console.error(error);
            setBinaryStatus('Erreur lors du chargement des composants.');
            toast.error("Impossible de charger les composants nécessaires.");
        }
    };
    check();
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
    if (!videoInfo) return;
    
    // Check if we are already downloading (although button should be hidden)
    if (isDownloading) return;
    
    await startDownload(url, { format, quality }, videoInfo);
  };

  const openFolder = () => {
      window.electronAPI.youtube.openDownloads().catch(console.error);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      
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
        <button 
            onClick={openFolder}
            className="p-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl transition-colors flex items-center gap-2 border border-gray-700"
            title="Ouvrir le dossier de téléchargement"
        >
            <FolderOpen className="w-5 h-5" />
            <span className="hidden sm:inline">Ouvrir dossier</span>
        </button>
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
      {videoInfo && (
        <div className="bg-gray-800/40 rounded-2xl border border-gray-700/50 overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col md:flex-row">
            {/* Thumbnail */}
            <div className="md:w-80 h-56 relative group bg-black/50 flex-shrink-0">
              {videoInfo.thumbnail ? (
                  <img 
                    src={videoInfo.thumbnail} 
                    alt={videoInfo.title} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
              ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600">
                      <Music className="w-16 h-16" />
                  </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                <span className="text-white text-sm font-medium bg-red-600 px-2 py-1 rounded">
                    {videoInfo.duration}
                </span>
              </div>
              {videoInfo.isPlaylist && (
                  <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2 border border-white/10">
                      <ListVideo className="w-3 h-3" />
                      Playlist ({videoInfo.playlistCount})
                  </div>
              )}
            </div>

            {/* Info & Controls */}
            <div className="p-6 flex flex-col justify-between flex-1 gap-6">
              <div>
                <h2 className="text-2xl font-bold text-white line-clamp-2 mb-2 leading-tight">
                  {videoInfo.title}
                </h2>
                <p className="text-gray-400 font-medium flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs">
                    {videoInfo.author.substring(0, 2).toUpperCase()}
                  </span>
                  {videoInfo.author}
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

                  {/* Download Button & Progress */}
                  <div className="space-y-4">
                    {!isDownloading ? (
                        <button
                            onClick={handleDownload}
                            className="w-full py-4 bg-white hover:bg-gray-50 text-gray-900 font-bold rounded-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl hover:shadow-2xl active:scale-[0.99]"
                        >
                            <Download className="w-5 h-5" />
                            <span>Télécharger {videoInfo.isPlaylist ? 'la playlist' : 'maintenant'}</span>
                        </button>
                    ) : (
                        <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700/50 space-y-3">
                            <div className="flex justify-between items-end text-sm">
                                <div className="flex items-center gap-2 text-white font-medium">
                                    <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                                    <span>
                                        {downloadProgress.total && downloadProgress.total > 1 
                                            ? `Téléchargement de la playlist...`
                                            : 'Téléchargement en cours...'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-red-400 font-bold">
                                        {Math.round(downloadProgress.total && downloadProgress.total > 1 
                                            ? (((downloadProgress.current || 1) - 1) / downloadProgress.total) * 100 + (downloadProgress.percent / downloadProgress.total)
                                            : downloadProgress.percent
                                        )}%
                                    </span>
                                    <button 
                                        onClick={cancelDownload}
                                        className="p-1 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                                        title="Annuler le téléchargement"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Main Progress Bar */}
                            <div className="h-2.5 w-full bg-gray-700 rounded-full overflow-hidden shadow-inner">
                                <div 
                                    className="h-full bg-gradient-to-r from-red-600 to-red-500 transition-all duration-300 ease-out"
                                    style={{ 
                                        width: `${downloadProgress.total && downloadProgress.total > 1 
                                            ? (((downloadProgress.current || 1) - 1) / downloadProgress.total) * 100 + (downloadProgress.percent / downloadProgress.total)
                                            : downloadProgress.percent}%` 
                                    }}
                                />
                            </div>

                            {/* Details Row */}
                            <div className="flex justify-between text-xs text-gray-400 font-medium">
                                <span>
                                    {downloadProgress.total && downloadProgress.total > 1 
                                        ? `Vidéo ${downloadProgress.current} sur ${downloadProgress.total}`
                                        : 'Traitement en cours...'}
                                </span>
                                {downloadProgress.eta && (
                                    <span>Temps restant : <span className="text-gray-300">{downloadProgress.eta}</span></span>
                                )}
                            </div>

                            {/* Playlist Item Progress (Small) */}
                            {downloadProgress.total && downloadProgress.total > 1 && (
                                <div className="space-y-1 mt-2 pt-2 border-t border-gray-700/30">
                                    <div className="flex justify-between text-[10px] text-gray-500 uppercase tracking-wider">
                                        <span>Fichier actuel</span>
                                        <span>{Math.round(downloadProgress.percent)}%</span>
                                    </div>
                                    <div className="h-1 w-full bg-gray-700 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-gray-400 transition-all duration-300 ease-out"
                                            style={{ width: `${downloadProgress.percent}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                  </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Features Grid (visible only when no video selected) */}
      {!videoInfo && !isLoading && (
        <div className="grid md:grid-cols-3 gap-6 pt-8">
          <div className="bg-gray-800/30 p-6 rounded-2xl border border-gray-800 hover:border-red-500/30 transition-colors">
            <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center mb-4">
              <Music className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Haute Qualité Audio</h3>
            <p className="text-gray-400 text-sm">Conversion en MP3 jusqu'à 320kbps pour une expérience d'écoute optimale.</p>
          </div>
          <div className="bg-gray-800/30 p-6 rounded-2xl border border-gray-800 hover:border-red-500/30 transition-colors">
            <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center mb-4">
              <ListVideo className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Support Playlists</h3>
            <p className="text-gray-400 text-sm">Téléchargez des playlists entières en un seul clic.</p>
          </div>
          <div className="bg-gray-800/30 p-6 rounded-2xl border border-gray-800 hover:border-red-500/30 transition-colors">
            <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center mb-4">
              <Video className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">MP3 & MP4</h3>
            <p className="text-gray-400 text-sm">Choisissez entre format audio ou vidéo selon vos besoins.</p>
          </div>
        </div>
      )}
    </div>
  );
}
