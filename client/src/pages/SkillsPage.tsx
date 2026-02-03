import React from 'react';
import { useSkills } from '../hooks/useSkills';
import PageShell from '../components/layout/PageShell';
import SkillManager from '../components/skills/SkillManager';

export default function SkillsPage() {
  const { skills, create, update, remove } = useSkills();

  return (
    <PageShell>
      <div className="flex-1 overflow-y-auto">
        <SkillManager skills={skills} onCreate={create} onUpdate={update} onDelete={remove} />
      </div>
    </PageShell>
  );
}
