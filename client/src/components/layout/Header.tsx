import React from 'react';
import { Brain, Download, Settings, MessageSquare, FolderTree, GitBranch, Menu, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMobileSidebar } from './MobileSidebar';
import type { Agent, SessionStatus } from '../../../../shared/types';

interface Props {
  agents: Agent[];
  selectedAgentId: string | null;
  onSelectAgent: (id: string) => void;
  onToggleMemory: () => void;
  onToggleSkills: () => void;
  onExport: () => void;
  sessionId: string | null;
  sessionStatus?: SessionStatus;
  onStatusChange?: (status: SessionStatus) => void;
  activeView?: 'chat' | 'files' | 'source_control';
  onToggleView?: (view: 'chat' | 'files' | 'source_control') => void;
  hasProject?: boolean;
  projectPath?: string | null;
}

export default function Header({
  agents, selectedAgentId, onSelectAgent,
  onToggleMemory, onToggleSkills, onExport, sessionId,
  sessionStatus, onStatusChange,
  activeView = 'chat', onToggleView, hasProject, projectPath,
}: Props) {
  const { t } = useTranslation();

  const STATUS_OPTIONS: { key: SessionStatus; label: string; color: string }[] = [
    { key: 'backlog', label: t('header.backlog'), color: 'bg-gray-500' },
    { key: 'in_progress', label: t('header.inProgress'), color: 'bg-accent-500' },
    { key: 'review', label: t('header.review'), color: 'bg-blue-500' },
    { key: 'done', label: t('header.done'), color: 'bg-emerald-500' },
  ];

  const currentStatus = STATUS_OPTIONS.find(s => s.key === sessionStatus) || STATUS_OPTIONS[0];
  const { setSidebarOpen } = useMobileSidebar();

  return (
    <header className="h-12 bg-[#161b22] border-b border-gray-800/50 flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        {/* Hamburger menu - mobile only */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-1 text-gray-400 hover:text-gray-200 transition-colors md:hidden"
        >
          <Menu size={20} />
        </button>

        {/* View toggle tabs */}
        {hasProject && onToggleView && (
          <div className="hidden sm:flex items-center bg-[#0d1117] rounded border border-gray-700/50">
            <button
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-l transition-colors ${
                activeView === 'chat' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
              onClick={() => onToggleView('chat')}
            >
              <MessageSquare size={13} />
              {t('header.chatTab')}
            </button>
            <button
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs transition-colors ${
                activeView === 'files' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
              onClick={() => onToggleView('files')}
            >
              <FolderTree size={13} />
              {t('header.filesTab')}
            </button>
            <button
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-r transition-colors ${
                activeView === 'source_control' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
              onClick={() => onToggleView('source_control')}
            >
              <GitBranch size={13} />
              {t('header.sourceControlTab')}
            </button>
          </div>
        )}

        {sessionId && (
          <select
            value={selectedAgentId || ''}
            onChange={(e) => onSelectAgent(e.target.value)}
            className="text-xs bg-[#0d1117] border border-gray-700/50 rounded px-2 py-1 text-white focus:outline-none focus:border-accent-500/50"
          >
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.icon} {a.name}
              </option>
            ))}
          </select>
        )}

        {sessionId && onStatusChange && (
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${currentStatus.color}`} />
            <select
              value={sessionStatus || 'backlog'}
              onChange={(e) => onStatusChange(e.target.value as SessionStatus)}
              className="text-xs bg-[#0d1117] border border-gray-700/50 rounded px-2 py-1 text-gray-300 focus:outline-none focus:border-accent-500/50"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </div>
        )}

        {projectPath && (() => {
          const folder = projectPath.split('/').pop();
          return folder ? (
            <a
              href={`https://${folder}.wpgens.com`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-accent-400 transition-colors"
              title={`https://${folder}.wpgens.com`}
            >
              <ExternalLink size={13} />
              <span className="hidden sm:inline">{t('header.demoTitle')}</span>
            </a>
          ) : null;
        })()}
      </div>

      {sessionId && (
        <div className="flex items-center gap-2">
          <button onClick={onToggleSkills} className="text-gray-500 hover:text-gray-300 p-1 transition-colors" title={t('header.skillsTitle')}>
            <Settings size={16} />
          </button>
          <button onClick={onToggleMemory} className="text-gray-500 hover:text-gray-300 p-1 transition-colors" title={t('header.memoryTitle')}>
            <Brain size={16} />
          </button>
          <button onClick={onExport} className="text-gray-500 hover:text-gray-300 p-1 transition-colors" title={t('header.exportTitle')}>
            <Download size={16} />
          </button>
        </div>
      )}
    </header>
  );
}
