import React from 'react';
import { useMcps } from '../hooks/useMcps';
import PageShell from '../components/layout/PageShell';
import McpManager from '../components/mcps/McpManager';

export default function McpsPage() {
  const { mcps, create, update, remove } = useMcps();

  return (
    <PageShell>
      <div className="flex-1 overflow-y-auto">
        <McpManager mcps={mcps} onCreate={create} onUpdate={update} onDelete={remove} />
      </div>
    </PageShell>
  );
}
