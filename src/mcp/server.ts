import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { McpServer, createMcpHandler, fromJsonSchema } from "@modelcontextprotocol/server";
import { toNodeHandler } from "@modelcontextprotocol/node";
import { ZaloPersonalToolSchema, executeZaloPersonalTool } from "../tool.js";
import { getLoginStatus, startQrLogin } from "./login.js";

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

const LOGIN_INPUT = fromJsonSchema({ type: "object", properties: {}, additionalProperties: false } as any);

function text(t: string) {
  return { type: "text" as const, text: t };
}

export function buildMcpServer(opts: { openQrViewer: boolean } = { openQrViewer: false }): McpServer {
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

  server.registerTool(
    "zalo_login",
    {
      title: "Đăng nhập Zalo",
      description:
        "Log in to Zalo with a QR code. Call this when the user asks to log in, or when another Zalo tool says " +
        "'Not authenticated'. Shows a QR code; the user scans it with the Zalo phone app and confirms. " +
        "Then call zalo_login_status to check the result.",
      inputSchema: LOGIN_INPUT,
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    },
    async () => {
      const current = await getLoginStatus();
      if (current.status === "done") return { content: [text("Đã đăng nhập Zalo. Không cần quét QR.")] };

      const s = await startQrLogin({ openViewer: opts.openQrViewer });
      if (s.status !== "waiting") {
        return { content: [text(`Không tạo được mã QR: ${s.status === "failed" ? s.error : s.status}`)], isError: true };
      }
      const where = opts.openQrViewer ? "Mã QR đã được mở trên màn hình" : "Mã QR ở ảnh bên dưới";
      return {
        content: [
          text(
            `${where} (file: ${s.qrPath}). Mở app Zalo trên điện thoại → biểu tượng quét QR → quét mã → bấm Đăng nhập. ` +
              "Sau đó gọi zalo_login_status để xác nhận.",
          ),
          { type: "image" as const, data: s.qrBase64, mimeType: "image/png" },
        ],
      };
    },
  );

  server.registerTool(
    "zalo_login_status",
    {
      title: "Trạng thái đăng nhập Zalo",
      description: "Check whether the Zalo account is logged in (after zalo_login).",
      inputSchema: LOGIN_INPUT,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async () => {
      const s = await getLoginStatus();
      const msg = {
        idle: "Chưa đăng nhập. Gọi zalo_login để lấy mã QR.",
        waiting: `Đang chờ quét QR${s.status === "waiting" && s.scannedBy ? ` (đã quét bởi ${s.scannedBy}, chờ bấm xác nhận)` : ""}.`,
        done: "Đã đăng nhập Zalo.",
        failed: `Đăng nhập thất bại: ${s.status === "failed" ? s.error : ""}. Gọi zalo_login để thử lại.`,
      }[s.status];
      return { content: [text(msg)], isError: s.status === "failed" };
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
