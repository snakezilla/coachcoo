import { create } from "zustand";

export type ChildProfile = { id: string; displayName: string };

type Store = {
  currentChild?: ChildProfile;
  setChild: (c: ChildProfile) => void;
};

export const useStore = create<Store>((set) => ({
  currentChild: undefined,
  setChild: (c) => set({ currentChild: c }),
}));
