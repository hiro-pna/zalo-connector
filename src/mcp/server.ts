import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { McpServer, createMcpHandler, fromJsonSchema } from "@modelcontextprotocol/server";
import { toNodeHandler } from "@modelcontextprotocol/node";
import { ZaloPersonalToolSchema, executeZaloPersonalTool } from "../tool.js";

const TOOL_NAME = "zalo_personal";
const TOOL_DESCRIPTION =
  "Manage a personal Zalo account (zca-js). Pick one `action` and fill the params it needs. " +
  "Common: me, friends, search-friends, list-groups, get-group-info, send (threadId + message, isGroup for groups), " +
  "send-styled (markdown), image (url), find-user (phoneNumber), get-user-info. " +
  "Names in userId/groupId are auto-resolved to IDs.";

export type McpServerOptions = {
  host: string;
  port: number;
  /** Shared secret. Accepted as `/mcp/<token>` path or `Authorization: Bearer <token>`. */
  token: string | null;
};

function buildMcpServer(): McpServer {
  const server = new McpServer({ name: "zalo-connector", version: "2.5.0" });

  server.registerTool(
    TOOL_NAME,
    {
      title: "Zalo Personal",
      description: TOOL_DESCRIPTION,
      inputSchema: fromJsonSchema(ZaloPersonalToolSchema as any),
      annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: true },
    },
    async (args: any) => {
      const result = await executeZaloPersonalTool("mcp", args ?? {});
      const failed = Boolean((result.details as { error?: unknown } | undefined)?.error);
      return { content: result.content as any, isError: failed };
    },
  );

  return server;
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

function isAuthorized(req: IncomingMessage, pathToken: string | undefined, token: string | null): boolean {
  if (!token) return true;
  if (pathToken && safeEqual(pathToken, token)) return true;
  const header = req.headers.authorization ?? "";
  return header.startsWith("Bearer ") && safeEqual(header.slice(7), token);
}

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(payload));
}

export function startMcpServer(opts: McpServerOptions) {
  // createMcpHandler serves the current MCP protocol and, by default,
  // 2025-era clients statelessly — one fresh server instance per request.
  const mcp = toNodeHandler(createMcpHandler(() => buildMcpServer()));

  const http = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");

    if (url.pathname === "/healthz") {
      sendJson(res, 200, { ok: true });
      return;
    }

    const match = url.pathname.match(/^\/mcp(?:\/([^/]+))?\/?$/);
    if (!match) {
      sendJson(res, 404, { error: "Not found" });
      return;
    }
    if (!isAuthorized(req, match[1], opts.token)) {
      sendJson(res, 401, { error: "Unauthorized" });
      return;
    }

    await mcp(req, res);
  });

  http.listen(opts.port, opts.host);
  return http;
}
