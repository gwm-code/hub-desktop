import { create } from 'zustand';
import { useAuthStore } from './useAuthStore';
import { useSettingsStore } from './useSettingsStore';
import axios from 'axios';

const getApi = () => {
  const { serverUrl } = useSettingsStore.getState();
  return axios.create({ baseURL: serverUrl });
};

interface FileItem {
  name: string;
  isDirectory: boolean;
  path: string;
  size: number;
  mtime: string;
}

interface FileStore {
  currentPath: string;
  files: FileItem[];
  isLoading: boolean;
  error: string | null;
  fetchFiles: (path?: string) => Promise<void>;
  readFile: (path: string) => Promise<string>;
  writeFile: (path: string, content: string) => Promise<void>;
  deleteFile: (path: string) => Promise<void>;
  renameFile: (oldPath: string, newPath: string) => Promise<void>;
  uploadFile: (path: string, file: File) => Promise<void>;
  downloadFile: (path: string, name: string) => Promise<void>;
  lastReferencedFile: string | null;
  setLastReferencedFile: (path: string | null) => void;
}

export const useFileStore = create<FileStore>((set, get) => ({
  currentPath: '/root/clawd/projects',
  files: [],
  isLoading: false,
  error: null,
  lastReferencedFile: null,

  setLastReferencedFile: (path) => set({ lastReferencedFile: path }),

  fetchFiles: async (path) => {
    const targetPath = path || get().currentPath;
    set({ isLoading: true, error: null });
    try {
      const token = useAuthStore.getState().token;
      const api = getApi();
      const response = await api.get(`/api/files/list`, {
        params: { path: targetPath },
        headers: { Authorization: `Bearer ${token}` }
      });
      set({ files: response.data, currentPath: targetPath, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.error || err.message, isLoading: false });
    }
  },

  readFile: async (path) => {
    const token = useAuthStore.getState().token;
    const api = getApi();
    const response = await api.get(`/api/files/read`, {
      params: { path },
      headers: { Authorization: `Bearer ${token}` }
    });
    set({ lastReferencedFile: path });
    return response.data.content;
  },

  writeFile: async (path, content) => {
    const token = useAuthStore.getState().token;
    const api = getApi();
    await api.post(`/api/files/write`, 
      { path, content },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    set({ lastReferencedFile: path });
    await get().fetchFiles();
  },

  deleteFile: async (path: string) => {
    const token = useAuthStore.getState().token;
    const api = getApi();
    await api.delete(`/api/files/delete`, {
      params: { path },
      headers: { Authorization: `Bearer ${token}` }
    });
    await get().fetchFiles();
  },

  renameFile: async (oldPath, newPath) => {
    const token = useAuthStore.getState().token;
    const api = getApi();
    await api.post(`/api/files/rename`, 
      { oldPath, newPath },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    await get().fetchFiles();
  },

  uploadFile: async (targetDir, file) => {
    const token = useAuthStore.getState().token;
    const api = getApi();
    const formData = new FormData();
    formData.append('file', file);
    
    await api.post(`/api/files/upload`, formData, {
      params: { path: targetDir },
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    });
    await get().fetchFiles();
  },

  downloadFile: async (path, name) => {
    const token = useAuthStore.getState().token;
    const api = getApi();
    const response = await api.get(`/api/files/download`, {
      params: { path },
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'blob'
    });
    
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', name);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
}));
