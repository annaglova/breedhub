// The legacy ApiService remains importable only by explicit path for the
// auth/user-profile flow. Do not re-export it from the public core barrel:
// that made the deprecated Supabase bypass look generally available.
export { apiConfig } from './api.service';
export type { ApiResponse, PaginatedResponse, QueryParams } from './api.service';
