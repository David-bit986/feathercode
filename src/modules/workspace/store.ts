import { create } from "zustand";

type WorkspaceStore = {
  home: string | null;
  launchCwd: string | null;
  launchCwdResolved: boolean;
  setHome: (home: string | null) => void;
  setLaunchCwd: (cwd: string | null) => void;
  setLaunchCwdResolved: (resolved: boolean) => void;
};

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
  home: null,
  launchCwd: null,
  launchCwdResolved: false,
  setHome: (home) => set({ home }),
  setLaunchCwd: (launchCwd) => set({ launchCwd }),
  setLaunchCwdResolved: (launchCwdResolved) => set({ launchCwdResolved }),
}));
