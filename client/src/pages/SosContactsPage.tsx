import React, { useState } from 'react';
import { Plus, Edit2, Trash2, ArrowRight } from 'lucide-react';
import PageShell from '../components/layout/PageShell';
import FormBuilder from '../components/sos/FormBuilder';
import FormRenderer from '../components/sos/FormRenderer';
import EntriesViewer from '../components/sos/EntriesViewer';
import { useSosContacts } from '../hooks/useSosContacts';

type Tab = 'forms' | 'entries';
type SubTab = 'list' | 'builder' | 'entries';

export default function SosContactsPage() {
  const { forms, entries, loading, entriesLoading, loadForms, loadEntries, createForm, updateForm, deleteForm, createEntry, deleteEntry } =
    useSosContacts();

  const [mainTab, setMainTab] = useState<Tab>('forms');
  const [subTab, setSubTab] = useState<SubTab>('list');
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [isCreatingForm, setIsCreatingForm] = useState(false);
  const [newFormName, setNewFormName] = useState('');
  const [newFormDesc, setNewFormDesc] = useState('');
  const [editingFormId, setEditingFormId] = useState<string | null>(null);
  const [editingFormName, setEditingFormName] = useState('');
  const [editingFormDesc, setEditingFormDesc] = useState('');
  const [formBuilderConfig, setFormBuilderConfig] = useState<any[]>([]);
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  const selectedForm = selectedFormId ? forms.find((f) => f.id === selectedFormId) : null;
  const selectedFormEntries = selectedForm ? entries.filter((e) => e.form_id === selectedForm.id) : [];

  const handleCreateForm = async () => {
    if (!newFormName.trim()) return;
    try {
      await createForm({
        name: newFormName,
        description: newFormDesc,
        config: formBuilderConfig,
      });
      setNewFormName('');
      setNewFormDesc('');
      setFormBuilderConfig([]);
      setIsCreatingForm(false);
    } catch (err) {
      console.error('Failed to create form:', err);
    }
  };

  const handleUpdateForm = async () => {
    if (!editingFormId || !editingFormName.trim()) return;
    try {
      await updateForm(editingFormId, {
        name: editingFormName,
        description: editingFormDesc,
        config: formBuilderConfig,
      });
      setEditingFormId(null);
      setEditingFormName('');
      setEditingFormDesc('');
      setFormBuilderConfig([]);
    } catch (err) {
      console.error('Failed to update form:', err);
    }
  };

  const handleDeleteForm = async (id: string) => {
    if (confirm('Delete this form? All associated entries will be deleted.')) {
      try {
        await deleteForm(id);
        if (selectedFormId === id) {
          setSelectedFormId(null);
          setMainTab('forms');
          setSubTab('list');
        }
      } catch (err) {
        console.error('Failed to delete form:', err);
      }
    }
  };

  const handleSelectForm = (formId: string) => {
    setSelectedFormId(formId);
    setSubTab('entries');
    setMainTab('entries');
    loadEntries(formId, filterStartDate, filterEndDate);
  };

  const handleAddEntry = async (data: any) => {
    if (!selectedForm) return;
    try {
      await createEntry({
        form_id: selectedForm.id,
        data: data.formData,
        call_date: data.callDate,
        call_time: data.callTime,
      });
      // Reload entries
      loadEntries(selectedForm.id, filterStartDate, filterEndDate);
    } catch (err) {
      console.error('Failed to create entry:', err);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (confirm('Delete this entry?')) {
      try {
        await deleteEntry(id);
        if (selectedForm) {
          loadEntries(selectedForm.id, filterStartDate, filterEndDate);
        }
      } catch (err) {
        console.error('Failed to delete entry:', err);
      }
    }
  };

  const handleExportCSV = () => {
    if (selectedFormEntries.length === 0) return;

    const headers = selectedForm?.config?.map((f) => f.label) || [];
    const rows = selectedFormEntries.map((entry) => {
      return selectedForm?.config?.map((field) => {
        const value = entry.data[field.id];
        if (Array.isArray(value)) return value.join('; ');
        if (typeof value === 'object') return JSON.stringify(value);
        return value || '';
      }) || [];
    });

    const csv = [
      ['Call Date', 'Call Time', 'Entry Time', ...headers].join(','),
      ...rows.map((row, idx) => {
        const entry = selectedFormEntries[idx];
        return [entry.call_date, entry.call_time, new Date(entry.entry_created_at).toLocaleString(), ...row].join(',');
      }),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedForm?.name || 'entries'}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    if (selectedFormEntries.length === 0) return;

    let pdf = `${selectedForm?.name || 'Entries'}\n`;
    pdf += `Exported: ${new Date().toLocaleString()}\n\n`;

    selectedFormEntries.forEach((entry, idx) => {
      pdf += `Entry ${idx + 1}\n`;
      pdf += `Call Date: ${entry.call_date} at ${entry.call_time}\n`;
      pdf += `Entry Time: ${new Date(entry.entry_created_at).toLocaleString()}\n`;

      selectedForm?.config?.forEach((field) => {
        const value = entry.data[field.id];
        let displayValue = value;
        if (Array.isArray(value)) displayValue = value.join(', ');
        if (value === null || value === undefined) displayValue = '-';
        pdf += `${field.label}: ${displayValue}\n`;
      });

      pdf += '\n' + '─'.repeat(60) + '\n\n';
    });

    const blob = new Blob([pdf], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedForm?.name || 'entries'}-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const formContent = (
    <div className="max-w-4xl space-y-4">
      {isCreatingForm ? (
        <div className="bg-gray-800 border border-gray-700 rounded p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">Form Name</label>
            <input
              type="text"
              value={newFormName}
              onChange={(e) => setNewFormName(e.target.value)}
              placeholder="e.g., Emergency Contacts, Incident Report"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-100 placeholder-gray-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">Description (optional)</label>
            <input
              type="text"
              value={newFormDesc}
              onChange={(e) => setNewFormDesc(e.target.value)}
              placeholder="What is this form for?"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-100 placeholder-gray-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">Form Fields</label>
            <FormBuilder config={formBuilderConfig} onChange={setFormBuilderConfig} />
          </div>

          <div className="flex gap-2 pt-4">
            <button
              onClick={handleCreateForm}
              disabled={!newFormName.trim() || formBuilderConfig.length === 0}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded transition"
            >
              Create Form
            </button>
            <button
              onClick={() => {
                setIsCreatingForm(false);
                setNewFormName('');
                setNewFormDesc('');
                setFormBuilderConfig([]);
              }}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 font-medium rounded transition"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : editingFormId ? (
        <div className="bg-gray-800 border border-gray-700 rounded p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">Form Name</label>
            <input
              type="text"
              value={editingFormName}
              onChange={(e) => setEditingFormName(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">Description (optional)</label>
            <input
              type="text"
              value={editingFormDesc}
              onChange={(e) => setEditingFormDesc(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">Form Fields</label>
            <FormBuilder config={formBuilderConfig} onChange={setFormBuilderConfig} />
          </div>

          <div className="flex gap-2 pt-4">
            <button
              onClick={handleUpdateForm}
              disabled={!editingFormName.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded transition"
            >
              Update Form
            </button>
            <button
              onClick={() => {
                setEditingFormId(null);
                setEditingFormName('');
                setEditingFormDesc('');
                setFormBuilderConfig([]);
              }}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 font-medium rounded transition"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <button
            onClick={() => setIsCreatingForm(true)}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded transition flex items-center justify-center gap-2"
          >
            <Plus size={18} />
            Create New Form
          </button>

          {forms.length === 0 ? (
            <div className="text-center py-12 text-gray-500 border border-gray-700 rounded bg-gray-800/50">
              <p className="mb-4">No forms yet. Create your first form to get started!</p>
              <button
                onClick={() => setIsCreatingForm(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded transition"
              >
                Create Form
              </button>
            </div>
          ) : (
            <div className="grid gap-3">
              {forms.map((form) => (
                <div key={form.id} className="bg-gray-800 border border-gray-700 rounded p-4 hover:border-gray-600 transition">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-100">{form.name}</h3>
                      {form.description && <p className="text-xs text-gray-400 mt-1">{form.description}</p>}
                      <p className="text-xs text-gray-500 mt-2">{form.config.length} fields</p>
                    </div>
                    <div className="flex gap-1 ml-3">
                      <button
                        onClick={() => {
                          setEditingFormId(form.id);
                          setEditingFormName(form.name);
                          setEditingFormDesc(form.description);
                          setFormBuilderConfig(form.config);
                        }}
                        className="p-2 text-gray-400 hover:text-gray-200 transition"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteForm(form.id)}
                        className="p-2 text-red-400 hover:text-red-300 transition"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSelectForm(form.id)}
                    className="w-full mt-3 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm font-medium rounded transition flex items-center justify-center gap-2"
                  >
                    <ArrowRight size={16} />
                    View Entries
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );

  const entriesContent = selectedForm ? (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-100">{selectedForm.name}</h2>
          {selectedForm.description && <p className="text-sm text-gray-400 mt-1">{selectedForm.description}</p>}
        </div>
        <button
          onClick={() => {
            setSelectedFormId(null);
            setMainTab('forms');
            setSubTab('list');
          }}
          className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm rounded transition"
        >
          Back to Forms
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Entry Form */}
        <div className="bg-gray-800 border border-gray-700 rounded p-4">
          <h3 className="text-sm font-semibold text-gray-200 mb-4">Add New Entry</h3>
          <FormRenderer config={selectedForm.config} onSubmit={handleAddEntry} loading={entriesLoading} />
        </div>

        {/* Entries List */}
        <div>
          <h3 className="text-sm font-semibold text-gray-200 mb-4">Recent Entries</h3>
          <EntriesViewer
            entries={selectedFormEntries}
            formConfig={selectedForm.config}
            onDelete={handleDeleteEntry}
            onExportCSV={handleExportCSV}
            onExportPDF={handleExportPDF}
            loading={entriesLoading}
          />
        </div>
      </div>
    </div>
  ) : (
    <div className="text-center py-12 text-gray-500">
      <p>Select a form to view or add entries</p>
    </div>
  );

  return (
    <PageShell title="SOS Contact Manager" description="Create forms and manage emergency contact entries">
      <div className="space-y-6">
        {mainTab === 'forms' && formContent}
        {mainTab === 'entries' && entriesContent}
      </div>
    </PageShell>
  );
}
