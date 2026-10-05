import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
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

function buildMcpServer(): Server {
  const server = new Server(
    { name: "zalo-connector", version: "2.5.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: TOOL_NAME,
        title: "Zalo Personal",
        description: TOOL_DESCRIPTION,
        inputSchema: ZaloPersonalToolSchema as any,
        annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: true },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    if (req.params.name !== TOOL_NAME) {
      return { isError: true, content: [{ type: "text", text: `Unknown tool: ${req.params.name}` }] };
    }
    const result = await executeZaloPersonalTool("mcp", (req.params.arguments ?? {}) as any);
    const failed = Boolean((result.details as { error?: unknown } | undefined)?.error);
    return { content: result.content as any, isError: failed };
  });

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

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  if (chunks.length === 0) return undefined;
  return JSON.parse(Buffer.concat(chunks).toString("utf-8"));
}

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(payload));
}

export function startMcpServer(opts: McpServerOptions) {
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

    // Stateless mode: one server + transport per request.
    const server = buildMcpServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on("close", () => {
      void transport.close();
      void server.close();
    });

    try {
      const body = req.method === "POST" ? await readJsonBody(req) : undefined;
      await server.connect(transport);
      await transport.handleRequest(req, res, body);
    } catch (err) {
      if (!res.headersSent) {
        sendJson(res, 400, {
          jsonrpc: "2.0",
          error: { code: -32700, message: err instanceof Error ? err.message : String(err) },
          id: null,
        });
      }
    }
  });

  http.listen(opts.port, opts.host);
  return http;
}
