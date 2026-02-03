import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  showTerminal: boolean;
  setShowTerminal: (show: boolean) => void;
  isArtifactsOpen: boolean;
  setIsArtifactsOpen: (open: boolean) => void;
  serverUrl: string;
  setServerUrl: (url: string) => void;
  useSsh: boolean;
  setUseSsh: (useSsh: boolean) => void;
  sshHost: string;
  setSshHost: (host: string) => void;
  sshUser: string;
  setSshUser: (user: string) => void;
  sshPort: number;
  setSshPort: (port: number) => void;
  sshPassword: string;
  setSshPassword: (password: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      showTerminal: false,
      setShowTerminal: (show) => set({ showTerminal: show }),
      isArtifactsOpen: false,
      setIsArtifactsOpen: (open) => set({ isArtifactsOpen: open }),
      serverUrl: 'http://localhost:4000', // Default to localhost for SSH tunneling
      setServerUrl: (url) => set({ serverUrl: url }),
      useSsh: true, // Default to SSH tunneling for remote users
      sshHost: '89.167.14.222',
      setSshHost: (sshHost) => set({ sshHost }),
      sshUser: 'root',
      setSshUser: (sshUser) => set({ sshUser }),
      sshPort: 22,
      setSshPort: (sshPort) => set({ sshPort }),
      sshPassword: '',
      setSshPassword: (sshPassword) => set({ sshPassword }),
    }),
    {
      name: 'hub-settings',
    }
  )
);
