import React, { useState } from 'react';
import { X, Globe, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { useSettingsStore } from '../store/useSettingsStore';
import api from '../services/api';

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const { serverUrl, setServerUrl } = useSettingsStore();
  const [url, setUrl] = useState(serverUrl);
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'latest' | 'error'>('idle');
  const [serverVersion, setServerVersion] = useState<string | null>(null);
  const currentVersion = '1.0.0';

  const handleSave = () => {
    setServerUrl(url);
    onClose();
  };

  const checkUpdates = async () => {
    setUpdateStatus('checking');
    try {
      // Comparing with a version.json on the server as requested
      const response = await api.get('/version.json');
      const latestVersion = response.data.version;
      setServerVersion(latestVersion);
      
      if (latestVersion !== currentVersion) {
        setUpdateStatus('available');
      } else {
        setUpdateStatus('latest');
      }
    } catch (err) {
      console.error('Update check failed:', err);
      setUpdateStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            Settings
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
              <Globe size={14} />
              Server URL
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
              placeholder="https://your-server-ip:4000"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <p className="text-xs text-zinc-500">
              The API server GWMCode Hub Desktop will connect to.
            </p>
          </div>

          <div className="pt-4 border-t border-zinc-800">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium">App Version</p>
                <p className="text-xs text-zinc-500">v{currentVersion}</p>
              </div>
              <button
                onClick={checkUpdates}
                disabled={updateStatus === 'checking'}
                className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
              >
                <RefreshCw size={14} className={updateStatus === 'checking' ? 'animate-spin' : ''} />
                Check for Updates
              </button>
            </div>

            {updateStatus === 'available' && (
              <div className="flex items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400 text-xs">
                <AlertCircle size={14} />
                <span>Update available: <strong>v{serverVersion}</strong> is now out!</span>
              </div>
            )}

            {updateStatus === 'latest' && (
              <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-xs">
                <CheckCircle size={14} />
                <span>You are running the latest version.</span>
              </div>
            )}

            {updateStatus === 'error' && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs">
                <AlertCircle size={14} />
                <span>Could not connect to server to check for updates.</span>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 bg-zinc-900/50 border-t border-zinc-800 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
