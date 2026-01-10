import { Client, ClientChannel } from 'ssh2';
import { BrowserWindow } from 'electron';

export class SshService {
  private client: Client | null = null;
  private stream: ClientChannel | null = null;
  private window: BrowserWindow | null = null;

  constructor(window: BrowserWindow) {
    this.window = window;
  }

  connect(config: { host: string; port: number; username: string; password?: string; privateKey?: string }) {
    if (this.client) {
        this.disconnect();
    }

    this.client = new Client();

    this.client.on('ready', () => {
      this.window?.webContents.send('ssh:status', 'connected');
      
      this.client?.shell((err, stream) => {
        if (err) {
            this.window?.webContents.send('ssh:error', 'Failed to start shell: ' + err.message);
            return;
        }
        
        this.stream = stream;
        
        stream.on('close', () => {
          this.client?.end();
          this.window?.webContents.send('ssh:status', 'disconnected');
        }).on('data', (data: any) => {
          this.window?.webContents.send('ssh:data', data.toString());
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
    });

    this.client.on('end', () => {
        this.window?.webContents.send('ssh:status', 'disconnected');
    });
    
    this.client.on('close', () => {
        this.window?.webContents.send('ssh:status', 'disconnected');
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

  disconnect() {
    if (this.client) {
      this.client.end();
      this.client = null;
      this.stream = null;
    }
  }
}
