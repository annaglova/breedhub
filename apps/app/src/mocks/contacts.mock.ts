/**
 * Mock data for contacts
 */

import { Contact } from '@/domain/entities/contact';
import { mockCountries } from './lookups.mock';

export const mockContacts: Contact[] = [
  {
    id: 'contact-1',
    first_name: 'John',
    last_name: 'Smith',
    display_name: 'John Smith',
    email: 'john.smith@example.com',
    phone: '+1 (555) 123-4567',
    is_breeder: true,
    is_owner: true,
    is_handler: false,
    is_judge: false,
    is_active: true,
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    address: '123 Main St',
    city: 'New York',
    region: 'NY',
    postal_code: '10001',
    country_id: '1', // USA
    created_at: '2023-01-10T08:00:00Z',
    updated_at: '2024-01-12T10:20:00Z'
  },
  {
    id: 'contact-2',
    first_name: 'Emily',
    last_name: 'Johnson',
    display_name: 'Emily Johnson',
    email: 'emily.johnson@example.com',
    phone: '+1 (555) 234-5678',
    is_breeder: true,
    is_owner: true,
    is_handler: true,
    is_judge: false,
    is_active: true,
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
    address: '456 Oak Ave',
    city: 'Los Angeles',
    region: 'CA',
    postal_code: '90001',
    country_id: '1', // USA
    created_at: '2023-02-15T10:30:00Z',
    updated_at: '2024-01-10T14:15:00Z'
  },
  {
    id: 'contact-3',
    first_name: 'Michael',
    last_name: 'Brown',
    display_name: 'Michael Brown',
    email: 'michael.brown@example.com',
    phone: '+44 20 7123 4567',
    is_breeder: true,
    is_owner: true,
    is_handler: false,
    is_judge: true,
    is_active: true,
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
    address: '789 Park Lane',
    city: 'London',
    region: 'England',
    postal_code: 'SW1A 1AA',
    country_id: '2', // UK
    license_number: 'UK-JUDGE-2021-0345',
    created_at: '2023-01-20T09:00:00Z',
    updated_at: '2024-01-08T11:45:00Z'
  },
  {
    id: 'contact-4',
    first_name: 'Sarah',
    last_name: 'Davis',
    display_name: 'Sarah Davis',
    email: 'sarah.davis@example.com',
    phone: '+1 (555) 345-6789',
    is_breeder: false,
    is_owner: true,
    is_handler: true,
    is_judge: false,
    is_active: true,
    avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400',
    address: '321 Elm St',
    city: 'Chicago',
    region: 'IL',
    postal_code: '60601',
    country_id: '1', // USA
    created_at: '2023-03-10T12:00:00Z',
    updated_at: '2024-01-06T09:30:00Z'
  },
  {
    id: 'contact-5',
    first_name: 'Hans',
    last_name: 'Mueller',
    display_name: 'Dr. Hans Mueller',
    email: 'hans.mueller@example.de',
    phone: '+49 30 12345678',
    is_breeder: true,
    is_owner: true,
    is_handler: false,
    is_judge: true,
    is_active: true,
    avatar_url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400',
    address: 'Hauptstraße 123',
    city: 'Berlin',
    region: 'Berlin',
    postal_code: '10115',
    country_id: '4', // Germany
    license_number: 'DE-JUDGE-2020-0789',
    created_at: '2023-02-01T08:00:00Z',
    updated_at: '2024-01-11T13:20:00Z'
  },
  {
    id: 'contact-6',
    first_name: 'Marie',
    last_name: 'Dubois',
    display_name: 'Marie Dubois',
    email: 'marie.dubois@example.fr',
    phone: '+33 1 23 45 67 89',
    is_breeder: true,
    is_owner: true,
    is_handler: true,
    is_judge: false,
    is_active: true,
    avatar_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400',
    address: '15 Rue de la Paix',
    city: 'Paris',
    region: 'Île-de-France',
    postal_code: '75001',
    country_id: '5', // France
    created_at: '2023-04-05T11:00:00Z',
    updated_at: '2024-01-05T16:40:00Z'
  },
  {
    id: 'contact-7',
    first_name: 'Robert',
    last_name: 'Wilson',
    display_name: 'Robert Wilson',
    email: 'robert.wilson@example.ca',
    phone: '+1 (416) 555-0123',
    is_breeder: false,
    is_owner: true,
    is_handler: false,
    is_judge: false,
    is_active: true,
    avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400',
    address: '567 Maple Ave',
    city: 'Toronto',
    region: 'ON',
    postal_code: 'M5H 2N2',
    country_id: '3', // Canada
    created_at: '2023-05-12T14:30:00Z',
    updated_at: '2024-01-03T10:15:00Z'
  },
  {
    id: 'contact-8',
    first_name: 'Anna',
    last_name: 'Kowalski',
    display_name: 'Anna Kowalski',
    email: 'anna.kowalski@example.pl',
    phone: '+48 22 123 45 67',
    is_breeder: true,
    is_owner: true,
    is_handler: false,
    is_judge: false,
    is_active: true,
    avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400',
    address: 'ul. Nowy Świat 12',
    city: 'Warsaw',
    region: 'Mazowieckie',
    postal_code: '00-001',
    country_id: '8', // Poland
    created_at: '2023-06-20T09:45:00Z',
    updated_at: '2024-01-02T14:50:00Z'
  },
  {
    id: 'contact-9',
    first_name: 'James',
    last_name: 'Taylor',
    display_name: 'James Taylor',
    email: 'james.taylor@example.au',
    phone: '+61 2 9876 5432',
    is_breeder: true,
    is_owner: true,
    is_handler: true,
    is_judge: true,
    is_active: true,
    avatar_url: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=400',
    address: '890 George St',
    city: 'Sydney',
    region: 'NSW',
    postal_code: '2000',
    country_id: '6', // Australia
    license_number: 'AU-JUDGE-2019-0234',
    created_at: '2023-01-25T07:30:00Z',
    updated_at: '2024-01-13T12:00:00Z'
  },
  {
    id: 'contact-10',
    first_name: 'Yuki',
    last_name: 'Tanaka',
    display_name: 'Yuki Tanaka',
    email: 'yuki.tanaka@example.jp',
    phone: '+81 3 1234 5678',
    is_breeder: true,
    is_owner: true,
    is_handler: false,
    is_judge: false,
    is_active: true,
    avatar_url: 'https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?w=400',
    address: '1-2-3 Shibuya',
    city: 'Tokyo',
    region: 'Tokyo',
    postal_code: '150-0002',
    country_id: '7', // Japan
    created_at: '2023-07-30T10:00:00Z',
    updated_at: '2024-01-01T08:20:00Z'
  }
];

// Helper functions
export const getRandomContact = () => mockContacts[Math.floor(Math.random() * mockContacts.length)];

export const getBreeders = () => mockContacts.filter(c => c.is_breeder);

export const getJudges = () => mockContacts.filter(c => c.is_judge);

export const getHandlers = () => mockContacts.filter(c => c.is_handler);

export const getContactsByCountry = (countryId: string) => 
  mockContacts.filter(c => c.country_id === countryId);

export const getContactWithCountry = (contactId: string) => {
  const contact = mockContacts.find(c => c.id === contactId);
  if (!contact) return undefined;
  
  return {
    ...contact,
    country: mockCountries.find(c => c.id === contact.country_id)
  };
};