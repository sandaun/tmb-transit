import { create } from 'zustand';

import type { TransportMode } from '@/src/domain/catalog/models';

interface TransitStore {
  selectedMode: TransportMode;
  selectedLineCode: string | null;
  selectedStationCode: string | null;
  setSelection: (mode: TransportMode, lineCode: string, stationCode: string) => void;
}

export const useTransitStore = create<TransitStore>((set) => ({
  selectedMode: 'metro',
  selectedLineCode: null,
  selectedStationCode: null,
  setSelection: (mode, lineCode, stationCode) => {
    set({
      selectedMode: mode,
      selectedLineCode: lineCode,
      selectedStationCode: stationCode,
    });
  },
}));
