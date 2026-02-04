import React, { useState, useEffect } from 'react';
import type { SosFieldConfig } from '../../../../shared/types';

interface FormRendererProps {
  config: SosFieldConfig[];
  onSubmit: (data: Record<string, any>) => void;
  loading?: boolean;
}

export default function FormRenderer({ config, onSubmit, loading }: FormRendererProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [callDate, setCallDate] = useState(new Date().toISOString().split('T')[0]);
  const [callTime, setCallTime] = useState(new Date().toTimeString().slice(0, 5));

  const handleChange = (fieldId: string, value: any) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[fieldId];
      return newErrors;
    });
  };

  const handleCheckboxChange = (fieldId: string, value: string) => {
    const currentValues = formData[fieldId] || [];
    const newValues = currentValues.includes(value)
      ? currentValues.filter((v: string) => v !== value)
      : [...currentValues, value];
    handleChange(fieldId, newValues);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    for (const field of config) {
      if (field.required && (!formData[field.id] || (Array.isArray(formData[field.id]) && formData[field.id].length === 0))) {
        newErrors[field.id] = `${field.label} is required`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit({
        formData,
        callDate,
        callTime,
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Call Date and Time */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-gray-800 border border-gray-700 rounded">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Call Date</label>
          <input
            type="date"
            value={callDate}
            onChange={(e) => setCallDate(e.target.value)}
            disabled={loading}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-gray-100 disabled:bg-gray-800 disabled:cursor-not-allowed"
          />
          <p className="text-xs text-gray-500 mt-1">Change if the call was before today</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Call Time</label>
          <input
            type="time"
            value={callTime}
            onChange={(e) => setCallTime(e.target.value)}
            disabled={loading}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-gray-100 disabled:bg-gray-800 disabled:cursor-not-allowed"
          />
          <p className="text-xs text-gray-500 mt-1">Change if the call was at a different time</p>
        </div>
      </div>

      {/* Form Fields */}
      {config.length === 0 ? (
        <div className="text-center py-8 text-gray-500 border border-gray-700 rounded bg-gray-800/50">
          No fields configured for this form.
        </div>
      ) : (
        config.map((field) => (
          <div key={field.id}>
            <label className="block text-sm font-medium text-gray-200 mb-1">
              {field.label}
              {field.required && <span className="text-red-400"> *</span>}
            </label>

            {field.type === 'text' && (
              <input
                type="text"
                placeholder={field.placeholder}
                value={formData[field.id] || ''}
                onChange={(e) => handleChange(field.id, e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-gray-100 placeholder-gray-500 disabled:bg-gray-800 disabled:cursor-not-allowed"
              />
            )}

            {field.type === 'email' && (
              <input
                type="email"
                placeholder={field.placeholder}
                value={formData[field.id] || ''}
                onChange={(e) => handleChange(field.id, e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-gray-100 placeholder-gray-500 disabled:bg-gray-800 disabled:cursor-not-allowed"
              />
            )}

            {field.type === 'phone' && (
              <input
                type="tel"
                placeholder={field.placeholder}
                value={formData[field.id] || ''}
                onChange={(e) => handleChange(field.id, e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-gray-100 placeholder-gray-500 disabled:bg-gray-800 disabled:cursor-not-allowed"
              />
            )}

            {field.type === 'number' && (
              <input
                type="number"
                placeholder={field.placeholder}
                value={formData[field.id] || ''}
                onChange={(e) => handleChange(field.id, e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-gray-100 placeholder-gray-500 disabled:bg-gray-800 disabled:cursor-not-allowed"
              />
            )}

            {field.type === 'date' && (
              <input
                type="date"
                value={formData[field.id] || ''}
                onChange={(e) => handleChange(field.id, e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-gray-100 disabled:bg-gray-800 disabled:cursor-not-allowed"
              />
            )}

            {field.type === 'time' && (
              <input
                type="time"
                value={formData[field.id] || ''}
                onChange={(e) => handleChange(field.id, e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-gray-100 disabled:bg-gray-800 disabled:cursor-not-allowed"
              />
            )}

            {field.type === 'textarea' && (
              <textarea
                placeholder={field.placeholder}
                value={formData[field.id] || ''}
                onChange={(e) => handleChange(field.id, e.target.value)}
                disabled={loading}
                rows={4}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-gray-100 placeholder-gray-500 disabled:bg-gray-800 disabled:cursor-not-allowed"
              />
            )}

            {field.type === 'dropdown' && (
              <select
                value={formData[field.id] || ''}
                onChange={(e) => handleChange(field.id, e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-gray-100 disabled:bg-gray-800 disabled:cursor-not-allowed"
              >
                <option value="">Select {field.label}</option>
                {(field.options || []).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            )}

            {field.type === 'radio' && (
              <div className="space-y-2">
                {(field.options || []).map((opt) => (
                  <label key={opt} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name={field.id}
                      value={opt}
                      checked={formData[field.id] === opt}
                      onChange={(e) => handleChange(field.id, e.target.value)}
                      disabled={loading}
                      className="disabled:cursor-not-allowed"
                    />
                    <span className="text-sm text-gray-200">{opt}</span>
                  </label>
                ))}
              </div>
            )}

            {field.type === 'checkbox' && (
              <div className="space-y-2">
                {(field.options || []).map((opt) => (
                  <label key={opt} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(formData[field.id] || []).includes(opt)}
                      onChange={() => handleCheckboxChange(field.id, opt)}
                      disabled={loading}
                      className="disabled:cursor-not-allowed"
                    />
                    <span className="text-sm text-gray-200">{opt}</span>
                  </label>
                ))}
              </div>
            )}

            {errors[field.id] && <p className="text-xs text-red-400 mt-1">{errors[field.id]}</p>}
          </div>
        ))
      )}

      <button
        type="submit"
        disabled={loading || config.length === 0}
        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded transition"
      >
        {loading ? 'Saving...' : 'Save Entry'}
      </button>
    </form>
  );
}
