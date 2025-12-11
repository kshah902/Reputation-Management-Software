import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Client {
  id: string;
  name: string;
  email?: string;
  industry?: string;
}

interface ClientState {
  selectedClient: Client | null;
  setSelectedClient: (client: Client | null) => void;
}

export const useClientStore = create<ClientState>()(
  persist(
    (set) => ({
      selectedClient: null,
      setSelectedClient: (client) => set({ selectedClient: client }),
    }),
    {
      name: 'selected-client',
    }
  )
);
