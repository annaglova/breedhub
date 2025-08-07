import React from 'react';
import { Breed } from '@/services/api';
import { Trophy, Calendar, MapPin } from 'lucide-react';

interface BreedTopPetsComponentProps {
  entity: Breed;
}

export function BreedTopPetsComponent({ entity }: BreedTopPetsComponentProps) {
  // Mock top pets data
  const topPets = [
    {
      id: '1',
      name: 'CH Majestic Thunder of Storm',
      kennel: 'Storm Crest Cattery',
      achievements: 'Best in Show, Supreme Grand Champion',
      birthDate: '2021-03-15',
      location: 'New York, USA',
      image: '/mock/cat-1.jpg'
    },
    {
      id: '2', 
      name: 'GC Silver Moon Rising',
      kennel: 'Moonlight Maine Coons',
      achievements: 'Grand Champion, Regional Winner',
      birthDate: '2020-06-22',
      location: 'California, USA',
      image: '/mock/cat-2.jpg'
    },
    {
      id: '3',
      name: 'RW Gentle Giant Leo',
      kennel: 'Gentle Paws Cattery',
      achievements: 'Regional Winner, Best of Breed',
      birthDate: '2019-11-08',
      location: 'Texas, USA',
      image: '/mock/cat-3.jpg'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Top {entity.Name} Pets</h2>
        <span className="text-sm text-gray-600">
          Showing top performers by achievements
        </span>
      </div>

      <div className="grid gap-4">
        {topPets.map((pet) => (
          <div 
            key={pet.id}
            className="bg-white border rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex gap-6">
              {/* Pet image */}
              <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                <img 
                  src={pet.image} 
                  alt={pet.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Pet info */}
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {pet.name}
                </h3>
                <p className="text-sm text-gray-600 mb-2">{pet.kennel}</p>
                
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm text-gray-700">{pet.achievements}</span>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{new Date(pet.birthDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    <span>{pet.location}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center pt-4">
        <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
          View all {entity.Name} pets →
        </button>
      </div>
    </div>
  );
}