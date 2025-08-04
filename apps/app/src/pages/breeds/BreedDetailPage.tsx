import React from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, Edit, Globe, Heart, Ruler, Calendar, Dog, Cat, Star, Users, Activity } from 'lucide-react';
import { Button } from '@ui/components/button';
import { Card } from '@ui/components/card';
import { Badge } from '@ui/components/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ui/components/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@ui/components/avatar';
import { useNavigationSync } from '@/shared/hooks';
import { useMockBreed } from '@/core/api/mock.hooks';
import { formatDate } from '@/shared/utils';

export function BreedDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { navigateTo } = useNavigationSync();
  const { data: breed, isLoading, error } = useMockBreed(id || '');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading breed details...</p>
        </div>
      </div>
    );
  }

  if (error || !breed) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-red-600">Failed to load breed details</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => navigateTo('/breeds')}
          >
            Back to Breeds
          </Button>
        </div>
      </div>
    );
  }

  const getPetTypeIcon = () => {
    return breed.pet_type_id === 'dog' ? <Dog className="h-5 w-5" /> : <Cat className="h-5 w-5" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigateTo('/breeds')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
        <Button onClick={() => navigateTo(`/breeds/${id}/edit`)}>
          <Edit className="mr-2 h-4 w-4" />
          Edit Breed
        </Button>
      </div>

      {/* Main Info Card */}
      <Card className="p-6">
        <div className="flex items-start gap-6">
          <Avatar className="h-24 w-24">
            <AvatarImage src={breed.photo_url} alt={breed.name} />
            <AvatarFallback>{breed.name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{breed.name}</h1>
              <Badge variant="outline" className="flex items-center gap-1">
                {getPetTypeIcon()}
                <span className="capitalize">{breed.pet_type_id}</span>
              </Badge>
            </div>
            
            {breed.authentic_name && (
              <p className="text-lg text-gray-600 italic mb-3">{breed.authentic_name}</p>
            )}
            
            {breed.bred_for && (
              <p className="text-gray-700 mb-4">
                <span className="font-medium">Bred for:</span> {breed.bred_for}
              </p>
            )}
            
            {breed.description && (
              <p className="text-gray-600 leading-relaxed">{breed.description}</p>
            )}
          </div>
        </div>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Ruler className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Average Height</p>
              <p className="text-xl font-bold text-gray-900">
                {breed.statistics?.avgHeightMin}-{breed.statistics?.avgHeightMax} cm
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Activity className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Average Weight</p>
              <p className="text-xl font-bold text-gray-900">
                {breed.statistics?.avgWeightMin}-{breed.statistics?.avgWeightMax} kg
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Heart className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Life Span</p>
              <p className="text-xl font-bold text-gray-900">
                {breed.statistics?.avgLifespan} years
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Users className="h-8 w-8 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Registered</p>
              <p className="text-xl font-bold text-gray-900">
                {breed.registration_count || 0}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Detailed Information Tabs */}
      <Tabs defaultValue="characteristics" className="w-full">
        <TabsList>
          <TabsTrigger value="characteristics">Characteristics</TabsTrigger>
          <TabsTrigger value="temperament">Temperament</TabsTrigger>
          <TabsTrigger value="standards">Standards</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="characteristics" className="mt-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Breed Characteristics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Physical Traits</h4>
                <ul className="space-y-2 text-gray-600">
                  <li>• Size: {breed.statistics?.avgWeightMin < 10 ? 'Small' : breed.statistics?.avgWeightMax > 30 ? 'Large' : 'Medium'}</li>
                  <li>• Coat: Short to medium length</li>
                  <li>• Colors: Various breed-specific colors</li>
                  <li>• Build: Well-proportioned and athletic</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Care Requirements</h4>
                <ul className="space-y-2 text-gray-600">
                  <li>• Exercise: Moderate to high activity level</li>
                  <li>• Grooming: Regular brushing required</li>
                  <li>• Training: Intelligent and trainable</li>
                  <li>• Socialization: Early socialization recommended</li>
                </ul>
              </div>
            </div>
          </Card>
        </TabsContent>
        
        <TabsContent value="temperament" className="mt-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Temperament & Behavior</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Personality Traits</h4>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Friendly</Badge>
                  <Badge variant="secondary">Loyal</Badge>
                  <Badge variant="secondary">Intelligent</Badge>
                  <Badge variant="secondary">Active</Badge>
                  <Badge variant="secondary">Trainable</Badge>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Suitability</h4>
                <p className="text-gray-600">
                  This breed is well-suited for active families and individuals who can provide adequate exercise and mental stimulation. 
                  They typically get along well with children and other pets when properly socialized.
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>
        
        <TabsContent value="standards" className="mt-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Breed Standards</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Official Recognition</h4>
                <div className="flex items-center gap-4">
                  <Badge variant="outline">
                    <Globe className="h-3 w-3 mr-1" />
                    FCI Group {breed.fci_group || 'N/A'}
                  </Badge>
                  <Badge variant="outline">
                    <Star className="h-3 w-3 mr-1" />
                    AKC Recognized
                  </Badge>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Standard Details</h4>
                <p className="text-gray-600">
                  The breed standard defines the ideal characteristics, temperament, and appearance of the breed. 
                  All breeding programs should aim to produce dogs that conform to these standards while maintaining 
                  good health and temperament.
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>
        
        <TabsContent value="history" className="mt-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Breed History</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Origin</h4>
                <p className="text-gray-600">
                  {breed.origin_country ? `Originally from ${breed.origin_country}.` : ''} 
                  This breed has a rich history dating back several centuries, originally bred for {breed.bred_for || 'specific working purposes'}.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Development</h4>
                <p className="text-gray-600">
                  Over the years, the breed has evolved while maintaining its core characteristics. 
                  Modern breeding programs focus on preserving the breed's unique traits while ensuring 
                  good health and temperament for today's companion animals.
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Related Actions */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => navigateTo(`/pets?breed=${id}`)}>
            View All {breed.name} Pets
          </Button>
          <Button variant="outline" onClick={() => navigateTo(`/kennels?breed=${id}`)}>
            Find {breed.name} Breeders
          </Button>
          <Button variant="outline" onClick={() => navigateTo(`/litters?breed=${id}`)}>
            Available Puppies
          </Button>
        </div>
      </Card>
    </div>
  );
}