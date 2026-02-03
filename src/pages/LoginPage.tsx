import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { createApi } from '../services/api';
import { Globe, Lock, Server } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { serverUrl, setServerUrl } = useSettingsStore();
  const [urlInput, setUrlInput] = useState(serverUrl);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const setToken = useAuthStore((state) => state.setToken);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Save the URL to the store first
    setServerUrl(urlInput);

    try {
      // Create API instance with the new URL
      const api = createApi();
      const response = await api.post('/api/auth/login', { password });
      setToken(response.data.token);
    } catch (err: any) {
      console.error('Login failed:', err);
      if (!err.response) {
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
                  <p className="mt-2 text-[10px] text-zinc-600 px-1">
                    Enter your server's public IP and API port (default 4000).
                  </p>
                </div>
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
          v1.0.0 Stable | Encrypted Connection
        </p>
      </div>
    </div>
  );
};
