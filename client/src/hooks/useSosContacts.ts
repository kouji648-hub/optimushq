import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/http';
import type { SosForm, SosEntry, SosFieldConfig } from '../../../shared/types';

interface CreateFormData {
  name: string;
  description?: string;
  config: SosFieldConfig[];
}

interface CreateEntryData {
  form_id: string;
  data: Record<string, any>;
  call_date: string;
  call_time: string;
}

interface UpdateEntryData {
  data?: Record<string, any>;
  call_date?: string;
  call_time?: string;
}

export function useSosContacts() {
  const [forms, setForms] = useState<SosForm[]>([]);
  const [entries, setEntries] = useState<SosEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [entriesLoading, setEntriesLoading] = useState(false);

  // Load all forms
  const loadForms = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<SosForm[]>('/sos/forms');
      setForms(data);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load entries with optional filtering
  const loadEntries = useCallback(async (formId?: string, startDate?: string, endDate?: string) => {
    setEntriesLoading(true);
    try {
      let path = '/sos/entries';
      const params = new URLSearchParams();
      if (formId) params.append('form_id', formId);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (params.toString()) path += `?${params.toString()}`;

      const data = await api.get<SosEntry[]>(path);
      setEntries(data);
    } finally {
      setEntriesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadForms();
  }, [loadForms]);

  const createForm = async (data: CreateFormData) => {
    const form = await api.post<SosForm>('/sos/forms', data);
    setForms((prev) => [...prev, form]);
    return form;
  };

  const updateForm = async (id: string, data: Partial<CreateFormData>) => {
    const form = await api.put<SosForm>(`/sos/forms/${id}`, data);
    setForms((prev) => prev.map((f) => (f.id === id ? form : f)));
    return form;
  };

  const deleteForm = async (id: string) => {
    await api.del(`/sos/forms/${id}`);
    setForms((prev) => prev.filter((f) => f.id !== id));
    setEntries((prev) => prev.filter((e) => e.form_id !== id));
  };

  const createEntry = async (data: CreateEntryData) => {
    const entry = await api.post<SosEntry>('/sos/entries', data);
    setEntries((prev) => [entry, ...prev]);
    return entry;
  };

  const updateEntry = async (id: string, data: UpdateEntryData) => {
    const entry = await api.put<SosEntry>(`/sos/entries/${id}`, data);
    setEntries((prev) => prev.map((e) => (e.id === id ? entry : e)));
    return entry;
  };

  const deleteEntry = async (id: string) => {
    await api.del(`/sos/entries/${id}`);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  return {
    forms,
    entries,
    loading,
    entriesLoading,
    loadForms,
    loadEntries,
    createForm,
    updateForm,
    deleteForm,
    createEntry,
    updateEntry,
    deleteEntry,
  };
}
