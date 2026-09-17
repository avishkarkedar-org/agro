import { create } from "zustand";

export const useStore = create((set) => ({
  user: null,
  setUser: (user) => set({ user }),

  // Real-time prices via WebSocket
  liveMandiPrices: [],
  setLiveMandiPrices: (prices) => set({ liveMandiPrices: prices }),

  liveFuelPrices: null,
  setLiveFuelPrices: (prices) => set({ liveFuelPrices: prices }),

  wsConnected: false,
  setWsConnected: (status) => set({ wsConnected: status }),
}));
