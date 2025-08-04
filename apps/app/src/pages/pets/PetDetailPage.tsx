import React from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, Image } from 'lucide-react';
import { Button } from '@ui/components/button';
import { Card } from '@ui/components/card';
import { Badge } from '@ui/components/badge';
import { Avatar } from '@ui/components/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ui/components/tabs';
import { useNavigationSync } from '@/shared/hooks';
import { useMockPet } from '@/core/api/mock.hooks';

export function PetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { navigateTo } = useNavigationSync();
  const { data: pet, isLoading, error } = useMockPet(id || '');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !pet) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">Pet not found</h3>
        <p className="text-gray-600 mt-2">The pet you're looking for doesn't exist.</p>
        <Button className="mt-4" onClick={() => navigateTo('/pets')}>
          Back to Pets
        </Button>
      </div>
    );
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'inactive': return 'secondary';
      case 'deceased': return 'destructive';
      case 'sold': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigateTo('/pets')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{pet.name}</h1>
            <p className="text-gray-600">{pet.breed?.name} • {pet.gender}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => navigateTo(`/pets/${pet.id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button variant="destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Pet Photo & Basic Info */}
        <div className="space-y-6">
          <Card className="p-6">
            <div className="text-center">
              <Avatar className="h-32 w-32 mx-auto mb-4">
                {pet.photoUrl ? (
                  <img src={pet.photoUrl} alt={pet.name} className="object-cover" />
                ) : (
                  <div className="flex items-center justify-center bg-gray-200 text-gray-600">
                    <Image className="h-16 w-16" />
                  </div>
                )}
              </Avatar>
              <h3 className="text-xl font-bold text-gray-900">{pet.name}</h3>
              <p className="text-gray-600">{pet.registrationName}</p>
              <div className="flex justify-center mt-2">
                <Badge variant={getStatusVariant(pet.status)}>{pet.status}</Badge>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h4 className="text-lg font-semibold mb-4">Quick Info</h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Gender:</span>
                <span className="font-medium">{pet.gender}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date of Birth:</span>
                <span className="font-medium">
                  {pet.dateOfBirth ? new Date(pet.dateOfBirth).toLocaleDateString() : 'Unknown'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Color:</span>
                <span className="font-medium">{pet.color || 'Not specified'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Weight:</span>
                <span className="font-medium">{pet.weight ? `${pet.weight} kg` : 'Not recorded'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Microchip:</span>
                <span className="font-medium font-mono text-sm">
                  {pet.microchipNumber || 'None'}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column - Detailed Information */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="general" className="space-y-4">
            <TabsList>
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="pedigree">Pedigree</TabsTrigger>
              <TabsTrigger value="health">Health</TabsTrigger>
              <TabsTrigger value="breeding">Breeding</TabsTrigger>
              <TabsTrigger value="activities">Activities</TabsTrigger>
            </TabsList>

            <TabsContent value="general">
              <Card className="p-6">
                <h4 className="text-lg font-semibold mb-4">General Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Registration Number</label>
                    <p className="mt-1 font-mono text-sm">{pet.registrationNumber || 'Not registered'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Breeding Status</label>
                    <p className="mt-1">{pet.breedingStatus || 'Not specified'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Owner</label>
                    <p className="mt-1">{pet.owner?.name || 'Not specified'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Kennel</label>
                    <p className="mt-1">{pet.kennel?.name || 'Not specified'}</p>
                  </div>
                </div>
                {pet.description && (
                  <div className="mt-4">
                    <label className="text-sm font-medium text-gray-600">Description</label>
                    <p className="mt-1 text-gray-900">{pet.description}</p>
                  </div>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="pedigree">
              <Card className="p-6">
                <h4 className="text-lg font-semibold mb-4">Pedigree Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h5 className="font-medium text-gray-900 mb-2">Sire (Father)</h5>
                    <div className="border rounded-lg p-4">
                      {pet.sire ? (
                        <div>
                          <p className="font-medium">{pet.sire.name}</p>
                          <p className="text-sm text-gray-600">{pet.sire.registrationNumber}</p>
                        </div>
                      ) : (
                        <p className="text-gray-500">Not specified</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-900 mb-2">Dam (Mother)</h5>
                    <div className="border rounded-lg p-4">
                      {pet.dam ? (
                        <div>
                          <p className="font-medium">{pet.dam.name}</p>
                          <p className="text-sm text-gray-600">{pet.dam.registrationNumber}</p>
                        </div>
                      ) : (
                        <p className="text-gray-500">Not specified</p>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="health">
              <Card className="p-6">
                <h4 className="text-lg font-semibold mb-4">Health Information</h4>
                {pet.healthTests && pet.healthTests.length > 0 ? (
                  <div className="space-y-4">
                    {pet.healthTests.map((test, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h5 className="font-medium">{test.testType}</h5>
                            <p className="text-sm text-gray-600">
                              Date: {new Date(test.testDate).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant={test.result === 'clear' ? 'default' : 'destructive'}>
                            {test.result}
                          </Badge>
                        </div>
                        {test.notes && (
                          <p className="mt-2 text-sm text-gray-600">{test.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No health tests recorded</p>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="breeding">
              <Card className="p-6">
                <h4 className="text-lg font-semibold mb-4">Breeding Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Breeding Status</label>
                    <p className="mt-1">{pet.breedingStatus || 'Not specified'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Available for Breeding</label>
                    <p className="mt-1">{pet.availableForBreeding ? 'Yes' : 'No'}</p>
                  </div>
                </div>
                {pet.offspring && pet.offspring.length > 0 && (
                  <div className="mt-6">
                    <h5 className="font-medium text-gray-900 mb-2">Offspring</h5>
                    <div className="space-y-2">
                      {pet.offspring.map((offspring, index) => (
                        <div key={index} className="flex justify-between items-center p-2 border rounded">
                          <span>{offspring.name}</span>
                          <Button variant="ghost" size="sm" onClick={() => navigateTo(`/pets/${offspring.id}`)}>
                            View
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="activities">
              <Card className="p-6">
                <h4 className="text-lg font-semibold mb-4">Recent Activities</h4>
                <p className="text-gray-500">No activities recorded</p>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}