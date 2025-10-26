import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { X, Expand, MapPin, Calendar, Dog, Building, Heart, Trophy, BarChart3, History, FileText, Image } from 'lucide-react';
import { Button } from '@ui/components/button';
import { Badge } from '@ui/components/badge';
import { Breed } from '@/domain/entities/breed';
import { spaceStore } from '@breedhub/rxdb-store';
import { useSignals } from '@preact/signals-react/runtime';
import { cn } from '@ui/lib/utils';

interface TabConfig {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const tabs: TabConfig[] = [
  { id: 'overview', label: 'Overview', icon: FileText },
  { id: 'pets', label: 'Pets', icon: Dog },
  { id: 'kennels', label: 'Kennels', icon: Building },
  { id: 'stats', label: 'Stats', icon: BarChart3 },
  { id: 'history', label: 'History', icon: History },
  { id: 'gallery', label: 'Gallery', icon: Image },
  { id: 'patrons', label: 'Patrons', icon: Heart },
];

export function BreedDrawerView() {
  useSignals();

  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('overview');

  // Get breed from EntityStore (reactive!)
  const breedSignal = spaceStore.getSelectedEntity('breed');
  const breed = breedSignal.value;

  console.log('[BreedDrawerView] Render:', {
    breed,
    breedId: breed?.id,
    breedName: breed?.name,
    urlId: id
  });

  // Get active tab from URL hash or set default
  useEffect(() => {
    const hash = location.hash.slice(1);
    if (hash && tabs.some(tab => tab.id === hash)) {
      setActiveTab(hash);
    } else {
      // If no hash or invalid hash, set to overview and update URL
      setActiveTab('overview');
      navigate('#overview', { replace: true });
    }
  }, [location.hash, navigate]);

  if (!breed) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-gray-500">Loading breed details...</p>
      </div>
    );
  }

  const handleClose = () => {
    navigate('/breeds');
  };

  const handleExpand = () => {
    // Navigate to full page with breed ID (not friendly URL for now)
    // Keep the current tab when expanding
    const hash = activeTab ? `#${activeTab}` : '';
    navigate(`/${breed.id}${hash}`);
  };

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    navigate(`#${tabId}`, { replace: true });
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {breed?.name || 'Breed Details'}
          </h2>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleExpand}
              title="Expand to full page"
            >
              <Expand className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b bg-white">
        <nav className="flex overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors",
                  activeTab === tab.id
                    ? "text-primary-600 border-primary-600"
                    : "text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'overview' && (
          <div>
            {/* Main image */}
            {breed.avatar_url && (
              <div className="w-full h-64 bg-gray-100">
                <img 
                  src={breed.avatar_url} 
                  alt={breed.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="p-6 space-y-6">
          {/* Title and origin */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {breed.name || 'Unknown Breed'}
            </h1>
            <p className="text-gray-600 mt-1">
              {breed.authentic_name || breed.admin_name || ''}
            </p>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Dog className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Pets</p>
                <p className="font-semibold">{breed.pet_profile_count}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Building className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Kennels</p>
                <p className="font-semibold">{breed.kennel_count}</p>
              </div>
            </div>
          </div>

          {/* Characteristics */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Characteristics</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Type</span>
                <span className="font-medium capitalize">{breed.pet_type_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Rating</span>
                <span className="font-medium">{breed.rating}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Achievement Progress</span>
                <span className="font-medium">{breed.achievement_progress}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Patrons</span>
                <span className="font-medium">{breed.patron_count}</span>
              </div>
            </div>
          </div>

          {/* Features */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Features</h3>
            <div className="flex flex-wrap gap-2">
              {breed.differ_by_coat_color && (
                <Badge variant="secondary">Different coat colors</Badge>
              )}
              {breed.differ_by_coat_type && (
                <Badge variant="secondary">Different coat types</Badge>
              )}
              {breed.differ_by_size && (
                <Badge variant="secondary">Different sizes</Badge>
              )}
              {breed.differ_by_body_feature && (
                <Badge variant="secondary">Different body features</Badge>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-3 pt-4">
            <Button 
              className="w-full"
              onClick={handleExpand}
            >
              View Full Details
            </Button>
            <Button 
              variant="outline" 
              className="w-full"
            >
              <Heart className="h-4 w-4 mr-2" />
              Add to Favorites
            </Button>
          </div>

          {/* Top pets preview */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Top {breed.name} Pets</h3>
              <button 
                className="text-sm text-primary-600 hover:text-primary-700"
                onClick={handleExpand}
              >
                View all →
              </button>
            </div>
            <div className="space-y-3">
              {/* Mock pet items */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-12 h-12 bg-gray-200 rounded-full" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">CH Majestic Thunder</p>
                  <p className="text-xs text-gray-600">Storm Crest Cattery</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-12 h-12 bg-gray-200 rounded-full" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">GC Silver Moon Rising</p>
                  <p className="text-xs text-gray-600">Moonlight Maine Coons</p>
                </div>
              </div>
            </div>
          </div>
            </div>
          </div>
        )}

        {activeTab === 'pets' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Top {breed.name} Pets</h3>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
                  <div className="w-16 h-16 bg-gray-200 rounded-lg" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">Champion Pet {i}</p>
                    <p className="text-sm text-gray-600">Kennel Name {i}</p>
                    <p className="text-xs text-gray-500">Grand Champion • 15 wins</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'kennels' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">{breed.name} Kennels</h3>
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="border rounded-lg p-4 hover:shadow-md cursor-pointer">
                  <h4 className="font-medium">Premium Kennel {i}</h4>
                  <p className="text-sm text-gray-600 mt-1">New York, USA</p>
                  <div className="flex gap-4 mt-2 text-sm text-gray-500">
                    <span>12 pets</span>
                    <span>•</span>
                    <span>Est. 2015</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Statistics</h3>
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Popularity Rank</span>
                  <span className="text-2xl font-bold">#{Math.floor(Math.random() * 20) + 1}</span>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Registrations</span>
                  <span className="text-2xl font-bold">{breed.pet_profile_count}</span>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Average Rating</span>
                  <span className="text-2xl font-bold">{breed.rating}%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Breed History</h3>
            <div className="prose prose-sm max-w-none">
              <p className="text-gray-700">
                The {breed.name} is a distinguished breed with a rich history dating back several centuries.
                Originally from {breed.authentic_name || breed.name}, this breed has become beloved worldwide
                for its unique characteristics and temperament.
              </p>
              <p className="text-gray-700 mt-4">
                Throughout history, the {breed.name} has served various roles, from working companion to
                cherished family pet. Their adaptability and intelligence have made them one of the most
                popular breeds in modern times.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'gallery' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Photo Gallery</h3>
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="aspect-square bg-gray-100 rounded-lg overflow-hidden hover:opacity-90 cursor-pointer">
                  {breed.avatar_url && i === 1 ? (
                    <img src={breed.avatar_url} alt={breed.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gray-200" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'patrons' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Breed Patrons</h3>
            <p className="text-sm text-gray-600 mb-4">{breed.patron_count} patrons supporting this breed</p>
            <div className="space-y-3">
              {breed.top_patrons?.map((patron, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                    <Heart className="h-5 w-5 text-primary-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{patron.name}</p>
                    <p className="text-xs text-gray-600">{patron.contributions} contributions</p>
                  </div>
                </div>
              ))}
              {!breed.top_patrons && (
                <p className="text-gray-500 text-center py-8">No top patrons yet</p>
              )}
            </div>
            <Button variant="outline" className="w-full mt-4">
              <Heart className="h-4 w-4 mr-2" />
              Become a Patron
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}