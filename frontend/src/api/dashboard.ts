import { apiClient } from './client';
import type { DashboardSummary, CategoryBreakdown, TrendResponse, FinancialRecord } from '../types';

export const dashboardApi = {
  summary: async (): Promise<DashboardSummary> => {
    const { data } = await apiClient.get<DashboardSummary>('/dashboard/summary');
    return data;
  },

  byCategory: async (): Promise<CategoryBreakdown[]> => {
    const { data } = await apiClient.get<CategoryBreakdown[]>('/dashboard/by-category');
    return data;
  },

  trends: async (granularity = 'monthly', compare = false): Promise<TrendResponse> => {
    const { data } = await apiClient.get<TrendResponse>('/dashboard/trends', {
      params: { granularity, compare },
    });
    return data;
  },

  recent: async (): Promise<FinancialRecord[]> => {
    const { data } = await apiClient.get<FinancialRecord[]>('/dashboard/recent');
    return data;
  },
};
