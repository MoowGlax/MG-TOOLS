import { useEffect, useRef } from 'react';
import { Terminal as Xterm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { toast } from 'sonner';

interface TerminalProps {
    config: {
        host: string;
        port?: number;
        user: string;
        password?: string;
    };
}

export function Terminal({ config }: TerminalProps) {
    const terminalRef = useRef<HTMLDivElement>(null);
    const xtermRef = useRef<Xterm | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);

    useEffect(() => {
        if (!terminalRef.current) return;

        // Initialize xterm
        const term = new Xterm({
            cursorBlink: true,
            theme: {
                background: '#18181b', // zinc-950
                foreground: '#e4e4e7', // zinc-200
                cursor: '#3b82f6',     // blue-500
            },
            fontFamily: 'Consolas, Monaco, "Courier New", monospace',
            fontSize: 14,
            allowProposedApi: true
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        
        // Don't open immediately - wait for dimensions
        // term.open(terminalRef.current);
        
        const safeFit = () => {
            // Check refs first
            if (!terminalRef.current || !xtermRef.current || !fitAddonRef.current) return;
            
            // Check visibility and presence in DOM
            if (!terminalRef.current.isConnected || terminalRef.current.clientWidth === 0) return;

            try {
                // Double check if fitAddon is attached (it should be)
                const dims = fitAddon.proposeDimensions();
                if (dims && dims.cols && dims.rows && !isNaN(dims.cols) && !isNaN(dims.rows)) {
                    fitAddon.fit();
                }
            } catch (e) {
                // Silently fail if dimensions are still calculating
            }
        };

        // Observe resize events on the container itself
        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
                     // Only open if not already opened
                     if (xtermRef.current && !xtermRef.current.element) {
                        xtermRef.current.open(terminalRef.current!);
                        requestAnimationFrame(() => safeFit());
                     } else {
                        // Debounce fit
                        requestAnimationFrame(() => safeFit());
                     }
                }
            }
        });
        
        if (terminalRef.current) {
            resizeObserver.observe(terminalRef.current);
        }

        // ... rest of the code ...
        xtermRef.current = term;
        fitAddonRef.current = fitAddon;

        // Handle window resizing
        const handleWindowResize = () => safeFit();
        window.addEventListener('resize', handleWindowResize);
        
        term.onResize((size) => {
            if (size && size.cols && size.rows) {
                window.electronAPI.ssh.resize(size.cols, size.rows);
            }
        });

        // Handle user input
        term.onData((data) => {
            window.electronAPI.ssh.write(data);
        });

        // Connect SSH
        const connect = async () => {
            try {
                await window.electronAPI.ssh.connect({
                    host: config.host,
                    port: 22,
                    username: config.user,
                    password: config.password,
                });
            } catch (e) {
                console.error(e);
                term.writeln('\r\nConnection failed.');
            }
        };

        // Listeners
        const removeDataListener = window.electronAPI.ssh.onData((data: string) => {
            term.write(data);
        });

        const removeStatusListener = window.electronAPI.ssh.onStatus((status: string) => {
            if (status === 'connected') {
                term.writeln('\r\nConnected to ' + config.host);
                // Initial resize sync
                setTimeout(() => {
                    safeFit();
                    try {
                        const dims = fitAddon.proposeDimensions();
                        if (dims) window.electronAPI.ssh.resize(dims.cols, dims.rows);
                    } catch (e) {
                        console.warn('Propose dimensions error:', e);
                    }
                }, 100);
            } else if (status === 'disconnected') {
                term.writeln('\r\nDisconnected.');
            }
        });

        const removeErrorListener = window.electronAPI.ssh.onError((error: string) => {
            term.writeln('\r\nError: ' + error);
            toast.error('SSH Error: ' + error);
        });

        connect();

        return () => {
            window.removeEventListener('resize', handleWindowResize);
            resizeObserver.disconnect();
            removeDataListener();
            removeStatusListener();
            removeErrorListener();
            window.electronAPI.ssh.disconnect();
            term.dispose();
        };
    }, [config]);

    return (
        <div className="w-full h-full bg-zinc-950 p-2 rounded-lg border border-zinc-800 overflow-hidden relative group">
            <div ref={terminalRef} className="w-full h-full" />
        </div>
    );
}
