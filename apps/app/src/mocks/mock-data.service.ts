/**
 * Mock Data Service
 * Provides methods to simulate API calls with mock data
 */

import { 
  mockBreeds, 
  mockPets, 
  mockKennels, 
  mockLitters, 
  mockContacts,
  mockEvents,
  getBreedWithRelations,
  getPetWithRelations,
  getKennelWithRelations,
  getLitterWithRelations
} from './index';

export class MockDataService {
  // Simulate network delay
  private static delay(ms: number = 300): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Breeds
  static async getBreeds(params?: { 
    petType?: string; 
    search?: string; 
    limit?: number; 
    offset?: number;
  }) {
    await this.delay();
    
    let breeds = [...mockBreeds];
    
    if (params?.petType) {
      breeds = breeds.filter(b => b.pet_type_id === params.petType);
    }
    
    if (params?.search) {
      const search = params.search.toLowerCase();
      breeds = breeds.filter(b => 
        b.name.toLowerCase().includes(search) ||
        b.authentic_name?.toLowerCase().includes(search)
      );
    }
    
    const total = breeds.length;
    
    if (params?.offset !== undefined && params?.limit !== undefined) {
      breeds = breeds.slice(params.offset, params.offset + params.limit);
    }
    
    return {
      data: breeds,
      total,
      offset: params?.offset || 0,
      limit: params?.limit || breeds.length
    };
  }

  static async getBreedById(id: string) {
    await this.delay();
    return getBreedWithRelations(id);
  }

  // Pets
  static async getPets(params?: {
    breedId?: string;
    kennelId?: string;
    ownerId?: string;
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    await this.delay();
    
    let pets = [...mockPets];
    
    if (params?.breedId) {
      pets = pets.filter(p => p.breed_id === params.breedId);
    }
    
    if (params?.kennelId) {
      pets = pets.filter(p => p.kennel_id === params.kennelId);
    }
    
    if (params?.ownerId) {
      pets = pets.filter(p => p.owner_id === params.ownerId);
    }
    
    if (params?.status) {
      pets = pets.filter(p => p.status === params.status);
    }
    
    if (params?.search) {
      const search = params.search.toLowerCase();
      pets = pets.filter(p => 
        p.name.toLowerCase().includes(search) ||
        p.call_name?.toLowerCase().includes(search)
      );
    }
    
    const total = pets.length;
    
    if (params?.offset !== undefined && params?.limit !== undefined) {
      pets = pets.slice(params.offset, params.offset + params.limit);
    }
    
    return {
      data: pets,
      total,
      offset: params?.offset || 0,
      limit: params?.limit || pets.length
    };
  }

  static async getPetById(id: string) {
    await this.delay();
    return getPetWithRelations(id);
  }

  // Kennels
  static async getKennels(params?: {
    breedId?: string;
    countryId?: string;
    verified?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    await this.delay();
    
    let kennels = [...mockKennels];
    
    if (params?.breedId) {
      kennels = kennels.filter(k => k.breed_specializations.includes(params.breedId));
    }
    
    if (params?.countryId) {
      kennels = kennels.filter(k => k.country_id === params.countryId);
    }
    
    if (params?.verified !== undefined) {
      kennels = kennels.filter(k => k.is_verified === params.verified);
    }
    
    if (params?.search) {
      const search = params.search.toLowerCase();
      kennels = kennels.filter(k => 
        k.name.toLowerCase().includes(search) ||
        k.prefix?.toLowerCase().includes(search)
      );
    }
    
    const total = kennels.length;
    
    if (params?.offset !== undefined && params?.limit !== undefined) {
      kennels = kennels.slice(params.offset, params.offset + params.limit);
    }
    
    return {
      data: kennels,
      total,
      offset: params?.offset || 0,
      limit: params?.limit || kennels.length
    };
  }

  static async getKennelById(id: string) {
    await this.delay();
    return getKennelWithRelations(id);
  }

  // Litters
  static async getLitters(params?: {
    breedId?: string;
    kennelId?: string;
    breederId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    await this.delay();
    
    let litters = [...mockLitters];
    
    if (params?.breedId) {
      litters = litters.filter(l => l.breed_id === params.breedId);
    }
    
    if (params?.kennelId) {
      litters = litters.filter(l => l.kennel_id === params.kennelId);
    }
    
    if (params?.breederId) {
      litters = litters.filter(l => l.breeder_id === params.breederId);
    }
    
    if (params?.status) {
      litters = litters.filter(l => l.status === params.status);
    }
    
    const total = litters.length;
    
    if (params?.offset !== undefined && params?.limit !== undefined) {
      litters = litters.slice(params.offset, params.offset + params.limit);
    }
    
    return {
      data: litters,
      total,
      offset: params?.offset || 0,
      limit: params?.limit || litters.length
    };
  }

  static async getLitterById(id: string) {
    await this.delay();
    return getLitterWithRelations(id);
  }

  // Contacts
  static async getContacts(params?: {
    isBreeder?: boolean;
    isJudge?: boolean;
    countryId?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    await this.delay();
    
    let contacts = [...mockContacts];
    
    if (params?.isBreeder !== undefined) {
      contacts = contacts.filter(c => c.is_breeder === params.isBreeder);
    }
    
    if (params?.isJudge !== undefined) {
      contacts = contacts.filter(c => c.is_judge === params.isJudge);
    }
    
    if (params?.countryId) {
      contacts = contacts.filter(c => c.country_id === params.countryId);
    }
    
    if (params?.search) {
      const search = params.search.toLowerCase();
      contacts = contacts.filter(c => 
        c.first_name.toLowerCase().includes(search) ||
        c.last_name.toLowerCase().includes(search) ||
        c.display_name.toLowerCase().includes(search) ||
        c.email.toLowerCase().includes(search)
      );
    }
    
    const total = contacts.length;
    
    if (params?.offset !== undefined && params?.limit !== undefined) {
      contacts = contacts.slice(params.offset, params.offset + params.limit);
    }
    
    return {
      data: contacts,
      total,
      offset: params?.offset || 0,
      limit: params?.limit || contacts.length
    };
  }

  static async getContactById(id: string) {
    await this.delay();
    return mockContacts.find(c => c.id === id);
  }

  // Events
  static async getEvents(params?: {
    type?: string;
    status?: string;
    organizerId?: string;
    countryId?: string;
    upcoming?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    await this.delay();
    
    let events = [...mockEvents];
    
    if (params?.type) {
      events = events.filter(e => e.event_type === params.type);
    }
    
    if (params?.status) {
      events = events.filter(e => e.status === params.status);
    }
    
    if (params?.organizerId) {
      events = events.filter(e => e.organizer_id === params.organizerId);
    }
    
    if (params?.countryId) {
      events = events.filter(e => e.country_id === params.countryId);
    }
    
    if (params?.upcoming) {
      const now = new Date();
      events = events.filter(e => new Date(e.start_date) > now);
    }
    
    if (params?.search) {
      const search = params.search.toLowerCase();
      events = events.filter(e => 
        e.name.toLowerCase().includes(search) ||
        e.description?.toLowerCase().includes(search) ||
        e.location_name?.toLowerCase().includes(search)
      );
    }
    
    const total = events.length;
    
    if (params?.offset !== undefined && params?.limit !== undefined) {
      events = events.slice(params.offset, params.offset + params.limit);
    }
    
    return {
      data: events,
      total,
      offset: params?.offset || 0,
      limit: params?.limit || events.length
    };
  }

  static async getEventById(id: string) {
    await this.delay();
    return mockEvents.find(e => e.id === id);
  }

  // Search across all entities
  static async globalSearch(query: string) {
    await this.delay();
    
    const search = query.toLowerCase();
    
    const breeds = mockBreeds
      .filter(b => b.name.toLowerCase().includes(search))
      .slice(0, 5);
    
    const pets = mockPets
      .filter(p => 
        p.name.toLowerCase().includes(search) ||
        p.call_name?.toLowerCase().includes(search)
      )
      .slice(0, 5);
    
    const kennels = mockKennels
      .filter(k => k.name.toLowerCase().includes(search))
      .slice(0, 5);
    
    const events = mockEvents
      .filter(e => e.name.toLowerCase().includes(search))
      .slice(0, 5);
    
    return {
      breeds,
      pets,
      kennels,
      events,
      total: breeds.length + pets.length + kennels.length + events.length
    };
  }
}