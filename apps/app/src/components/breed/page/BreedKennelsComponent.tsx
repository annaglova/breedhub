import React from 'react';
import { Breed } from '@/services/api';
import { MapPin, Phone, Globe, Dog } from 'lucide-react';

interface BreedKennelsComponentProps {
  entity: Breed;
}

export function BreedKennelsComponent({ entity }: BreedKennelsComponentProps) {
  // Mock kennels data
  const kennels = [
    {
      id: '1',
      name: 'Storm Crest Cattery',
      location: 'New York, USA',
      phone: '+1 555-0123',
      website: 'www.stormcrest.com',
      petCount: 12,
      specialization: 'Show quality Maine Coons',
      established: '2010'
    },
    {
      id: '2',
      name: 'Moonlight Maine Coons',
      location: 'California, USA', 
      phone: '+1 555-0456',
      website: 'www.moonlightmainecoons.com',
      petCount: 8,
      specialization: 'Champion bloodlines',
      established: '2015'
    },
    {
      id: '3',
      name: 'Gentle Paws Cattery',
      location: 'Texas, USA',
      phone: '+1 555-0789',
      website: 'www.gentlepaws.com',
      petCount: 15,
      specialization: 'Family-friendly temperament',
      established: '2008'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">{entity.Name} Kennels</h2>
        <span className="text-sm text-gray-600">
          {kennels.length} registered kennels
        </span>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {kennels.map((kennel) => (
          <div 
            key={kennel.id}
            className="bg-white border rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {kennel.name}
                </h3>
                <p className="text-sm text-gray-600">
                  Est. {kennel.established}
                </p>
              </div>
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <Dog className="h-4 w-4" />
                <span>{kennel.petCount}</span>
              </div>
            </div>

            <p className="text-sm text-gray-700 mb-4">
              {kennel.specialization}
            </p>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin className="h-4 w-4" />
                <span>{kennel.location}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Phone className="h-4 w-4" />
                <span>{kennel.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Globe className="h-4 w-4" />
                <a 
                  href={`https://${kennel.website}`}
                  className="text-primary-600 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {kennel.website}
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center pt-4">
        <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
          View all kennels →
        </button>
      </div>
    </div>
  );
}