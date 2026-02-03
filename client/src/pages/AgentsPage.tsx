import React from 'react';
import { useAgents } from '../hooks/useAgents';
import PageShell from '../components/layout/PageShell';
import AgentManager from '../components/agents/AgentManager';

export default function AgentsPage() {
  const { agents, create, update, remove } = useAgents();

  return (
    <PageShell>
      <div className="flex-1 overflow-y-auto">
        <AgentManager agents={agents} onCreate={create} onUpdate={update} onDelete={remove} />
      </div>
    </PageShell>
  );
}
