import { create } from 'zustand';

interface EditorState {
  activeFile: string | null;
  isLiveEditEnabled: boolean;
  setActiveFile: (path: string | null) => void;
  setLiveEditEnabled: (enabled: boolean) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  activeFile: null,
  isLiveEditEnabled: false,
  setActiveFile: (path) => set({ activeFile: path }),
  setLiveEditEnabled: (enabled) => set({ isLiveEditEnabled: enabled }),
}));
