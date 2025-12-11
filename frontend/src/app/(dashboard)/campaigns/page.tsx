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
  Trash2,
  X,
  UserPlus,
  Check,
  AlertTriangle,
  Phone,
} from 'lucide-react';
import { useClientStore } from '@/store/client';

type ChannelTab = 'all' | 'email' | 'sms';
type CreateStep = 'details' | 'email' | 'sms' | 'schedule';

export default function CampaignsPage() {
  const queryClient = useQueryClient();
  const { selectedClient } = useClientStore();
  const [channelFilter, setChannelFilter] = useState<ChannelTab>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createStep, setCreateStep] = useState<CreateStep>('details');
  const [showRecipientsModal, setShowRecipientsModal] = useState<string | null>(null);
  const [recipientCampaign, setRecipientCampaign] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    description: '',
    type: 'REVIEW_REQUEST',
    emailEnabled: true,
    smsEnabled: false,
    emailSubject: 'How was your experience at {{businessName}}?',
    emailTemplate: `<h2>Hi {{customerName}},</h2>
<p>Thank you for visiting {{businessName}}! We hope you had a great experience.</p>
<p>Would you mind taking a moment to leave us a review? Your feedback helps us improve!</p>
<p><a href="{{reviewLink}}">Leave a Review</a></p>
<p>Thank you!</p>`,
    smsTemplate: 'Hi {{customerName}}! Thanks for visiting {{businessName}}. We\'d love your feedback: {{reviewLink}}',
    scheduleType: 'IMMEDIATE',
  });

  const clientId = selectedClient?.id;

  const { data, isLoading } = useQuery({
    queryKey: ['campaigns', clientId],
    queryFn: () => (clientId ? api.getCampaigns(clientId) : null),
    enabled: !!clientId,
  });

  const { data: customersData } = useQuery({
    queryKey: ['customers', clientId],
    queryFn: () => (clientId ? api.getCustomers(clientId, {}) : null),
    enabled: !!clientId,
  });

  // Filter campaigns based on channel
  const filteredCampaigns = data?.campaigns?.filter((campaign: any) => {
    if (channelFilter === 'all') return true;
    if (channelFilter === 'email') return campaign.emailEnabled;
    if (channelFilter === 'sms') return campaign.smsEnabled;
    return true;
  });

  // Filter customers based on campaign channel and opt-out status
  const getEligibleCustomers = (campaign: any) => {
    if (!customersData?.customers) return [];

    return customersData.customers.filter((customer: any) => {
      // If campaign uses email, customer must not have opted out of email AND must have email
      if (campaign?.emailEnabled && (customer.optOutEmail || !customer.email)) {
        return false;
      }
      // If campaign uses SMS, customer must not have opted out of SMS AND must have phone
      if (campaign?.smsEnabled && (customer.optOutSms || !customer.phone)) {
        return false;
      }
      return true;
    });
  };

  const createMutation = useMutation({
    mutationFn: (data: typeof newCampaign) => api.createCampaign(clientId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      setShowCreateModal(false);
      setCreateStep('details');
      setNewCampaign({
        name: '',
        description: '',
        type: 'REVIEW_REQUEST',
        emailEnabled: true,
        smsEnabled: false,
        emailSubject: 'How was your experience at {{businessName}}?',
        emailTemplate: `<h2>Hi {{customerName}},</h2>
<p>Thank you for visiting {{businessName}}! We hope you had a great experience.</p>
<p>Would you mind taking a moment to leave us a review? Your feedback helps us improve!</p>
<p><a href="{{reviewLink}}">Leave a Review</a></p>
<p>Thank you!</p>`,
        smsTemplate: 'Hi {{customerName}}! Thanks for visiting {{businessName}}. We\'d love your feedback: {{reviewLink}}',
        scheduleType: 'IMMEDIATE',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (campaignId: string) => api.deleteCampaign(clientId!, campaignId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      setShowDeleteConfirm(null);
    },
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

  const addRecipientsMutation = useMutation({
    mutationFn: ({ campaignId, customerIds }: { campaignId: string; customerIds: string[] }) =>
      api.addCampaignRecipients(clientId!, campaignId, customerIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      setShowRecipientsModal(null);
      setRecipientCampaign(null);
      setSelectedCustomers([]);
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(newCampaign);
  };

  const toggleCustomer = (customerId: string) => {
    setSelectedCustomers((prev) =>
      prev.includes(customerId)
        ? prev.filter((id) => id !== customerId)
        : [...prev, customerId]
    );
  };

  const handleAddRecipients = () => {
    if (showRecipientsModal && selectedCustomers.length > 0) {
      addRecipientsMutation.mutate({
        campaignId: showRecipientsModal,
        customerIds: selectedCustomers,
      });
    }
  };

  const openRecipientsModal = (campaign: any) => {
    setShowRecipientsModal(campaign.id);
    setRecipientCampaign(campaign);
    setSelectedCustomers([]);
  };

  const nextStep = () => {
    if (createStep === 'details') {
      if (newCampaign.emailEnabled) setCreateStep('email');
      else if (newCampaign.smsEnabled) setCreateStep('sms');
      else setCreateStep('schedule');
    } else if (createStep === 'email') {
      if (newCampaign.smsEnabled) setCreateStep('sms');
      else setCreateStep('schedule');
    } else if (createStep === 'sms') {
      setCreateStep('schedule');
    }
  };

  const prevStep = () => {
    if (createStep === 'schedule') {
      if (newCampaign.smsEnabled) setCreateStep('sms');
      else if (newCampaign.emailEnabled) setCreateStep('email');
      else setCreateStep('details');
    } else if (createStep === 'sms') {
      if (newCampaign.emailEnabled) setCreateStep('email');
      else setCreateStep('details');
    } else if (createStep === 'email') {
      setCreateStep('details');
    }
  };

  const eligibleCustomers = recipientCampaign ? getEligibleCustomers(recipientCampaign) : [];
  const ineligibleCount = (customersData?.customers?.length || 0) - eligibleCustomers.length;

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

        {/* Channel Filter Tabs */}
        <div className="mb-6 flex gap-2 border-b">
          <button
            onClick={() => setChannelFilter('all')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
              channelFilter === 'all'
                ? 'border-b-2 border-purple-500 text-purple-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            All Campaigns
          </button>
          <button
            onClick={() => setChannelFilter('email')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
              channelFilter === 'email'
                ? 'border-b-2 border-purple-500 text-purple-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Mail className="h-4 w-4" />
            Email Campaigns
          </button>
          <button
            onClick={() => setChannelFilter('sms')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
              channelFilter === 'sms'
                ? 'border-b-2 border-purple-500 text-purple-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            SMS Campaigns
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCampaigns?.map((campaign: any) => (
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
                          <Badge variant="outline">{campaign.type.replace(/_/g, ' ')}</Badge>
                        </span>
                        {campaign.emailEnabled && (
                          <span className="flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-blue-700">
                            <Mail className="h-3 w-3" />
                            Email
                          </span>
                        )}
                        {campaign.smsEnabled && (
                          <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-green-700">
                            <MessageSquare className="h-3 w-3" />
                            SMS
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openRecipientsModal(campaign)}
                      >
                        <UserPlus className="mr-1 h-4 w-4" />
                        Add Recipients
                      </Button>
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
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => setShowDeleteConfirm(campaign.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Separate stats for Email and SMS */}
                  <div className="mt-4 border-t pt-4">
                    {campaign.emailEnabled && (
                      <div className="mb-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Mail className="h-4 w-4 text-blue-500" />
                          <span className="text-sm font-medium text-blue-700">Email Stats</span>
                        </div>
                        <div className="grid grid-cols-4 gap-4 rounded-lg bg-blue-50 p-3">
                          <div>
                            <span className="text-xl font-bold text-blue-700">
                              {formatNumber(campaign.emailSentCount || campaign.sentCount || 0)}
                            </span>
                            <p className="text-xs text-blue-600">Sent</p>
                          </div>
                          <div>
                            <span className="text-xl font-bold text-blue-700">
                              {formatNumber(campaign.emailDeliveredCount || campaign.deliveredCount || 0)}
                            </span>
                            <p className="text-xs text-blue-600">Delivered</p>
                          </div>
                          <div>
                            <span className="text-xl font-bold text-blue-700">
                              {formatNumber(campaign.openedCount || 0)}
                            </span>
                            <p className="text-xs text-blue-600">Opened</p>
                          </div>
                          <div>
                            <span className="text-xl font-bold text-blue-700">
                              {formatNumber(campaign.clickedCount || 0)}
                            </span>
                            <p className="text-xs text-blue-600">Clicked</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {campaign.smsEnabled && (
                      <div className="mb-3">
                        <div className="flex items-center gap-2 mb-2">
                          <MessageSquare className="h-4 w-4 text-green-500" />
                          <span className="text-sm font-medium text-green-700">SMS Stats</span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 rounded-lg bg-green-50 p-3">
                          <div>
                            <span className="text-xl font-bold text-green-700">
                              {formatNumber(campaign.smsSentCount || 0)}
                            </span>
                            <p className="text-xs text-green-600">Sent</p>
                          </div>
                          <div>
                            <span className="text-xl font-bold text-green-700">
                              {formatNumber(campaign.smsDeliveredCount || 0)}
                            </span>
                            <p className="text-xs text-green-600">Delivered</p>
                          </div>
                          <div>
                            <span className="text-xl font-bold text-green-700">
                              {formatNumber(campaign.smsClickedCount || 0)}
                            </span>
                            <p className="text-xs text-green-600">Clicked</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Overall Stats */}
                    <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-400" />
                        <div>
                          <span className="text-lg font-bold">
                            {formatNumber(campaign.totalRecipients || 0)}
                          </span>
                          <p className="text-xs text-gray-600">Total Recipients</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <div>
                          <span className="text-lg font-bold">
                            {formatNumber(campaign.reviewCount || 0)}
                          </span>
                          <p className="text-xs text-gray-600">Reviews Generated</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Send className="h-4 w-4 text-gray-400" />
                        <div>
                          <span className="text-lg font-bold">
                            {campaign.totalRecipients > 0
                              ? Math.round((campaign.reviewCount || 0) / campaign.totalRecipients * 100)
                              : 0}%
                          </span>
                          <p className="text-xs text-gray-600">Conversion Rate</p>
                        </div>
                      </div>
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

            {filteredCampaigns?.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Send className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium">
                    {channelFilter === 'all'
                      ? 'No campaigns yet'
                      : `No ${channelFilter} campaigns`}
                  </h3>
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

        {/* Create Campaign Modal - Multi-step */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <CardContent className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Create New Campaign</h2>
                  <Button variant="ghost" size="sm" onClick={() => { setShowCreateModal(false); setCreateStep('details'); }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Step Indicator */}
                <div className="mb-6 flex items-center justify-center gap-2">
                  <div className={`flex items-center gap-1 ${createStep === 'details' ? 'text-purple-600' : 'text-gray-400'}`}>
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${createStep === 'details' ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}>1</div>
                    <span className="text-sm hidden sm:inline">Details</span>
                  </div>
                  <div className="h-px w-8 bg-gray-300" />
                  {newCampaign.emailEnabled && (
                    <>
                      <div className={`flex items-center gap-1 ${createStep === 'email' ? 'text-purple-600' : 'text-gray-400'}`}>
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${createStep === 'email' ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}>
                          <Mail className="h-4 w-4" />
                        </div>
                        <span className="text-sm hidden sm:inline">Email</span>
                      </div>
                      <div className="h-px w-8 bg-gray-300" />
                    </>
                  )}
                  {newCampaign.smsEnabled && (
                    <>
                      <div className={`flex items-center gap-1 ${createStep === 'sms' ? 'text-purple-600' : 'text-gray-400'}`}>
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${createStep === 'sms' ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}>
                          <MessageSquare className="h-4 w-4" />
                        </div>
                        <span className="text-sm hidden sm:inline">SMS</span>
                      </div>
                      <div className="h-px w-8 bg-gray-300" />
                    </>
                  )}
                  <div className={`flex items-center gap-1 ${createStep === 'schedule' ? 'text-purple-600' : 'text-gray-400'}`}>
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${createStep === 'schedule' ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}>
                      <Send className="h-4 w-4" />
                    </div>
                    <span className="text-sm hidden sm:inline">Schedule</span>
                  </div>
                </div>

                <form onSubmit={handleCreate}>
                  {/* Step 1: Campaign Details */}
                  {createStep === 'details' && (
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Campaign Name</label>
                        <Input
                          value={newCampaign.name}
                          onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                          placeholder="Monthly Review Request"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Description</label>
                        <Input
                          value={newCampaign.description}
                          onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })}
                          placeholder="Send review requests to recent customers"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium">Campaign Type</label>
                        <select
                          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-purple-500 focus:outline-none"
                          value={newCampaign.type}
                          onChange={(e) => setNewCampaign({ ...newCampaign, type: e.target.value })}
                        >
                          <option value="REVIEW_REQUEST">Review Request</option>
                          <option value="FEEDBACK">Feedback Collection</option>
                          <option value="FOLLOW_UP">Follow Up</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Communication Channels</label>
                        <div className="grid grid-cols-2 gap-4">
                          <div
                            className={`cursor-pointer rounded-lg border-2 p-4 transition-all ${
                              newCampaign.emailEnabled
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => setNewCampaign({ ...newCampaign, emailEnabled: !newCampaign.emailEnabled })}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`rounded-full p-2 ${newCampaign.emailEnabled ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}>
                                <Mail className="h-5 w-5" />
                              </div>
                              <div>
                                <p className="font-medium">Email</p>
                                <p className="text-xs text-gray-500">Send via email</p>
                              </div>
                              <div className="ml-auto">
                                <div className={`h-5 w-5 rounded border flex items-center justify-center ${
                                  newCampaign.emailEnabled ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-300'
                                }`}>
                                  {newCampaign.emailEnabled && <Check className="h-3 w-3" />}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div
                            className={`cursor-pointer rounded-lg border-2 p-4 transition-all ${
                              newCampaign.smsEnabled
                                ? 'border-green-500 bg-green-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => setNewCampaign({ ...newCampaign, smsEnabled: !newCampaign.smsEnabled })}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`rounded-full p-2 ${newCampaign.smsEnabled ? 'bg-green-500 text-white' : 'bg-gray-100'}`}>
                                <MessageSquare className="h-5 w-5" />
                              </div>
                              <div>
                                <p className="font-medium">SMS</p>
                                <p className="text-xs text-gray-500">Send via text message</p>
                              </div>
                              <div className="ml-auto">
                                <div className={`h-5 w-5 rounded border flex items-center justify-center ${
                                  newCampaign.smsEnabled ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'
                                }`}>
                                  {newCampaign.smsEnabled && <Check className="h-3 w-3" />}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        {!newCampaign.emailEnabled && !newCampaign.smsEnabled && (
                          <p className="mt-2 text-sm text-red-500">Please select at least one channel</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Step 2: Email Settings */}
                  {createStep === 'email' && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="rounded-full bg-blue-100 p-2">
                          <Mail className="h-5 w-5 text-blue-600" />
                        </div>
                        <h3 className="text-lg font-medium">Email Settings</h3>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Subject Line</label>
                        <Input
                          value={newCampaign.emailSubject}
                          onChange={(e) => setNewCampaign({ ...newCampaign, emailSubject: e.target.value })}
                          placeholder="How was your experience?"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Use {'{{customerName}}'} and {'{{businessName}}'} for personalization
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Email Body (HTML)</label>
                        <textarea
                          className="mt-1 h-48 w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:border-purple-500 focus:outline-none"
                          value={newCampaign.emailTemplate}
                          onChange={(e) => setNewCampaign({ ...newCampaign, emailTemplate: e.target.value })}
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Variables: {'{{customerName}}'}, {'{{businessName}}'}, {'{{reviewLink}}'}
                        </p>
                      </div>
                      <div className="rounded-lg border bg-gray-50 p-4">
                        <p className="text-sm font-medium mb-2">Preview</p>
                        <div className="bg-white border rounded p-4 text-sm" dangerouslySetInnerHTML={{
                          __html: newCampaign.emailTemplate
                            .replace(/\{\{customerName\}\}/g, 'John')
                            .replace(/\{\{businessName\}\}/g, 'Acme Restaurant')
                            .replace(/\{\{reviewLink\}\}/g, '#')
                        }} />
                      </div>
                    </div>
                  )}

                  {/* Step 3: SMS Settings */}
                  {createStep === 'sms' && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="rounded-full bg-green-100 p-2">
                          <MessageSquare className="h-5 w-5 text-green-600" />
                        </div>
                        <h3 className="text-lg font-medium">SMS Settings</h3>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Message</label>
                        <textarea
                          className="mt-1 h-32 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
                          value={newCampaign.smsTemplate}
                          onChange={(e) => setNewCampaign({ ...newCampaign, smsTemplate: e.target.value })}
                          maxLength={160}
                        />
                        <div className="mt-1 flex justify-between text-xs">
                          <span className="text-gray-500">
                            Variables: {'{{customerName}}'}, {'{{businessName}}'}, {'{{reviewLink}}'}
                          </span>
                          <span className={newCampaign.smsTemplate.length > 140 ? 'text-orange-500' : 'text-gray-500'}>
                            {newCampaign.smsTemplate.length}/160
                          </span>
                        </div>
                      </div>
                      <div className="rounded-lg border bg-gray-50 p-4">
                        <p className="text-sm font-medium mb-2">Preview</p>
                        <div className="bg-green-100 rounded-2xl rounded-bl-none p-3 text-sm max-w-xs">
                          {newCampaign.smsTemplate
                            .replace(/\{\{customerName\}\}/g, 'John')
                            .replace(/\{\{businessName\}\}/g, 'Acme Restaurant')
                            .replace(/\{\{reviewLink\}\}/g, 'bit.ly/review123')}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 4: Schedule */}
                  {createStep === 'schedule' && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="rounded-full bg-purple-100 p-2">
                          <Send className="h-5 w-5 text-purple-600" />
                        </div>
                        <h3 className="text-lg font-medium">Schedule & Launch</h3>
                      </div>
                      <div>
                        <label className="text-sm font-medium">When to send</label>
                        <div className="mt-2 space-y-2">
                          {[
                            { value: 'IMMEDIATE', label: 'Send Immediately', desc: 'Messages go out as soon as campaign is launched' },
                            { value: 'SCHEDULED', label: 'Schedule for Later', desc: 'Choose a specific date and time' },
                            { value: 'DRIP', label: 'Drip Campaign', desc: 'Send messages over time with delays' },
                          ].map((option) => (
                            <div
                              key={option.value}
                              className={`cursor-pointer rounded-lg border-2 p-3 transition-all ${
                                newCampaign.scheduleType === option.value
                                  ? 'border-purple-500 bg-purple-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                              onClick={() => setNewCampaign({ ...newCampaign, scheduleType: option.value })}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium">{option.label}</p>
                                  <p className="text-xs text-gray-500">{option.desc}</p>
                                </div>
                                <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                                  newCampaign.scheduleType === option.value
                                    ? 'border-purple-500 bg-purple-500'
                                    : 'border-gray-300'
                                }`}>
                                  {newCampaign.scheduleType === option.value && (
                                    <div className="h-2 w-2 rounded-full bg-white" />
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Summary */}
                      <div className="rounded-lg border bg-gray-50 p-4 mt-4">
                        <p className="text-sm font-medium mb-3">Campaign Summary</p>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Name:</span>
                            <span className="font-medium">{newCampaign.name || 'Untitled'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Channels:</span>
                            <div className="flex gap-2">
                              {newCampaign.emailEnabled && (
                                <span className="flex items-center gap-1 text-blue-600">
                                  <Mail className="h-3 w-3" /> Email
                                </span>
                              )}
                              {newCampaign.smsEnabled && (
                                <span className="flex items-center gap-1 text-green-600">
                                  <MessageSquare className="h-3 w-3" /> SMS
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Schedule:</span>
                            <span className="font-medium">{newCampaign.scheduleType.replace(/_/g, ' ')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Navigation Buttons */}
                  <div className="flex gap-2 pt-6 mt-6 border-t">
                    {createStep !== 'details' && (
                      <Button type="button" variant="outline" onClick={prevStep} className="flex-1">
                        Back
                      </Button>
                    )}
                    {createStep === 'details' && (
                      <Button type="button" variant="outline" onClick={() => { setShowCreateModal(false); setCreateStep('details'); }} className="flex-1">
                        Cancel
                      </Button>
                    )}
                    {createStep !== 'schedule' && (
                      <Button
                        type="button"
                        onClick={nextStep}
                        className="flex-1"
                        disabled={createStep === 'details' && (!newCampaign.name || (!newCampaign.emailEnabled && !newCampaign.smsEnabled))}
                      >
                        Next
                      </Button>
                    )}
                    {createStep === 'schedule' && (
                      <Button type="submit" className="flex-1" disabled={createMutation.isPending}>
                        {createMutation.isPending ? 'Creating...' : 'Create Campaign'}
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Add Recipients Modal with Opt-out filtering */}
        {showRecipientsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
            <Card className="w-full max-w-lg">
              <CardContent className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Add Recipients</h2>
                  <Button variant="ghost" size="sm" onClick={() => { setShowRecipientsModal(null); setRecipientCampaign(null); }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Campaign channels info */}
                {recipientCampaign && (
                  <div className="mb-4 p-3 rounded-lg bg-gray-50">
                    <p className="text-sm font-medium mb-2">Campaign channels:</p>
                    <div className="flex gap-2">
                      {recipientCampaign.emailEnabled && (
                        <span className="flex items-center gap-1 text-xs rounded-full bg-blue-100 px-2 py-1 text-blue-700">
                          <Mail className="h-3 w-3" /> Email
                        </span>
                      )}
                      {recipientCampaign.smsEnabled && (
                        <span className="flex items-center gap-1 text-xs rounded-full bg-green-100 px-2 py-1 text-green-700">
                          <MessageSquare className="h-3 w-3" /> SMS
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Opt-out warning */}
                {ineligibleCount > 0 && (
                  <div className="mb-4 flex items-start gap-2 rounded-lg border border-orange-200 bg-orange-50 p-3">
                    <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-orange-800">
                        {ineligibleCount} customer{ineligibleCount > 1 ? 's' : ''} not shown
                      </p>
                      <p className="text-orange-700">
                        {recipientCampaign?.emailEnabled && recipientCampaign?.smsEnabled
                          ? 'Customers who have opted out of email or SMS, or are missing contact info, are not eligible.'
                          : recipientCampaign?.emailEnabled
                            ? 'Customers who have opted out of email or have no email address are not eligible.'
                            : 'Customers who have opted out of SMS or have no phone number are not eligible.'}
                      </p>
                    </div>
                  </div>
                )}

                <div className="mb-4">
                  <p className="text-sm text-gray-600">
                    Select customers to add to this campaign ({eligibleCustomers.length} eligible)
                  </p>
                </div>

                <div className="max-h-64 overflow-y-auto rounded-lg border">
                  {eligibleCustomers.map((customer: any) => (
                    <div
                      key={customer.id}
                      className="flex cursor-pointer items-center justify-between border-b p-3 hover:bg-gray-50"
                      onClick={() => toggleCustomer(customer.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-5 w-5 items-center justify-center rounded border ${
                            selectedCustomers.includes(customer.id)
                              ? 'border-purple-500 bg-purple-500 text-white'
                              : 'border-gray-300'
                          }`}
                        >
                          {selectedCustomers.includes(customer.id) && (
                            <Check className="h-3 w-3" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">
                            {customer.firstName} {customer.lastName}
                          </p>
                          <div className="flex gap-2 text-xs text-gray-500">
                            {customer.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" /> {customer.email}
                              </span>
                            )}
                            {customer.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" /> {customer.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {eligibleCustomers.length === 0 && (
                    <div className="p-6 text-center text-gray-500">
                      No eligible customers available
                    </div>
                  )}
                </div>

                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => { setShowRecipientsModal(null); setRecipientCampaign(null); }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddRecipients}
                    className="flex-1"
                    disabled={selectedCustomers.length === 0 || addRecipientsMutation.isPending}
                  >
                    {addRecipientsMutation.isPending
                      ? 'Adding...'
                      : `Add ${selectedCustomers.length} Recipients`}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <Card className="w-full max-w-sm">
              <CardContent className="p-6">
                <h2 className="mb-2 text-xl font-semibold">Delete Campaign</h2>
                <p className="mb-4 text-gray-600">
                  Are you sure you want to delete this campaign? This action cannot be undone.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(null)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => deleteMutation.mutate(showDeleteConfirm)}
                    className="flex-1"
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
