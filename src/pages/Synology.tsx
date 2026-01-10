import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Server, Activity, HardDrive, Cpu, Power, AlertCircle, Terminal, RefreshCw, Lock, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';
import { confirmAction } from '../utils/confirm';
import { SynologyService } from '../services/synology';

export function Synology() {
  const navigate = useNavigate();
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [systemData, setSystemData] = useState<any>(null);
  const [command, setCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);

  useEffect(() => {
    const checkConfig = async () => {
      const url = await window.electronAPI.getCredentials('synology_url');
      if (!url) {
        setIsConfigured(false);
        setTimeout(() => {
          navigate('/settings', { state: { section: 'synology' } });
        }, 2000);
      } else {
        setIsConfigured(true);
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
  
  const handleCommand = (e: React.FormEvent) => {
      e.preventDefault();
      if (!command.trim()) return;
      
      const newHistory = [...commandHistory, `> ${command}`, 'Commande non supportée dans cette version (API limitée)'];
      setCommandHistory(newHistory);
      setCommand('');
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

  const { utilization, storage } = systemData;

  return (
    <div className="space-y-6 h-full flex flex-col">
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
                  {utilization.cpu.user + utilization.cpu.system}%
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-500" 
                    style={{ width: `${utilization.cpu.user + utilization.cpu.system}%` }} 
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
                  {utilization.memory.real_usage}%
              </div>
               <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-500" 
                    style={{ width: `${utilization.memory.real_usage}%` }} 
                  />
              </div>
              <div className="text-xs text-muted-foreground">
                  {Math.round((utilization.memory.total_real - utilization.memory.avail_real) / 1024 / 1024)} GB / {Math.round(utilization.memory.total_real / 1024 / 1024)} GB
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
                      <span>{(utilization.network.rx / 1024).toFixed(1)} KB/s</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1"><ArrowUp className="h-3 w-3" /> Up</span>
                      <span>{(utilization.network.tx / 1024).toFixed(1)} KB/s</span>
                  </div>
              </div>
          </div>

           {/* Disk */}
           <div className="bg-card border rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-sm font-medium">Disque</span>
                  <HardDrive className="h-4 w-4" />
              </div>
              <div className="text-sm text-muted-foreground">
                  {storage.disks?.length || 0} disque(s) détecté(s)
              </div>
          </div>
      </div>

      {/* Console */}
      <div className="flex-1 bg-zinc-950 rounded-lg border border-zinc-800 flex flex-col overflow-hidden font-mono text-sm min-h-[300px]">
          <div className="bg-zinc-900 px-4 py-2 border-b border-zinc-800 flex items-center gap-2">
              <Terminal className="h-4 w-4 text-zinc-400" />
              <span className="text-zinc-400">Console Sécurisée</span>
          </div>
          <div className="flex-1 p-4 overflow-auto space-y-1 text-zinc-300">
              <div className="text-zinc-500">Connexion établie avec {isConfigured ? 'Synology' : '...'}</div>
              {commandHistory.map((line, i) => (
                  <div key={i} className="whitespace-pre-wrap">{line}</div>
              ))}
          </div>
          <form onSubmit={handleCommand} className="p-2 bg-zinc-900 border-t border-zinc-800 flex gap-2">
              <span className="text-green-500 py-2 pl-2">❯</span>
              <input 
                  type="text" 
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-zinc-100 placeholder-zinc-600"
                  placeholder="Entrez une commande..."
              />
          </form>
      </div>
    </div>
  );
}
