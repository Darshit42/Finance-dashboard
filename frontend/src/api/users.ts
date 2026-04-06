import { apiClient } from './client';
import type { User, Paginated, Role } from '../types';

export const usersApi = {
  list: async (page = 1, page_size = 20): Promise<Paginated<User>> => {
    const { data } = await apiClient.get<Paginated<User>>('/users', {
      params: { page, page_size },
    });
    return data;
  },

  updateRole: async (id: string, role: Role): Promise<User> => {
    const { data } = await apiClient.patch<User>(`/users/${id}/role`, { role });
    return data;
  },

  updateStatus: async (id: string, is_active: boolean): Promise<User> => {
    const { data } = await apiClient.patch<User>(`/users/${id}/status`, { is_active });
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/users/${id}`);
  },
};
