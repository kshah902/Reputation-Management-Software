'use client';

import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { formatNumber, getRatingColor } from '@/lib/utils';
import {
  Star,
  Users,
  Send,
  MessageSquare,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';

export default function DashboardPage() {
  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.getClients(),
  });

  // For demo purposes, using the first client
  const clientId = clients?.clients?.[0]?.id;

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats', clientId],
    queryFn: () => (clientId ? api.getClientDashboard(clientId) : null),
    enabled: !!clientId,
  });

  const statCards = [
    {
      title: 'Total Customers',
      value: formatNumber(stats?.totalCustomers || 0),
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Total Reviews',
      value: formatNumber(stats?.totalReviews || 0),
      icon: Star,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
    {
      title: 'Average Rating',
      value: (stats?.averageRating || 0).toFixed(1),
      icon: TrendingUp,
      color: getRatingColor(stats?.averageRating || 0),
      bgColor: 'bg-green-100',
    },
    {
      title: 'Active Campaigns',
      value: formatNumber(stats?.activeCampaigns || 0),
      icon: Send,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Reviews This Month',
      value: formatNumber(stats?.recentReviews || 0),
      icon: MessageSquare,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
    },
    {
      title: 'Needs Response',
      value: formatNumber(stats?.needsResponseCount || 0),
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
  ];

  return (
    <div>
      <Header title="Dashboard" />

      <div className="p-6">
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900">Overview</h2>
          <p className="text-sm text-gray-600">
            Your reputation management performance at a glance
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {statCards.map((stat) => (
            <Card key={stat.title}>
              <CardContent className="flex items-center gap-4 p-6">
                <div className={`rounded-full p-3 ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm text-gray-600">{stat.title}</p>
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Rating Distribution */}
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Rating Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[5, 4, 3, 2, 1].map((rating) => {
                  const count = stats?.ratingDistribution?.[rating] || 0;
                  const total = stats?.totalReviews || 1;
                  const percentage = (count / total) * 100;

                  return (
                    <div key={rating} className="flex items-center gap-3">
                      <div className="flex w-12 items-center gap-1">
                        <span className="text-sm font-medium">{rating}</span>
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      </div>
                      <div className="flex-1">
                        <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                          <div
                            className="h-full rounded-full bg-yellow-400"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                      <span className="w-12 text-right text-sm text-gray-600">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <a
                  href="/campaigns/new"
                  className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-gray-50"
                >
                  <Send className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="font-medium">Create Campaign</p>
                    <p className="text-sm text-gray-600">
                      Send review requests to your customers
                    </p>
                  </div>
                </a>

                <a
                  href="/customers/import"
                  className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-gray-50"
                >
                  <Users className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium">Import Customers</p>
                    <p className="text-sm text-gray-600">
                      Upload a CSV file with customer data
                    </p>
                  </div>
                </a>

                <a
                  href="/reviews?needsResponse=true"
                  className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-gray-50"
                >
                  <MessageSquare className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="font-medium">Respond to Reviews</p>
                    <p className="text-sm text-gray-600">
                      {stats?.needsResponseCount || 0} reviews need your attention
                    </p>
                  </div>
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
