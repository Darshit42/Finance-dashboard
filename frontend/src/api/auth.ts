import { apiClient } from './client';
import type { TokenResponse, User } from '../types';

export const authApi = {
  login: async (email: string, password: string): Promise<TokenResponse> => {
    const { data } = await apiClient.post<TokenResponse>('/auth/login', { email, password });
    return data;
  },

  register: async (name: string, email: string, password: string): Promise<User> => {
    const { data } = await apiClient.post<User>('/auth/register', { name, email, password });
    return data;
  },

  me: async (): Promise<User> => {
    const { data } = await apiClient.get<User>('/auth/me');
    return data;
  },
};
