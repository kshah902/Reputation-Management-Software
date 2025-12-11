'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { Plus, Building2, Users, Star, Send, Edit2, Trash2, X } from 'lucide-react';

export default function ClientsPage() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [newClient, setNewClient] = useState({ name: '', email: '', phone: '', industry: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.getClients(),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof newClient) => api.createClient(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setShowCreateModal(false);
      setNewClient({ name: '', email: '', phone: '', industry: '' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ clientId, data }: { clientId: string; data: any }) =>
      api.updateClient(clientId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setShowEditModal(false);
      setEditingClient(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (clientId: string) => api.deleteClient(clientId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setShowDeleteConfirm(null);
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(newClient);
  };

  const handleEdit = (client: any) => {
    setEditingClient({
      id: client.id,
      name: client.name,
      email: client.email || '',
      phone: client.phone || '',
      industry: client.industry || '',
    });
    setShowEditModal(true);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      clientId: editingClient.id,
      data: {
        name: editingClient.name,
        email: editingClient.email,
        phone: editingClient.phone,
        industry: editingClient.industry,
      },
    });
  };

  return (
    <div>
      <Header title="Clients" />

      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Manage Clients</h2>
            <p className="text-sm text-gray-600">
              Add and manage your client accounts
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Client
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data?.clients?.map((client: any) => (
              <Card key={client.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                        <Building2 className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{client.name}</h3>
                        <p className="text-sm text-gray-600">{client.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(client)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => setShowDeleteConfirm(client.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-2">
                    <Badge variant={client.isActive !== false ? 'success' : 'secondary'}>
                      {client.isActive !== false ? 'Active' : 'Inactive'}
                    </Badge>
                    {client.industry && (
                      <Badge variant="outline" className="ml-2">
                        {client.industry}
                      </Badge>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-4 border-t pt-4">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{client._count?.customers || 0}</span>
                      </div>
                      <p className="text-xs text-gray-600">Customers</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Star className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{client._count?.reviews || 0}</span>
                      </div>
                      <p className="text-xs text-gray-600">Reviews</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Send className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{client._count?.campaigns || 0}</span>
                      </div>
                      <p className="text-xs text-gray-600">Campaigns</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {data?.clients?.length === 0 && (
              <div className="col-span-full py-12 text-center">
                <Building2 className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-lg font-medium">No clients yet</h3>
                <p className="text-gray-600">
                  Add your first client to get started
                </p>
                <Button className="mt-4" onClick={() => setShowCreateModal(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Client
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Create Client Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <Card className="w-full max-w-md">
              <CardContent className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Add New Client</h2>
                  <Button variant="ghost" size="sm" onClick={() => setShowCreateModal(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Client Name</label>
                    <Input
                      value={newClient.name}
                      onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                      placeholder="Acme Corp"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <Input
                      type="email"
                      value={newClient.email}
                      onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                      placeholder="contact@acme.com"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Phone</label>
                    <Input
                      value={newClient.phone}
                      onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Industry</label>
                    <Input
                      value={newClient.industry}
                      onChange={(e) => setNewClient({ ...newClient, industry: e.target.value })}
                      placeholder="Restaurant"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowCreateModal(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="flex-1" disabled={createMutation.isPending}>
                      {createMutation.isPending ? 'Creating...' : 'Create Client'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Edit Client Modal */}
        {showEditModal && editingClient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <Card className="w-full max-w-md">
              <CardContent className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Edit Client</h2>
                  <Button variant="ghost" size="sm" onClick={() => setShowEditModal(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <form onSubmit={handleUpdate} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Client Name</label>
                    <Input
                      value={editingClient.name}
                      onChange={(e) =>
                        setEditingClient({ ...editingClient, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <Input
                      type="email"
                      value={editingClient.email}
                      onChange={(e) =>
                        setEditingClient({ ...editingClient, email: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Phone</label>
                    <Input
                      value={editingClient.phone}
                      onChange={(e) =>
                        setEditingClient({ ...editingClient, phone: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Industry</label>
                    <Input
                      value={editingClient.industry}
                      onChange={(e) =>
                        setEditingClient({ ...editingClient, industry: e.target.value })
                      }
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowEditModal(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="flex-1" disabled={updateMutation.isPending}>
                      {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <Card className="w-full max-w-sm">
              <CardContent className="p-6">
                <h2 className="mb-2 text-xl font-semibold">Delete Client</h2>
                <p className="mb-4 text-gray-600">
                  Are you sure you want to delete this client? This will also delete all
                  associated customers, campaigns, and reviews. This action cannot be undone.
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
