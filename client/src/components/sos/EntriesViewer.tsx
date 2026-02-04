import React, { useState, useCallback } from 'react';
import { Download, Trash2, Filter, X } from 'lucide-react';
import type { SosEntry, SosFieldConfig } from '../../../../shared/types';

interface EntriesViewerProps {
  entries: SosEntry[];
  formConfig: SosFieldConfig[];
  onDelete: (id: string) => void;
  onExportCSV: () => void;
  onExportPDF: () => void;
  loading?: boolean;
}

export default function EntriesViewer({
  entries,
  formConfig,
  onDelete,
  onExportCSV,
  onExportPDF,
  loading,
}: EntriesViewerProps) {
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);

  const filteredEntries = entries.filter((entry) => {
    if (filterStartDate && entry.call_date < filterStartDate) return false;
    if (filterEndDate && entry.call_date > filterEndDate) return false;
    return true;
  });

  const fieldMap = new Map(formConfig.map((f) => [f.id, f]));

  const clearFilters = () => {
    setFilterStartDate('');
    setFilterEndDate('');
  };

  const hasActiveFilters = filterStartDate || filterEndDate;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="p-3 bg-gray-800 border border-gray-700 rounded space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-200 flex items-center gap-2">
            <Filter size={16} />
            Date Range Filter
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-gray-300"
            >
              Clear Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-400 block mb-1">From</label>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              disabled={loading}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-gray-100 disabled:bg-gray-800 disabled:cursor-not-allowed"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-400 block mb-1">To</label>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              disabled={loading}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-gray-100 disabled:bg-gray-800 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={onExportCSV}
            disabled={loading || filteredEntries.length === 0}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-700 hover:bg-green-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm font-medium rounded transition"
          >
            <Download size={16} />
            Export CSV
          </button>
          <button
            onClick={onExportPDF}
            disabled={loading || filteredEntries.length === 0}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-700 hover:bg-red-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm font-medium rounded transition"
          >
            <Download size={16} />
            Export PDF
          </button>
        </div>
      </div>

      {/* Entries List */}
      <div className="space-y-2">
        {filteredEntries.length === 0 ? (
          <div className="text-center py-8 text-gray-500 border border-gray-700 rounded bg-gray-800/50">
            {entries.length === 0 ? 'No entries yet.' : 'No entries match the selected date range.'}
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-400">
              Showing {filteredEntries.length} of {entries.length} entries
            </p>
            {filteredEntries.map((entry) => (
              <div key={entry.id} className="bg-gray-800 border border-gray-700 rounded overflow-hidden">
                <button
                  onClick={() => setExpandedEntryId(expandedEntryId === entry.id ? null : entry.id)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-750 transition text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-200">
                      {entry.call_date} at {entry.call_time}
                    </p>
                    <p className="text-xs text-gray-500">
                      Entered: {new Date(entry.entry_created_at).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(entry.id);
                    }}
                    disabled={loading}
                    className="p-2 text-red-400 hover:text-red-300 disabled:cursor-not-allowed transition ml-2"
                  >
                    <Trash2 size={16} />
                  </button>
                </button>

                {expandedEntryId === entry.id && (
                  <div className="px-4 py-3 bg-gray-750 border-t border-gray-700 space-y-2">
                    {Object.entries(entry.data).map(([fieldId, value]) => {
                      const field = fieldMap.get(fieldId);
                      if (!field) return null;

                      let displayValue = value;
                      if (Array.isArray(value)) displayValue = value.join(', ');
                      if (value === null || value === undefined) displayValue = '-';

                      return (
                        <div key={fieldId} className="text-sm">
                          <p className="text-xs font-medium text-gray-400">{field.label}</p>
                          <p className="text-gray-200 mt-0.5 break-words">{displayValue}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
