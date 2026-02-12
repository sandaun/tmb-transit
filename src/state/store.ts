import { create } from 'zustand';

interface TransitStore {
  selectedLineCode: string | null;
  selectedStationCode: string | null;
  setSelection: (lineCode: string, stationCode: string) => void;
}

export const useTransitStore = create<TransitStore>((set) => ({
  selectedLineCode: null,
  selectedStationCode: null,
  setSelection: (lineCode, stationCode) => {
    set({ selectedLineCode: lineCode, selectedStationCode: stationCode });
  },
}));
