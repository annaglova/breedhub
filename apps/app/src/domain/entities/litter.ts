import { LitterStatus } from './common';

export interface Litter {
  id: string;
  kennel_id: string;
  mother_id: string;
  father_id: string;
  breed_id: string;
  birth_date?: Date;
  expected_date?: Date;
  status: LitterStatus;
  puppies_count?: number;
  available_count?: number;
  price_range?: {
    min: number;
    max: number;
  };
  description?: string;
  photos?: string[];
}