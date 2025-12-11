'use client';

import { useEffect } from 'react';
import { Bell, Search, Building2, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useClientStore } from '@/store/client';

interface HeaderProps {
  title: string;
  showClientSelector?: boolean;
}

export function Header({ title, showClientSelector = true }: HeaderProps) {
  const { selectedClient, setSelectedClient } = useClientStore();

  const { data: clientsData } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.getClients(),
  });

  // Auto-select first client if none selected
  useEffect(() => {
    if (!selectedClient && clientsData?.clients?.length > 0) {
      setSelectedClient(clientsData.clients[0]);
    }
  }, [clientsData, selectedClient, setSelectedClient]);

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>

        {showClientSelector && clientsData?.clients?.length > 0 && (
          <div className="relative">
            <select
              value={selectedClient?.id || ''}
              onChange={(e) => {
                const client = clientsData.clients.find((c: any) => c.id === e.target.value);
                setSelectedClient(client || null);
              }}
              className="appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-8 text-sm font-medium text-gray-700 hover:border-gray-400 focus:border-purple-500 focus:outline-none"
            >
              {clientsData.clients.map((client: any) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
            <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <ChevronDown className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Search..." className="w-64 pl-10" />
        </div>

        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
        </Button>
      </div>
    </header>
  );
}
