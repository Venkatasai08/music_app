// Engine Switcher Store

import { create } from 'zustand';
import { EngineType } from '../types/engine';
import { storage } from '../utils/storage';

interface EngineState {
  activeEngine: EngineType;
  setEngine: (engine: EngineType) => void;
  toggleEngine: () => void;
  loadSavedEngine: () => Promise<void>;
}

const STORAGE_KEY = '@music_app_active_engine';

export const useEngineStore = create<EngineState>((set, get) => ({
  activeEngine: 'listen_free',

  setEngine: (engine: EngineType) => {
    set({ activeEngine: engine });
    storage.setItem(STORAGE_KEY, engine);
  },

  toggleEngine: () => {
    const current = get().activeEngine;
    const order: EngineType[] = ['listen_free', 'freefy', 'tune_free'];
    const nextIdx = (order.indexOf(current) + 1) % order.length;
    const next = order[nextIdx];
    set({ activeEngine: next });
    storage.setItem(STORAGE_KEY, next);
  },

  loadSavedEngine: async () => {
    const saved = await storage.getItem<EngineType>(STORAGE_KEY, 'listen_free');
    if (saved === 'listen_free' || saved === 'freefy' || saved === 'tune_free') {
      set({ activeEngine: saved });
    }
  },
}));

