import React, { useState } from 'react';
import { Plus, Trash2, Copy, ChevronDown } from 'lucide-react';
import type { SosFieldConfig, SosFieldType } from '../../../../shared/types';

interface FormBuilderProps {
  config: SosFieldConfig[];
  onChange: (config: SosFieldConfig[]) => void;
  disabled?: boolean;
}

const FIELD_TYPES: { type: SosFieldType; label: string; icon: string }[] = [
  { type: 'text', label: 'Text Input', icon: '📝' },
  { type: 'email', label: 'Email', icon: '📧' },
  { type: 'phone', label: 'Phone', icon: '📱' },
  { type: 'number', label: 'Number', icon: '🔢' },
  { type: 'date', label: 'Date', icon: '📅' },
  { type: 'time', label: 'Time', icon: '⏰' },
  { type: 'textarea', label: 'Text Area', icon: '📄' },
  { type: 'dropdown', label: 'Dropdown', icon: '📋' },
  { type: 'radio', label: 'Radio Buttons', icon: '⭕' },
  { type: 'checkbox', label: 'Checkboxes', icon: '☑️' },
];

export default function FormBuilder({ config, onChange, disabled }: FormBuilderProps) {
  const [expandedField, setExpandedField] = useState<string | null>(null);

  const addField = (type: SosFieldType) => {
    const newField: SosFieldConfig = {
      id: Math.random().toString(36).substring(2, 9),
      type,
      label: `New ${type}`,
      placeholder: '',
      required: false,
      ...((['dropdown', 'radio', 'checkbox'].includes(type)) && { options: ['Option 1', 'Option 2'] }),
    };
    onChange([...config, newField]);
  };

  const updateField = (id: string, updates: Partial<SosFieldConfig>) => {
    onChange(config.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  const removeField = (id: string) => {
    onChange(config.filter((f) => f.id !== id));
  };

  const duplicateField = (id: string) => {
    const field = config.find((f) => f.id === id);
    if (!field) return;
    const copy: SosFieldConfig = { ...field, id: Math.random().toString(36).substring(2, 9) };
    onChange([...config, copy]);
  };

  const moveField = (id: string, direction: 'up' | 'down') => {
    const idx = config.findIndex((f) => f.id === id);
    if (idx === -1) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === config.length - 1) return;

    const newConfig = [...config];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    [newConfig[idx], newConfig[targetIdx]] = [newConfig[targetIdx], newConfig[idx]];
    onChange(newConfig);
  };

  return (
    <div className="space-y-4">
      {/* Field Palette */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase mb-3">Add Fields</p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {FIELD_TYPES.map((ft) => (
            <button
              key={ft.type}
              onClick={() => addField(ft.type)}
              disabled={disabled}
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-xs rounded text-gray-200 font-medium transition"
              title={ft.label}
            >
              <span>{ft.icon}</span>
              <span className="hidden sm:inline ml-1">{ft.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Form Fields */}
      <div className="space-y-2">
        {config.length === 0 ? (
          <div className="text-center py-8 text-gray-500 border border-gray-700 rounded bg-gray-800/50">
            No fields yet. Add fields from the palette above.
          </div>
        ) : (
          config.map((field, idx) => (
            <div key={field.id} className="bg-gray-800 border border-gray-700 rounded p-3 space-y-2">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setExpandedField(expandedField === field.id ? null : field.id)}
                  className="flex-1 flex items-center gap-2 text-sm font-medium text-gray-200 hover:text-white transition"
                >
                  <ChevronDown
                    size={16}
                    className={`transition-transform ${expandedField === field.id ? 'rotate-180' : ''}`}
                  />
                  <span className="text-xs text-gray-400">{field.type}</span>
                  <span className="font-medium">{field.label}</span>
                  {field.required && <span className="text-red-400 text-xs">*</span>}
                </button>

                <div className="flex gap-1">
                  <button
                    onClick={() => moveField(field.id, 'up')}
                    disabled={idx === 0 || disabled}
                    className="p-1 text-gray-400 hover:text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveField(field.id, 'down')}
                    disabled={idx === config.length - 1 || disabled}
                    className="p-1 text-gray-400 hover:text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    title="Move down"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => duplicateField(field.id)}
                    disabled={disabled}
                    className="p-1 text-gray-400 hover:text-gray-200 disabled:cursor-not-allowed transition"
                    title="Duplicate"
                  >
                    <Copy size={16} />
                  </button>
                  <button
                    onClick={() => removeField(field.id)}
                    disabled={disabled}
                    className="p-1 text-red-400 hover:text-red-300 disabled:cursor-not-allowed transition"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Field Details */}
              {expandedField === field.id && (
                <div className="mt-3 pt-3 border-t border-gray-700 space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-400">Label</label>
                    <input
                      type="text"
                      value={field.label}
                      onChange={(e) => updateField(field.id, { label: e.target.value })}
                      disabled={disabled}
                      className="w-full mt-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-gray-100 placeholder-gray-500 disabled:bg-gray-800 disabled:cursor-not-allowed"
                    />
                  </div>

                  {!['date', 'time'].includes(field.type) && (
                    <div>
                      <label className="text-xs font-medium text-gray-400">Placeholder</label>
                      <input
                        type="text"
                        value={field.placeholder || ''}
                        onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                        disabled={disabled}
                        className="w-full mt-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-gray-100 placeholder-gray-500 disabled:bg-gray-800 disabled:cursor-not-allowed"
                      />
                    </div>
                  )}

                  <label className="flex items-center gap-2 text-xs font-medium text-gray-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={(e) => updateField(field.id, { required: e.target.checked })}
                      disabled={disabled}
                      className="rounded disabled:cursor-not-allowed"
                    />
                    Required field
                  </label>

                  {['dropdown', 'radio', 'checkbox'].includes(field.type) && (
                    <div>
                      <label className="text-xs font-medium text-gray-400">Options (one per line)</label>
                      <textarea
                        value={(field.options || []).join('\n')}
                        onChange={(e) =>
                          updateField(field.id, {
                            options: e.target.value.split('\n').filter((o) => o.trim()),
                          })
                        }
                        disabled={disabled}
                        rows={3}
                        className="w-full mt-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-gray-100 placeholder-gray-500 disabled:bg-gray-800 disabled:cursor-not-allowed"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
