'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { useClientStore } from '@/store/client';
import {
  MapPin,
  Plus,
  Edit2,
  Trash2,
  Star,
  Phone,
  Globe,
  Mail,
  Clock,
  Image,
  FileText,
  ExternalLink,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  X,
  Building2,
  Settings,
} from 'lucide-react';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function LocationsPage() {
  const queryClient = useQueryClient();
  const { selectedClient } = useClientStore();
  const clientId = selectedClient?.id;

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showHoursModal, setShowHoursModal] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);

  const [newProfile, setNewProfile] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'United States',
    phone: '',
    website: '',
    email: '',
    description: '',
    primaryCategory: '',
  });

  const [editData, setEditData] = useState<any>({});
  const [hoursData, setHoursData] = useState<Record<string, string>>({});
  const [newPost, setNewPost] = useState({
    type: 'STANDARD',
    title: '',
    summary: '',
    callToAction: '',
    callToActionUrl: '',
  });

  const { data: profilesData, isLoading } = useQuery({
    queryKey: ['business-profiles', clientId],
    queryFn: () => (clientId ? api.getBusinessProfiles(clientId) : null),
    enabled: !!clientId,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.createBusinessProfile(clientId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-profiles'] });
      setShowCreateModal(false);
      setNewProfile({
        name: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'United States',
        phone: '',
        website: '',
        email: '',
        description: '',
        primaryCategory: '',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ profileId, data }: { profileId: string; data: any }) =>
      api.updateBusinessProfile(clientId!, profileId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-profiles'] });
      setShowEditModal(false);
      setSelectedProfile(null);
    },
  });

  const updateHoursMutation = useMutation({
    mutationFn: ({ profileId, data }: { profileId: string; data: any }) =>
      api.updateBusinessProfileHours(clientId!, profileId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-profiles'] });
      setShowHoursModal(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (profileId: string) => api.deleteBusinessProfile(clientId!, profileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-profiles'] });
    },
  });

  const createPostMutation = useMutation({
    mutationFn: ({ profileId, data }: { profileId: string; data: any }) =>
      api.createBusinessProfilePost(clientId!, profileId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-profiles'] });
      setShowPostModal(false);
      setNewPost({
        type: 'STANDARD',
        title: '',
        summary: '',
        callToAction: '',
        callToActionUrl: '',
      });
    },
  });

  const handleEdit = (profile: any) => {
    setSelectedProfile(profile);
    setEditData({
      name: profile.name,
      address: profile.address || '',
      city: profile.city || '',
      state: profile.state || '',
      zipCode: profile.zipCode || '',
      country: profile.country || 'United States',
      phone: profile.phone || '',
      website: profile.website || '',
      email: profile.email || '',
      description: profile.description || '',
      primaryCategory: profile.primaryCategory || '',
    });
    setShowEditModal(true);
  };

  const handleEditHours = (profile: any) => {
    setSelectedProfile(profile);
    setHoursData({
      mondayHours: profile.mondayHours || '',
      tuesdayHours: profile.tuesdayHours || '',
      wednesdayHours: profile.wednesdayHours || '',
      thursdayHours: profile.thursdayHours || '',
      fridayHours: profile.fridayHours || '',
      saturdayHours: profile.saturdayHours || '',
      sundayHours: profile.sundayHours || '',
    });
    setShowHoursModal(true);
  };

  const handleCreatePost = (profile: any) => {
    setSelectedProfile(profile);
    setShowPostModal(true);
  };

  const formatHours = (hours: string | null) => {
    if (!hours) return 'Closed';
    return hours;
  };

  return (
    <div>
      <Header title="Locations" />

      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Business Locations</h2>
            <p className="text-sm text-gray-600">
              Manage your client's Google Business Profile locations
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Location
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {profilesData?.profiles?.map((profile: any) => (
              <Card key={profile.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
                        <Building2 className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{profile.name}</CardTitle>
                        <div className="mt-1 flex items-center gap-2">
                          {profile.isVerified ? (
                            <Badge className="bg-green-100 text-green-700">
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Verified
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <AlertTriangle className="mr-1 h-3 w-3" />
                              Not Verified
                            </Badge>
                          )}
                          {profile.averageRating && (
                            <Badge variant="outline">
                              <Star className="mr-1 h-3 w-3 fill-yellow-400 text-yellow-400" />
                              {profile.averageRating.toFixed(1)} ({profile.totalReviews})
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(profile)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(profile.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {profile.address && (
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="mt-0.5 h-4 w-4 text-gray-400" />
                        <span>
                          {profile.address}
                          {profile.city && `, ${profile.city}`}
                          {profile.state && `, ${profile.state}`}
                          {profile.zipCode && ` ${profile.zipCode}`}
                        </span>
                      </div>
                    )}
                    {profile.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span>{profile.phone}</span>
                      </div>
                    )}
                    {profile.website && (
                      <div className="flex items-center gap-2 text-sm">
                        <Globe className="h-4 w-4 text-gray-400" />
                        <a
                          href={profile.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-600 hover:underline"
                        >
                          {profile.website}
                        </a>
                      </div>
                    )}
                    {profile.primaryCategory && (
                      <div className="flex items-center gap-2 text-sm">
                        <Badge variant="outline">{profile.primaryCategory}</Badge>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEditHours(profile)}>
                      <Clock className="mr-1 h-4 w-4" />
                      Hours
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleCreatePost(profile)}>
                      <FileText className="mr-1 h-4 w-4" />
                      New Post
                    </Button>
                    <Button variant="outline" size="sm">
                      <Image className="mr-1 h-4 w-4" />
                      Photos
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <a href={`/locations/${profile.id}/directories`}>
                        <Settings className="mr-1 h-4 w-4" />
                        Directories
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {(!profilesData?.profiles || profilesData.profiles.length === 0) && (
              <Card className="col-span-2">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <MapPin className="h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium">No locations yet</h3>
                  <p className="text-gray-600">
                    Add your first business location to manage its online presence
                  </p>
                  <Button className="mt-4" onClick={() => setShowCreateModal(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Location
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <CardContent className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Add Business Location</h2>
                  <Button variant="ghost" size="sm" onClick={() => setShowCreateModal(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    createMutation.mutate(newProfile);
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="text-sm font-medium">Business Name *</label>
                    <Input
                      required
                      value={newProfile.name}
                      onChange={(e) => setNewProfile({ ...newProfile, name: e.target.value })}
                      placeholder="Enter business name"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium">Street Address</label>
                      <Input
                        value={newProfile.address}
                        onChange={(e) => setNewProfile({ ...newProfile, address: e.target.value })}
                        placeholder="123 Main Street"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">City</label>
                      <Input
                        value={newProfile.city}
                        onChange={(e) => setNewProfile({ ...newProfile, city: e.target.value })}
                        placeholder="City"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">State</label>
                      <Input
                        value={newProfile.state}
                        onChange={(e) => setNewProfile({ ...newProfile, state: e.target.value })}
                        placeholder="State"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">ZIP Code</label>
                      <Input
                        value={newProfile.zipCode}
                        onChange={(e) => setNewProfile({ ...newProfile, zipCode: e.target.value })}
                        placeholder="12345"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium">Phone</label>
                      <Input
                        value={newProfile.phone}
                        onChange={(e) => setNewProfile({ ...newProfile, phone: e.target.value })}
                        placeholder="(555) 123-4567"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Website</label>
                      <Input
                        value={newProfile.website}
                        onChange={(e) => setNewProfile({ ...newProfile, website: e.target.value })}
                        placeholder="https://example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Business Category</label>
                    <Input
                      value={newProfile.primaryCategory}
                      onChange={(e) =>
                        setNewProfile({ ...newProfile, primaryCategory: e.target.value })
                      }
                      placeholder="e.g., Restaurant, Dentist, Plumber"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <textarea
                      className="h-24 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
                      value={newProfile.description}
                      onChange={(e) =>
                        setNewProfile({ ...newProfile, description: e.target.value })
                      }
                      placeholder="Brief description of your business..."
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowCreateModal(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending} className="flex-1">
                      {createMutation.isPending ? 'Creating...' : 'Create Location'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && selectedProfile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <CardContent className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Edit Location</h2>
                  <Button variant="ghost" size="sm" onClick={() => setShowEditModal(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    updateMutation.mutate({ profileId: selectedProfile.id, data: editData });
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="text-sm font-medium">Business Name *</label>
                    <Input
                      required
                      value={editData.name}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium">Street Address</label>
                      <Input
                        value={editData.address}
                        onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">City</label>
                      <Input
                        value={editData.city}
                        onChange={(e) => setEditData({ ...editData, city: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">State</label>
                      <Input
                        value={editData.state}
                        onChange={(e) => setEditData({ ...editData, state: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">ZIP Code</label>
                      <Input
                        value={editData.zipCode}
                        onChange={(e) => setEditData({ ...editData, zipCode: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium">Phone</label>
                      <Input
                        value={editData.phone}
                        onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Website</label>
                      <Input
                        value={editData.website}
                        onChange={(e) => setEditData({ ...editData, website: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <Input
                      type="email"
                      value={editData.email}
                      onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Business Category</label>
                    <Input
                      value={editData.primaryCategory}
                      onChange={(e) => setEditData({ ...editData, primaryCategory: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <textarea
                      className="h-24 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
                      value={editData.description}
                      onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowEditModal(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={updateMutation.isPending} className="flex-1">
                      {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Hours Modal */}
        {showHoursModal && selectedProfile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
            <Card className="w-full max-w-md">
              <CardContent className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Business Hours</h2>
                  <Button variant="ghost" size="sm" onClick={() => setShowHoursModal(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    updateHoursMutation.mutate({ profileId: selectedProfile.id, data: hoursData });
                  }}
                  className="space-y-3"
                >
                  {DAYS.map((day) => (
                    <div key={day} className="flex items-center gap-3">
                      <span className="w-24 text-sm font-medium capitalize">{day}</span>
                      <Input
                        value={hoursData[`${day}Hours`] || ''}
                        onChange={(e) =>
                          setHoursData({ ...hoursData, [`${day}Hours`]: e.target.value })
                        }
                        placeholder="9:00 AM - 5:00 PM or Closed"
                        className="flex-1"
                      />
                    </div>
                  ))}

                  <div className="flex gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowHoursModal(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={updateHoursMutation.isPending} className="flex-1">
                      {updateHoursMutation.isPending ? 'Saving...' : 'Save Hours'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Post Modal */}
        {showPostModal && selectedProfile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
            <Card className="w-full max-w-lg">
              <CardContent className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Create Post</h2>
                  <Button variant="ghost" size="sm" onClick={() => setShowPostModal(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    createPostMutation.mutate({
                      profileId: selectedProfile.id,
                      data: newPost,
                    });
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="text-sm font-medium">Post Type</label>
                    <select
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      value={newPost.type}
                      onChange={(e) => setNewPost({ ...newPost, type: e.target.value })}
                    >
                      <option value="STANDARD">Update</option>
                      <option value="EVENT">Event</option>
                      <option value="OFFER">Offer</option>
                      <option value="PRODUCT">Product</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Title (optional)</label>
                    <Input
                      value={newPost.title}
                      onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                      placeholder="Post title"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Content *</label>
                    <textarea
                      required
                      className="h-32 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
                      value={newPost.summary}
                      onChange={(e) => setNewPost({ ...newPost, summary: e.target.value })}
                      placeholder="What would you like to share?"
                      maxLength={1500}
                    />
                    <span className="text-xs text-gray-500">
                      {newPost.summary.length}/1500 characters
                    </span>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Call to Action (optional)</label>
                    <div className="flex gap-2">
                      <select
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                        value={newPost.callToAction}
                        onChange={(e) => setNewPost({ ...newPost, callToAction: e.target.value })}
                      >
                        <option value="">None</option>
                        <option value="BOOK">Book</option>
                        <option value="ORDER">Order Online</option>
                        <option value="SHOP">Shop</option>
                        <option value="LEARN_MORE">Learn More</option>
                        <option value="SIGN_UP">Sign Up</option>
                        <option value="CALL">Call Now</option>
                      </select>
                      {newPost.callToAction && (
                        <Input
                          placeholder="URL"
                          value={newPost.callToActionUrl}
                          onChange={(e) =>
                            setNewPost({ ...newPost, callToActionUrl: e.target.value })
                          }
                          className="flex-1"
                        />
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowPostModal(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createPostMutation.isPending} className="flex-1">
                      {createPostMutation.isPending ? 'Creating...' : 'Create Post'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
