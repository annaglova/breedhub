import { supabase } from '../supabase';

/**
 * Environment конфігурація для API
 * Адаптовано з Angular версії
 */
export const apiConfig = {
  // Creatio API URLs (якщо потрібно зберегти інтеграцію)
  creatio: {
    baseUrl: 'https://dev.dogarray.com/0/ServiceModel/BreedprideAdminApi/',
    publicUrl: 'https://dev.dogarray.com/0/ServiceModel/BreedpridePublicApi/',
    metaUrl: 'https://dev.dogarray.com/0/BreedprideMetaApi/public/',
    searchUrl: 'https://dev.dogarray.com/0/BreedprideSearchApi/search',
  },
  
  // Supabase конфігурація
  supabase: {
    url: process.env.VITE_SUPABASE_URL || '',
    anonKey: process.env.VITE_SUPABASE_ANON_KEY || '',
  }
};

/**
 * Базові типи для API відповідей
 */
export interface ApiResponse<T = any> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface QueryParams {
  page?: number;
  pageSize?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  filters?: Record<string, any>;
}

/**
 * API Service для роботи з Supabase
 * Замінює Angular ApiService
 */
export class ApiService {
  private static instance: ApiService;

  static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  /**
   * Показати повідомлення про успіх
   */
  private showSuccessMessage(message: string) {
    // TODO: Інтегрувати з системою сповіщень
    console.log(`✅ Success: ${message}`);
  }

  /**
   * Показати повідомлення про помилку
   */
  private showErrorMessage(error: string) {
    // TODO: Інтегрувати з системою сповіщень
    console.error(`❌ Error: ${error}`);
  }

  /**
   * Загальний метод для Supabase запитів з обробкою помилок
   */
  private async executeQuery<T>(
    queryPromise: Promise<{ data: T | null; error: any }>
  ): Promise<ApiResponse<T>> {
    try {
      const { data, error } = await queryPromise;
      
      if (error) {
        this.showErrorMessage(error.message || 'Unknown error occurred');
        return {
          data: null as T,
          success: false,
          error: error.message || 'Unknown error occurred',
        };
      }

      return {
        data: data as T,
        success: true,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Network error occurred';
      this.showErrorMessage(errorMessage);
      return {
        data: null as T,
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Отримати список записів з таблиці
   */
  async getList<T>(
    tableName: string,
    params?: QueryParams
  ): Promise<ApiResponse<PaginatedResponse<T>>> {
    let query = supabase.from(tableName).select('*', { count: 'exact' });

    // Додаємо фільтри
    if (params?.filters) {
      Object.entries(params.filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          query = query.eq(key, value);
        }
      });
    }

    // Додаємо сортування
    if (params?.sort) {
      query = query.order(params.sort, { 
        ascending: params.order === 'asc' 
      });
    }

    // Додаємо пагінацію
    if (params?.page && params?.pageSize) {
      const from = (params.page - 1) * params.pageSize;
      const to = from + params.pageSize - 1;
      query = query.range(from, to);
    }

    const result = await this.executeQuery(query);

    if (result.success && result.data) {
      const { data, count } = result.data as any;
      return {
        data: {
          data,
          total: count || 0,
          page: params?.page || 1,
          pageSize: params?.pageSize || data.length,
        },
        success: true,
      };
    }

    return result as ApiResponse<PaginatedResponse<T>>;
  }

  /**
   * Отримати один запис за ID
   */
  async getById<T>(tableName: string, id: string): Promise<ApiResponse<T>> {
    const query = supabase
      .from(tableName)
      .select('*')
      .eq('id', id)
      .single();

    return this.executeQuery<T>(query);
  }

  /**
   * Створити новий запис
   */
  async create<T>(tableName: string, data: Partial<T>): Promise<ApiResponse<T>> {
    const query = supabase
      .from(tableName)
      .insert(data)
      .select()
      .single();

    const result = await this.executeQuery<T>(query);
    
    if (result.success) {
      this.showSuccessMessage('Record created successfully');
    }

    return result;
  }

  /**
   * Оновити запис
   */
  async update<T>(
    tableName: string, 
    id: string, 
    data: Partial<T>
  ): Promise<ApiResponse<T>> {
    const query = supabase
      .from(tableName)
      .update(data)
      .eq('id', id)
      .select()
      .single();

    const result = await this.executeQuery<T>(query);
    
    if (result.success) {
      this.showSuccessMessage('Record updated successfully');
    }

    return result;
  }

  /**
   * Видалити запис
   */
  async delete(tableName: string, id: string): Promise<ApiResponse<boolean>> {
    const query = supabase
      .from(tableName)
      .delete()
      .eq('id', id);

    const result = await this.executeQuery<null>(query);
    
    if (result.success) {
      this.showSuccessMessage('Record deleted successfully');
      return {
        data: true,
        success: true,
      };
    }

    return {
      data: false,
      success: false,
      error: result.error,
    };
  }

  /**
   * Масове видалення записів
   */
  async massDelete(tableName: string, ids: string[]): Promise<ApiResponse<boolean>> {
    // TODO: Додати діалог підтвердження
    const confirmed = window.confirm(`Are you sure you want to delete ${ids.length} records?`);
    
    if (!confirmed) {
      return {
        data: false,
        success: false,
        error: 'Operation cancelled by user',
      };
    }

    const query = supabase
      .from(tableName)
      .delete()
      .in('id', ids);

    const result = await this.executeQuery<null>(query);
    
    if (result.success) {
      this.showSuccessMessage(`${ids.length} records deleted successfully`);
      return {
        data: true,
        success: true,
      };
    }

    return {
      data: false,
      success: false,
      error: result.error,
    };
  }

  /**
   * Виконати Raw SQL запит (для складних операцій)
   */
  async rawQuery<T>(query: string, params?: any[]): Promise<ApiResponse<T[]>> {
    try {
      const { data, error } = await supabase.rpc('execute_sql', { 
        query_text: query, 
        query_params: params 
      });

      if (error) {
        this.showErrorMessage(error.message);
        return {
          data: [],
          success: false,
          error: error.message,
        };
      }

      return {
        data: data || [],
        success: true,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Query execution failed';
      this.showErrorMessage(errorMessage);
      return {
        data: [],
        success: false,
        error: errorMessage,
      };
    }
  }
}

// Експорт singleton instance
export const apiService = ApiService.getInstance();