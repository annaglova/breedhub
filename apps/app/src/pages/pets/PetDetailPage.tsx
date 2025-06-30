import React from 'react';
import { useParams } from 'react-router-dom';
import { Button, Card, Badge, Avatar, Tabs, TabsContent, TabsList, TabsTrigger } from 'ui';
import { useNavigationSync } from '@/shared/hooks';
import { usePet } from '@/core/api';

export function PetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { navigateTo } = useNavigationSync();
  const { data: pet, isLoading, error } = usePet(id!);

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
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{pet.name}</h1>
            <p className="text-gray-600">{pet.breed?.name} • {pet.gender}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => navigateTo(`/pets/${pet.id}/edit`)}>
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </Button>
          <Button variant="destructive">
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
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
                    <svg className="h-16 w-16" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" />
                    </svg>
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