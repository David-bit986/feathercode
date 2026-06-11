import { isSecretPath, checkShellCommand } from "./security";

export type ToolGate = {
  validateRead: (path: string) => void;
  validateWrite: (path: string) => void;
  validateSpawn: (cwd: string, command: string) => void;
  isDeniedPath: (path: string) => boolean;
};

export const toolGate: ToolGate = {
  validateRead(path: string) {
    if (isSecretPath(path)) {
      throw new Error(`ToolGate: read denied for "${path}"`);
    }
  },

  validateWrite(path: string) {
    if (isSecretPath(path)) {
      throw new Error(`ToolGate: write denied for "${path}"`);
    }
  },

  validateSpawn(cwd: string, command: string) {
    if (!command || command.trim().length === 0) {
      throw new Error("ToolGate: spawn denied — empty command");
    }
    const safety = checkShellCommand(command);
    if (!safety.ok) {
      throw new Error(`ToolGate: spawn denied — ${safety.reason}`);
    }
    if (!cwd || cwd.trim().length === 0) {
      throw new Error("ToolGate: spawn denied — empty cwd");
    }
  },

  isDeniedPath(path: string) {
    return isSecretPath(path);
  },
};
