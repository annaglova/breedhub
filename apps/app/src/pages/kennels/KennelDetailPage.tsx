import React from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, Edit, MapPin, Award, Globe, Phone, Mail, Calendar, Users, Star, Home, Dog } from 'lucide-react';
import { Button } from '@ui/components/button';
import { Card } from '@ui/components/card';
import { Badge } from '@ui/components/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ui/components/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@ui/components/avatar';
import { useNavigationSync } from '@/shared/hooks';
import { useMockKennel } from '@/core/api/mock.hooks';
import { formatDate } from '@/shared/utils';

export function KennelDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { navigateTo } = useNavigationSync();
  const { data: kennel, isLoading, error } = useMockKennel(id || '');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading kennel details...</p>
        </div>
      </div>
    );
  }

  if (error || !kennel) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-red-600">Failed to load kennel details</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => navigateTo('/kennels')}
          >
            Back to Kennels
          </Button>
        </div>
      </div>
    );
  }

  const yearEstablished = kennel.established_date ? new Date(kennel.established_date).getFullYear() : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigateTo('/kennels')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
        <Button onClick={() => navigateTo(`/kennels/${id}/edit`)}>
          <Edit className="mr-2 h-4 w-4" />
          Edit Kennel
        </Button>
      </div>

      {/* Main Info Card */}
      <Card className="p-6">
        <div className="flex items-start gap-6">
          <Avatar className="h-24 w-24">
            <AvatarImage src={kennel.logo_url} alt={kennel.name} />
            <AvatarFallback>{kennel.name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{kennel.name}</h1>
              {kennel.is_verified && (
                <Badge variant="default" className="flex items-center gap-1">
                  <Award className="h-3 w-3" />
                  Verified
                </Badge>
              )}
              {kennel.rating && kennel.rating >= 90 && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  Top Rated
                </Badge>
              )}
            </div>
            
            {kennel.prefix && (
              <p className="text-lg text-gray-600 mb-2">
                Prefix: <code className="bg-muted px-2 py-1 rounded">{kennel.prefix}</code>
              </p>
            )}
            
            <div className="flex items-center gap-4 text-gray-600">
              {kennel.country && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>{kennel.country.name}</span>
                </div>
              )}
              {yearEstablished && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>Est. {yearEstablished}</span>
                </div>
              )}
            </div>
            
            {kennel.description && (
              <p className="text-gray-600 mt-4 leading-relaxed">{kennel.description}</p>
            )}
          </div>
        </div>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Star className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Rating</p>
              <p className="text-xl font-bold text-gray-900">
                {kennel.rating ? `${kennel.rating}%` : 'N/A'}
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Dog className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Breeds</p>
              <p className="text-xl font-bold text-gray-900">
                {kennel.breeds?.length || 0}
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Users className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Pets</p>
              <p className="text-xl font-bold text-gray-900">
                {kennel.pets?.length || 0}
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Home className="h-8 w-8 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Litters</p>
              <p className="text-xl font-bold text-gray-900">
                {kennel.litters?.length || 0}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Detailed Information Tabs */}
      <Tabs defaultValue="about" className="w-full">
        <TabsList>
          <TabsTrigger value="about">About</TabsTrigger>
          <TabsTrigger value="breeds">Breed Specializations</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="pets">Active Pets</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
        </TabsList>
        
        <TabsContent value="about" className="mt-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">About the Kennel</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Mission & Philosophy</h4>
                <p className="text-gray-600">
                  {kennel.description || 'Our kennel is dedicated to breeding healthy, well-tempered dogs that excel in both conformation and performance. We prioritize health testing, proper socialization, and maintaining breed standards in all our breeding programs.'}
                </p>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Facilities</h4>
                <ul className="space-y-2 text-gray-600">
                  <li>• Modern, climate-controlled kennels</li>
                  <li>• Spacious exercise areas and play yards</li>
                  <li>• On-site grooming facilities</li>
                  <li>• Veterinary care partnership</li>
                </ul>
              </div>
              
              {kennel.registration_number && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Registration</h4>
                  <p className="text-gray-600">
                    Registration Number: <code className="bg-muted px-2 py-1 rounded">{kennel.registration_number}</code>
                  </p>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>
        
        <TabsContent value="breeds" className="mt-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Breed Specializations</h3>
            {kennel.breeds && kennel.breeds.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {kennel.breeds.map((breed) => (
                  <div key={breed.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">{breed.name}</h4>
                        <p className="text-sm text-gray-600">{breed.authentic_name || breed.pet_type_id}</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => navigateTo(`/breeds/${breed.id}`)}
                      >
                        View Breed
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No breed specializations listed</p>
            )}
          </Card>
        </TabsContent>
        
        <TabsContent value="contact" className="mt-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
            <div className="space-y-4">
              {kennel.owner && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Owner</h4>
                  <p className="text-gray-600">{kennel.owner.display_name}</p>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Contact Details</h4>
                  <div className="space-y-2">
                    {kennel.phone && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone className="h-4 w-4" />
                        <span>{kennel.phone}</span>
                      </div>
                    )}
                    {kennel.email && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Mail className="h-4 w-4" />
                        <span>{kennel.email}</span>
                      </div>
                    )}
                    {kennel.website && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Globe className="h-4 w-4" />
                        <a href={kennel.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {kennel.website}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Address</h4>
                  <div className="text-gray-600">
                    {kennel.address ? (
                      <>
                        <p>{kennel.address}</p>
                        {kennel.city && <p>{kennel.city}, {kennel.postal_code}</p>}
                        <p>{kennel.country?.name}</p>
                      </>
                    ) : (
                      <p className="text-gray-500">Address not provided</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
        
        <TabsContent value="pets" className="mt-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Active Pets</h3>
            {kennel.pets && kennel.pets.length > 0 ? (
              <div className="space-y-3">
                {kennel.pets.slice(0, 5).map((pet) => (
                  <div key={pet.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={pet.photoUrl} alt={pet.name} />
                        <AvatarFallback>{pet.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{pet.name}</p>
                        <p className="text-sm text-gray-600">{pet.breed?.name} • {pet.gender}</p>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => navigateTo(`/pets/${pet.id}`)}
                    >
                      View Details
                    </Button>
                  </div>
                ))}
                {kennel.pets.length > 5 && (
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => navigateTo(`/pets?kennel=${id}`)}
                  >
                    View All {kennel.pets.length} Pets
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-gray-500">No active pets registered</p>
            )}
          </Card>
        </TabsContent>
        
        <TabsContent value="achievements" className="mt-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Achievements & Awards</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Recent Achievements</h4>
                <ul className="space-y-2 text-gray-600">
                  <li>• Best in Show - Westminster 2023</li>
                  <li>• Top Breeder Award - National Club 2023</li>
                  <li>• Excellence in Health Testing Recognition</li>
                  <li>• Community Service Award - Local Kennel Club</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Certifications</h4>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">AKC Breeder of Merit</Badge>
                  <Badge variant="secondary">CHIC Certified</Badge>
                  <Badge variant="secondary">Puppy Culture Breeder</Badge>
                  <Badge variant="secondary">Good Dog Verified</Badge>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Related Actions */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => navigateTo(`/pets?kennel=${id}`)}>
            View All Pets
          </Button>
          <Button variant="outline" onClick={() => navigateTo(`/litters?kennel=${id}`)}>
            View Litters
          </Button>
          <Button variant="outline" onClick={() => window.open(`mailto:${kennel.email}`)}>
            Contact Kennel
          </Button>
        </div>
      </Card>
    </div>
  );
}