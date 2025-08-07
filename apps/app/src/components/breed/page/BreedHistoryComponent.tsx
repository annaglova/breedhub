import React from 'react';
import { Breed } from '@/services/api';
import { Calendar } from 'lucide-react';

interface BreedHistoryComponentProps {
  entity: Breed;
}

export function BreedHistoryComponent({ entity }: BreedHistoryComponentProps) {
  // Mock history timeline
  const timeline = [
    {
      year: '1860s',
      title: 'Origins',
      description: 'Maine Coon cats first appeared in the state of Maine, USA. Local farmers valued them for their hunting abilities.'
    },
    {
      year: '1895',
      title: 'First Cat Show',
      description: 'A Maine Coon named Cosey won the first major cat show at Madison Square Garden in New York City.'
    },
    {
      year: '1950s',
      title: 'Near Extinction',
      description: 'The breed nearly disappeared due to the popularity of more exotic long-haired breeds like the Persian.'
    },
    {
      year: '1968',
      title: 'Breed Revival',
      description: 'The Maine Coon Breeders and Fanciers Association was formed to preserve and promote the breed.'
    },
    {
      year: '1976',
      title: 'CFA Recognition',
      description: 'The Cat Fanciers\' Association officially recognized the Maine Coon breed for championship competition.'
    },
    {
      year: '1985',
      title: 'State Cat',
      description: 'Maine Coon was designated as the official state cat of Maine.'
    },
    {
      year: 'Present',
      title: 'Global Popularity',
      description: 'Maine Coons are now one of the most popular cat breeds worldwide, known for their gentle temperament and impressive size.'
    }
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold mb-6">History of {entity.Name}</h2>
      
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200" />
        
        {/* Timeline items */}
        <div className="space-y-8">
          {timeline.map((item, index) => (
            <div key={index} className="relative flex gap-6">
              {/* Timeline dot */}
              <div className="relative z-10 flex items-center justify-center w-16 h-16 bg-white border-4 border-primary-600 rounded-full">
                <Calendar className="h-6 w-6 text-primary-600" />
              </div>
              
              {/* Content */}
              <div className="flex-1 pb-8">
                <div className="bg-white border rounded-lg p-6">
                  <div className="flex items-baseline gap-4 mb-2">
                    <span className="text-lg font-semibold text-primary-600">
                      {item.year}
                    </span>
                    <h3 className="text-xl font-semibold text-gray-900">
                      {item.title}
                    </h3>
                  </div>
                  <p className="text-gray-700">
                    {item.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}