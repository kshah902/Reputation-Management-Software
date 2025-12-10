'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Plus, Building2, Users, Star, Send, MoreVertical } from 'lucide-react';

export default function ClientsPage() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
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

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(newClient);
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
                    <Badge variant={client.isActive ? 'success' : 'secondary'}>
                      {client.isActive ? 'Active' : 'Inactive'}
                    </Badge>
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

                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" asChild>
                      <a href={`/clients/${client.id}`}>View Details</a>
                    </Button>
                    <Button size="sm" className="flex-1" asChild>
                      <a href={`/clients/${client.id}/dashboard`}>Dashboard</a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create Client Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <Card className="w-full max-w-md">
              <CardContent className="p-6">
                <h2 className="mb-4 text-xl font-semibold">Add New Client</h2>
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
      </div>
    </div>
  );
}
