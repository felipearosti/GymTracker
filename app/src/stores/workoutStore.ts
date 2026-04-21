import { create } from 'zustand';
import { Session, SessionSet } from '../types';

interface ActiveSet {
  exerciseId: string;
  setNumber: number;
  weight: number;
  reps: number;
  rir?: number;
  completed: boolean;
}

interface WorkoutStore {
  activeSession: Session | null;
  activeSets: ActiveSet[];
  setActiveSession: (session: Session | null) => void;
  addCompletedSet: (set: SessionSet) => void;
  updateDraftSet: (exerciseId: string, setNumber: number, weight: number, reps: number, rir?: number) => void;
  clearActive: () => void;
}

export const useWorkoutStore = create<WorkoutStore>((set) => ({
  activeSession: null,
  activeSets: [],
  setActiveSession: (session) => set({ activeSession: session, activeSets: [] }),
  addCompletedSet: (serverSet) =>
    set((state) => {
      const exists = state.activeSets.findIndex(
        (s) => s.exerciseId === serverSet.exerciseId && s.setNumber === serverSet.setNumber,
      );
      const entry: ActiveSet = {
        exerciseId: serverSet.exerciseId,
        setNumber: serverSet.setNumber,
        weight: serverSet.weight,
        reps: serverSet.reps,
        rir: serverSet.rir,
        completed: true,
      };
      if (exists >= 0) {
        const updated = [...state.activeSets];
        updated[exists] = entry;
        return { activeSets: updated };
      }
      return { activeSets: [...state.activeSets, entry] };
    }),
  updateDraftSet: (exerciseId, setNumber, weight, reps, rir) =>
    set((state) => {
      const exists = state.activeSets.findIndex(
        (s) => s.exerciseId === exerciseId && s.setNumber === setNumber,
      );
      const entry: ActiveSet = { exerciseId, setNumber, weight, reps, rir, completed: false };
      if (exists >= 0) {
        const updated = [...state.activeSets];
        updated[exists] = { ...updated[exists], weight, reps, rir };
        return { activeSets: updated };
      }
      return { activeSets: [...state.activeSets, entry] };
    }),
  clearActive: () => set({ activeSession: null, activeSets: [] }),
}));
