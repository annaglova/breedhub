export interface Contact {
  id: string;
  user_id?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  city?: string;
  country?: string;
  avatar_url?: string;
  is_breeder?: boolean;
  is_judge?: boolean;
  is_handler?: boolean;
  specialization?: string[];
}