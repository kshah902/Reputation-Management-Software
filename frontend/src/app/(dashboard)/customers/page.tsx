'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Plus, Upload, Users, Mail, Phone, Search, Trash2, Edit2, X, MailX, MessageSquareOff, MailCheck, MessageSquare } from 'lucide-react';
import { useClientStore } from '@/store/client';

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const { selectedClient } = useClientStore();
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [newCustomer, setNewCustomer] = useState({ firstName: '', lastName: '', email: '', phone: '' });
  const [search, setSearch] = useState('');

  const clientId = selectedClient?.id;

  const { data, isLoading } = useQuery({
    queryKey: ['customers', clientId, search],
    queryFn: () => (clientId ? api.getCustomers(clientId, { search }) : null),
    enabled: !!clientId,
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof newCustomer) => api.createCustomer(clientId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setShowCreateModal(false);
      setNewCustomer({ firstName: '', lastName: '', email: '', phone: '' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ customerId, data }: { customerId: string; data: any }) =>
      api.updateCustomer(clientId!, customerId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setShowEditModal(false);
      setEditingCustomer(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (customerId: string) => api.deleteCustomer(clientId!, customerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setShowDeleteConfirm(null);
    },
  });

  const importMutation = useMutation({
    mutationFn: (file: File) => api.importCustomers(clientId!, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setShowImportModal(false);
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      importMutation.mutate(acceptedFiles[0]);
    }
  }, [importMutation]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    maxFiles: 1,
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(newCustomer);
  };

  const handleEdit = (customer: any) => {
    setEditingCustomer({
      id: customer.id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email || '',
      phone: customer.phone || '',
      optOutEmail: customer.optOutEmail || false,
      optOutSms: customer.optOutSms || false,
    });
    setShowEditModal(true);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      customerId: editingCustomer.id,
      data: {
        firstName: editingCustomer.firstName,
        lastName: editingCustomer.lastName,
        email: editingCustomer.email,
        phone: editingCustomer.phone,
        optOutEmail: editingCustomer.optOutEmail,
        optOutSms: editingCustomer.optOutSms,
      },
    });
  };

  const handleToggleOptOut = (customerId: string, type: 'email' | 'sms', currentValue: boolean) => {
    updateMutation.mutate({
      customerId,
      data: type === 'email'
        ? { optOutEmail: !currentValue }
        : { optOutSms: !currentValue },
    });
  };

  return (
    <div>
      <Header title="Customers" />

      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Customer Database</h2>
            <p className="text-sm text-gray-600">
              Manage your customer contacts for review campaigns
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowImportModal(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Import CSV
            </Button>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Customer
            </Button>
          </div>
        </div>

        <div className="mb-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search customers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">
                      Tags
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">
                      Added
                    </th>
                    <th className="px-6 py-3 text-right text-sm font-medium text-gray-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data?.customers?.map((customer: any) => (
                    <tr key={customer.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100">
                            <span className="text-sm font-medium text-purple-600">
                              {customer.firstName?.[0] || '?'}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">
                              {customer.firstName} {customer.lastName}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {customer.email && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Mail className="h-4 w-4" />
                              {customer.email}
                            </div>
                          )}
                          {customer.phone && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Phone className="h-4 w-4" />
                              {customer.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {customer.tags?.map((tag: string) => (
                            <Badge key={tag} variant="secondary">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          {/* Email Status */}
                          <button
                            onClick={() => handleToggleOptOut(customer.id, 'email', customer.optOutEmail)}
                            className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium transition-colors ${
                              customer.optOutEmail
                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                            title={customer.optOutEmail ? 'Click to opt-in for Email' : 'Click to opt-out from Email'}
                          >
                            {customer.optOutEmail ? (
                              <>
                                <MailX className="h-3 w-3" />
                                Email Opt-out
                              </>
                            ) : (
                              <>
                                <MailCheck className="h-3 w-3" />
                                Email Active
                              </>
                            )}
                          </button>

                          {/* SMS Status */}
                          <button
                            onClick={() => handleToggleOptOut(customer.id, 'sms', customer.optOutSms)}
                            className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium transition-colors ${
                              customer.optOutSms
                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                            title={customer.optOutSms ? 'Click to opt-in for SMS' : 'Click to opt-out from SMS'}
                          >
                            {customer.optOutSms ? (
                              <>
                                <MessageSquareOff className="h-3 w-3" />
                                SMS Opt-out
                              </>
                            ) : (
                              <>
                                <MessageSquare className="h-3 w-3" />
                                SMS Active
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(customer.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(customer)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => setShowDeleteConfirm(customer.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {data?.customers?.length === 0 && (
                <div className="py-12 text-center">
                  <Users className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium">No customers yet</h3>
                  <p className="text-gray-600">
                    Import a CSV file or add customers manually
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Create Customer Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <Card className="w-full max-w-md">
              <CardContent className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Add New Customer</h2>
                  <Button variant="ghost" size="sm" onClick={() => setShowCreateModal(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">First Name</label>
                      <Input
                        value={newCustomer.firstName}
                        onChange={(e) => setNewCustomer({ ...newCustomer, firstName: e.target.value })}
                        placeholder="John"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Last Name</label>
                      <Input
                        value={newCustomer.lastName}
                        onChange={(e) => setNewCustomer({ ...newCustomer, lastName: e.target.value })}
                        placeholder="Doe"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <Input
                      type="email"
                      value={newCustomer.email}
                      onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                      placeholder="john@example.com"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Phone</label>
                    <Input
                      value={newCustomer.phone}
                      onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                      placeholder="+1 (555) 123-4567"
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
                      {createMutation.isPending ? 'Creating...' : 'Create Customer'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Edit Customer Modal */}
        {showEditModal && editingCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <Card className="w-full max-w-md">
              <CardContent className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Edit Customer</h2>
                  <Button variant="ghost" size="sm" onClick={() => setShowEditModal(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <form onSubmit={handleUpdate} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">First Name</label>
                      <Input
                        value={editingCustomer.firstName}
                        onChange={(e) =>
                          setEditingCustomer({ ...editingCustomer, firstName: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Last Name</label>
                      <Input
                        value={editingCustomer.lastName}
                        onChange={(e) =>
                          setEditingCustomer({ ...editingCustomer, lastName: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <Input
                      type="email"
                      value={editingCustomer.email}
                      onChange={(e) =>
                        setEditingCustomer({ ...editingCustomer, email: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Phone</label>
                    <Input
                      value={editingCustomer.phone}
                      onChange={(e) =>
                        setEditingCustomer({ ...editingCustomer, phone: e.target.value })
                      }
                    />
                  </div>

                  {/* Opt-out Settings */}
                  <div className="rounded-lg border bg-gray-50 p-4">
                    <h4 className="mb-3 text-sm font-medium">Communication Preferences</h4>
                    <div className="space-y-3">
                      <label className="flex cursor-pointer items-center justify-between">
                        <div className="flex items-center gap-2">
                          {editingCustomer.optOutEmail ? (
                            <MailX className="h-4 w-4 text-red-500" />
                          ) : (
                            <MailCheck className="h-4 w-4 text-green-500" />
                          )}
                          <span className="text-sm">Email Communications</span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setEditingCustomer({
                              ...editingCustomer,
                              optOutEmail: !editingCustomer.optOutEmail,
                            })
                          }
                          className={`relative h-6 w-11 rounded-full transition-colors ${
                            editingCustomer.optOutEmail ? 'bg-red-500' : 'bg-green-500'
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                              editingCustomer.optOutEmail ? 'left-0.5' : 'left-5'
                            }`}
                          />
                        </button>
                      </label>
                      <p className="ml-6 text-xs text-gray-500">
                        {editingCustomer.optOutEmail
                          ? 'Customer has opted out of email campaigns'
                          : 'Customer will receive email campaigns'}
                      </p>

                      <label className="flex cursor-pointer items-center justify-between">
                        <div className="flex items-center gap-2">
                          {editingCustomer.optOutSms ? (
                            <MessageSquareOff className="h-4 w-4 text-red-500" />
                          ) : (
                            <MessageSquare className="h-4 w-4 text-green-500" />
                          )}
                          <span className="text-sm">SMS Communications</span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setEditingCustomer({
                              ...editingCustomer,
                              optOutSms: !editingCustomer.optOutSms,
                            })
                          }
                          className={`relative h-6 w-11 rounded-full transition-colors ${
                            editingCustomer.optOutSms ? 'bg-red-500' : 'bg-green-500'
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                              editingCustomer.optOutSms ? 'left-0.5' : 'left-5'
                            }`}
                          />
                        </button>
                      </label>
                      <p className="ml-6 text-xs text-gray-500">
                        {editingCustomer.optOutSms
                          ? 'Customer has opted out of SMS campaigns'
                          : 'Customer will receive SMS campaigns'}
                      </p>
                    </div>
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
                <h2 className="mb-2 text-xl font-semibold">Delete Customer</h2>
                <p className="mb-4 text-gray-600">
                  Are you sure you want to delete this customer? This action cannot be undone.
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

        {/* Import Modal */}
        {showImportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <Card className="w-full max-w-md">
              <CardContent className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Import Customers</h2>
                  <Button variant="ghost" size="sm" onClick={() => setShowImportModal(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div
                  {...getRootProps()}
                  className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                    isDragActive
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-300 hover:border-purple-500'
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-gray-600">
                    {isDragActive
                      ? 'Drop the file here'
                      : 'Drag & drop a CSV file, or click to select'}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    CSV should include: firstName, lastName, email, phone
                  </p>
                </div>

                {importMutation.isPending && (
                  <div className="mt-4 text-center">
                    <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <p className="mt-2 text-sm text-gray-600">Importing...</p>
                  </div>
                )}

                {importMutation.isError && (
                  <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-600">
                    Import failed. Please check your CSV format.
                  </div>
                )}

                {importMutation.isSuccess && (
                  <div className="mt-4 rounded-md bg-green-50 p-3 text-sm text-green-600">
                    Import successful!
                  </div>
                )}

                <div className="mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowImportModal(false)}
                    className="w-full"
                  >
                    Close
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
