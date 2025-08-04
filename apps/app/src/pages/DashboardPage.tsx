import React from 'react';
import { Heart, Users, Calendar, Building, Plus, FileDown, User } from 'lucide-react';
import { Card } from '@ui/components/card';
import { Button } from '@ui/components/button';
import { Badge } from '@ui/components/badge';
import { Avatar } from '@ui/components/avatar';
import { Progress } from '@ui/components/progress';
import { useNavigationSync } from '@/shared/hooks';

export function DashboardPage() {
  const { navigateTo } = useNavigationSync();

  // Mock data for demonstration
  const stats = [
    {
      title: 'Total Pets',
      value: '156',
      change: '+12',
      changeType: 'increase' as const,
      icon: <Heart className="h-8 w-8 text-blue-600" />,
    },
    {
      title: 'Active Litters',
      value: '23',
      change: '+3',
      changeType: 'increase' as const,
      icon: <Users className="h-8 w-8 text-green-600" />,
    },
    {
      title: 'Upcoming Events',
      value: '8',
      change: '+2',
      changeType: 'increase' as const,
      icon: <Calendar className="h-8 w-8 text-purple-600" />,
    },
    {
      title: 'Total Kennels',
      value: '12',
      change: '+1',
      changeType: 'increase' as const,
      icon: <Building className="h-8 w-8 text-orange-600" />,
    },
  ];

  const recentActivities = [
    {
      id: '1',
      type: 'new_pet',
      title: 'New pet added',
      description: 'Luna - Golden Retriever',
      time: '2 hours ago',
      user: 'John Doe',
    },
    {
      id: '2',
      type: 'litter_update',
      title: 'Litter updated',
      description: 'Bella x Max litter - 6 puppies born',
      time: '5 hours ago',
      user: 'Jane Smith',
    },
    {
      id: '3',
      type: 'event_reminder',
      title: 'Event reminder',
      description: 'Dog show tomorrow at 9:00 AM',
      time: '1 day ago',
      user: 'System',
    },
  ];

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
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Breeding Program Progress</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Health Testing</span>
                <span className="text-sm text-gray-600">85%</span>
              </div>
              <Progress value={85} className="h-2" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Pedigree Completion</span>
                <span className="text-sm text-gray-600">92%</span>
              </div>
              <Progress value={92} className="h-2" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Registration Status</span>
                <span className="text-sm text-gray-600">78%</span>
              </div>
              <Progress value={78} className="h-2" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Tasks</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">Health check for Luna</p>
                <p className="text-xs text-gray-600">Due in 3 days</p>
              </div>
              <Badge variant="outline">Pending</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">Vaccination reminder</p>
                <p className="text-xs text-gray-600">Due in 1 week</p>
              </div>
              <Badge variant="outline">Scheduled</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">Update breeding records</p>
                <p className="text-xs text-gray-600">Overdue by 2 days</p>
              </div>
              <Badge variant="destructive">Overdue</Badge>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}