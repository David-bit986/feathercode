import { type RefObject, useCallback, useEffect } from "react";
import { homeDir } from "@tauri-apps/api/path";
import { native } from "@/modules/ai/lib/native";
import type { Tab } from "@/modules/tabs";
import {
  getWslHome,
  LOCAL_WORKSPACE,
  type WorkspaceEnv,
  useWorkspaceStore,
} from "@/modules/workspace";

type Params = {
  tabsRef: RefObject<Tab[]>;
  workspaceEnv: WorkspaceEnv;
  setWorkspaceEnv: (env: WorkspaceEnv) => void;
  resetWorkspace: (home?: string) => void;
  clearWorkspaceState: () => void;
};

export function useWorkspaceSwitcher({
  tabsRef,
  workspaceEnv,
  setWorkspaceEnv,
  resetWorkspace,
  clearWorkspaceState,
}: Params) {
  const setHome = useWorkspaceStore((s) => s.setHome);
  const setLaunchCwd = useWorkspaceStore((s) => s.setLaunchCwd);
  const setLaunchCwdResolved = useWorkspaceStore((s) => s.setLaunchCwdResolved);

  useEffect(() => {
    homeDir()
      .then(async (p) => {
        const normalized = p.replace(/\\/g, "/");
        setHome(normalized);
        try {
          await native.workspaceAuthorize(normalized);
        } catch {
        }
      })
      .catch(() => setHome(null));
  }, [setHome]);

  useEffect(() => {
    native
      .workspaceCurrentDir()
      .then(setLaunchCwd)
      .catch(() => setLaunchCwd(null))
      .finally(() => setLaunchCwdResolved(true));
  }, [setLaunchCwd, setLaunchCwdResolved]);

  const switchWorkspace = useCallback(
    async (env: WorkspaceEnv) => {
      if (
        env.kind === workspaceEnv.kind &&
        (env.kind === "local" ||
          (workspaceEnv.kind === "wsl" && env.distro === workspaceEnv.distro))
      ) {
        return;
      }
      const dirty = tabsRef.current.some((t) => t.kind === "editor" && t.dirty);
      if (dirty) {
        window.alert(
          "Save or close unsaved editor tabs before switching workspace.",
        );
        return;
      }

      let nextHome: string | null = null;
      try {
        if (env.kind === "wsl") {
          nextHome = await getWslHome(env.distro);
        } else {
          nextHome = (await homeDir()).replace(/\\/g, "/");
        }
      } catch (e) {
        window.alert(String(e));
        return;
      }

      clearWorkspaceState();
      setWorkspaceEnv(env.kind === "local" ? LOCAL_WORKSPACE : env);
      setHome(nextHome);
      setLaunchCwd(nextHome);
      if (nextHome) {
        try {
          await native.workspaceAuthorize(nextHome);
        } catch {
        }
      }
      resetWorkspace(nextHome ?? undefined);
    },
    [
      workspaceEnv,
      setWorkspaceEnv,
      resetWorkspace,
      tabsRef,
      clearWorkspaceState,
      setHome,
      setLaunchCwd,
    ],
  );

  const openFolderWorkspace = useCallback(
    async (folder: string) => {
      const dirty = tabsRef.current.some((t) => t.kind === "editor" && t.dirty);
      if (dirty) {
        window.alert(
          "Save or close unsaved editor tabs before switching folder.",
        );
        return;
      }
      clearWorkspaceState();
      setWorkspaceEnv(LOCAL_WORKSPACE);
      const normalized = folder.replace(/\\/g, "/");
      setLaunchCwd(normalized);
      try {
        await native.workspaceAuthorize(normalized);
      } catch {
      }
      resetWorkspace(normalized);
    },
    [tabsRef, clearWorkspaceState, setWorkspaceEnv, resetWorkspace, setLaunchCwd]
  );

  return { switchWorkspace, openFolderWorkspace };
}
