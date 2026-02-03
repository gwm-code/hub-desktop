import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuthStore } from '../store/useAuthStore';

interface AgentSession {
  id: string;
  label: string;
  type: string;
  lastMessageAt?: string;
  lastTask?: string;
  status?: 'active' | 'idle' | 'error';
}

const AGENT_NAME_MAP: Record<string, string> = {
  'infrastructure': 'Nova',
  'ui': 'Luna',
  'research': 'Atlas',
  'security': 'Orion',
  'hub-chat-final-polish': 'Orion',
  'hub-chat-agents-and-fixes': 'Luna',
  'hub-chat-week-1': 'Nova',
  'hub-chat-completion-ph3-ph4': 'Nova',
  'hub-chat-ui-ux-cleanup': 'Luna',
  'hub-chat-final-audit': 'Orion',
  'minimax-bunny-analysis': 'Atlas',
  'hub-chat-file-features-and-cleanup': 'Nova',
  'subagent': 'Sub-Agent',
};

const getAgentName = (label: string, type: string, id: string, key: string = '') => {
  const lowercaseKey = key.toLowerCase();
  const lowercaseLabel = (label || '').toLowerCase();

  // 1. Check for specific fleet labels in the key or label
  for (const [k, v] of Object.entries(AGENT_NAME_MAP)) {
    if (lowercaseKey.includes(k) || lowercaseLabel.includes(k)) return v;
  }

  // 2. Special handling for the actual Main PA / Hub sessions
  if (lowercaseKey === 'agent:main:main' || lowercaseKey === 'main' || lowercaseKey.includes('hub')) return 'Cody';

  // 3. Meaningful labels (filtering out generic terms)
  if (label && !['agent', 'unknown', 'direct', 'group', 'main', 'subagent', 'channel'].includes(lowercaseLabel)) {
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  // 4. Use kind (type) if it's specific
  if (type && !['agent', 'unknown', 'direct', 'group'].includes(type.toLowerCase())) {
    return type.charAt(0).toUpperCase() + type.slice(1);
  }

  // 5. Friendly name for direct/group nodes
  if (type === 'group' || lowercaseKey.includes('discord')) return 'Discord Node';
  if (type === 'direct' || lowercaseKey.includes('whatsapp')) return 'Direct Node';

  return `Node [${(id || '????').substring(0, 4)}]`;
};

export const AgentNodes: React.FC = () => {
  const [agents, setAgents] = useState<AgentSession[]>([]);
  const token = useAuthStore((state) => state.token);

  const fetchAgents = async () => {
    try {
      const response = await api.get('/api/agents');
      
      const sessions = response.data.sessions || [];
      const mappedAgents = sessions.map((s: any) => {
        const parts = s.key.split(':');
        const type = parts[2] || 'agent';
        // Use displayName if available, then fallback to parts[3], then type
        const label = s.displayName || parts[3] || type;
        const sessionId = s.sessionId || s.id || 'unknown';
        
        // Map status
        let status: 'active' | 'idle' | 'error' = 'idle';
        const ageMs = s.ageMs || (Date.now() - s.updatedAt);
        if (ageMs < 120000) { // Active if seen in last 2 mins
          status = 'active';
        } else if (s.abortedLastRun) {
          status = 'error';
        }

        return {
          ...s,
          id: sessionId,
          name: getAgentName(label, type, sessionId, s.key),
          status,
          lastTask: s.model ? `Running ${s.model}` : undefined
        };
      });

      // DEDUPLICATION: Only show one node per name, prioritizing active ones
      const uniqueAgents: Record<string, any> = {};
      mappedAgents.forEach((a: any) => {
        const nameKey = a.name.toLowerCase();
        if (!uniqueAgents[nameKey] || (a.status === 'active' && uniqueAgents[nameKey].status !== 'active')) {
          uniqueAgents[nameKey] = a;
        }
      });

      // Filter and Sort: 
      // 1. Hide stale nodes (> 24h old)
      // 2. Hide system nodes (cron, heartbeat)
      // 3. Hide Discord nodes (as requested)
      const filteredAgents = Object.values(uniqueAgents)
        .filter((a: any) => {
          const isStale = (a.ageMs || (Date.now() - a.updatedAt)) > 86400000;
          const isSystem = a.key.includes('cron') || a.key.includes('heartbeat');
          const isDiscord = a.key.includes('discord');
          return !isStale && !isSystem && !isDiscord;
        })
        .sort((a, b) => {
          if (a.status === 'active' && b.status !== 'active') return -1;
          if (a.status !== 'active' && b.status === 'active') return 1;
          return a.name.localeCompare(b.name);
        })
        .slice(0, 8);

      setAgents(filteredAgents);
    } catch (err) {
      console.error('Failed to fetch agents', err);
    }
  };

  useEffect(() => {
    fetchAgents();
    const interval = setInterval(fetchAgents, 10000);
    return () => clearInterval(interval);
  }, [token]);

  return (
    <div className="flex items-center gap-4 px-4 overflow-x-auto">
      <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest mr-2 whitespace-nowrap">Agent Nodes</span>
      {agents.map((agent) => (
        <AgentNode key={agent.id} agent={agent} />
      ))}
    </div>
  );
};

const AgentNode: React.FC<{ agent: any }> = ({ agent }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const statusColors = {
    active: 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]',
    idle: 'bg-yellow-500',
    error: 'bg-red-500'
  };

  return (
    <div 
      className="relative group cursor-pointer flex items-center gap-2 px-2 py-1 rounded-md hover:bg-zinc-800 transition-colors"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className={`w-2 h-2 rounded-full ${statusColors[agent.status as keyof typeof statusColors] || statusColors.idle} ${agent.status === 'active' ? 'animate-pulse' : ''}`} />
      <span className="text-sm font-medium text-zinc-300">{agent.name}</span>

      {showTooltip && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 p-3 bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl z-[100] text-xs animate-in fade-in slide-in-from-top-1 pointer-events-none">
          <div className="flex items-center justify-between mb-2">
            <div className="font-bold text-zinc-400 uppercase tracking-tighter">Session: {agent.id.substring(0, 8)}</div>
            <div className={`px-1.5 py-0.5 rounded text-[10px] ${agent.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-zinc-800 text-zinc-400'}`}>
              {agent.status}
            </div>
          </div>
          <div className="text-zinc-200 line-clamp-4 leading-relaxed bg-zinc-950/50 p-2 rounded border border-zinc-800/50 mb-2">
            {agent.lastTask || 'System idle. Waiting for new commands or scheduled tasks.'}
          </div>
          <div className="flex items-center justify-between text-[10px] text-zinc-500">
            <span>Type: {agent.type || 'standard'}</span>
            <span>{agent.updatedAt ? new Date(agent.updatedAt).toLocaleTimeString() : 'Recently active'}</span>
          </div>
        </div>
      )}
    </div>
  );
};
