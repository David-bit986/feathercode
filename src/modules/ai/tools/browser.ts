import { tool } from "ai";
import { z } from "zod";
import {
  browserNavigate,
  browserClick,
  browserType,
  browserScreenshot,
  browserGetContent,
  browserExecuteJs,
} from "../lib/browser-agent";
import type { ToolContext } from "./context";

export function buildBrowserTools(_ctx: ToolContext) {
  return {
    browser_navigate: tool({
      description:
        "Navigate the browser to a URL. Use this to visit web pages for testing or inspection.",
      inputSchema: z.object({
        url: z.string().describe("Full URL to navigate to (e.g., https://example.com)"),
      }),
      execute: async ({ url }) => {
        const result = await browserNavigate(url);
        return { success: true, url: result.url };
      },
    }),

    browser_screenshot: tool({
      description:
        "Take a screenshot of the current browser page. Returns base64-encoded image data.",
      inputSchema: z.object({}),
      execute: async () => {
        const result = await browserScreenshot();
        return {
          success: true,
          width: result.width,
          height: result.height,
          imageBase64: result.base64.slice(0, 200) + "...",
        };
      },
    }),

    browser_click: tool({
      description:
        "Click an element on the page by CSS selector.",
      inputSchema: z.object({
        selector: z.string().describe("CSS selector for the element to click"),
      }),
      execute: async ({ selector }) => {
        const result = await browserClick(selector);
        return { success: result.success };
      },
    }),

    browser_type: tool({
      description:
        "Type text into an input element by CSS selector.",
      inputSchema: z.object({
        selector: z.string().describe("CSS selector for the input element"),
        text: z.string().describe("Text to type"),
      }),
      execute: async ({ selector, text }) => {
        const result = await browserType(selector, text);
        return { success: result.success };
      },
    }),

    browser_get_content: tool({
      description:
        "Get the text content of the current browser page. Useful for verifying page state.",
      inputSchema: z.object({}),
      execute: async () => {
        const content = await browserGetContent();
        return {
          success: true,
          content: content.slice(0, 10000),
          truncated: content.length > 10000,
        };
      },
    }),

    browser_execute_js: tool({
      description:
        "Execute JavaScript in the browser page and get the return value.",
      inputSchema: z.object({
        script: z.string().describe("JavaScript code to execute"),
      }),
      execute: async ({ script }) => {
        const result = await browserExecuteJs(script);
        return { success: true, result: result.slice(0, 5000) };
      },
    }),
  } as const;
}
