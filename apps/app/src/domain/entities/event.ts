import { EventType, EventStatus } from './common';

export interface Event {
  id: string;
  name: string;
  type: EventType;
  status: EventStatus;
  start_date: Date;
  end_date: Date;
  location: string;
  city: string;
  country: string;
  description?: string;
  organizer_id: string;
  website?: string;
  registration_deadline?: Date;
  max_participants?: number;
  current_participants?: number;
  entry_fee?: number;
  poster_url?: string;
  judges?: string[];
  sponsors?: string[];
}