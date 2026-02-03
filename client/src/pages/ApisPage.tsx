import React from 'react';
import { useApis } from '../hooks/useApis';
import PageShell from '../components/layout/PageShell';
import ApiManager from '../components/apis/ApiManager';

export default function ApisPage() {
  const { apis, create, update, remove } = useApis();

  return (
    <PageShell>
      <div className="flex-1 overflow-y-auto">
        <ApiManager apis={apis} onCreate={create} onUpdate={update} onDelete={remove} />
      </div>
    </PageShell>
  );
}
