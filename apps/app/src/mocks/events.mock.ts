/**
 * Mock data for events
 */

import { Event } from '@/domain/entities/event';
import { EventType, EventStatus } from '@/domain/entities/common';
import { mockContacts } from './contacts.mock';
import { mockCountries } from './lookups.mock';

export const mockEvents: Event[] = [
  {
    id: 'event-1',
    name: 'Westminster Dog Show 2024',
    event_type: EventType.SHOW,
    status: EventStatus.REGISTRATION_OPEN,
    start_date: '2024-02-10',
    end_date: '2024-02-11',
    registration_deadline: '2024-01-31',
    description: 'The prestigious Westminster Kennel Club Dog Show, featuring top dogs from around the world.',
    location_name: 'Madison Square Garden',
    address: '4 Pennsylvania Plaza',
    city: 'New York',
    region: 'NY',
    postal_code: '10001',
    country_id: '1', // USA
    organizer_id: 'contact-1',
    max_participants: 2500,
    current_participants: 1876,
    entry_fee: 75,
    is_public: true,
    is_online: false,
    website: 'https://www.westminsterkennelclub.org',
    contact_email: 'info@westminsterkennelclub.org',
    contact_phone: '+1 (212) 213-3165',
    rules_document_url: 'https://example.com/rules.pdf',
    schedule: [
      { time: '08:00', activity: 'Check-in opens' },
      { time: '09:00', activity: 'Breed judging begins' },
      { time: '12:00', activity: 'Lunch break' },
      { time: '13:00', activity: 'Group competitions' },
      { time: '18:00', activity: 'Best in Show' }
    ],
    categories: ['All Breeds', 'Junior Showmanship', 'Obedience'],
    sponsors: ['Purina', 'PetSmart', 'Blue Buffalo'],
    prize_description: 'Best in Show: $5000 + Trophy',
    created_at: '2023-10-01T10:00:00Z',
    updated_at: '2024-01-12T14:30:00Z'
  },
  {
    id: 'event-2',
    name: 'German Shepherd National Championship',
    event_type: EventType.COMPETITION,
    status: EventStatus.PLANNED,
    start_date: '2024-05-15',
    end_date: '2024-05-17',
    registration_deadline: '2024-04-30',
    description: 'Annual German Shepherd Dog championship with conformation and working trials.',
    location_name: 'Canine Sports Complex',
    address: 'Hauptstraße 100',
    city: 'Munich',
    region: 'Bavaria',
    postal_code: '80331',
    country_id: '4', // Germany
    organizer_id: 'contact-5',
    max_participants: 500,
    current_participants: 0,
    entry_fee: 100,
    is_public: true,
    is_online: false,
    categories: ['Conformation', 'Schutzhund', 'Agility', 'Tracking'],
    prize_description: 'Trophies and titles for each category',
    created_at: '2023-12-15T09:00:00Z',
    updated_at: '2024-01-10T11:20:00Z'
  },
  {
    id: 'event-3',
    name: 'International Cat Show Paris',
    event_type: EventType.EXHIBITION,
    status: EventStatus.COMPLETED,
    start_date: '2023-11-18',
    end_date: '2023-11-19',
    registration_deadline: '2023-11-01',
    description: 'Premier cat show featuring all breeds with international judges.',
    location_name: 'Paris Expo Porte de Versailles',
    address: '1 Place de la Porte de Versailles',
    city: 'Paris',
    region: 'Île-de-France',
    postal_code: '75015',
    country_id: '5', // France
    organizer_id: 'contact-6',
    max_participants: 800,
    current_participants: 756,
    entry_fee: 50,
    is_public: true,
    is_online: false,
    results_published: true,
    results_url: 'https://example.com/paris-cat-show-results-2023',
    created_at: '2023-09-01T10:00:00Z',
    updated_at: '2023-11-25T16:45:00Z'
  },
  {
    id: 'event-4',
    name: 'Breeder Education Webinar Series',
    event_type: EventType.MEETING,
    status: EventStatus.REGISTRATION_OPEN,
    start_date: '2024-02-01',
    end_date: '2024-02-29',
    registration_deadline: '2024-01-25',
    description: 'Monthly online educational series covering breeding best practices, health testing, and genetics.',
    organizer_id: 'contact-3',
    max_participants: 200,
    current_participants: 145,
    entry_fee: 0,
    is_public: true,
    is_online: true,
    online_platform: 'Zoom',
    online_link: 'https://zoom.us/webinar/breeder-education',
    schedule: [
      { time: '2024-02-01 19:00', activity: 'Genetic Testing Basics' },
      { time: '2024-02-08 19:00', activity: 'Nutrition for Breeding Dogs' },
      { time: '2024-02-15 19:00', activity: 'Whelping and Neonatal Care' },
      { time: '2024-02-22 19:00', activity: 'Marketing Your Kennel' }
    ],
    created_at: '2023-12-20T14:00:00Z',
    updated_at: '2024-01-08T10:30:00Z'
  },
  {
    id: 'event-5',
    name: 'Canine Good Citizen Test',
    event_type: EventType.EXAM,
    status: EventStatus.REGISTRATION_OPEN,
    start_date: '2024-03-10',
    end_date: '2024-03-10',
    registration_deadline: '2024-03-05',
    description: 'Official AKC Canine Good Citizen certification test.',
    location_name: 'Central Park Dog Training Area',
    address: 'Central Park West',
    city: 'New York',
    region: 'NY',
    postal_code: '10024',
    country_id: '1', // USA
    organizer_id: 'contact-1',
    max_participants: 50,
    current_participants: 32,
    entry_fee: 30,
    is_public: true,
    is_online: false,
    requirements: [
      'Dogs must be at least 6 months old',
      'Current vaccination records required',
      'Dogs must be on leash'
    ],
    created_at: '2024-01-05T11:00:00Z',
    updated_at: '2024-01-11T09:15:00Z'
  },
  {
    id: 'event-6',
    name: 'Spring Fun Match',
    event_type: EventType.SHOW,
    status: EventStatus.PLANNED,
    start_date: '2024-04-20',
    end_date: '2024-04-20',
    registration_deadline: '2024-04-15',
    description: 'Informal fun match for puppies and young dogs. Great practice for formal shows!',
    location_name: 'Riverside Park',
    address: '123 River Road',
    city: 'Chicago',
    region: 'IL',
    postal_code: '60601',
    country_id: '1', // USA
    organizer_id: 'contact-4',
    max_participants: 100,
    current_participants: 0,
    entry_fee: 15,
    is_public: true,
    is_online: false,
    categories: ['3-6 months puppy', '6-12 months puppy', '12-18 months junior'],
    created_at: '2024-01-10T13:00:00Z',
    updated_at: '2024-01-10T13:00:00Z'
  }
];

// Helper functions
export const getEventWithOrganizer = (eventId: string) => {
  const event = mockEvents.find(e => e.id === eventId);
  if (!event) return undefined;
  
  return {
    ...event,
    organizer: mockContacts.find(c => c.id === event.organizer_id),
    country: event.country_id ? mockCountries.find(c => c.id === event.country_id) : undefined
  };
};

export const getRandomEvent = () => mockEvents[Math.floor(Math.random() * mockEvents.length)];

export const getUpcomingEvents = () => {
  const now = new Date();
  return mockEvents.filter(e => new Date(e.start_date) > now);
};

export const getActiveEvents = () => mockEvents.filter(e => 
  e.status === EventStatus.REGISTRATION_OPEN || 
  e.status === EventStatus.IN_PROGRESS
);

export const getEventsByType = (type: EventType) => mockEvents.filter(e => e.event_type === type);

export const getEventsByOrganizer = (organizerId: string) => 
  mockEvents.filter(e => e.organizer_id === organizerId);

export const getOnlineEvents = () => mockEvents.filter(e => e.is_online);

export const getEventsByCountry = (countryId: string) => 
  mockEvents.filter(e => e.country_id === countryId);