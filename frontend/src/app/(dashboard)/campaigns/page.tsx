'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { formatDate, formatNumber, getStatusColor } from '@/lib/utils';
import {
  Plus,
  Send,
  Play,
  Pause,
  Mail,
  MessageSquare,
  Users,
  Star,
  MoreVertical,
} from 'lucide-react';

export default function CampaignsPage() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.getClients(),
  });

  const clientId = clients?.clients?.[0]?.id;

  const { data, isLoading } = useQuery({
    queryKey: ['campaigns', clientId],
    queryFn: () => (clientId ? api.getCampaigns(clientId) : null),
    enabled: !!clientId,
  });

  const launchMutation = useMutation({
    mutationFn: (campaignId: string) => api.launchCampaign(clientId!, campaignId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });

  const pauseMutation = useMutation({
    mutationFn: (campaignId: string) => api.pauseCampaign(clientId!, campaignId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });

  return (
    <div>
      <Header title="Campaigns" />

      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Review Request Campaigns</h2>
            <p className="text-sm text-gray-600">
              Create and manage automated review request campaigns
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Campaign
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-4">
            {data?.campaigns?.map((campaign: any) => (
              <Card key={campaign.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold">{campaign.name}</h3>
                        <Badge className={getStatusColor(campaign.status)}>
                          {campaign.status}
                        </Badge>
                      </div>
                      {campaign.description && (
                        <p className="mt-1 text-gray-600">{campaign.description}</p>
                      )}
                      <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Badge variant="outline">{campaign.type}</Badge>
                        </span>
                        {campaign.emailEnabled && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-4 w-4" />
                            Email
                          </span>
                        )}
                        {campaign.smsEnabled && (
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-4 w-4" />
                            SMS
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {campaign.status === 'DRAFT' && (
                        <Button
                          size="sm"
                          onClick={() => launchMutation.mutate(campaign.id)}
                          disabled={launchMutation.isPending}
                        >
                          <Play className="mr-1 h-4 w-4" />
                          Launch
                        </Button>
                      )}
                      {campaign.status === 'ACTIVE' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => pauseMutation.mutate(campaign.id)}
                          disabled={pauseMutation.isPending}
                        >
                          <Pause className="mr-1 h-4 w-4" />
                          Pause
                        </Button>
                      )}
                      <Button size="sm" variant="ghost">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-4 gap-4 border-t pt-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span className="text-2xl font-bold">
                          {formatNumber(campaign.totalRecipients)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">Recipients</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Send className="h-4 w-4 text-gray-400" />
                        <span className="text-2xl font-bold">
                          {formatNumber(campaign.sentCount)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">Sent</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span className="text-2xl font-bold">
                          {formatNumber(campaign.openedCount)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">Opened</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-gray-400" />
                        <span className="text-2xl font-bold">
                          {formatNumber(campaign.reviewCount)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">Reviews</p>
                    </div>
                  </div>

                  <div className="mt-4 text-sm text-gray-500">
                    Created {formatDate(campaign.createdAt)}
                    {campaign.startedAt && ` • Started ${formatDate(campaign.startedAt)}`}
                    {campaign.completedAt && ` • Completed ${formatDate(campaign.completedAt)}`}
                  </div>
                </CardContent>
              </Card>
            ))}

            {data?.campaigns?.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Send className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium">No campaigns yet</h3>
                  <p className="text-gray-600">
                    Create your first campaign to start collecting reviews
                  </p>
                  <Button className="mt-4" onClick={() => setShowCreateModal(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Campaign
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
