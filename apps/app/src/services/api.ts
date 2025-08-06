import axios from 'axios';

// API configuration
// In development, we use proxy to avoid CORS issues
const isDevelopment = import.meta.env.DEV;
const API_URL = isDevelopment ? '/api' : 'https://dev.dogarray.com';

export const API_ENDPOINTS = {
  collection: `${API_URL}/0/BreedprideAdminApi/collection/`,
  space: `${API_URL}/0/BreedprideAdminApi/space/collection/`,
  public: `${API_URL}/0/BreedpridePublicApi/`,
  admin: `${API_URL}/0/BreedprideAdminApi/`,
  landing: `${API_URL}/0/BreedprideLandingApi/`,
};

// Types
export interface CrmResponse<T = any> {
  result: {
    isSuccess: boolean;
    data?: T;
    entities?: T[];
    total?: number;
    message?: string;
  };
}

export interface Breed {
  Id: string;
  Name: string;
  PetProfileCount: number;
  KennelCount: number;
  PatronCount: number;
  AchievementProgress?: number;
  HasNotes?: boolean;
  TopPatrons?: any[];
  Avatar?: string;
  Description?: string;
}

export interface Pet {
  Id: string;
  Name: string;
  Breed?: string;
  BreedName?: string;
  Age?: number;
  Avatar?: string;
  Owner?: string;
  OwnerName?: string;
}

// API client
export const apiClient = axios.create({
  baseURL: isDevelopment ? '' : API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for debugging
apiClient.interceptors.request.use(
  (config) => {
    console.log('=== Axios Request ===');
    console.log('URL:', config.url);
    console.log('Method:', config.method);
    console.log('Base URL:', config.baseURL);
    console.log('Full URL:', config.baseURL + config.url);
    console.log('Headers:', config.headers);
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for debugging
apiClient.interceptors.response.use(
  (response) => {
    console.log('=== Axios Response ===');
    console.log('Status:', response.status);
    console.log('Data:', response.data);
    return response;
  },
  (error) => {
    console.error('=== Axios Error ===');
    console.error('Message:', error.message);
    console.error('Response:', error.response);
    console.error('Request:', error.request);
    return Promise.reject(error);
  }
);

// Helper to build query params
const buildParams = (config: {
  columns?: string[];
  rows?: number;
  from?: number;
  filters?: any;
  force?: boolean;
}) => {
  const params = new URLSearchParams();
  
  if (config.columns) {
    config.columns.forEach(col => params.append('columns', col));
  }
  if (config.rows) params.set('rows', config.rows.toString());
  if (config.from !== undefined) params.set('from', config.from.toString());
  if (config.filters) params.set('filters', JSON.stringify(config.filters));
  if (config.force) params.set('force', 'true');
  params.set('customQuery', 'true');
  
  return params;
};

// API methods
export const api = {
  // Get breeds list
  async getBreeds(params: {
    rows?: number;
    from?: number;
    filters?: any;
  } = {}) {
    const queryParams = buildParams({
      columns: [
        'Id',
        'Name', 
        'PetProfileCount',
        'KennelCount',
        'PatronCount',
        'AchievementProgress',
        'HasNotes',
        'Avatar'
      ],
      rows: params.rows || 60,
      from: params.from || 0,
      filters: params.filters,
      force: true
    });

    const url = `${API_ENDPOINTS.space}Breed?${queryParams}`;
    console.log('API Request URL:', url);
    console.log('Full URL:', url.startsWith('http') ? url : window.location.origin + url);

    const response = await apiClient.get<CrmResponse<Breed>>(url);
    
    console.log('Raw API response:', response);
    
    return {
      entities: response.data.result.entities || [],
      total: response.data.result.total || 0
    };
  },

  // Get pets list
  async getPets(params: {
    rows?: number;
    from?: number;
    filters?: any;
  } = {}) {
    const queryParams = buildParams({
      columns: [
        'Id',
        'Name',
        'Breed',
        'Breed.Name',
        'Age',
        'Avatar',
        'Owner',
        'Owner.Name'
      ],
      rows: params.rows || 60,
      from: params.from || 0,
      filters: params.filters,
      force: true
    });

    const response = await apiClient.get<CrmResponse<Pet>>(
      `${API_ENDPOINTS.space}Pet?${queryParams}`
    );
    
    return {
      entities: response.data.result.entities || [],
      total: response.data.result.total || 0
    };
  },

  // Get single breed by ID
  async getBreedById(id: string) {
    const queryParams = buildParams({
      columns: [
        'Id',
        'Name',
        'PetProfileCount',
        'KennelCount', 
        'PatronCount',
        'AchievementProgress',
        'HasNotes',
        'Avatar',
        'Description'
      ]
    });

    const response = await apiClient.get<CrmResponse<Breed>>(
      `${API_ENDPOINTS.admin}Breed/${id}?${queryParams}`
    );
    
    return response.data.result;
  }
};