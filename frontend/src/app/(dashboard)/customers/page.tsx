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
import { Plus, Upload, Users, Mail, Phone, Tag, Search } from 'lucide-react';

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const [showImportModal, setShowImportModal] = useState(false);
  const [search, setSearch] = useState('');

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.getClients(),
  });

  const clientId = clients?.clients?.[0]?.id;

  const { data, isLoading } = useQuery({
    queryKey: ['customers', clientId, search],
    queryFn: () => (clientId ? api.getCustomers(clientId, { search }) : null),
    enabled: !!clientId,
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
            <Button>
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
                              {customer.firstName[0]}
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
                        <div className="space-y-1">
                          {customer.optOutEmail && (
                            <Badge variant="destructive">Email Opt-out</Badge>
                          )}
                          {customer.optOutSms && (
                            <Badge variant="destructive">SMS Opt-out</Badge>
                          )}
                          {!customer.optOutEmail && !customer.optOutSms && (
                            <Badge variant="success">Active</Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(customer.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="sm">
                          Edit
                        </Button>
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

        {/* Import Modal */}
        {showImportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <Card className="w-full max-w-md">
              <CardContent className="p-6">
                <h2 className="mb-4 text-xl font-semibold">Import Customers</h2>

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
                    CSV should include: Name, Email, Phone
                  </p>
                </div>

                {importMutation.isPending && (
                  <div className="mt-4 text-center">
                    <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <p className="mt-2 text-sm text-gray-600">Importing...</p>
                  </div>
                )}

                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowImportModal(false)}
                    className="flex-1"
                  >
                    Cancel
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
