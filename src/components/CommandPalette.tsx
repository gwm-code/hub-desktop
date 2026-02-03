import React, { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { Search, Plus, PanelLeft, MessageSquare, History, X } from 'lucide-react';
import { useChatStore } from '../store/useChatStore';
import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';

interface CommandPaletteProps {
  toggleSidebar: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ toggleSidebar }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const { setCurrentConversationId } = useChatStore();
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  useEffect(() => {
    const search = async () => {
      if (query.length < 2) {
        setSearchResults([]);
        return;
      }
      try {
        const response = await axios.get(`/api/search?q=${query}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSearchResults(response.data);
      } catch (err) {
        console.error('Search failed', err);
      }
    };

    const debounce = setTimeout(search, 300);
    return () => clearTimeout(debounce);
  }, [query, token]);

  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-zinc-950/80 backdrop-blur-sm p-4"
      onClick={() => setOpen(false)}
    >
      <div 
        className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <Command label="Command Palette" className="flex flex-col h-full" shouldFilter={false}>
          <div className="flex items-center border-b border-zinc-800 px-4 py-3 gap-3">
            <Search size={20} className="text-zinc-500" />
            <Command.Input 
              value={query}
              onValueChange={setQuery}
              placeholder="Type a command or search history..." 
              className="flex-1 bg-transparent border-none focus:outline-none text-zinc-100 placeholder:text-zinc-600"
            />
            <button onClick={() => setOpen(false)} className="text-zinc-600 hover:text-zinc-400">
              <X size={18} />
            </button>
          </div>

          <Command.List className="max-h-[300px] overflow-y-auto p-2 scrollbar-hide">
            <Command.Empty className="px-4 py-8 text-center text-zinc-500 text-sm">
              No results found.
            </Command.Empty>

            {query.length === 0 && (
              <Command.Group heading="Navigation" className="text-[10px] uppercase font-bold text-zinc-600 px-3 py-2">
                <CommandItem 
                  onSelect={() => {
                    setCurrentConversationId(null);
                    setOpen(false);
                  }}
                >
                  <Plus size={16} />
                  <span>New Chat</span>
                  <kbd className="ml-auto text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-500">Cmd+N</kbd>
                </CommandItem>
                
                <CommandItem 
                  onSelect={() => {
                    toggleSidebar();
                    setOpen(false);
                  }}
                >
                  <PanelLeft size={16} />
                  <span>Toggle Sidebar</span>
                  <kbd className="ml-auto text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-500">Cmd+/</kbd>
                </CommandItem>

                <CommandItem 
                  onSelect={() => {
                    const input = document.querySelector('[cmdk-input]') as HTMLInputElement;
                    if (input) input.focus();
                  }}
                >
                  <History size={16} />
                  <span>Search History</span>
                </CommandItem>
              </Command.Group>
            )}

            {searchResults.length > 0 && (
              <Command.Group heading="Search Results" className="text-[10px] uppercase font-bold text-zinc-600 px-3 py-2">
                {searchResults.map((result) => (
                  <CommandItem 
                    key={result.id}
                    onSelect={() => {
                      setCurrentConversationId(result.conversation_id);
                      setOpen(false);
                    }}
                  >
                    <div className="flex flex-col gap-1 overflow-hidden">
                      <div className="flex items-center gap-2">
                        <MessageSquare size={14} className="text-zinc-500" />
                        <span className="font-medium text-zinc-200">{result.conversation_title}</span>
                      </div>
                      <div 
                        className="text-xs text-zinc-500 truncate"
                      >
                        {result.snippet.split(/~~~b~~~|~~~\/b~~~/).map((part: string, i: number) => 
                          i % 2 === 1 ? <b key={i} className="text-blue-400">{part}</b> : part
                        )}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </Command.Group>
            )}
          </Command.List>
        </Command>
      </div>
    </div>
  );
};

function CommandItem({ children, onSelect }: { children: React.ReactNode; onSelect?: () => void }) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white cursor-pointer transition-colors aria-selected:bg-zinc-800 aria-selected:text-white outline-none"
    >
      {children}
    </Command.Item>
  );
}
