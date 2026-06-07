import { tool } from "ai";
import { z } from "zod";
import { useMcpStore } from "../store/mcpStore";
import { callMcpTool } from "../lib/mcp-client";
import type { ToolContext } from "./context";

export function buildMcpTools(_ctx: ToolContext) {
  const allTools = useMcpStore.getState().getAllTools();
  const tools: Record<string, unknown> = {};

  for (const [fullName, mcpTool] of Object.entries(allTools)) {
    let inputSchema: z.ZodObject<Record<string, z.ZodTypeAny>>;
    try {
      inputSchema = jsonSchemaToZod(mcpTool.inputSchema);
    } catch {
      inputSchema = z.object({});
    }

    const serverId = extractServerId(fullName);
    const toolName = mcpTool.name;

    tools[fullName] = tool({
      description: `[MCP] ${mcpTool.description || `External tool: ${toolName}`}`,
      inputSchema,
      execute: async (args: Record<string, unknown>) => {
        try {
          const result = await callMcpTool(serverId, toolName, args);
          return { success: true, result };
        } catch (err) {
          return { success: false, error: String(err) };
        }
      },
    });
  }

  return tools;
}

function extractServerId(fullName: string): string {
  const parts = fullName.split("_");
  // fullName format: mcp_SERVERID_TOOLNAME
  // So parts[1] is the server ID
  if (parts.length >= 2 && parts[0] === "mcp") {
    return parts.slice(1, -1).join("_") || parts[1];
  }
  return fullName;
}

function jsonSchemaToZod(
  schema: Record<string, unknown>,
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};

  if (schema.type === "object" && schema.properties) {
    const props = schema.properties as Record<string, Record<string, unknown>>;
    const required = (schema.required as string[]) ?? [];

    for (const [key, prop] of Object.entries(props)) {
      let zodType: z.ZodTypeAny;

      switch (prop.type) {
        case "string":
          zodType = z.string();
          break;
        case "number":
        case "integer":
          zodType = z.number();
          break;
        case "boolean":
          zodType = z.boolean();
          break;
        case "array":
          zodType = z.array(z.unknown());
          break;
        default:
          zodType = z.unknown();
      }

      if (prop.description) {
        zodType = zodType.describe(prop.description as string);
      }

      if (!required.includes(key)) {
        zodType = zodType.optional();
      }

      shape[key] = zodType;
    }
  }

  return z.object(shape);
}
