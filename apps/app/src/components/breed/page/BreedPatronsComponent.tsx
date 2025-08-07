import React from 'react';
import { Breed } from '@/services/api';
import { Heart, Star, Award } from 'lucide-react';

interface BreedPatronsComponentProps {
  entity: Breed;
}

export function BreedPatronsComponent({ entity }: BreedPatronsComponentProps) {
  // Mock patrons data
  const patrons = [
    {
      id: '1',
      name: 'Sarah Johnson',
      level: 'Gold Patron',
      since: '2021',
      contribution: 'Breed preservation fund',
      avatar: '/mock/avatar-1.jpg'
    },
    {
      id: '2',
      name: 'Michael Chen',
      level: 'Silver Patron',
      since: '2022',
      contribution: 'Education programs',
      avatar: '/mock/avatar-2.jpg'
    },
    {
      id: '3',
      name: 'Emma Williams',
      level: 'Bronze Patron',
      since: '2023',
      contribution: 'Health research',
      avatar: '/mock/avatar-3.jpg'
    }
  ];

  const getPatronIcon = (level: string) => {
    if (level.includes('Gold')) return <Award className="h-5 w-5 text-yellow-500" />;
    if (level.includes('Silver')) return <Star className="h-5 w-5 text-gray-400" />;
    return <Heart className="h-5 w-5 text-orange-600" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">{entity.Name} Patrons</h2>
        <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
          Become a Patron
        </button>
      </div>

      {/* Patron info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">
          Support {entity.Name} Preservation
        </h3>
        <p className="text-blue-800">
          Patrons help support breed preservation, health research, and education programs. 
          Your contribution makes a difference in maintaining the breed's future.
        </p>
      </div>

      {/* Patrons list */}
      <div className="space-y-4">
        {patrons.map((patron) => (
          <div 
            key={patron.id}
            className="bg-white border rounded-lg p-6 flex items-center gap-4"
          >
            {/* Avatar */}
            <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
              <img 
                src={patron.avatar} 
                alt={patron.name}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  {patron.name}
                </h3>
                {getPatronIcon(patron.level)}
              </div>
              <p className="text-sm text-gray-600">
                {patron.level} • Patron since {patron.since}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Supporting: {patron.contribution}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Patron tiers */}
      <div className="mt-12">
        <h3 className="text-lg font-semibold mb-4">Patron Tiers</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
            <Heart className="h-8 w-8 text-orange-600 mx-auto mb-2" />
            <h4 className="font-semibold text-orange-900">Bronze</h4>
            <p className="text-sm text-orange-700 mt-1">$10/month</p>
          </div>
          <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 text-center">
            <Star className="h-8 w-8 text-gray-600 mx-auto mb-2" />
            <h4 className="font-semibold text-gray-900">Silver</h4>
            <p className="text-sm text-gray-700 mt-1">$25/month</p>
          </div>
          <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 text-center">
            <Award className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
            <h4 className="font-semibold text-yellow-900">Gold</h4>
            <p className="text-sm text-yellow-700 mt-1">$50/month</p>
          </div>
        </div>
      </div>
    </div>
  );
}