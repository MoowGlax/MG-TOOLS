import { Client, ClientChannel } from 'ssh2';
import { BrowserWindow } from 'electron';

export class SshService {
  private client: Client | null = null;
  private stream: ClientChannel | null = null;
  private window: BrowserWindow | null = null;
  private historyBuffer: string = '';
  private currentHost: string | null = null;
  private connectionState: 'disconnected' | 'connecting' | 'connected' = 'disconnected';

  constructor(window: BrowserWindow) {
    this.window = window;
  }

  // Check if connected to the requested host
  isConnected(host: string): boolean {
      return this.connectionState === 'connected' && this.currentHost === host;
  }

  // Re-emit history to the renderer
  reattach() {
      if (this.historyBuffer && this.window) {
          this.window.webContents.send('ssh:data', this.historyBuffer);
      }
      if (this.isConnected(this.currentHost || '')) {
          this.window?.webContents.send('ssh:status', 'connected');
      }
  }

  connect(config: { host: string; port: number; username: string; password?: string; privateKey?: string }) {
    // If already connected or connecting to the same host
    if (this.currentHost === config.host) {
        if (this.connectionState === 'connected') {
            this.reattach();
            return;
        }
        if (this.connectionState === 'connecting') {
            return; // Already connecting, let it finish
        }
    }

    if (this.client) {
        this.disconnect();
    }

    this.currentHost = config.host;
    this.connectionState = 'connecting';
    this.historyBuffer = ''; // Reset buffer on new connection
    this.client = new Client();

    this.client.on('ready', () => {
      this.connectionState = 'connected';
      this.window?.webContents.send('ssh:status', 'connected');
      
      this.client?.shell((err, stream) => {
        if (err) {
            this.window?.webContents.send('ssh:error', 'Failed to start shell: ' + err.message);
            this.disconnect();
            return;
        }
        
        this.stream = stream;
        
        stream.on('close', () => {
          this.disconnect();
        }).on('data', (data: any) => {
          const str = data.toString();
          // Keep last 100KB of history
          this.historyBuffer += str;
          if (this.historyBuffer.length > 100000) {
              this.historyBuffer = this.historyBuffer.substring(this.historyBuffer.length - 100000);
          }
          this.window?.webContents.send('ssh:data', str);
        });
      });
    });

    this.client.on('error', (err: any) => {
        // Suppress ECONNRESET errors as they often occur during connection retries or rapid disconnects
        if (err.code === 'ECONNRESET' || err.message.includes('ECONNRESET')) {
            return;
        }

        console.error('SSH Client Error:', err);
        this.window?.webContents.send('ssh:error', err.message);
        this.window?.webContents.send('ssh:status', 'disconnected');
        this.currentHost = null;
    });

    this.client.on('end', () => {
        this.window?.webContents.send('ssh:status', 'disconnected');
        this.currentHost = null;
    });
    
    this.client.on('close', () => {
        this.window?.webContents.send('ssh:status', 'disconnected');
        this.currentHost = null;
    });

    this.client.on('keyboard-interactive', (name, instructions, instructionsLang, prompts, finish) => {
        // Handle keyboard-interactive auth if server requests it
        if (config.password && prompts.length > 0) {
            // Auto-fill password if available
            finish([config.password]);
        } else {
            finish([]);
        }
    });

    try {
        const connectConfig: any = {
            host: config.host,
            port: config.port || 22,
            username: config.username,
            password: config.password,
            keepaliveInterval: 0, // Disable keepalive to prevent ECONNRESET
            readyTimeout: 20000,
            // Broad algorithm support
            algorithms: {
                kex: [
                    "curve25519-sha256", "curve25519-sha256@libssh.org",
                    "ecdh-sha2-nistp256", "ecdh-sha2-nistp384", "ecdh-sha2-nistp521",
                    "diffie-hellman-group-exchange-sha256", 
                    "diffie-hellman-group14-sha256", "diffie-hellman-group14-sha1",
                    "diffie-hellman-group1-sha1"
                ],
                cipher: [
                    "aes128-ctr", "aes192-ctr", "aes256-ctr",
                    "aes128-gcm", "aes128-gcm@openssh.com",
                    "aes256-gcm", "aes256-gcm@openssh.com",
                    "aes128-cbc", "aes256-cbc", "3des-cbc"
                ]
            }
        };

        if (config.privateKey) {
            connectConfig.privateKey = config.privateKey;
        }

        this.client.connect(connectConfig);
    } catch (e: any) {
        this.window?.webContents.send('ssh:error', e.message);
    }
  }

  write(data: string) {
    if (this.stream) {
      this.stream.write(data);
    }
  }

  resize(cols: number, rows: number) {
    if (this.stream) {
      this.stream.setWindow(rows, cols, 0, 0);
    }
  }

  private cleanup() {
      this.client = null;
      this.stream = null;
      this.currentHost = null;
      this.connectionState = 'disconnected';
  }

  disconnect() {
    if (this.client) {
      this.client.end();
      // 'close' event will handle cleanup and notification
    } else {
        this.cleanup();
    }
  }
}
