import { Client, ClientChannel } from 'ssh2';
import { BrowserWindow } from 'electron';
import * as fs from 'fs';

interface SshSession {
    id: string;
    client: Client;
    stream: ClientChannel | null;
    historyBuffer: string;
    debugLog: string[];
    config: {
        host: string;
        port: number;
        username: string;
    };
    connectionState: 'disconnected' | 'connecting' | 'connected';
}

export class SshService {
  private sessions: Map<string, SshSession> = new Map();
  private window: BrowserWindow | null = null;

  constructor(window: BrowserWindow) {
    this.window = window;
  }

  // Check if a session exists and is connected
  isConnected(sessionId: string): boolean {
      const session = this.sessions.get(sessionId);
      return !!session && session.connectionState === 'connected';
  }

  private log(sessionId: string, msg: string) {
      const session = this.sessions.get(sessionId);
      if (session) {
          session.debugLog.push(`[${new Date().toISOString()}] ${msg}`);
          if (session.debugLog.length > 50) session.debugLog.shift();
      }
      console.log(`[SSH ${sessionId}] ${msg}`);
  }

  // Re-emit history to the renderer for a specific session
  reattach(sessionId: string) {
      const session = this.sessions.get(sessionId);
      this.log(sessionId, `Reattaching session ${sessionId}: hasSession=${!!session}, hasBuffer=${!!session?.historyBuffer}, bufferLen=${session?.historyBuffer?.length}`);
      
      if (session && session.historyBuffer && this.window) {
          this.window.webContents.send('ssh:data', sessionId, session.historyBuffer);
      }
      if (this.isConnected(sessionId)) {
          this.window?.webContents.send('ssh:status', sessionId, 'connected');
      }
  }

  connect(sessionId: string, config: { host: string; port: number; username: string; password?: string; privateKey?: string }) {
    let session = this.sessions.get(sessionId);

    // If session exists
    if (session) {
        // If already connected to the same host
        if (session.config.host === config.host && session.config.username === config.username) {
             if (session.connectionState === 'connected') {
                 this.reattach(sessionId);
                 return;
             }
             if (session.connectionState === 'connecting') {
                 return; // Already connecting
             }
        }
        // If different config or disconnected, disconnect first
        this.disconnect(sessionId);
    }

    // Create new session
    const client = new Client();
    session = {
        id: sessionId,
        client,
        stream: null,
        historyBuffer: '',
        debugLog: [],
        config: {
            host: config.host,
            port: config.port || 22,
            username: config.username
        },
        connectionState: 'connecting'
    };
    this.sessions.set(sessionId, session);

    // Helper to log debug info
    const logDebug = (msg: string) => {
        const s = this.sessions.get(sessionId);
        if (s) {
            s.debugLog.push(`[${new Date().toISOString()}] ${msg}`);
            if (s.debugLog.length > 50) s.debugLog.shift(); // Keep last 50 lines
            console.log(`[SSH ${sessionId}] ${msg}`);
        }
    };

    client.on('ready', () => {
      logDebug('Client ready');
      const currentSession = this.sessions.get(sessionId);
      if (!currentSession) return;

      currentSession.connectionState = 'connected';
      this.window?.webContents.send('ssh:status', sessionId, 'connected');
      
      client.shell((err, stream) => {
        if (err) {
            const errorMsg = 'Failed to start shell: ' + err.message;
            logDebug(errorMsg);
            this.window?.webContents.send('ssh:error', sessionId, errorMsg);
            this.disconnect(sessionId);
            return;
        }
        
        logDebug('Shell started');
        currentSession.stream = stream;
        
        stream.on('close', () => {
          logDebug('Stream closed');
          this.disconnect(sessionId);
        }).on('data', (data: any) => {
          const str = data.toString();
          // Keep last 100KB of history
          currentSession.historyBuffer += str;
          if (currentSession.historyBuffer.length > 100000) {
              currentSession.historyBuffer = currentSession.historyBuffer.substring(currentSession.historyBuffer.length - 100000);
          }
          this.window?.webContents.send('ssh:data', sessionId, str);
        });
      });
    });

    client.on('error', (err: any) => {
        // Suppress ECONNRESET errors
        if (err.code === 'ECONNRESET' || err.message.includes('ECONNRESET')) {
            return;
        }

        const currentSession = this.sessions.get(sessionId);
        const debugInfo = currentSession ? '\nDebug Log:\n' + currentSession.debugLog.join('\n') : '';
        
        console.error(`SSH Client Error (${sessionId}):`, err);
        if (currentSession) {
             this.window?.webContents.send('ssh:error', sessionId, err.message + debugInfo);
             this.disconnect(sessionId);
        }
    });

    client.on('end', () => {
        logDebug('Client ended');
        const currentSession = this.sessions.get(sessionId);
        if (currentSession) {
            this.disconnect(sessionId);
        }
    });
    
    client.on('close', () => {
        logDebug('Client closed');
        const currentSession = this.sessions.get(sessionId);
        if (currentSession) {
            this.window?.webContents.send('ssh:status', sessionId, 'disconnected');
            this.cleanup(sessionId);
        }
    });

    client.on('banner', (message) => {
        logDebug(`Banner: ${message}`);
    });

    client.on('keyboard-interactive', (name, instructions, instructionsLang, prompts, finish) => {
        logDebug(`Keyboard-interactive: name=${name}, instructions=${instructions}, prompts=${prompts.length}`);
        prompts.forEach((p, i) => logDebug(`Prompt ${i}: ${p.prompt} (echo: ${p.echo})`));

        if (config.password) {
            // Debian et d'autres distros demandent souvent le mot de passe via keyboard-interactive
            // Si on a un mot de passe, on l'envoie pour chaque prompt
            finish(prompts.map(() => config.password!));
        } else {
            finish([]);
        }
    });

    try {
        logDebug(`Configuring connection: host=${config.host}, user=${config.username}, passwordLen=${config.password?.length || 0}, hasKey=${!!config.privateKey}`);

        const connectConfig: any = {
            host: config.host,
            port: config.port || 22,
            username: config.username.trim(),
            password: config.password,
            tryKeyboard: true, // Enable keyboard-interactive for servers that require it (e.g. Debian with PAM)
            keepaliveInterval: 10000, 
            readyTimeout: 30000,
            // Explicitly support all algorithms to avoid negotiation failures
            algorithms: {
                kex: ['curve25519-sha256', 'curve25519-sha256@libssh.org', 'ecdh-sha2-nistp256', 'ecdh-sha2-nistp384', 'ecdh-sha2-nistp521', 'diffie-hellman-group-exchange-sha256', 'diffie-hellman-group14-sha256'],
                cipher: ['aes128-ctr', 'aes192-ctr', 'aes256-ctr', 'aes128-gcm', 'aes128-gcm@openssh.com', 'aes256-gcm', 'aes256-gcm@openssh.com'],
                serverHostKey: ['ssh-ed25519', 'ecdsa-sha2-nistp256', 'ecdsa-sha2-nistp384', 'ecdsa-sha2-nistp521', 'rsa-sha2-512', 'rsa-sha2-256', 'ssh-rsa'],
                hmac: ['hmac-sha2-256-etm@openssh.com', 'hmac-sha2-512-etm@openssh.com', 'hmac-sha1-etm@openssh.com', 'hmac-sha2-256', 'hmac-sha2-512', 'hmac-sha1']
            },
            debug: (msg: string) => {
                if (msg.includes('DEBUG: Parser:')) return; 
                logDebug(msg);
            }
        };

        if (config.privateKey) {
            try {
                if (fs.existsSync(config.privateKey)) {
                    logDebug(`Reading private key from ${config.privateKey}`);
                    connectConfig.privateKey = fs.readFileSync(config.privateKey);
                } else {
                    logDebug('Using provided private key content');
                    connectConfig.privateKey = config.privateKey;
                }
                // Use password as passphrase if provided
                if (config.password) {
                    connectConfig.passphrase = config.password;
                }
            } catch (e) {
                logDebug(`Failed to read private key file: ${e}`);
                connectConfig.privateKey = config.privateKey;
                if (config.password) {
                    connectConfig.passphrase = config.password;
                }
            }
        }

        logDebug(`Connecting to ${config.username}@${config.host}:${connectConfig.port}`);
        client.connect(connectConfig);
    } catch (e: any) {
        const currentSession = this.sessions.get(sessionId);
        const debugInfo = currentSession ? '\nDebug Log:\n' + currentSession.debugLog.join('\n') : '';
        this.window?.webContents.send('ssh:error', sessionId, e.message + debugInfo);
        this.cleanup(sessionId);
    }
  }

  write(sessionId: string, data: string) {
    const session = this.sessions.get(sessionId);
    if (session && session.stream) {
      session.stream.write(data);
    }
  }

  resize(sessionId: string, cols: number, rows: number) {
    const session = this.sessions.get(sessionId);
    if (session && session.stream) {
      session.stream.setWindow(rows, cols, 0, 0);
    }
  }

  private cleanup(sessionId: string) {
      this.sessions.delete(sessionId);
  }

  disconnect(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (session) {
      if (session.client) {
          session.client.end();
          // 'close' event will handle cleanup and notification
      } else {
          this.cleanup(sessionId);
      }
    }
  }
}
