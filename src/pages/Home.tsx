import { useState, useEffect } from 'react';
import { Download, Search, Tv, Github, Shield, RefreshCw, GitBranch, ArrowRight, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Release {
  id: number;
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  html_url: string;
}

export function Home() {
  const [releases, setReleases] = useState<Release[]>([]);
  const [isLoadingReleases, setIsLoadingReleases] = useState(true);
  const [updateStatus, setUpdateStatus] = useState<string>('idle');
  const [updateMessage, setUpdateMessage] = useState<string>('');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [appVersion, setAppVersion] = useState<string>('');

  useEffect(() => {
    // Get app version
    if (window.electronAPI) {
        window.electronAPI.getAppVersion().then(setAppVersion).catch(console.error);
    }

    // Fetch releases
    fetch('https://api.github.com/repos/MoowGlax/mg-tools/releases')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setReleases(data.slice(0, 3)); // Keep top 3
        } else {
            setReleases([]);
        }
      })
      .catch(err => console.error('Failed to fetch releases', err))
      .finally(() => setIsLoadingReleases(false));

    // Update listeners
    const cleanupStatus = window.electronAPI.onUpdateStatus((status, msg) => {
        setUpdateStatus(status);
        if (msg) setUpdateMessage(msg);
    });
    
    const cleanupProgress = window.electronAPI.onUpdateProgress((percent) => {
        setDownloadProgress(percent);
    });

    return () => {
        cleanupStatus();
        cleanupProgress();
    };
  }, []);

  const handleCheckUpdate = () => {
      setUpdateStatus('checking');
      window.electronAPI.checkForUpdates().catch(err => {
          console.error("Update check failed:", err);
          setUpdateStatus('error');
      });
  };

  const handleInstall = () => {
      if (window.electronAPI) {
          window.electronAPI.quitAndInstall();
      }
  };

  return (
    <div className="space-y-8 pb-8">
      {/* Header & Welcome */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
            <img src="logo.svg" alt="Logo" className="w-16 h-16 drop-shadow-lg" />
            <div>
                <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">MG Tools</h1>
                    {appVersion && (
                        <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
                            v{appVersion}
                        </span>
                    )}
                </div>
                <p className="text-muted-foreground mt-1">
                    Votre outil centralisé pour la gestion de vos services.
                </p>
            </div>
        </div>
        
        {/* Update Status Badge/Button */}
        <div className="flex items-center gap-4">
            {updateStatus === 'available' && (
                <div className="flex flex-col items-end">
                    <div className="flex items-center gap-2 text-sm text-blue-500 animate-pulse">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Mise à jour disponible...
                    </div>
                    {updateMessage && <span className="text-xs text-muted-foreground">{updateMessage}</span>}
                </div>
            )}
            {updateStatus === 'downloading' && (
                 <div className="flex items-center gap-2 text-sm text-blue-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Téléchargement {Math.round(downloadProgress)}%
                </div>
            )}
            {updateStatus === 'downloaded' ? (
                <button 
                    onClick={handleInstall}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors shadow-lg shadow-green-500/20 cursor-pointer"
                >
                    <RefreshCw className="h-4 w-4" />
                    Installer et redémarrer
                </button>
            ) : (
                <button 
                    onClick={handleCheckUpdate}
                    disabled={updateStatus === 'checking' || updateStatus === 'downloading'}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-muted cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {updateStatus === 'checking' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <RefreshCw className="h-4 w-4" />
                    )}
                    {updateStatus === 'checking' ? 'Vérification...' : 'Vérifier les mises à jour'}
                </button>
            )}
        </div>
      </div>

      {/* Progress Bar for Update */}
      {updateStatus === 'downloading' && (
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div 
                  className="bg-primary h-full transition-all duration-300"
                  style={{ width: `${downloadProgress}%` }}
              />
          </div>
      )}

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Deluge */}
        <Link to="/deluge" className="group relative overflow-hidden rounded-xl border bg-card p-6 shadow-sm hover:shadow-md transition-all hover:border-primary/50">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Download className="h-24 w-24 -mr-8 -mt-8 rotate-12" />
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                <Download className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold">Deluge</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Gérez vos téléchargements et surveillez l'état de vos torrents en temps réel.
          </p>
          <div className="flex items-center text-sm text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0">
            Accéder <ArrowRight className="ml-1 h-4 w-4" />
          </div>
        </Link>

        {/* Prowlarr */}
        <Link to="/prowlarr" className="group relative overflow-hidden rounded-xl border bg-card p-6 shadow-sm hover:shadow-md transition-all hover:border-primary/50">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Search className="h-24 w-24 -mr-8 -mt-8 rotate-12" />
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500">
                <Search className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold">Prowlarr</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Recherchez du contenu sur tous vos indexers simultanément et gérez vos sources.
          </p>
          <div className="flex items-center text-sm text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0">
            Accéder <ArrowRight className="ml-1 h-4 w-4" />
          </div>
        </Link>

        {/* Series */}
        <Link to="/series" className="group relative overflow-hidden rounded-xl border bg-card p-6 shadow-sm hover:shadow-md transition-all hover:border-primary/50">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Tv className="h-24 w-24 -mr-8 -mt-8 rotate-12" />
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500">
                <Tv className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold">Séries</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Suivez vos séries préférées, les dates de sortie et marquez votre progression.
          </p>
          <div className="flex items-center text-sm text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0">
            Accéder <ArrowRight className="ml-1 h-4 w-4" />
          </div>
        </Link>
      </div>

      {/* Changelog Section */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-xl font-semibold">Dernières mises à jour</h2>
        </div>
        
        <div className="grid gap-4">
            {isLoadingReleases ? (
                <div className="p-8 text-center text-muted-foreground bg-card border rounded-xl">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Chargement de l'historique...
                </div>
            ) : releases.length > 0 ? (
                releases.map(release => (
                    <div key={release.id} className="bg-card border rounded-xl p-4 shadow-sm">
                        <div className="flex items-start justify-between mb-2">
                            <div>
                                <h3 className="font-semibold text-lg flex items-center gap-2">
                                    {release.name || release.tag_name}
                                    <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                                        {new Date(release.published_at).toLocaleDateString()}
                                    </span>
                                </h3>
                            </div>
                            <a 
                                href={release.html_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                            >
                                Voir sur GitHub <ArrowRight className="h-3 w-3" />
                            </a>
                        </div>
                        <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground">
                            <p className="whitespace-pre-wrap text-sm line-clamp-3">{release.body}</p>
                        </div>
                    </div>
                ))
            ) : (
                <div className="p-8 text-center text-muted-foreground bg-card border rounded-xl">
                    Aucune information de mise à jour disponible (Impossible de joindre GitHub ou aucune release).
                </div>
            )}
        </div>
      </div>

      {/* Credits Footer */}
      <div className="mt-12 pt-8 border-t">
        <div className="bg-gradient-to-br from-card to-muted rounded-xl p-6 border shadow-sm">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-background rounded-full border shadow-sm">
                        <Shield className="h-6 w-6 text-green-500" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg">Sécurité & Confidentialité</h3>
                        <p className="text-sm text-muted-foreground max-w-md">
                            Projet OpenSource et totalement local. Vos données sensibles sont chiffrées et ne quittent jamais votre machine.
                        </p>
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="text-right hidden md:block">
                        <div className="text-sm font-medium">Développé par</div>
                        <div className="text-lg font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                            MoowGlax
                        </div>
                    </div>
                    <a 
                        href="https://github.com/MoowGlax" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-3 bg-background rounded-full border hover:border-primary hover:text-primary transition-all shadow-sm hover:shadow-md group"
                    >
                        <Github className="h-6 w-6 group-hover:scale-110 transition-transform" />
                    </a>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}