import { create } from 'zustand';

interface AppState {
  initialized: boolean;
  setInitialized: (initialized: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  initialized: false,
  setInitialized: (initialized) => set({ initialized }),
}));
