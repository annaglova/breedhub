export interface Breed {
  id: string;
  name: string;
  authentic_name?: string;
  photo_url?: string;
  pet_type_id: 'dog' | 'cat';
  bred_for?: string;
  breed_group?: string;
  life_span?: string;
  temperament?: string;
  origin?: string;
  weight?: {
    imperial: string;
    metric: string;
  };
  height?: {
    imperial: string;
    metric: string;
  };
  statistics?: {
    avgWeightMin: number;
    avgWeightMax: number;
    avgLifespan: number;
  };
  registration_count?: number;
}

export interface BreedWithPlugins extends Breed {
  Id: string;
  Name: string;
  AvatarUrl?: string;
  PetProfileCount: number;
  KennelCount: number;
  PatronCount: number;
  HasNotes?: boolean;
  TopPatrons?: any[];
  AchievementProgress?: number;
}