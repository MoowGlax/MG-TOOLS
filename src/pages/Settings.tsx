import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Save, Check, AlertCircle, Loader2, Download, Database, ChevronDown, ChevronRight, Bell, Clapperboard, MessageSquare, ExternalLink, ArrowUp, ArrowDown, Eye, EyeOff, LayoutTemplate, Server } from 'lucide-react';
import { DelugeService } from '../services/deluge';
import { ProwlarrService } from '../services/prowlarr';
import { TmdbService } from '../services/tmdb';
import { SynologyService } from '../services/synology';
import { NotificationsService } from '../services/notifications';
import { toast } from 'sonner';

import { confirmAction } from '../utils/confirm';

export function Settings() {
  const location = useLocation();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    deluge: false,
    prowlarr: false,
    synology: false,
    tmdb: false,
    notifications: false,
    advanced: false,
    sidebar: false,
  });

  useEffect(() => {
    // Ouvrir la section demandée via la navigation state
    if (location.state && location.state.section) {
      setOpenSections(prev => ({ ...prev, [location.state.section]: true }));
    }
  }, [location]);

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Paramètres</h1>
      
      <div className="space-y-4">
        <SidebarSettings isOpen={openSections.sidebar} onToggle={() => toggleSection('sidebar')} />
        <DelugeSettings isOpen={openSections.deluge} onToggle={() => toggleSection('deluge')} />
        <ProwlarrSettings isOpen={openSections.prowlarr} onToggle={() => toggleSection('prowlarr')} />
        <SynologySettings isOpen={openSections.synology} onToggle={() => toggleSection('synology')} />
        <TmdbSettings isOpen={openSections.tmdb} onToggle={() => toggleSection('tmdb')} />
        <NotificationSettings isOpen={openSections.notifications} onToggle={() => toggleSection('notifications')} />
        <AdvancedSettings isOpen={openSections.advanced} onToggle={() => toggleSection('advanced')} />
      </div>
    </div>
  );
}

function AdvancedSettings({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) {
    const handleOpenUserData = async () => {
        await window.electronAPI.openUserData();
    };

    const handleReset = async () => {
        if (await confirmAction('Êtes-vous sûr de vouloir tout réinitialiser ? Cette action est irréversible.')) {
            const success = await window.electronAPI.resetConfig();
            if (!success) toast.error("Erreur lors de la réinitialisation");
        }
    };

    const handleExport = async () => {
        toast.custom((t) => (
            <div className="flex flex-col gap-4 w-full bg-background border border-border rounded-lg p-4 shadow-lg max-w-md">
                <div className="flex flex-col gap-1">
                    <h3 className="font-semibold text-base">Format d'exportation</h3>
                    <p className="text-sm text-muted-foreground">Choisissez le type de sauvegarde :</p>
                </div>

                <div className="space-y-3">
                    <div className="p-3 rounded-md bg-amber-500/10 border border-amber-500/20 space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="text-amber-600 dark:text-amber-500 font-medium text-sm">⚠️ Clair (Portable)</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Les mots de passe sont lisibles. Restaurable sur <span className="font-medium">n'importe quel PC</span>.
                            <br/><span className="text-destructive font-medium">À conserver en lieu sûr !</span>
                        </p>
                    </div>

                    <div className="p-3 rounded-md bg-primary/10 border border-primary/20 space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="text-primary font-medium text-sm">🔒 Chiffré (Ce PC)</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Sécurisé avec la clé système. Restaurable <span className="font-medium">UNIQUEMENT sur ce PC</span>.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 justify-end pt-2">
                    <button
                        onClick={() => toast.dismiss(t)}
                        className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={async () => {
                            toast.dismiss(t);
                            const success = await window.electronAPI.exportConfig('clear');
                            if (success) toast.success('Configuration exportée (Portable)');
                            else toast.error("Échec de l'exportation");
                        }}
                        className="px-3 py-1.5 text-xs font-medium bg-amber-500 text-white rounded hover:bg-amber-600 transition-colors"
                    >
                        Portable
                    </button>
                    <button
                        onClick={async () => {
                            toast.dismiss(t);
                            const success = await window.electronAPI.exportConfig('encrypted');
                            if (success) toast.success('Configuration exportée (Sécurisée)');
                            else toast.error("Échec de l'exportation");
                        }}
                        className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
                    >
                        Sécurisé (Recommandé)
                    </button>
                </div>
            </div>
        ), {
            duration: Infinity,
        });
    };

    const handleImport = async () => {
        if (await confirmAction('Importer une configuration écrasera les données actuelles. Continuer ?')) {
            const success = await window.electronAPI.importConfig();
            if (success) toast.success('Configuration importée avec succès');
            else toast.error("Échec de l'importation");
        }
    };

    return (
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
            <div 
                className="flex items-center justify-between p-6 cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={onToggle}
            >
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-primary/10 rounded-full">
                        <Database className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold">Avancé</h2>
                        <p className="text-sm text-muted-foreground">Gestion des données et configuration</p>
                    </div>
                </div>
                {isOpen ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
            </div>

            {isOpen && (
                <div className="p-6 border-t space-y-6">
                    <div className="space-y-4">
                        <h3 className="font-medium">Données de l'application</h3>
                        <div className="flex flex-col gap-2">
                            <button 
                                onClick={handleOpenUserData}
                                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
                            >
                                <ExternalLink className="h-4 w-4" />
                                Ouvrir le dossier de données (AppData)
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="font-medium">Sauvegarde et Restauration</h3>
                        <div className="flex gap-4">
                            <button
                                onClick={handleExport}
                                className="flex items-center gap-2 rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80"
                            >
                                <Download className="h-4 w-4" />
                                Exporter la configuration
                            </button>
                            <button
                                onClick={handleImport}
                                className="flex items-center gap-2 rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80"
                            >
                                <LayoutTemplate className="h-4 w-4" />
                                Importer une configuration
                            </button>
                        </div>
                    </div>

                    <div className="pt-4 border-t">
                        <h3 className="font-medium text-destructive mb-4">Zone de danger</h3>
                        <button
                            onClick={handleReset}
                            className="flex items-center gap-2 rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
                        >
                            <AlertCircle className="h-4 w-4" />
                            Réinitialiser l'application
                        </button>
                        <p className="mt-2 text-xs text-muted-foreground">
                            Cette action effacera toutes les données et préférences de l'application.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

function SidebarSettings({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) {
  const [items, setItems] = useState<{id: string, label: string}[]>([]);
  const [hidden, setHidden] = useState<string[]>([]);
  
  // Constante locale pour les labels
  const ALL_LABELS: Record<string, string> = {
      'home': 'Accueil',
      'deluge': 'Deluge',
      'prowlarr': 'Prowlarr',
      'series': 'Séries',
      'synology': 'Synology',
      'settings': 'Paramètres'
  };
  const DEFAULT_ORDER = ['home', 'deluge', 'prowlarr', 'series', 'synology', 'settings'];

  useEffect(() => {
      if (isOpen) {
          const stored = localStorage.getItem('sidebar_config');
          if (stored) {
              const parsed = JSON.parse(stored);
              // Handle potential missing items if updates happen
              const order = parsed.order || DEFAULT_ORDER;
              // Add missing items if any
              DEFAULT_ORDER.forEach(id => {
                  if (!order.includes(id)) order.push(id);
              });
              
              setItems(order.map((id: string) => ({ id, label: ALL_LABELS[id] || id })));
              setHidden(parsed.hidden || []);
          } else {
              setItems(DEFAULT_ORDER.map(id => ({ id, label: ALL_LABELS[id] })));
              setHidden([]);
          }
      }
  }, [isOpen]);

  const save = (newItems: typeof items, newHidden: string[]) => {
      const config = {
          order: newItems.map(i => i.id),
          hidden: newHidden
      };
      localStorage.setItem('sidebar_config', JSON.stringify(config));
      window.dispatchEvent(new Event('sidebar-config-changed'));
  };

  const move = (index: number, direction: -1 | 1) => {
      const newItems = [...items];
      // Skip Home (index 0 usually)
      if (newItems[index].id === 'home') return;
      
      const targetIndex = index + direction;
      // Check bounds
      if (targetIndex < 0 || targetIndex >= newItems.length) return;
      // Skip swapping with Home if Home is at target
      if (newItems[targetIndex].id === 'home') return;

      const temp = newItems[index];
      newItems[index] = newItems[targetIndex];
      newItems[targetIndex] = temp;
      
      setItems(newItems);
      save(newItems, hidden);
  };

  const toggleHidden = (id: string) => {
      if (id === 'settings') return; // Cannot hide settings
      
      let newHidden;
      if (hidden.includes(id)) {
          newHidden = hidden.filter(h => h !== id);
      } else {
          newHidden = [...hidden, id];
      }
      setHidden(newHidden);
      save(items, newHidden);
  };

  if (!isOpen) {
    return (
      <div 
        onClick={onToggle}
        className="flex items-center justify-between rounded-lg border bg-card p-4 shadow-sm hover:bg-accent/50 cursor-pointer transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="p-2 bg-primary/10 rounded-full">
            <LayoutTemplate className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Personnalisation de la barre latérale</h2>
            <p className="text-sm text-muted-foreground">Gérer l'ordre et la visibilité des modules</p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card shadow-sm overflow-hidden transition-all">
        <div 
            onClick={onToggle}
            className="flex items-center justify-between p-4 border-b bg-muted/30 cursor-pointer hover:bg-muted/50"
        >
            <div className="flex items-center gap-4">
                <div className="p-2 bg-primary/10 rounded-full">
                    <LayoutTemplate className="h-6 w-6 text-primary" />
                </div>
                <div>
                    <h2 className="text-lg font-semibold">Personnalisation de la barre latérale</h2>
                    <p className="text-sm text-muted-foreground">Organisez votre espace de travail</p>
                </div>
            </div>
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
        </div>
        
        <div className="p-6 space-y-4">
            <div className="grid gap-2">
                {items.map((item, index) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
                        <span className="font-medium flex items-center gap-2">
                            {item.label}
                            {item.id === 'home' && <span className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">Fixe</span>}
                        </span>
                        
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => toggleHidden(item.id)}
                                disabled={item.id === 'settings'}
                                className={`p-2 rounded-md transition-colors ${
                                    item.id === 'settings' ? 'opacity-50 cursor-not-allowed text-muted-foreground' :
                                    hidden.includes(item.id) ? 'text-muted-foreground hover:bg-muted hover:text-foreground' : 'text-primary bg-primary/10 hover:bg-primary/20'
                                }`}
                                title={hidden.includes(item.id) ? "Afficher" : "Masquer"}
                            >
                                {hidden.includes(item.id) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                            
                            <div className="w-px h-4 bg-border mx-1" />
                            
                            <button
                                onClick={() => move(index, -1)}
                                disabled={index === 0 || item.id === 'home' || items[index - 1].id === 'home'}
                                className="p-2 hover:bg-muted rounded-md disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                <ArrowUp className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => move(index, 1)}
                                disabled={index === items.length - 1 || item.id === 'home'}
                                className="p-2 hover:bg-muted rounded-md disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                <ArrowDown className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            <p className="text-xs text-muted-foreground text-center">
                La page "Accueil" reste toujours en haut. La page "Paramètres" ne peut pas être masquée.
            </p>
        </div>
    </div>
  );
}

function DelugeSettings({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) {
  const [url, setUrl] = useState('http://localhost:8112');
  const [password, setPassword] = useState('');
  const [remotePath, setRemotePath] = useState('');
  const [localPath, setLocalPath] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const load = async () => {
      const savedUrl = await window.electronAPI.getCredentials('deluge_url');
      const savedPass = await window.electronAPI.getCredentials('deluge_password');
      const configured = await window.electronAPI.getCredentials('deluge_configured');
      
      const savedRemotePath = localStorage.getItem('deluge_remote_path');
      const savedLocalPath = localStorage.getItem('deluge_local_path');

      if (savedUrl) setUrl(savedUrl);
      if (savedPass) setPassword(savedPass);
      if (savedRemotePath) setRemotePath(savedRemotePath);
      if (savedLocalPath) setLocalPath(savedLocalPath);
      if (configured === 'true') setIsConnected(true);
    };
    load();
  }, []);

  const handleTestAndSave = async () => {
    setStatus('loading');
    setMessage('');
    try {
      // Nettoyage et détection intelligente de l'URL
      let targetUrl = url.trim();
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
          targetUrl = `http://${targetUrl}`;
      }
      
      let success = await DelugeService.login(targetUrl, password);
      
      if (!success && url.trim() === targetUrl.replace('http://', '')) {
         const httpsUrl = `https://${url.trim()}`;
         success = await DelugeService.login(httpsUrl, password);
         if (success) targetUrl = httpsUrl;
      }

      if (success) {
        setUrl(targetUrl);
        await window.electronAPI.saveCredentials('deluge_url', targetUrl);
        await window.electronAPI.saveCredentials('deluge_password', password);
        await window.electronAPI.saveCredentials('deluge_configured', 'true');
        
        // Sauvegarde du mapping
        if (remotePath) localStorage.setItem('deluge_remote_path', remotePath);
        else localStorage.removeItem('deluge_remote_path');
        
        if (localPath) localStorage.setItem('deluge_local_path', localPath);
        else localStorage.removeItem('deluge_local_path');

        setStatus('success');
        setMessage('Connexion réussie et configuration sauvegardée');
        setIsConnected(true);
      } else {
        setStatus('error');
        setMessage('Échec de la connexion. Vérifiez l\'URL et le mot de passe.');
        setIsConnected(false);
      }
    } catch (err) {
      setStatus('error');
      setMessage('Erreur lors du test de connexion');
      setIsConnected(false);
    }
  };

  if (!isOpen) {
    return (
      <div 
        onClick={onToggle}
        className="flex items-center justify-between rounded-lg border bg-card p-4 shadow-sm hover:bg-accent/50 cursor-pointer transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="p-2 bg-primary/10 rounded-full">
            <Download className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Deluge</h2>
            <p className="text-sm text-muted-foreground">Configuration de la connexion au client Deluge</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
            {isConnected ? (
                <div className="flex items-center gap-2 text-green-500 text-sm font-medium">
                    <Check className="h-4 w-4" /> Connecté
                </div>
            ) : (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    Non connecté
                </div>
            )}
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card shadow-sm overflow-hidden transition-all">
      <div 
        onClick={onToggle}
        className="flex items-center justify-between p-4 border-b bg-muted/30 cursor-pointer hover:bg-muted/50"
      >
        <div className="flex items-center gap-4">
          <div className="p-2 bg-primary/10 rounded-full">
            <Download className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Deluge</h2>
            <p className="text-sm text-muted-foreground">Connexion au client torrent</p>
          </div>
        </div>
        <ChevronDown className="h-5 w-5 text-muted-foreground" />
      </div>

      <div className="p-6 space-y-4">
        <div className="grid gap-2">
          <label className="text-sm font-medium">URL de Deluge</label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="http://localhost:8112"
          />
        </div>
        
        <div className="grid gap-2">
          <label className="text-sm font-medium">Mot de passe</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Votre mot de passe Deluge"
          />
        </div>

        <div className="pt-4 border-t">
          <h3 className="text-sm font-semibold mb-2">Mapping des chemins (Optionnel)</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Nécessaire pour le téléchargement direct si Deluge est sur une autre machine.
            Mappez le dossier de téléchargement distant vers un lecteur réseau local (ex: SMB).
          </p>
          
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Chemin Distant (Vu par Deluge)</label>
              <input
                type="text"
                value={remotePath}
                onChange={(e) => setRemotePath(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Ex: /mnt/disk3 ou /downloads"
              />
              <p className="text-[10px] text-muted-foreground">Le chemin absolu du fichier sur le serveur (Linux).</p>
            </div>
            
            <div className="grid gap-2">
              <label className="text-sm font-medium">Chemin Local (Accès Windows)</label>
              <input
                type="text"
                value={localPath}
                onChange={(e) => setLocalPath(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Ex: \\192.168.1.x\partage ou Z:\"
              />
              <p className="text-[10px] text-muted-foreground">Le chemin réseau équivalent pour accéder à ce dossier.</p>
            </div>
          </div>
        </div>

        {message && (
          <div className={`flex items-center gap-2 rounded-md p-3 text-sm ${
            status === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-destructive/10 text-destructive'
          }`}>
            {status === 'success' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {message}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            onClick={handleTestAndSave}
            disabled={status === 'loading'}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {status === 'loading' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Tester & Sauvegarder
          </button>
        </div>
      </div>
    </div>
  );
}

function ProwlarrSettings({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) {
  const [url, setUrl] = useState('http://localhost:9696');
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const load = async () => {
      const savedUrl = await window.electronAPI.getCredentials('prowlarr_url');
      const savedKey = await window.electronAPI.getCredentials('prowlarr_apikey');
      const configured = await window.electronAPI.getCredentials('prowlarr_configured');

      if (savedUrl) setUrl(savedUrl);
      if (savedKey) setApiKey(savedKey);
      if (configured === 'true') setIsConnected(true);
    };
    load();
  }, []);

  const handleTestAndSave = async () => {
    setStatus('loading');
    setMessage('');
    try {
        let targetUrl = url.trim();
        if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
            targetUrl = `http://${targetUrl}`;
        }

        const success = await ProwlarrService.testConnection(targetUrl, apiKey);
        
        if (success) {
            setUrl(targetUrl);
            await window.electronAPI.saveCredentials('prowlarr_url', targetUrl);
            await window.electronAPI.saveCredentials('prowlarr_apikey', apiKey);
            await window.electronAPI.saveCredentials('prowlarr_configured', 'true');
            setStatus('success');
            setMessage('Connexion réussie et configuration sauvegardée');
            setIsConnected(true);
        } else {
            setStatus('error');
            setMessage('Échec de la connexion à Prowlarr');
            setIsConnected(false);
        }
    } catch (err) {
      setStatus('error');
      setMessage('Erreur lors du test de connexion');
      setIsConnected(false);
    }
  };

  if (!isOpen) {
    return (
      <div 
        onClick={onToggle}
        className="flex items-center justify-between rounded-lg border bg-card p-4 shadow-sm hover:bg-accent/50 cursor-pointer transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="p-2 bg-primary/10 rounded-full">
            <Database className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Prowlarr</h2>
            <p className="text-sm text-muted-foreground">Configuration de l'indexeur Prowlarr</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
            {isConnected ? (
                <div className="flex items-center gap-2 text-green-500 text-sm font-medium">
                    <Check className="h-4 w-4" /> Connecté
                </div>
            ) : (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    Non connecté
                </div>
            )}
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card shadow-sm overflow-hidden transition-all">
      <div 
        onClick={onToggle}
        className="flex items-center justify-between p-4 border-b bg-muted/30 cursor-pointer hover:bg-muted/50"
      >
        <div className="flex items-center gap-4">
          <div className="p-2 bg-primary/10 rounded-full">
            <Database className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Prowlarr</h2>
            <p className="text-sm text-muted-foreground">Indexeur de torrents</p>
          </div>
        </div>
        <ChevronDown className="h-5 w-5 text-muted-foreground" />
      </div>

      <div className="p-6 space-y-4">
        <div className="grid gap-2">
          <label className="text-sm font-medium">URL de Prowlarr</label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="http://localhost:9696"
          />
        </div>
        
        <div className="grid gap-2">
          <label className="text-sm font-medium">Clé API</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Votre clé API Prowlarr"
          />
        </div>

        {message && (
          <div className={`flex items-center gap-2 rounded-md p-3 text-sm ${
            status === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-destructive/10 text-destructive'
          }`}>
            {status === 'success' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {message}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            onClick={handleTestAndSave}
            disabled={status === 'loading'}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {status === 'loading' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Tester & Sauvegarder
          </button>
        </div>
      </div>
    </div>
  );
}

function SynologySettings({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) {
    const [url, setUrl] = useState('');
    const [user, setUser] = useState('');
    const [password, setPassword] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const [isConnected, setIsConnected] = useState(false);
  
    useEffect(() => {
      const load = async () => {
        const savedUrl = await window.electronAPI.getCredentials('synology_url');
        const savedUser = await window.electronAPI.getCredentials('synology_user');
        const savedPass = await window.electronAPI.getCredentials('synology_password');
        
        if (savedUrl) setUrl(savedUrl);
        if (savedUser) setUser(savedUser);
        if (savedPass) setPassword(savedPass);
        
        if (savedUrl && savedUser && savedPass) setIsConnected(true);
      };
      load();
    }, []);
  
    const handleTestAndSave = async () => {
      setStatus('loading');
      setMessage('');
      try {
          let targetUrl = url.trim();
          if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
              targetUrl = `http://${targetUrl}`;
          }
  
          const success = await SynologyService.login(targetUrl, user, password);
          
          if (success) {
              setUrl(targetUrl);
              await window.electronAPI.saveCredentials('synology_url', targetUrl);
              await window.electronAPI.saveCredentials('synology_user', user);
              await window.electronAPI.saveCredentials('synology_password', password);
              setStatus('success');
              setMessage('Connexion réussie et configuration sauvegardée');
              setIsConnected(true);
          } else {
              setStatus('error');
              setMessage('Échec de la connexion au NAS');
              setIsConnected(false);
          }
      } catch (err) {
        setStatus('error');
        setMessage('Erreur lors du test de connexion');
        setIsConnected(false);
      }
    };
  
    if (!isOpen) {
      return (
        <div 
          onClick={onToggle}
          className="flex items-center justify-between rounded-lg border bg-card p-4 shadow-sm hover:bg-accent/50 cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="p-2 bg-primary/10 rounded-full">
              <Server className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Synology NAS</h2>
              <p className="text-sm text-muted-foreground">Monitoring et contrôle du NAS</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
              {isConnected ? (
                  <div className="flex items-center gap-2 text-green-500 text-sm font-medium">
                      <Check className="h-4 w-4" /> Configuré
                  </div>
              ) : (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      Non configuré
                  </div>
              )}
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      );
    }
  
    return (
      <div className="rounded-lg border bg-card shadow-sm overflow-hidden transition-all">
        <div 
          onClick={onToggle}
          className="flex items-center justify-between p-4 border-b bg-muted/30 cursor-pointer hover:bg-muted/50"
        >
          <div className="flex items-center gap-4">
            <div className="p-2 bg-primary/10 rounded-full">
              <Server className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Synology NAS</h2>
              <p className="text-sm text-muted-foreground">Configuration de l'accès API (DSM 6/7)</p>
            </div>
          </div>
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        </div>
  
        <div className="p-6 space-y-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">URL du NAS</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="http://192.168.1.100:5000"
            />
          </div>
          
          <div className="grid gap-2">
            <label className="text-sm font-medium">Nom d'utilisateur</label>
            <input
              type="text"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="admin"
            />
          </div>
  
          <div className="grid gap-2">
            <label className="text-sm font-medium">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Votre mot de passe"
            />
          </div>
  
          {message && (
            <div className={`flex items-center gap-2 rounded-md p-3 text-sm ${
              status === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-destructive/10 text-destructive'
            }`}>
              {status === 'success' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              {message}
            </div>
          )}
  
          <div className="flex justify-end pt-2">
            <button
              onClick={handleTestAndSave}
              disabled={status === 'loading'}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {status === 'loading' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Tester & Sauvegarder
            </button>
          </div>
        </div>
      </div>
    );
}

function TmdbSettings({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) {
    const [apiKey, setApiKey] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const [isConnected, setIsConnected] = useState(false);
  
    useEffect(() => {
      const load = async () => {
        const savedKey = await window.electronAPI.getCredentials('tmdb_apikey');
        if (savedKey) {
            setApiKey(savedKey);
            setIsConnected(true);
        }
      };
      load();
    }, []);
  
    const handleTestAndSave = async () => {
      setStatus('loading');
      setMessage('');
      try {
          const success = await TmdbService.testConnection(apiKey);
          
          if (success) {
              await window.electronAPI.saveCredentials('tmdb_apikey', apiKey);
              setStatus('success');
              setMessage('Clé API valide et sauvegardée');
              setIsConnected(true);
          } else {
              setStatus('error');
              setMessage('Clé API invalide');
              setIsConnected(false);
          }
      } catch (err) {
        setStatus('error');
        setMessage('Erreur lors du test de connexion');
        setIsConnected(false);
      }
    };
  
    if (!isOpen) {
      return (
        <div 
          onClick={onToggle}
          className="flex items-center justify-between rounded-lg border bg-card p-4 shadow-sm hover:bg-accent/50 cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="p-2 bg-primary/10 rounded-full">
              <Clapperboard className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">TMDB</h2>
              <p className="text-sm text-muted-foreground">Source d'informations pour les séries</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
              {isConnected ? (
                  <div className="flex items-center gap-2 text-green-500 text-sm font-medium">
                      <Check className="h-4 w-4" /> Configuré
                  </div>
              ) : (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      Non configuré
                  </div>
              )}
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      );
    }
  
    return (
      <div className="rounded-lg border bg-card shadow-sm overflow-hidden transition-all">
        <div 
          onClick={onToggle}
          className="flex items-center justify-between p-4 border-b bg-muted/30 cursor-pointer hover:bg-muted/50"
        >
          <div className="flex items-center gap-4">
            <div className="p-2 bg-primary/10 rounded-full">
              <Clapperboard className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">TMDB</h2>
              <p className="text-sm text-muted-foreground">The Movie Database API</p>
            </div>
          </div>
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        </div>
  
        <div className="p-6 space-y-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Clé API (v3)</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Votre clé API TMDB"
            />
            <p className="text-xs text-muted-foreground">
                Nécessaire pour récupérer les images et infos des séries.
                <a 
                    href="https://www.themoviedb.org/settings/api" 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline mt-1 w-fit"
                >
                    Obtenir ma clé API <ExternalLink className="h-3 w-3" />
                </a>
            </p>
          </div>
  
          {message && (
            <div className={`flex items-center gap-2 rounded-md p-3 text-sm ${
              status === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-destructive/10 text-destructive'
            }`}>
              {status === 'success' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              {message}
            </div>
          )}
  
          <div className="flex justify-end pt-2">
            <button
              onClick={handleTestAndSave}
              disabled={status === 'loading'}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {status === 'loading' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Sauvegarder
            </button>
          </div>
        </div>
      </div>
    );
}

function NotificationSettings({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) {
    const [pushoverUser, setPushoverUser] = useState('');
    const [pushoverToken, setPushoverToken] = useState('');
    const [discordWebhook, setDiscordWebhook] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
  
    useEffect(() => {
      const load = async () => {
        const pUser = await window.electronAPI.getCredentials('pushover_user');
        const pToken = await window.electronAPI.getCredentials('pushover_token');
        const dWebhook = await window.electronAPI.getCredentials('discord_webhook');
        
        if (pUser) setPushoverUser(pUser);
        if (pToken) setPushoverToken(pToken);
        if (dWebhook) setDiscordWebhook(dWebhook);
      };
      load();
    }, []);
  
    const handleSave = async () => {
        setStatus('loading');
        try {
            await window.electronAPI.saveCredentials('pushover_user', pushoverUser);
            await window.electronAPI.saveCredentials('pushover_token', pushoverToken);
            await window.electronAPI.saveCredentials('discord_webhook', discordWebhook);
            
            setStatus('success');
            setMessage('Configuration sauvegardée');
            setTimeout(() => setStatus('idle'), 2000);
        } catch (e) {
            setStatus('error');
            setMessage('Erreur de sauvegarde');
        }
    };

    const testPushover = async () => {
        if (!pushoverUser || !pushoverToken) {
            setStatus('error');
            setMessage('Configuration Pushover incomplète');
            return;
        }
        setStatus('loading');
        const success = await NotificationsService.testPushover(pushoverUser, pushoverToken);
        if (success) {
            setStatus('success');
            setMessage('Notification Pushover envoyée !');
        } else {
            setStatus('error');
            setMessage('Échec de l\'envoi Pushover');
        }
    };

    const testDiscord = async () => {
        if (!discordWebhook) {
            setStatus('error');
            setMessage('Webhook Discord manquant');
            return;
        }
        setStatus('loading');
        const success = await NotificationsService.testDiscord(discordWebhook);
        if (success) {
            setStatus('success');
            setMessage('Notification Discord envoyée !');
        } else {
            setStatus('error');
            setMessage('Échec de l\'envoi Discord');
        }
    };
  
    if (!isOpen) {
      return (
        <div 
          onClick={onToggle}
          className="flex items-center justify-between rounded-lg border bg-card p-4 shadow-sm hover:bg-accent/50 cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="p-2 bg-primary/10 rounded-full">
              <Bell className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Notifications</h2>
              <p className="text-sm text-muted-foreground">Pushover & Discord</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>
      );
    }
  
    return (
      <div className="rounded-lg border bg-card shadow-sm overflow-hidden transition-all">
        <div 
          onClick={onToggle}
          className="flex items-center justify-between p-4 border-b bg-muted/30 cursor-pointer hover:bg-muted/50"
        >
          <div className="flex items-center gap-4">
            <div className="p-2 bg-primary/10 rounded-full">
              <Bell className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Notifications</h2>
              <p className="text-sm text-muted-foreground">Configurer les alertes de changement de statut</p>
            </div>
          </div>
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        </div>
  
        <div className="p-6 space-y-6">
            {/* Pushover */}
            <div className="space-y-4 border-b pb-6">
                <h3 className="font-medium flex items-center gap-2">
                    <Bell className="h-4 w-4" /> Pushover
                </h3>
                <div className="space-y-2">
                    <label className="text-sm font-medium">User Key</label>
                    <input
                        type="password"
                        value={pushoverUser}
                        onChange={(e) => setPushoverUser(e.target.value)}
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Votre clé utilisateur (User Key)"
                    />
                    <a href="https://pushover.net" target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 w-fit">
                        Créer un compte Pushover <ExternalLink className="h-3 w-3" />
                    </a>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">API Token (Application)</label>
                    <input
                        type="password"
                        value={pushoverToken}
                        onChange={(e) => setPushoverToken(e.target.value)}
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Token de l'application (API Token)"
                    />
                    <a href="https://pushover.net/apps/build" target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 w-fit">
                        Créer une application Pushover <ExternalLink className="h-3 w-3" />
                    </a>
                </div>
                <button
                    onClick={testPushover}
                    className="text-xs bg-muted hover:bg-muted/80 px-3 py-1 rounded"
                >
                    Tester Pushover
                </button>
            </div>

            {/* Discord */}
            <div className="space-y-4">
                <h3 className="font-medium flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" /> Discord
                </h3>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Webhook URL</label>
                    <input
                        type="password"
                        value={discordWebhook}
                        onChange={(e) => setDiscordWebhook(e.target.value)}
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="https://discord.com/api/webhooks/..."
                    />
                </div>
                <button
                    onClick={testDiscord}
                    className="text-xs bg-muted hover:bg-muted/80 px-3 py-1 rounded"
                >
                    Tester Discord
                </button>
            </div>
  
            {message && (
                <div className={`flex items-center gap-2 rounded-md p-3 text-sm ${
                status === 'success' ? 'bg-green-500/10 text-green-500' : 
                status === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'
                }`}>
                {status === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : 
                 status === 'success' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                {message}
                </div>
            )}
  
            <div className="flex justify-end pt-2">
                <button
                onClick={handleSave}
                disabled={status === 'loading'}
                className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                {status === 'loading' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <Save className="h-4 w-4" />
                )}
                Sauvegarder tout
                </button>
            </div>
        </div>
      </div>
    );
}