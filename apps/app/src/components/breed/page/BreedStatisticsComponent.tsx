import React from 'react';
import { Breed } from '@/services/api';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface BreedStatisticsComponentProps {
  entity: Breed;
}

export function BreedStatisticsComponent({ entity }: BreedStatisticsComponentProps) {
  // Mock statistics data
  const stats = {
    popularity: {
      rank: 5,
      previousRank: 7,
      trend: 'up' as const
    },
    registrations: {
      current: 1234,
      previous: 1156,
      trend: 'up' as const
    },
    shows: {
      participations: 567,
      wins: 123,
      winRate: 21.7
    },
    geography: [
      { country: 'United States', count: 456, percentage: 37 },
      { country: 'Canada', count: 234, percentage: 19 },
      { country: 'United Kingdom', count: 198, percentage: 16 },
      { country: 'Australia', count: 123, percentage: 10 },
      { country: 'Other', count: 223, percentage: 18 }
    ]
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Minus className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-6">{entity.Name} Statistics</h2>
        
        {/* Key metrics */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white border rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Popularity Rank</span>
              {getTrendIcon(stats.popularity.trend)}
            </div>
            <div className="text-3xl font-bold text-gray-900">
              #{stats.popularity.rank}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Previously #{stats.popularity.previousRank}
            </div>
          </div>

          <div className="bg-white border rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Registrations</span>
              {getTrendIcon(stats.registrations.trend)}
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {stats.registrations.current.toLocaleString()}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              +{((stats.registrations.current - stats.registrations.previous) / stats.registrations.previous * 100).toFixed(1)}% from last year
            </div>
          </div>

          <div className="bg-white border rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Show Win Rate</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {stats.shows.winRate}%
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {stats.shows.wins} wins / {stats.shows.participations} shows
            </div>
          </div>
        </div>

        {/* Geographic distribution */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Geographic Distribution</h3>
          <div className="space-y-3">
            {stats.geography.map((country) => (
              <div key={country.country} className="flex items-center gap-4">
                <span className="text-sm text-gray-700 w-32">
                  {country.country}
                </span>
                <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                  <div 
                    className="absolute top-0 left-0 h-full bg-primary-600 rounded-full"
                    style={{ width: `${country.percentage}%` }}
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-700">
                    {country.count} ({country.percentage}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}