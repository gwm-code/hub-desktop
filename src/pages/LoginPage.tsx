import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { createApi } from '../services/api';
import { Globe, Lock, Server, Shield, Key } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

export const LoginPage: React.FC = () => {
  const { 
    serverUrl, setServerUrl,
    useSsh, setUseSsh,
    sshHost, setSshHost,
    sshUser, setSshUser,
    sshPort, setSshPort,
    sshPassword, setSshPassword
  } = useSettingsStore();

  const [urlInput, setUrlInput] = useState(serverUrl);
  const [password, setPassword] = useState('');
  const [sshKey, setSshKey] = useState('');
  const [useKeyAuth, setUseKeyAuth] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const setToken = useAuthStore((state) => state.setToken);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      if (useSsh) {
        setError('Establishing SSH Tunnel...');
        await invoke('start_ssh_tunnel', {
          host: sshHost,
          port: sshPort,
          username: sshUser,
          password: useKeyAuth ? null : (sshPassword || null),
          privateKey: useKeyAuth ? (sshKey || null) : null
        });
        // Override server URL to localhost for SSH tunnel
        const tunnelUrl = 'http://localhost:4000';
        setServerUrl(tunnelUrl);
        setUrlInput(tunnelUrl);
      } else {
        setServerUrl(urlInput);
      }

      // Create API instance with the new URL
      const api = createApi();
      const response = await api.post('/api/auth/login', { password });
      setToken(response.data.token);
    } catch (err: any) {
      console.error('Login failed:', err);
      if (typeof err === 'string') {
        setError(`SSH Error: ${err}`);
      } else if (!err.response) {
        setError('Could not connect to server. Check the URL.');
      } else {
        setError(err.response?.data?.error || 'Invalid password');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white p-4">
      <div className="w-full max-w-md p-8 space-y-8 bg-zinc-900 rounded-2xl border border-zinc-800 shadow-2xl">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-blue-600/10 rounded-xl mb-2">
            <Lock className="text-blue-500" size={32} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">GWMCode Hub</h1>
          <p className="text-zinc-400 text-sm italic">Sovereign Desktop Interface</p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">
                Master Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  autoFocus
                  className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all pl-11"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
              </div>
            </div>

            <div className="pt-2">
              <button 
                type="button" 
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors uppercase tracking-widest flex items-center gap-1"
              >
                {showAdvanced ? 'Hide Connection Settings' : 'Connection Settings'}
              </button>
            </div>

            {showAdvanced && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-center gap-2 mb-4 p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
                  <input
                    type="checkbox"
                    id="useSsh"
                    checked={useSsh}
                    onChange={(e) => setUseSsh(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="useSsh" className="text-sm font-medium text-zinc-300 flex items-center gap-2 cursor-pointer">
                    <Shield size={14} className="text-blue-500" />
                    Use SSH Tunnel
                  </label>
                </div>

                {useSsh ? (
                  <div className="space-y-3 p-3 bg-zinc-950/50 border border-zinc-800 rounded-xl">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-semibold text-zinc-500 uppercase mb-1 block">Host</label>
                        <input
                          type="text"
                          value={sshHost}
                          onChange={(e) => setSshHost(e.target.value)}
                          className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                          placeholder="1.2.3.4"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-zinc-500 uppercase mb-1 block">Port</label>
                        <input
                          type="number"
                          value={sshPort}
                          onChange={(e) => setSshPort(parseInt(e.target.value))}
                          className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-zinc-500 uppercase mb-1 block">Username</label>
                      <input
                        type="text"
                        value={sshUser}
                        onChange={(e) => setSshUser(e.target.value)}
                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                        placeholder="root"
                      />
                    </div>
                    
                    <div className="flex items-center gap-2 py-1">
                      <input
                        type="checkbox"
                        id="useKeyAuth"
                        checked={useKeyAuth}
                        onChange={(e) => setUseKeyAuth(e.target.checked)}
                        className="w-3 h-3 rounded border-zinc-700 bg-zinc-900 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="useKeyAuth" className="text-[10px] font-semibold text-zinc-500 uppercase cursor-pointer">
                        Use SSH Key instead of password
                      </label>
                    </div>

                    {useKeyAuth ? (
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-zinc-500 uppercase mb-1 block">Private Key Content</label>
                        <textarea
                          rows={4}
                          value={sshKey}
                          onChange={(e) => setSshKey(e.target.value)}
                          className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-[10px] font-mono focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                          placeholder="-----BEGIN OPENSSH PRIVATE KEY-----..."
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="text-[10px] font-semibold text-zinc-500 uppercase mb-1 block">SSH Password</label>
                        <input
                          type="password"
                          value={sshPassword}
                          onChange={(e) => setSshPassword(e.target.value)}
                          className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                          placeholder="••••••••"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">
                      Server Address
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all pl-11 text-sm font-mono"
                        placeholder="http://your-ip:4000"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                      />
                      <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs text-center flex items-center justify-center gap-2">
              <Server size={14} />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:text-zinc-400 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Connecting...
              </>
            ) : (
              'Unlock Hub'
            )}
          </button>
        </form>

        <p className="text-[10px] text-center text-zinc-700">
          v1.2.0 Stable | SSH Key Auth Enabled
        </p>
      </div>
    </div>
  );
};
