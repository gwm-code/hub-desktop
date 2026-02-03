import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  showTerminal: boolean;
  setShowTerminal: (show: boolean) => void;
  isArtifactsOpen: boolean;
  setIsArtifactsOpen: (open: boolean) => void;
  serverUrl: string;
  setServerUrl: (url: string) => void;
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
    }),
    {
      name: 'hub-settings',
    }
  )
);
