import { create } from "zustand";

export interface ChildProfile {
  id: string;
  displayName: string;
  createdAt: number;
}

export interface SessionMeta {
  id: string;
  routineId: string;
  startedAt: number;
  endedAt?: number;
  engagement?: number;
}

export interface AppState {
  currentChild?: ChildProfile;
  currentSession?: SessionMeta;
  setCurrentChild(child: ChildProfile): void;
  setCurrentSession(session: SessionMeta): void;
  endSession(endedAt: number, engagement: number): void;
  clearAll(): void;
}

export const useAppStore = create<AppState>((set) => ({
  currentChild: undefined,
  currentSession: undefined,
  setCurrentChild: (child) => set({ currentChild: child }),
  setCurrentSession: (session) => set({ currentSession: session }),
  endSession: (endedAt, engagement) =>
    set((state) => {
      if (!state.currentSession) return state;
      return {
        currentSession: { ...state.currentSession, endedAt, engagement },
      };
    }),
  clearAll: () => set({ currentChild: undefined, currentSession: undefined }),
}));

export default useAppStore;
