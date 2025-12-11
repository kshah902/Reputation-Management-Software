'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { useClientStore } from '@/store/client';
import {
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Plus,
  Trash2,
  Edit2,
  X,
  Globe,
  Check,
  AlertCircle,
  Zap,
  Settings,
} from 'lucide-react';

const DIRECTORY_ICONS: Record<string, string> = {
  GOOGLE: '/icons/google.svg',
  YELP: '/icons/yelp.svg',
  FACEBOOK: '/icons/facebook.svg',
  BING: '/icons/bing.svg',
};

const getSyncStatusColor = (status: string) => {
  switch (status) {
    case 'SYNCED':
      return 'bg-green-100 text-green-700';
    case 'SYNCING':
      return 'bg-blue-100 text-blue-700';
    case 'ERROR':
      return 'bg-red-100 text-red-700';
    case 'PENDING':
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

export default function DirectoriesPage() {
  const params = useParams();
  const router = useRouter();
  const profileId = params.profileId as string;
  const queryClient = useQueryClient();
  const { selectedClient } = useClientStore();
  const clientId = selectedClient?.id;

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [editData, setEditData] = useState<any>({});

  const { data: profile } = useQuery({
    queryKey: ['business-profile', clientId, profileId],
    queryFn: () => (clientId ? api.getBusinessProfile(clientId, profileId) : null),
    enabled: !!clientId,
  });

  const { data: listingsData, isLoading } = useQuery({
    queryKey: ['directory-listings', clientId, profileId],
    queryFn: () => (clientId ? api.getDirectoryListings(clientId, profileId) : null),
    enabled: !!clientId,
  });

  const { data: availableDirectories } = useQuery({
    queryKey: ['available-directories', clientId],
    queryFn: () => (clientId ? api.getAvailableDirectories(clientId) : null),
    enabled: !!clientId,
  });

  const createListingMutation = useMutation({
    mutationFn: (data: any) => api.createDirectoryListing(clientId!, profileId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['directory-listings'] });
      setShowAddModal(false);
    },
  });

  const autoCreateMutation = useMutation({
    mutationFn: (directoryTypes?: string[]) =>
      api.autoCreateDirectoryListings(clientId!, profileId, directoryTypes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['directory-listings'] });
    },
  });

  const syncAllMutation = useMutation({
    mutationFn: () => api.syncAllDirectoryListings(clientId!, profileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['directory-listings'] });
    },
  });

  const updateListingMutation = useMutation({
    mutationFn: ({ listingId, data }: { listingId: string; data: any }) =>
      api.updateDirectoryListing(clientId!, listingId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['directory-listings'] });
      setShowEditModal(false);
    },
  });

  const deleteListingMutation = useMutation({
    mutationFn: (listingId: string) => api.deleteDirectoryListing(clientId!, listingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['directory-listings'] });
    },
  });

  const handleEdit = (listing: any) => {
    setSelectedListing(listing);
    setEditData({
      name: listing.name || '',
      address: listing.address || '',
      phone: listing.phone || '',
      website: listing.website || '',
      listingUrl: listing.listingUrl || '',
      isClaimed: listing.isClaimed || false,
      isVerified: listing.isVerified || false,
    });
    setShowEditModal(true);
  };

  return (
    <div>
      <Header title="Directory Listings" />

      <div className="p-6">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => router.push('/locations')} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Locations
          </Button>

          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">{profile?.name || 'Business'} - Directory Listings</h2>
              <p className="text-sm text-gray-600">
                Manage your business listings across online directories for consistent NAP (Name, Address, Phone)
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => syncAllMutation.mutate()} disabled={syncAllMutation.isPending}>
                <RefreshCw className={`mr-2 h-4 w-4 ${syncAllMutation.isPending ? 'animate-spin' : ''}`} />
                Sync All
              </Button>
              <Button variant="outline" onClick={() => autoCreateMutation.mutate()} disabled={autoCreateMutation.isPending}>
                <Zap className="mr-2 h-4 w-4" />
                Auto-Add Popular
              </Button>
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Listing
              </Button>
            </div>
          </div>
        </div>

        {/* Consistency Score Card */}
        {listingsData && (
          <div className="mb-6 grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-purple-600">
                  {listingsData.consistencyScore}%
                </div>
                <div className="text-sm text-gray-600">Consistency Score</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{listingsData.totalListings}</div>
                <div className="text-sm text-gray-600">Total Listings</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">
                  {listingsData.consistentListings}
                </div>
                <div className="text-sm text-gray-600">Consistent</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-orange-600">
                  {listingsData.totalListings - listingsData.consistentListings}
                </div>
                <div className="text-sm text-gray-600">Need Attention</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Master Profile Card */}
        {profile && (
          <Card className="mb-6 border-2 border-purple-200 bg-purple-50/50">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">Master Profile (Source of Truth)</CardTitle>
                <Badge className="bg-purple-600">Primary</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4 text-sm">
                <div>
                  <span className="text-gray-500">Name:</span>
                  <div className="font-medium">{profile.name}</div>
                </div>
                <div>
                  <span className="text-gray-500">Address:</span>
                  <div className="font-medium">
                    {profile.address}{profile.city && `, ${profile.city}`}{profile.state && `, ${profile.state}`}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Phone:</span>
                  <div className="font-medium">{profile.phone || 'Not set'}</div>
                </div>
                <div>
                  <span className="text-gray-500">Website:</span>
                  <div className="font-medium truncate">{profile.website || 'Not set'}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-4">
            {listingsData?.listings?.map((listing: any) => (
              <Card key={listing.id} className={!listing.isConsistent ? 'border-orange-300' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100">
                        <Globe className="h-6 w-6 text-gray-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{listing.directoryInfo?.name || listing.directory}</h3>
                          {listing.isConsistent ? (
                            <Badge className="bg-green-100 text-green-700">
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Consistent
                            </Badge>
                          ) : (
                            <Badge className="bg-orange-100 text-orange-700">
                              <AlertTriangle className="mr-1 h-3 w-3" />
                              Inconsistent
                            </Badge>
                          )}
                          <Badge className={getSyncStatusColor(listing.syncStatus)}>
                            {listing.syncStatus}
                          </Badge>
                          {listing.isClaimed && (
                            <Badge variant="outline">
                              <Check className="mr-1 h-3 w-3" />
                              Claimed
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-gray-600">
                          {listing.directoryInfo?.description}
                        </p>

                        {/* Show inconsistencies */}
                        {!listing.isConsistent && listing.inconsistencies && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {listing.inconsistencies.map((field: string) => (
                              <Badge key={field} variant="destructive" className="text-xs">
                                {field} differs
                              </Badge>
                            ))}
                          </div>
                        )}

                        {/* Listing data preview */}
                        <div className="mt-2 grid gap-2 text-xs text-gray-500 md:grid-cols-3">
                          {listing.name && (
                            <span className={listing.name !== profile?.name ? 'text-orange-600' : ''}>
                              Name: {listing.name}
                            </span>
                          )}
                          {listing.phone && (
                            <span className={listing.phone !== profile?.phone ? 'text-orange-600' : ''}>
                              Phone: {listing.phone}
                            </span>
                          )}
                          {listing.website && (
                            <span className={listing.website !== profile?.website ? 'text-orange-600' : ''}>
                              Web: {listing.website}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {listing.listingUrl && (
                        <Button variant="ghost" size="sm" asChild>
                          <a href={listing.listingUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      {listing.claimUrl && !listing.isClaimed && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={listing.claimUrl} target="_blank" rel="noopener noreferrer">
                            Claim
                          </a>
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(listing)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteListingMutation.mutate(listing.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Available directories to add */}
            {listingsData?.availableDirectories?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Available Directories</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2 md:grid-cols-3">
                    {listingsData.availableDirectories.slice(0, 9).map((dir: any) => (
                      <Button
                        key={dir.type}
                        variant="outline"
                        className="justify-start"
                        onClick={() => createListingMutation.mutate({ directory: dir.type })}
                        disabled={createListingMutation.isPending}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        {dir.name}
                      </Button>
                    ))}
                  </div>
                  {listingsData.availableDirectories.length > 9 && (
                    <p className="mt-2 text-sm text-gray-500">
                      +{listingsData.availableDirectories.length - 9} more directories available
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {(!listingsData?.listings || listingsData.listings.length === 0) && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Globe className="h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium">No directory listings yet</h3>
                  <p className="text-gray-600">
                    Add your business to popular directories to improve local SEO
                  </p>
                  <div className="mt-4 flex gap-2">
                    <Button onClick={() => autoCreateMutation.mutate()} disabled={autoCreateMutation.isPending}>
                      <Zap className="mr-2 h-4 w-4" />
                      Add Popular Directories
                    </Button>
                    <Button variant="outline" onClick={() => setShowAddModal(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Manually
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Add Listing Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
            <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <CardContent className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Add Directory Listing</h2>
                  <Button variant="ghost" size="sm" onClick={() => setShowAddModal(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  {availableDirectories?.map((dir: any) => (
                    <Button
                      key={dir.type}
                      variant="outline"
                      className="w-full justify-between"
                      onClick={() => createListingMutation.mutate({ directory: dir.type })}
                      disabled={createListingMutation.isPending}
                    >
                      <div className="text-left">
                        <div className="font-medium">{dir.name}</div>
                        <div className="text-xs text-gray-500">{dir.description}</div>
                      </div>
                      <Plus className="h-4 w-4" />
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Edit Listing Modal */}
        {showEditModal && selectedListing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
            <Card className="w-full max-w-lg">
              <CardContent className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-semibold">
                    Edit {selectedListing.directoryInfo?.name} Listing
                  </h2>
                  <Button variant="ghost" size="sm" onClick={() => setShowEditModal(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="mb-4 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">
                  <AlertCircle className="mb-1 inline h-4 w-4" />
                  <span className="ml-1">
                    Changes here track what's currently on the directory. Use "Sync All" to update
                    listings to match your master profile.
                  </span>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    updateListingMutation.mutate({
                      listingId: selectedListing.id,
                      data: editData,
                    });
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="text-sm font-medium">Business Name</label>
                    <Input
                      value={editData.name}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    />
                    {editData.name !== profile?.name && (
                      <p className="mt-1 text-xs text-orange-600">
                        Differs from master: {profile?.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium">Address</label>
                    <Input
                      value={editData.address}
                      onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Phone</label>
                    <Input
                      value={editData.phone}
                      onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                    />
                    {editData.phone !== profile?.phone && (
                      <p className="mt-1 text-xs text-orange-600">
                        Differs from master: {profile?.phone || 'Not set'}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium">Website</label>
                    <Input
                      value={editData.website}
                      onChange={(e) => setEditData({ ...editData, website: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Listing URL</label>
                    <Input
                      value={editData.listingUrl}
                      onChange={(e) => setEditData({ ...editData, listingUrl: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>

                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editData.isClaimed}
                        onChange={(e) => setEditData({ ...editData, isClaimed: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-sm">Claimed</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editData.isVerified}
                        onChange={(e) => setEditData({ ...editData, isVerified: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-sm">Verified</span>
                    </label>
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
                    <Button type="submit" disabled={updateListingMutation.isPending} className="flex-1">
                      {updateListingMutation.isPending ? 'Saving...' : 'Save Changes'}
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
