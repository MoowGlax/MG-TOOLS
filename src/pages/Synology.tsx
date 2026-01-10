import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Server, Activity, HardDrive, Cpu, Power, AlertCircle, RefreshCw, ArrowUp, ArrowDown, TerminalSquare, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { confirmAction } from '../utils/confirm';
import { SynologyService } from '../services/synology';
import { Terminal } from '../components/ui/Terminal';

export function Synology() {
  const navigate = useNavigate();
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [systemData, setSystemData] = useState<any>(null);
  const [sshConfig, setSshConfig] = useState<{user: string, host: string, port?: number, password?: string} | null>(null);
  const [showTerminal, setShowTerminal] = useState(false);

  useEffect(() => {
    const checkConfig = async () => {
      const url = await window.electronAPI.getCredentials('synology_url');
      const user = await window.electronAPI.getCredentials('synology_user');
      const password = await window.electronAPI.getCredentials('synology_password');
      
      if (!url) {
        setIsConfigured(false);
        setTimeout(() => {
          navigate('/settings', { state: { section: 'synology' } });
        }, 2000);
      } else {
        setIsConfigured(true);
        if (user) {
            let host = url;
            try {
                // Extract hostname from URL (e.g., http://192.168.1.72:5000 -> 192.168.1.72)
                const urlObj = new URL(url);
                host = urlObj.hostname;
            } catch {
                // Fallback for non-standard URLs
                host = url.replace(/^https?:\/\//, '').split(':')[0];
            }
            setSshConfig({ user, host, password: password || undefined });
        }
        loadData();
      }
    };
    checkConfig();
  }, [navigate]);

  useEffect(() => {
    if (isConfigured) {
        const interval = setInterval(loadData, 5000);
        return () => clearInterval(interval);
    }
  }, [isConfigured]);

  const loadData = async () => {
    try {
      const data = await SynologyService.getSystemData();
      setSystemData(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAction = async (action: 'reboot' | 'shutdown') => {
      if (await confirmAction(`Voulez-vous vraiment ${action === 'reboot' ? 'redémarrer' : 'éteindre'} le NAS ?`)) {
          try {
              const success = await SynologyService.executeAction(action);
              if (success) {
                  toast.success(`Action ${action} envoyée avec succès`);
              } else {
                  toast.error(`Echec de l'action ${action}`);
              }
          } catch (e) {
              toast.error('Erreur lors de l\'exécution');
          }
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

  if (!systemData) return <div className="flex h-full items-center justify-center"><RefreshCw className="h-8 w-8 animate-spin" /></div>;

  // New data structure: { cpu: { load: number }, memory: { ... }, network: { rx, tx }, storage: { disks: [], usb: [] } }
  const { cpu, memory, network, storage } = systemData;

  return (
    <div className="space-y-6 h-full flex flex-col relative">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
            <Server className="h-6 w-6" />
            Synology NAS
        </h1>
        <div className="flex gap-2">
             <button 
                onClick={() => handleAction('reboot')}
                className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/10 text-orange-500 rounded hover:bg-orange-500/20"
             >
                 <RefreshCw className="h-4 w-4" /> Redémarrer
             </button>
             <button 
                onClick={() => handleAction('shutdown')}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-500 rounded hover:bg-red-500/20"
             >
                 <Power className="h-4 w-4" /> Éteindre
             </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* CPU */}
          <div className="bg-card border rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-sm font-medium">CPU</span>
                  <Cpu className="h-4 w-4" />
              </div>
              <div className="text-2xl font-bold">
                  {cpu.load}%
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-500" 
                    style={{ width: `${cpu.load}%` }} 
                  />
              </div>
          </div>

          {/* RAM */}
          <div className="bg-card border rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-sm font-medium">RAM</span>
                  <Activity className="h-4 w-4" />
              </div>
              <div className="text-2xl font-bold">
                  {memory.real_usage}%
              </div>
               <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-500" 
                    style={{ width: `${memory.real_usage}%` }} 
                  />
              </div>
              <div className="text-xs text-muted-foreground">
                  {Math.round((memory.total_real - memory.avail_real) / 1024 / 1024)} GB / {Math.round(memory.total_real / 1024 / 1024)} GB
              </div>
          </div>

          {/* Network */}
          <div className="bg-card border rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-sm font-medium">Réseau</span>
                  <Activity className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1"><ArrowDown className="h-3 w-3" /> Down</span>
                      <span>{(network.rx / 1024).toFixed(1)} KB/s</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1"><ArrowUp className="h-3 w-3" /> Up</span>
                      <span>{(network.tx / 1024).toFixed(1)} KB/s</span>
                  </div>
              </div>
          </div>

           {/* Disk */}
           <div className="bg-card border rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-sm font-medium">Disque</span>
                  <HardDrive className="h-4 w-4" />
              </div>
              <div className="text-sm text-muted-foreground space-y-2">
                  <div className="flex flex-col gap-1">
                      {storage.volumes && storage.volumes.length > 0 ? (
                        storage.volumes.map((vol: any, idx: number) => {
                            const total = parseInt(vol.size_total || 0);
                            const used = parseInt(vol.size_used || 0);
                            const percent = total > 0 ? Math.round((used / total) * 100) : 0;
                            return (
                                <div key={idx} className="space-y-1">
                                    <div className="flex justify-between text-xs">
                                        <span>Vol {idx + 1}</span>
                                        <span>{percent}%</span>
                                    </div>
                                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                        <div 
                                            className={cn("h-full transition-all duration-500", percent > 90 ? "bg-red-500" : "bg-blue-500")}
                                            style={{ width: `${percent}%` }} 
                                        />
                                    </div>
                                </div>
                            );
                        })
                      ) : (
                         <div>{storage.disks?.length || 0} disque(s) interne(s)</div>
                      )}
                  </div>
                  {storage.usb?.length > 0 && (
                      <div className="text-blue-400 text-xs flex items-center gap-1">
                          <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"/>
                          {storage.usb.length} périphérique(s) USB
                      </div>
                  )}
              </div>
          </div>
      </div>

      {/* Internal Terminal */}
      <div className="flex-1 bg-zinc-950 rounded-lg border border-zinc-800 flex flex-col overflow-hidden min-h-[400px]">
        {showTerminal && sshConfig ? (
            <div className="flex flex-col h-full">
                <div className="flex items-center justify-between p-2 bg-zinc-900 border-b border-zinc-800">
                    <span className="text-xs text-zinc-400 flex items-center gap-2">
                        <TerminalSquare className="h-4 w-4" />
                        SSH: {sshConfig.user}@{sshConfig.host}
                    </span>
                    <button onClick={() => setShowTerminal(false)} className="text-zinc-500 hover:text-white">
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <div className="flex-1 p-2">
                    <Terminal config={sshConfig} />
                </div>
            </div>
        ) : (
            <div className="flex flex-col items-center justify-center h-full space-y-6 text-center p-8">
                <div className="p-4 bg-zinc-900 rounded-full border border-zinc-800">
                    <TerminalSquare className="h-12 w-12 text-zinc-400" />
                </div>
                <div className="space-y-2 max-w-md">
                    <h3 className="text-xl font-semibold text-zinc-200">Terminal Système</h3>
                    <p className="text-muted-foreground text-sm">
                        Accédez à votre NAS en ligne de commande directement depuis l'application via SSH.
                    </p>
                </div>
                <button 
                    onClick={() => setShowTerminal(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors shadow-lg shadow-blue-900/20"
                >
                    <TerminalSquare className="h-5 w-5" />
                    Connecter le Terminal
                </button>
            </div>
        )}
      </div>
    </div>
  );
}
