import { useState, useEffect } from 'react';
import type { ChangeEvent } from 'react';
import { Terminal } from '../components/ui/Terminal';
import { Plus, X, Server, TerminalSquare, Trash2, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

interface SshProfile {
    id: string;
    name: string;
    host: string;
    port: number;
    username: string;
    password?: string;
    privateKey?: string;
}

interface ActiveSession {
    id: string;
    profileId: string;
    name: string;
}

export function SshManager() {
    const [profiles, setProfiles] = useState<SshProfile[]>([]);
    const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
    const [activeTabId, setActiveTabId] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [showProfileDialog, setShowProfileDialog] = useState(false);
    
    // Form state
    const [formData, setFormData] = useState<Partial<SshProfile>>({
        port: 22,
        username: 'root'
    });

    useEffect(() => {
        loadProfiles();
        const storedSessions = localStorage.getItem('ssh_active_sessions');
        const storedActiveTab = localStorage.getItem('ssh_active_tab');
        
        if (storedSessions) {
            try {
                const sessions = JSON.parse(storedSessions);
                setActiveSessions(sessions);
                if (storedActiveTab && sessions.some((s: any) => s.id === storedActiveTab)) {
                    setActiveTabId(storedActiveTab);
                } else if (sessions.length > 0) {
                    setActiveTabId(sessions[0].id);
                }
            } catch (e) {}
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('ssh_active_sessions', JSON.stringify(activeSessions));
        if (activeTabId) {
            localStorage.setItem('ssh_active_tab', activeTabId);
        }
    }, [activeSessions, activeTabId]);

    const loadProfiles = async () => {
        try {
            // Try to load encrypted profiles first
            const encrypted = await window.electronAPI.getCredentials('ssh_profiles');
            if (encrypted) {
                try {
                    const parsed = JSON.parse(encrypted);
                    setProfiles(parsed);
                    return;
                } catch (e) {
                    console.error('Failed to parse encrypted SSH profiles', e);
                }
            }

            // Fallback: Check for legacy unencrypted profiles (migration)
            const legacy = await window.electronAPI.getData('ssh_profiles') as SshProfile[];
            if (legacy && Array.isArray(legacy) && legacy.length > 0) {
                console.log('Migrating SSH profiles to encrypted storage...');
                // Migrate to encrypted storage
                await window.electronAPI.saveCredentials('ssh_profiles', JSON.stringify(legacy));
                // We don't delete legacy data automatically to be safe, or we could overwrite it with empty
                // await window.electronAPI.saveData('ssh_profiles', null); 
                setProfiles(legacy);
                toast.success('Profils SSH migrés vers le stockage sécurisé');
            }
        } catch (e) {
            console.error('Failed to load SSH profiles', e);
        }
    };

    const saveProfiles = async (newProfiles: SshProfile[]) => {
        setProfiles(newProfiles);
        // Always save encrypted
        await window.electronAPI.saveCredentials('ssh_profiles', JSON.stringify(newProfiles));
    };

    const handleSaveProfile = async () => {
        if (!formData.name || !formData.host || !formData.username) {
            toast.error('Veuillez remplir les champs obligatoires');
            return;
        }

        const newProfile: SshProfile = {
            id: isEditing || crypto.randomUUID(),
            name: formData.name,
            host: formData.host,
            port: formData.port || 22,
            username: formData.username,
            password: formData.password,
            privateKey: formData.privateKey
        };

        let newProfiles;
        if (isEditing) {
            newProfiles = profiles.map(p => p.id === isEditing ? newProfile : p);
            toast.success('Profil mis à jour');
        } else {
            newProfiles = [...profiles, newProfile];
            toast.success('Profil créé');
        }

        await saveProfiles(newProfiles);
        setShowProfileDialog(false);
        setFormData({ port: 22, username: 'root' });
        setIsEditing(null);
    };

    const handleDeleteProfile = async (id: string) => {
        if (confirm('Êtes-vous sûr de vouloir supprimer ce profil ?')) {
            const newProfiles = profiles.filter(p => p.id !== id);
            await saveProfiles(newProfiles);
            toast.success('Profil supprimé');
        }
    };

    const handleEditProfile = (profile: SshProfile) => {
        setFormData(profile);
        setIsEditing(profile.id);
        setShowProfileDialog(true);
    };

    const connectToProfile = (profile: SshProfile) => {
        const sessionId = `ssh-session-${Date.now()}`;
        const newSession: ActiveSession = {
            id: sessionId,
            profileId: profile.id,
            name: profile.name
        };

        setActiveSessions([...activeSessions, newSession]);
        setActiveTabId(sessionId);
    };

    const closeSession = async (sessionId: string) => {
        await window.electronAPI.ssh.disconnect(sessionId);
        const newSessions = activeSessions.filter(s => s.id !== sessionId);
        setActiveSessions(newSessions);
        if (activeTabId === sessionId) {
            setActiveTabId(newSessions.length > 0 ? newSessions[newSessions.length - 1].id : null);
        }
    };

    return (
        <div className="flex h-full gap-4">
            {/* Sidebar / Profiles List */}
            <div className="w-64 flex flex-col gap-4 border-r border-zinc-800 pr-4">
                <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-lg flex items-center gap-2">
                        <Server className="h-5 w-5" />
                        Connexions
                    </h2>
                    <button 
                        className="p-2 hover:bg-zinc-800 rounded-md transition-colors"
                        onClick={() => {
                            setFormData({ port: 22, username: 'root' });
                            setIsEditing(null);
                            setShowProfileDialog(true);
                        }}
                    >
                        <Plus className="h-4 w-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2">
                    {profiles.map(profile => (
                        <div key={profile.id} className="group flex items-center justify-between p-3 rounded-lg border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 transition-colors">
                            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => connectToProfile(profile)}>
                                <div className="font-medium truncate">{profile.name}</div>
                                <div className="text-xs text-muted-foreground truncate">
                                    {profile.username}@{profile.host}
                                </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    className="p-1.5 hover:bg-zinc-800 rounded-md transition-colors"
                                    onClick={() => handleEditProfile(profile)}
                                >
                                    <Edit2 className="h-3 w-3" />
                                </button>
                                <button 
                                    className="p-1.5 hover:bg-red-900/50 hover:text-red-500 rounded-md transition-colors"
                                    onClick={() => handleDeleteProfile(profile.id)}
                                >
                                    <Trash2 className="h-3 w-3" />
                                </button>
                            </div>
                        </div>
                    ))}

                    {profiles.length === 0 && (
                        <div className="text-center p-4 text-muted-foreground text-sm border border-dashed border-zinc-800 rounded-lg">
                            Aucun profil configuré
                        </div>
                    )}
                </div>
            </div>

            {/* Main Area / Tabs */}
            <div className="flex-1 flex flex-col min-w-0 bg-zinc-950 rounded-lg border border-zinc-800 overflow-hidden">
                {/* Tabs Header */}
                <div className="flex items-center border-b border-zinc-800 bg-zinc-900/50 overflow-x-auto">
                    {activeSessions.map(session => (
                        <div 
                            key={session.id}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 text-sm border-r border-zinc-800 cursor-pointer min-w-[150px] max-w-[200px] group select-none",
                                activeTabId === session.id ? "bg-zinc-800 text-white font-medium" : "hover:bg-zinc-900 text-zinc-400"
                            )}
                            onClick={() => setActiveTabId(session.id)}
                        >
                            <TerminalSquare className="h-4 w-4 shrink-0" />
                            <span className="truncate flex-1">{session.name}</span>
                            <div 
                                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-zinc-700 transition-all"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    closeSession(session.id);
                                }}
                            >
                                <X className="h-3 w-3" />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="flex-1 relative bg-zinc-950">
                    {activeSessions.length > 0 ? (
                        activeSessions.map(session => {
                            const profile = profiles.find(p => p.id === session.profileId);
                            if (!profile) return null;
                            
                            // Keep all terminals mounted but hidden when inactive
                            // This preserves the xterm instance and connection state
                            const isActive = activeTabId === session.id;

                            return (
                                <div 
                                    key={session.id} 
                                    className={cn("absolute inset-0 w-full h-full z-10", !isActive && "hidden")}
                                >
                                    <Terminal 
                                        sessionId={session.id} 
                                        config={{
                                            host: profile.host,
                                            port: profile.port,
                                            user: profile.username,
                                            password: profile.password || undefined,
                                            privateKey: profile.privateKey || undefined
                                        }} 
                                    />
                                </div>
                            );
                        })
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-4">
                            <div className="p-4 rounded-full bg-zinc-900 border border-zinc-800">
                                <TerminalSquare className="h-12 w-12" />
                            </div>
                            <div className="text-center">
                                <h3 className="text-lg font-medium text-zinc-300">Aucune session active</h3>
                                <p className="text-sm">Sélectionnez un profil pour démarrer une connexion SSH</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Profile Modal */}
            {showProfileDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-card w-full max-w-md p-6 rounded-lg border border-zinc-800 shadow-xl space-y-5 animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                            <h3 className="text-lg font-semibold">{isEditing ? 'Modifier le profil' : 'Nouveau profil SSH'}</h3>
                            <button onClick={() => setShowProfileDialog(false)} className="text-muted-foreground hover:text-foreground">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Nom du profil</label>
                                <input 
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                    placeholder="Mon Serveur" 
                                    value={formData.name || ''} 
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({...formData, name: e.target.value})} 
                                />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-2 space-y-2">
                                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Hôte (IP/Domaine)</label>
                                    <input 
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                        placeholder="192.168.1.x" 
                                        value={formData.host || ''} 
                                        onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({...formData, host: e.target.value})} 
                                />
                            </div>
                            <div className="space-y-2">
                                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Port</label>
                                    <input 
                                        type="number" 
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                        placeholder="22" 
                                        value={formData.port || 22} 
                                        onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({...formData, port: parseInt(e.target.value)})} 
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Nom d'utilisateur</label>
                                <input 
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                    placeholder="root" 
                                    value={formData.username || ''} 
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({...formData, username: e.target.value})} 
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Mot de passe</label>
                                <input 
                                    type="password" 
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                    placeholder="Optionnel si clé SSH" 
                                    value={formData.password || ''} 
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({...formData, password: e.target.value})} 
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Clé privée (Chemin)</label>
                                <input 
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                    placeholder="C:/Users/name/.ssh/id_rsa" 
                                    value={formData.privateKey || ''} 
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({...formData, privateKey: e.target.value})} 
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <button 
                                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
                                onClick={() => setShowProfileDialog(false)}
                            >
                                Annuler
                            </button>
                            <button 
                                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2"
                                onClick={handleSaveProfile}
                            >
                                Enregistrer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
