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
      serverUrl: 'https://hub.gwmcode.com', // Default production URL
      setServerUrl: (url) => set({ serverUrl: url }),
      useSsh: false,
      setUseSsh: (useSsh) => set({ useSsh }),
      sshHost: '',
      setSshHost: (sshHost) => set({ sshHost }),
      sshUser: '',
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
