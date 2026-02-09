import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/http';
import PageShell from '../components/layout/PageShell';
import type { Session, Project, ActivityLog, SessionStatus } from '../../../shared/types';
import {
  LayoutGrid, Filter, Activity, Clock, ArrowRight,
  MessageCircle, GripVertical, ChevronDown, ChevronUp
} from 'lucide-react';

interface KanbanCardProps {
  session: Session & { project_name?: string; project_color?: string };
  onMove: (id: string, status: SessionStatus) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onClick: (id: string) => void;
}

function KanbanCard({ session, onMove, onDragStart, onClick, generalProjectId, columns, timeAgo }: KanbanCardProps & { generalProjectId: string | null; columns: { key: SessionStatus; label: string; color: string; dotColor: string; bgColor: string }[]; timeAgo: (dateStr: string) => string }) {
  const isGeneral = generalProjectId && session.project_id === generalProjectId;
  const colIdx = columns.findIndex(c => c.key === session.status);
  const canMoveLeft = colIdx > 0;
  const canMoveRight = colIdx < columns.length - 1;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, session.id)}
      className="bg-[#161b22] border border-gray-800/60 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-gray-700/80 transition-colors group"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div
            onClick={() => onClick(session.id)}
            className="text-sm font-medium text-gray-200 truncate cursor-pointer hover:text-white transition-colors"
          >
            {session.title}
          </div>
          {!isGeneral && session.project_name && (
            <div className="flex items-center gap-1.5 mt-1 min-w-0">
              <div
                className={`w-2 h-2 rounded-full flex-shrink-0 ${!session.project_color ? 'bg-gray-600' : ''}`}
                style={session.project_color ? { backgroundColor: session.project_color } : undefined}
              />
              <span className="text-xs text-gray-500 truncate">{session.project_name}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          {canMoveLeft && (
            <button
              onClick={() => onMove(session.id, columns[colIdx - 1].key)}
              className="p-1 text-gray-500 hover:text-gray-300 rounded hover:bg-gray-800/50"
              title={`Move to ${columns[colIdx - 1].label}`}
            >
              <ArrowRight size={12} className="rotate-180" />
            </button>
          )}
          {canMoveRight && (
            <button
              onClick={() => onMove(session.id, columns[colIdx + 1].key)}
              className="p-1 text-gray-500 hover:text-gray-300 rounded hover:bg-gray-800/50"
              title={`Move to ${columns[colIdx + 1].label}`}
            >
              <ArrowRight size={12} />
            </button>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2 text-[11px] text-gray-600">
        <Clock size={10} />
        <span>{timeAgo(session.status_updated_at || session.updated_at)}</span>
      </div>
    </div>
  );
}

export default function MissionControlPage() {
  const { t } = useTranslation();
  const [sessions, setSessions] = useState<(Session & { project_name?: string; project_color?: string })[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [filterProject, setFilterProject] = useState<string>('all');
  const [showActivity, setShowActivity] = useState(true);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [generalProjectId, setGeneralProjectId] = useState<string | null>(null);
  const navigate = useNavigate();

  const COLUMNS: { key: SessionStatus; label: string; color: string; dotColor: string; bgColor: string }[] = [
    { key: 'backlog', label: t('header.backlog'), color: 'text-gray-400', dotColor: 'bg-gray-400', bgColor: 'bg-gray-400/10' },
    { key: 'in_progress', label: t('header.inProgress'), color: 'text-accent-400', dotColor: 'bg-accent-400', bgColor: 'bg-accent-400/10' },
    { key: 'review', label: t('header.review'), color: 'text-blue-400', dotColor: 'bg-blue-400', bgColor: 'bg-blue-400/10' },
    { key: 'done', label: t('header.done'), color: 'text-emerald-400', dotColor: 'bg-emerald-400', bgColor: 'bg-emerald-400/10' },
  ];

  function timeAgo(dateStr: string): string {
    const d = new Date(dateStr + 'Z');
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t('common.justNow');
    if (mins < 60) return t('common.minutesAgo', { count: mins });
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return t('common.hoursAgo', { count: hrs });
    const days = Math.floor(hrs / 24);
    return t('common.daysAgo', { count: days });
  }

  function statusLabel(s: string): string {
    if (s === 'backlog') return t('header.backlog');
    if (s === 'in_progress') return t('header.inProgress');
    if (s === 'review') return t('header.review');
    if (s === 'done') return t('header.done');
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  const fetchAll = useCallback(async () => {
    const [sessData, projData, actData, configData] = await Promise.all([
      api.get<Session[]>('/sessions'),
      api.get<Project[]>('/projects'),
      api.get<ActivityLog[]>('/activity'),
      api.get<{ generalProjectId: string | null }>('/config'),
    ]);
    const gpId = configData.generalProjectId;
    setGeneralProjectId(gpId);
    // Attach project names and colors to sessions
    const projMap = new Map(projData.map(p => [p.id, p]));
    const enriched = sessData
      .filter(s => s.project_id !== gpId)
      .map(s => {
        const proj = projMap.get(s.project_id);
        return { ...s, project_name: proj?.name || '', project_color: proj?.color || '' };
      });
    setSessions(enriched);
    setProjects(projData);
    setActivity(actData);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const moveSession = useCallback(async (sessionId: string, newStatus: SessionStatus) => {
    // Optimistic update
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, status: newStatus, status_updated_at: new Date().toISOString() } : s));
    await api.patch(`/sessions/${sessionId}/status`, { status: newStatus, actor: 'user' });
    // Refresh activity
    const actData = await api.get<ActivityLog[]>('/activity');
    setActivity(actData);
  }, []);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, colKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCol(colKey);
  };

  const handleDragLeave = () => setDragOverCol(null);

  const handleDrop = (e: React.DragEvent, colKey: SessionStatus) => {
    e.preventDefault();
    setDragOverCol(null);
    const sessionId = e.dataTransfer.getData('text/plain');
    if (sessionId) moveSession(sessionId, colKey);
  };

  const handleCardClick = (sessionId: string) => {
    const s = sessions.find(x => x.id === sessionId);
    if (!s) return;
    const params = new URLSearchParams();
    params.set('session', sessionId);
    if (generalProjectId && s.project_id !== generalProjectId) {
      params.set('project', s.project_id);
    }
    navigate(`/chat?${params.toString()}`);
  };

  const filtered = filterProject === 'all'
    ? sessions
    : sessions.filter(s => s.project_id === filterProject);

  return (
    <PageShell>
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800/50">
          <div className="flex items-center gap-3">
            <LayoutGrid size={20} className="text-accent-400" />
            <h1 className="text-lg font-bold text-white">{t('missionControl.title')}</h1>
          </div>
          <div className="flex items-center gap-3">
            {/* Project Filter */}
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-gray-500" />
              <select
                value={filterProject}
                onChange={(e) => setFilterProject(e.target.value)}
                className="bg-[#161b22] border border-gray-800/60 rounded-md px-2.5 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-accent-500/50"
              >
                <option value="all">{t('missionControl.allProjects')}</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            {/* Activity toggle */}
            <button
              onClick={() => setShowActivity(!showActivity)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                showActivity ? 'bg-accent-600/20 text-accent-400 border border-accent-600/30' : 'bg-[#161b22] text-gray-400 border border-gray-800/60 hover:text-gray-300'
              }`}
            >
              <Activity size={14} /> {t('missionControl.activity')}
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Kanban Board */}
          <div className="flex-1 flex gap-4 p-5 overflow-x-auto">
            {COLUMNS.map((col) => {
              const colSessions = filtered.filter(s => s.status === col.key);
              return (
                <div
                  key={col.key}
                  className="flex-1 min-w-[260px] flex flex-col"
                  onDragOver={(e) => handleDragOver(e, col.key)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, col.key)}
                >
                  {/* Column header */}
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <div className={`w-2 h-2 rounded-full ${col.dotColor}`} />
                    <span className={`text-sm font-semibold ${col.color}`}>{col.label}</span>
                    <span className="text-xs text-gray-600 ml-1">{colSessions.length}</span>
                  </div>

                  {/* Column body */}
                  <div
                    className={`flex-1 rounded-lg p-2 space-y-2 overflow-y-auto transition-colors ${
                      dragOverCol === col.key
                        ? `${col.bgColor} border-2 border-dashed border-gray-700/60`
                        : 'bg-[#0d1117]'
                    }`}
                  >
                    {colSessions.map(s => (
                      <KanbanCard
                        key={s.id}
                        session={s}
                        onMove={moveSession}
                        onDragStart={handleDragStart}
                        onClick={handleCardClick}
                        generalProjectId={generalProjectId}
                        columns={COLUMNS}
                        timeAgo={timeAgo}
                      />
                    ))}
                    {colSessions.length === 0 && (
                      <div className="text-center py-8 text-gray-700 text-xs">
                        {dragOverCol === col.key ? t('missionControl.dropHere') : t('missionControl.noTasks')}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Activity Panel */}
          {showActivity && (
            <div className="w-72 border-l border-gray-800/50 flex flex-col bg-[#0d1117]">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800/50">
                <Activity size={14} className="text-gray-500" />
                <span className="text-sm font-semibold text-gray-300">{t('missionControl.activity')}</span>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {activity.map((a) => (
                  <div key={a.id} className="px-3 py-2 rounded-md hover:bg-[#161b22] transition-colors">
                    <div className="text-xs text-gray-400">
                      <span className={a.actor === 'ai' ? 'text-blue-400' : 'text-accent-400'}>
                        {a.actor === 'ai' ? t('common.ai') : t('common.you')}
                      </span>
                      {' '}{a.action}{' '}
                      <span className="text-gray-300 font-medium">{a.session_title}</span>
                    </div>
                    {a.from_status && a.to_status && (
                      <div className="flex items-center gap-1.5 mt-1 text-[11px] text-gray-600">
                        <span>{statusLabel(a.from_status)}</span>
                        <ArrowRight size={10} />
                        <span>{statusLabel(a.to_status)}</span>
                      </div>
                    )}
                    <div className="text-[10px] text-gray-700 mt-1">{timeAgo(a.created_at)}</div>
                  </div>
                ))}
                {activity.length === 0 && (
                  <div className="text-center py-8 text-gray-700 text-xs">{t('missionControl.noActivity')}</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
