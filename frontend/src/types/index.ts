export type Role = 'VIEWER' | 'ANALYST' | 'ADMIN';
export type RecordType = 'INCOME' | 'EXPENSE';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface FinancialRecord {
  id: string;
  user_id: string;
  amount: string;
  type: RecordType;
  category: string;
  date: string;
  notes: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface DashboardSummary {
  total_income: string;
  total_expenses: string;
  net_balance: string;
  record_count: number;
}

export interface CategoryBreakdown {
  category: string;
  total_income: string;
  total_expenses: string;
  net: string;
}

export interface TrendPoint {
  period: string;
  income: string;
  expenses: string;
  net: string;
}

export interface TrendResponse {
  granularity: string;
  current_period: TrendPoint[];
  previous_period: TrendPoint[] | null;
}

export interface RecordFilters {
  page?: number;
  page_size?: number;
  date_from?: string;
  date_to?: string;
  type?: RecordType;
  category?: string;
  amount_min?: number;
  amount_max?: number;
}

export interface CreateRecordPayload {
  amount: number;
  type: RecordType;
  category: string;
  date?: string;
  notes?: string;
}

export interface UpdateRecordPayload {
  amount?: number;
  type?: RecordType;
  category?: string;
  date?: string;
  notes?: string;
}
