import React, { useEffect, useState } from 'react';
import { Folder, File, ChevronRight, RefreshCw, Upload, Download, Trash, Edit } from 'lucide-react';
import { useFileStore } from '../store/useFileStore';
import { useSettingsStore } from '../store/useSettingsStore';

export const FileBrowser: React.FC = () => {
  const { files, currentPath, fetchFiles, uploadFile, deleteFile, renameFile, downloadFile, isLoading } = useFileStore();
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleFolderClick = (path: string) => {
    fetchFiles(path);
  };

  const handleDelete = async (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this file?')) {
      await deleteFile(path);
    }
  };

  const handleRename = async (e: React.MouseEvent, oldPath: string, currentName: string) => {
    e.stopPropagation();
    const newName = prompt('Enter new name:', currentName);
    if (newName && newName !== currentName) {
      const dir = oldPath.substring(0, oldPath.lastIndexOf('/'));
      const newPath = `${dir}/${newName}`;
      await renameFile(oldPath, newPath);
    }
  };

  const handleDownload = async (e: React.MouseEvent, path: string, name: string) => {
    e.stopPropagation();
    await downloadFile(path, name);
  };

  const handleBack = () => {
    const parts = currentPath.split('/');
    parts.pop();
    fetchFiles(parts.join('/'));
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    for (const file of droppedFiles) {
      await uploadFile(currentPath, file);
    }
  };

  return (
    <div 
      className={`flex flex-col h-1/2 border-t border-zinc-800 transition-colors ${isDragging ? 'bg-zinc-800/50' : ''}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="p-3 flex items-center justify-between bg-zinc-900/50">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Files</span>
        <div className="flex gap-2">
          <label className="text-zinc-500 hover:text-white cursor-pointer">
            <Upload size={14} />
            <input 
              type="file" 
              className="hidden" 
              onChange={async (e) => {
                if (e.target.files) {
                  for (const file of Array.from(e.target.files)) {
                    await uploadFile(currentPath, file);
                  }
                }
              }} 
            />
          </label>
          <button onClick={() => fetchFiles()} className="text-zinc-500 hover:text-white">
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>
      
      <div className="px-2 pb-2 text-[10px] text-zinc-600 truncate border-b border-zinc-800/50">
        {currentPath.replace('/root/clawd/', '')}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {currentPath !== '/root/clawd' && currentPath !== '/' && (
          <button 
            onClick={handleBack}
            className="flex items-center gap-2 w-full px-2 py-1 text-sm text-zinc-400 hover:bg-zinc-800/50 rounded"
          >
            <ChevronRight size={14} className="rotate-180" />
            <span>..</span>
          </button>
        )}

        {files.map((file) => (
          <div
            key={file.path}
            draggable={!file.isDirectory}
            onDragStart={(e) => {
              if (!file.isDirectory) {
                e.dataTransfer.setData('application/hub-chat-file', JSON.stringify(file));
                e.dataTransfer.effectAllowed = 'copy';
              }
            }}
            onClick={() => {
              if (file.isDirectory) {
                handleFolderClick(file.path);
              } else {
                useFileStore.getState().setLastReferencedFile(file.path);
                useSettingsStore.getState().setIsArtifactsOpen(true);
              }
            }}
            className="flex items-center gap-2 w-full px-2 py-1 text-sm text-zinc-400 hover:bg-zinc-800/50 rounded group text-left cursor-pointer"
          >
            {file.isDirectory ? (
              <Folder size={14} className="text-blue-400" />
            ) : (
              <File size={14} className="text-zinc-500" />
            )}
            <span className="truncate flex-1">{file.name}</span>
            
            <div className="hidden group-hover:flex items-center gap-1">
              {!file.isDirectory && (
                <button 
                  onClick={(e) => handleDownload(e, file.path, file.name)}
                  className="p-1 hover:text-blue-400 transition-colors"
                  title="Download"
                >
                  <Download size={12} />
                </button>
              )}
              <button 
                onClick={(e) => handleRename(e, file.path, file.name)}
                className="p-1 hover:text-yellow-400 transition-colors"
                title="Rename"
              >
                <Edit size={12} />
              </button>
              <button 
                onClick={(e) => handleDelete(e, file.path)}
                className="p-1 hover:text-red-400 transition-colors"
                title="Delete"
              >
                <Trash size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
