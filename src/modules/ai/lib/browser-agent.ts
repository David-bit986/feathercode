/**
 * Browser agent — enables AI agents to interact with web pages.
 *
 * Uses the existing web preview surface + Tauri IPC for
 * basic browser automation (navigate, click, type, screenshot).
 */

type BrowserState = {
  url: string;
  title: string;
  ready: boolean;
};

let browserState: BrowserState = {
  url: "",
  title: "",
  ready: false,
};

export async function browserNavigate(url: string): Promise<BrowserState> {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("browser_navigate", { url });
    browserState = { url, title: "", ready: true };
    return browserState;
  } catch (err) {
    throw new Error(`Browser navigate failed: ${String(err)}`);
  }
}

export async function browserClick(
  selector: string,
): Promise<{ success: boolean }> {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const result = await invoke<boolean>("browser_click", { selector });
    return { success: result };
  } catch (err) {
    throw new Error(`Browser click failed: ${String(err)}`);
  }
}

export async function browserType(
  selector: string,
  text: string,
): Promise<{ success: boolean }> {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const result = await invoke<boolean>("browser_type", { selector, text });
    return { success: result };
  } catch (err) {
    throw new Error(`Browser type failed: ${String(err)}`);
  }
}

export async function browserScreenshot(): Promise<{
  base64: string;
  width: number;
  height: number;
}> {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke("browser_screenshot");
  } catch (err) {
    throw new Error(`Browser screenshot failed: ${String(err)}`);
  }
}

export async function browserGetContent(): Promise<string> {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<string>("browser_get_content");
  } catch (err) {
    throw new Error(`Browser get content failed: ${String(err)}`);
  }
}

export async function browserExecuteJs(script: string): Promise<string> {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<string>("browser_execute_js", { script });
  } catch (err) {
    throw new Error(`Browser execute JS failed: ${String(err)}`);
  }
}
