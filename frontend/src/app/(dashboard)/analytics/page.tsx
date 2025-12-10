'use client';

import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { formatNumber, getRatingColor } from '@/lib/utils';
import {
  Star,
  TrendingUp,
  TrendingDown,
  Users,
  MessageSquare,
} from 'lucide-react';

export default function AnalyticsPage() {
  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.getClients(),
  });

  const clientId = clients?.clients?.[0]?.id;

  const { data: stats } = useQuery({
    queryKey: ['review-stats', clientId],
    queryFn: () => (clientId ? api.getReviewStats(clientId) : null),
    enabled: !!clientId,
  });

  const { data: dashboard } = useQuery({
    queryKey: ['dashboard-stats', clientId],
    queryFn: () => (clientId ? api.getClientDashboard(clientId) : null),
    enabled: !!clientId,
  });

  return (
    <div>
      <Header title="Analytics" />

      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold">Reputation Analytics</h2>
          <p className="text-sm text-gray-600">
            Track your review performance and reputation trends
          </p>
        </div>

        {/* Key Metrics */}
        <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Reviews</p>
                  <p className="text-3xl font-bold">
                    {formatNumber(stats?.totalReviews || 0)}
                  </p>
                </div>
                <div className="rounded-full bg-blue-100 p-3">
                  <Star className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Average Rating</p>
                  <p className={`text-3xl font-bold ${getRatingColor(stats?.averageRating || 0)}`}>
                    {(stats?.averageRating || 0).toFixed(1)}
                  </p>
                </div>
                <div className="rounded-full bg-yellow-100 p-3">
                  {(stats?.averageRating || 0) >= 4 ? (
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  ) : (
                    <TrendingDown className="h-6 w-6 text-red-600" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Needs Response</p>
                  <p className="text-3xl font-bold text-red-600">
                    {formatNumber(stats?.needsResponseCount || 0)}
                  </p>
                </div>
                <div className="rounded-full bg-red-100 p-3">
                  <MessageSquare className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Customers</p>
                  <p className="text-3xl font-bold">
                    {formatNumber(dashboard?.totalCustomers || 0)}
                  </p>
                </div>
                <div className="rounded-full bg-purple-100 p-3">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Rating Distribution */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Rating Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[5, 4, 3, 2, 1].map((rating) => {
                  const count = stats?.ratingDistribution?.[rating] || 0;
                  const total = stats?.totalReviews || 1;
                  const percentage = (count / total) * 100;

                  return (
                    <div key={rating} className="flex items-center gap-4">
                      <div className="flex w-20 items-center gap-1">
                        <span className="text-lg font-medium">{rating}</span>
                        <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                      </div>
                      <div className="flex-1">
                        <div className="h-4 overflow-hidden rounded-full bg-gray-200">
                          <div
                            className="h-full rounded-full bg-yellow-400 transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                      <div className="w-20 text-right">
                        <span className="font-medium">{count}</span>
                        <span className="ml-1 text-sm text-gray-500">
                          ({percentage.toFixed(0)}%)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sentiment Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {['POSITIVE', 'NEUTRAL', 'NEGATIVE'].map((sentiment) => {
                  const count = stats?.sentimentDistribution?.[sentiment] || 0;
                  const total = stats?.totalReviews || 1;
                  const percentage = (count / total) * 100;

                  const colors: Record<string, { bg: string; bar: string }> = {
                    POSITIVE: { bg: 'bg-green-100', bar: 'bg-green-500' },
                    NEUTRAL: { bg: 'bg-gray-100', bar: 'bg-gray-500' },
                    NEGATIVE: { bg: 'bg-red-100', bar: 'bg-red-500' },
                  };

                  return (
                    <div key={sentiment} className="flex items-center gap-4">
                      <div className="w-24">
                        <span className="text-sm font-medium capitalize">
                          {sentiment.toLowerCase()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className={`h-4 overflow-hidden rounded-full ${colors[sentiment].bg}`}>
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${colors[sentiment].bar}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                      <div className="w-20 text-right">
                        <span className="font-medium">{count}</span>
                        <span className="ml-1 text-sm text-gray-500">
                          ({percentage.toFixed(0)}%)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Campaign Performance */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Campaign Performance Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="text-center">
                <p className="text-4xl font-bold text-purple-600">
                  {formatNumber(dashboard?.activeCampaigns || 0)}
                </p>
                <p className="text-gray-600">Active Campaigns</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-bold text-blue-600">
                  {formatNumber(dashboard?.totalCustomers || 0)}
                </p>
                <p className="text-gray-600">Total Recipients</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-bold text-green-600">
                  {formatNumber(dashboard?.recentReviews || 0)}
                </p>
                <p className="text-gray-600">Reviews This Month</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
