// Базові типи що будуть використовуватися в усьому додатку

export interface BaseEntity {
  id: string;
  created_at?: string;
  updated_at?: string;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type LoadingState = 'idle' | 'pending' | 'succeeded' | 'failed';

export interface ErrorResponse {
  message: string;
  code?: string;
  details?: Record<string, any>;
}