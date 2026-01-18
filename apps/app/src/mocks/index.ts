/**
 * Central export for all mock data
 */

// Export all lookups
export * from './lookups.mock';

// Export all entity mocks
export * from './breeds.mock';
export * from './contacts.mock';
export * from './kennels.mock';
export * from './pets.mock';
export * from './litters.mock';
export * from './events.mock';
export * from './notes.mock';

// Export mock data service
export { MockDataService } from './mock-data.service';

// Aggregate statistics for dashboard
export const mockDashboardStats = {
  totalPets: 12,
  totalBreeds: 10,
  totalKennels: 5,
  totalLitters: 5,
  totalEvents: 6,
  totalContacts: 10,
  
  activePets: 12,
  verifiedKennels: 4,
  upcomingEvents: 4,
  availablePuppies: 8,
  
  recentActivity: [
    { type: 'pet_added', message: 'New pet registered: Golden Valley\'s Sunshine Hero', date: '2024-01-10' },
    { type: 'litter_born', message: 'New litter born: Royal Crown Protection Line', date: '2023-10-17' },
    { type: 'event_created', message: 'New event: Westminster Dog Show 2024', date: '2024-01-12' },
    { type: 'kennel_verified', message: 'Kennel verified: Majestic Maine Coons', date: '2024-01-11' },
  ],
  
  popularBreeds: [
    { breed: 'Labrador Retriever', count: 3245 },
    { breed: 'German Shepherd', count: 2341 },
    { breed: 'French Bulldog', count: 1876 },
    { breed: 'Siberian Husky', count: 1654 },
    { breed: 'Golden Retriever', count: 1523 },
  ],
  
  topRatedKennels: [
    { name: 'Royal Crown German Shepherds', rating: 98 },
    { name: 'Golden Valley Kennels', rating: 95 },
    { name: 'Majestic Maine Coons', rating: 94 },
    { name: 'Petit Amour French Bulldogs', rating: 92 },
  ]
};