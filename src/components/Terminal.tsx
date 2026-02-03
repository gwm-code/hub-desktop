import React, { useEffect, useRef } from 'react';
import { Terminal as Xterm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { useAuthStore } from '../store/useAuthStore';

import { getSocket } from '../services/socket';

export const Terminal: React.FC = () => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Xterm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    if (!terminalRef.current || !token) return;

    const socket = getSocket(token);
    if (!socket) return;

    const term = new Xterm({
      theme: {
        background: '#18181b', // zinc-900
        foreground: '#e4e4e7', // zinc-200
        cursor: '#a1a1aa', // zinc-400
      },
      fontFamily: 'JetBrains Mono, Menlo, Monaco, "Courier New", monospace',
      fontSize: 13,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    
    // Delay fit to ensure container is rendered and has final dimensions
    const timer = setTimeout(() => {
      if (fitAddon && term) {
        fitAddon.fit();
        socket.emit('terminal.resize', {
          cols: term.cols,
          rows: term.rows,
        });
      }
    }, 200);

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    socket.on('terminal.output', (data: string) => {
      term.write(data);
    });

    term.onData((data) => {
      socket.emit('terminal.input', data);
    });

    term.onResize(({ cols, rows }) => {
      socket.emit('terminal.resize', { cols, rows });
    });

    const handleResize = () => {
      if (!fitAddon || !term || !term.element) return;
      try {
        fitAddon.fit();
        socket.emit('terminal.resize', {
          cols: term.cols,
          rows: term.rows,
        });
      } catch (e) {
        // Silently catch dimension errors if renderer isn't ready
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        handleResize();
      });
    });
    resizeObserver.observe(terminalRef.current);

    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      socket.off('terminal.output');
      term.dispose();
    };
  }, [token]);

  return (
    <div className="w-full h-full bg-zinc-900 overflow-hidden">
      <div ref={terminalRef} className="w-full h-full p-2" />
    </div>
  );
};
