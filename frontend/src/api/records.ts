import { apiClient } from './client';
import type { FinancialRecord, Paginated, RecordFilters, CreateRecordPayload, UpdateRecordPayload } from '../types';

export const recordsApi = {
  list: async (filters: RecordFilters = {}): Promise<Paginated<FinancialRecord>> => {
    const params = Object.fromEntries(
      Object.entries(filters).filter(([, v]) => v !== undefined && v !== '' && v !== null)
    );
    const { data } = await apiClient.get<Paginated<FinancialRecord>>('/records', { params });
    return data;
  },

  get: async (id: string): Promise<FinancialRecord> => {
    const { data } = await apiClient.get<FinancialRecord>(`/records/${id}`);
    return data;
  },

  create: async (payload: CreateRecordPayload): Promise<FinancialRecord> => {
    const { data } = await apiClient.post<FinancialRecord>('/records', payload);
    return data;
  },

  update: async (id: string, payload: UpdateRecordPayload): Promise<FinancialRecord> => {
    const { data } = await apiClient.patch<FinancialRecord>(`/records/${id}`, payload);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/records/${id}`);
  },
};
