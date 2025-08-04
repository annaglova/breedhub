import React from 'react';
import { Heart, Users, Calendar, Building, Plus, FileDown, User, Dog, Cat, Award, TrendingUp } from 'lucide-react';
import { Card } from '@ui/components/card';
import { Button } from '@ui/components/button';
import { Badge } from '@ui/components/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@ui/components/avatar';
import { Progress } from '@ui/components/progress';
import { useNavigationSync } from '@/shared/hooks';
import { 
  useMockPets, 
  useMockBreeds, 
  useMockKennels, 
  useMockLitters, 
  useMockEvents,
  useMockContacts 
} from '@/core/api/mock.hooks';
import { mockDashboardStats } from '@/mocks';

export function DashboardPage() {
  const { navigateTo } = useNavigationSync();
  
  // Fetch mock data
  const { data: petsData } = useMockPets();
  const { data: breedsData } = useMockBreeds();
  const { data: kennelsData } = useMockKennels();
  const { data: littersData } = useMockLitters();
  const { data: eventsData } = useMockEvents();
  const { data: contactsData } = useMockContacts();
  
  const pets = petsData?.data || [];
  const breeds = breedsData?.data || [];
  const kennels = kennelsData?.data || [];
  const litters = littersData?.data || [];
  const events = eventsData?.data || [];
  const contacts = contactsData?.data || [];

  // Calculate real statistics
  const activePets = pets.filter(p => p.status === 'active').length;
  const activeLitters = litters.filter(l => l.status === 'active').length;
  const upcomingEvents = events.filter(e => new Date(e.start_date) > new Date()).length;
  const verifiedKennels = kennels.filter(k => k.is_verified).length;

  const stats = [
    {
      title: 'Total Pets',
      value: pets.length.toString(),
      change: '+2',
      changeType: 'increase' as const,
      icon: <Heart className="h-8 w-8 text-blue-600" />,
      subtitle: `${activePets} active`,
    },
    {
      title: 'Active Litters',
      value: activeLitters.toString(),
      change: '+1',
      changeType: 'increase' as const,
      icon: <Users className="h-8 w-8 text-green-600" />,
      subtitle: `${litters.length} total`,
    },
    {
      title: 'Upcoming Events',
      value: upcomingEvents.toString(),
      change: '+2',
      changeType: 'increase' as const,
      icon: <Calendar className="h-8 w-8 text-purple-600" />,
      subtitle: `${events.length} total`,
    },
    {
      title: 'Total Kennels',
      value: kennels.length.toString(),
      change: '+1',
      changeType: 'increase' as const,
      icon: <Building className="h-8 w-8 text-orange-600" />,
      subtitle: `${verifiedKennels} verified`,
    },
  ];

  // Use real recent activities from mock data
  const recentActivities = mockDashboardStats.recentActivity.map((activity, index) => ({
    id: index.toString(),
    type: activity.type,
    title: activity.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    description: activity.message,
    time: new Date(activity.date).toLocaleDateString(),
    user: 'System',
  }));

  const quickActions = [
    {
      title: 'Add New Pet',
      description: 'Register a new pet in the system',
      icon: <Plus className="h-6 w-6" />,
      action: () => navigateTo('/pets/new'),
    },
    {
      title: 'Create Litter',
      description: 'Register a new litter',
      icon: <Users className="h-6 w-6" />,
      action: () => navigateTo('/litters/new'),
    },
    {
      title: 'Add Event',
      description: 'Schedule a new event',
      icon: <Calendar className="h-6 w-6" />,
      action: () => navigateTo('/events/new'),
    },
    {
      title: 'Add Contact',
      description: 'Add a new contact',
      icon: <User className="h-6 w-6" />,
      action: () => navigateTo('/contacts/new'),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back! Here's what's happening with your breeding program.</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <FileDown className="mr-2 h-4 w-4" />
            Export Report
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Quick Add
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index} className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                {stat.subtitle && (
                  <p className="text-sm text-gray-500">{stat.subtitle}</p>
                )}
                <div className="flex items-center mt-1">
                  <Badge variant={stat.changeType === 'increase' ? 'default' : 'destructive'} className="text-xs">
                    {stat.change}
                  </Badge>
                  <span className="text-xs text-gray-500 ml-2">from last month</span>
                </div>
              </div>
              <div className="flex-shrink-0">
                {stat.icon}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={action.action}
                className="w-full flex items-start p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex-shrink-0 mr-3 mt-1">
                  {action.icon}
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900">{action.title}</h4>
                  <p className="text-xs text-gray-600">{action.description}</p>
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* Recent Activity */}
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
            <Button variant="ghost" size="sm" onClick={() => navigateTo('/activity')}>
              View All
            </Button>
          </div>
          <div className="space-y-4">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3">
                <Avatar className="h-8 w-8">
                  <div className="flex items-center justify-center bg-blue-500 text-white">
                    {activity.user[0]}
                  </div>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                  <p className="text-sm text-gray-600">{activity.description}</p>
                  <p className="text-xs text-gray-500 mt-1">{activity.time} • {activity.user}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Breeding Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Popular Breeds</h3>
          <div className="space-y-3">
            {mockDashboardStats.popularBreeds.slice(0, 5).map((breed, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-600">{index + 1}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{breed.breed}</span>
                </div>
                <Badge variant="secondary">{breed.count.toLocaleString()}</Badge>
              </div>
            ))}
          </div>
          <Button 
            variant="outline" 
            className="w-full mt-4"
            onClick={() => navigateTo('/breeds')}
          >
            View All Breeds
          </Button>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Rated Kennels</h3>
          <div className="space-y-3">
            {mockDashboardStats.topRatedKennels.map((kennel, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    <Award className={`h-5 w-5 ${index === 0 ? 'text-yellow-500' : index === 1 ? 'text-gray-400' : index === 2 ? 'text-orange-600' : 'text-gray-600'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{kennel.name}</p>
                    <p className="text-xs text-gray-600">Verified Kennel</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-semibold">{kennel.rating}%</span>
                </div>
              </div>
            ))}
          </div>
          <Button 
            variant="outline" 
            className="w-full mt-4"
            onClick={() => navigateTo('/kennels')}
          >
            View All Kennels
          </Button>
        </Card>
      </div>
    </div>
  );
}