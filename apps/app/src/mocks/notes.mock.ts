/**
 * Mock data for notes
 */

import { mockPets } from './pets.mock';
import { mockContacts } from './contacts.mock';
import { mockBreeds } from './breeds.mock';
import { mockLitters } from './litters.mock';

// Type for connected entity schema names
type EntitySchemaName = 'pet' | 'contact' | 'breed' | 'litter' | 'project' | 'program' | 'account';

export interface Note {
  id: string;
  name: string; // Note text content
  notes?: string;
  created_at: string;
  updated_at?: string;
  entity_schema_name?: EntitySchemaName;
  pet_id?: string;
  contact_id?: string;
  breed_id?: string;
  litter_id?: string;
  program_id?: string;
  account_id?: string;
  deleted?: boolean;
}

export interface NoteWithRelations extends Note {
  pet?: {
    id: string;
    name?: string;
    avatar_url?: string;
    slug?: string;
  };
  contact?: {
    id: string;
    name?: string;
    avatar_url?: string;
    slug?: string;
  };
  breed?: {
    id: string;
    name?: string;
    avatar_url?: string;
    slug?: string;
  };
  litter?: {
    id: string;
    name?: string;
    avatar_url?: string;
    slug?: string;
  };
}

export const mockNotes: Note[] = [
  // Notes connected to pets
  {
    id: 'note-1',
    name: 'Max showed excellent performance at the agility trial today. Completed the course in 42.3 seconds with no faults. Need to work on weave poles timing for next competition.',
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-01-15T10:30:00Z',
    entity_schema_name: 'pet',
    pet_id: 'pet-1'
  },
  {
    id: 'note-2',
    name: 'Annual vet checkup completed. All vaccinations up to date. Weight is 32kg - within healthy range. Next dental cleaning scheduled for March.',
    created_at: '2024-01-12T14:15:00Z',
    entity_schema_name: 'pet',
    pet_id: 'pet-1'
  },
  {
    id: 'note-3',
    name: 'Bella is showing signs of being in heat. Mark calendar for breeding window in 2 weeks. Contact Dr. Mueller about timing for breeding.',
    created_at: '2024-01-10T09:00:00Z',
    entity_schema_name: 'pet',
    pet_id: 'pet-2'
  },
  {
    id: 'note-4',
    name: 'Thunder completed Schutzhund III certification with flying colors! Score: 285/300. One of the best scores in the region this year.',
    created_at: '2024-01-08T16:45:00Z',
    entity_schema_name: 'pet',
    pet_id: 'pet-3'
  },
  {
    id: 'note-5',
    name: 'Coco had minor digestive issues this week. Switched to sensitive stomach food formula. Monitor for 2 weeks before next vet visit.',
    created_at: '2024-01-05T11:20:00Z',
    entity_schema_name: 'pet',
    pet_id: 'pet-5'
  },

  // Notes connected to contacts
  {
    id: 'note-6',
    name: 'Meeting with John Smith regarding potential stud service for Bella. Discussed health testing requirements and contract terms. Follow up next week.',
    created_at: '2024-01-14T13:00:00Z',
    entity_schema_name: 'contact',
    contact_id: 'contact-1'
  },
  {
    id: 'note-7',
    name: 'Emily Johnson interested in purchasing a Maine Coon kitten from next litter. Deposit received. Add to waiting list.',
    created_at: '2024-01-11T10:30:00Z',
    entity_schema_name: 'contact',
    contact_id: 'contact-2'
  },
  {
    id: 'note-8',
    name: 'Dr. Hans Mueller confirmed as judge for upcoming breed specialty show. Send confirmation email with event details and accommodation options.',
    created_at: '2024-01-09T15:00:00Z',
    entity_schema_name: 'contact',
    contact_id: 'contact-5'
  },

  // Notes connected to breeds
  {
    id: 'note-9',
    name: 'Research notes: Golden Retriever breed standard updated by AKC in 2024. Key changes include height tolerance and coat color clarification. Update breeding program documentation.',
    created_at: '2024-01-13T08:45:00Z',
    entity_schema_name: 'breed',
    breed_id: 'breed-1'
  },
  {
    id: 'note-10',
    name: 'German Shepherd health testing protocol: HD/ED X-rays required before breeding. New DNA test for DM now recommended by breed club.',
    created_at: '2024-01-07T14:30:00Z',
    entity_schema_name: 'breed',
    breed_id: 'breed-2'
  },

  // Notes connected to litters
  {
    id: 'note-11',
    name: 'Litter born! 7 healthy puppies - 4 males, 3 females. All nursing well. Dam recovered quickly from delivery. Vet check scheduled for day 3.',
    created_at: '2024-01-06T03:15:00Z',
    entity_schema_name: 'litter',
    litter_id: 'litter-1'
  },
  {
    id: 'note-12',
    name: 'Puppies at 3 weeks: eyes open, starting to walk. All weights within normal range. Begin early neurological stimulation exercises.',
    created_at: '2024-01-04T10:00:00Z',
    entity_schema_name: 'litter',
    litter_id: 'litter-2'
  },

  // Notes without connected entity (general notes)
  {
    id: 'note-13',
    name: 'Order supplies: puppy food (large breed formula), whelping box heating pad, microchip scanner. Check PetSupply website for bulk discount.',
    created_at: '2024-01-03T16:20:00Z'
  },
  {
    id: 'note-14',
    name: 'Reminder: Submit entries for Westminster Dog Show by January 31st. Need to register Max and Thunder for breed competition.',
    created_at: '2024-01-02T09:30:00Z'
  },
  {
    id: 'note-15',
    name: 'Annual kennel inspection scheduled for February 15th. Prepare documentation: health records, breeding logs, facility maintenance records.',
    created_at: '2024-01-01T11:00:00Z'
  }
];

// Helper function to get note with relations
export const getNoteWithRelations = (noteId: string): NoteWithRelations | undefined => {
  const note = mockNotes.find(n => n.id === noteId);
  if (!note) return undefined;

  const result: NoteWithRelations = { ...note };

  // Add connected entity based on entity_schema_name
  if (note.entity_schema_name === 'pet' && note.pet_id) {
    const pet = mockPets.find(p => p.id === note.pet_id);
    if (pet) {
      result.pet = {
        id: pet.id,
        name: pet.name,
        avatar_url: pet.avatar_url,
        slug: pet.id // Use id as slug for mock data
      };
    }
  }

  if (note.entity_schema_name === 'contact' && note.contact_id) {
    const contact = mockContacts.find(c => c.id === note.contact_id);
    if (contact) {
      result.contact = {
        id: contact.id,
        name: contact.display_name || `${contact.first_name} ${contact.last_name}`,
        avatar_url: contact.avatar_url,
        slug: contact.id
      };
    }
  }

  if (note.entity_schema_name === 'breed' && note.breed_id) {
    const breed = mockBreeds.find(b => b.id === note.breed_id);
    if (breed) {
      result.breed = {
        id: breed.id,
        name: breed.name,
        avatar_url: breed.avatar_url,
        slug: breed.url
      };
    }
  }

  if (note.entity_schema_name === 'litter' && note.litter_id) {
    const litter = mockLitters.find(l => l.id === note.litter_id);
    if (litter) {
      result.litter = {
        id: litter.id,
        name: litter.name,
        slug: litter.id
      };
    }
  }

  return result;
};

// Helper functions
export const getRandomNote = () => mockNotes[Math.floor(Math.random() * mockNotes.length)];

export const getNotesByPet = (petId: string) => mockNotes.filter(n => n.pet_id === petId);

export const getNotesByContact = (contactId: string) => mockNotes.filter(n => n.contact_id === contactId);

export const getNotesByBreed = (breedId: string) => mockNotes.filter(n => n.breed_id === breedId);

export const getNotesByLitter = (litterId: string) => mockNotes.filter(n => n.litter_id === litterId);

export const getNotesWithoutEntity = () => mockNotes.filter(n => !n.entity_schema_name);

export const getAllNotesWithRelations = (): NoteWithRelations[] => {
  return mockNotes.map(note => getNoteWithRelations(note.id)!);
};
