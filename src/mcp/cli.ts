import { randomBytes } from "node:crypto";
import * as fs from "node:fs";
import { LoginQRCallbackEventType } from "zca-js";
import { hasStoredCredentials, loginWithCredentials, loginWithQR, logout } from "../zalo-client.js";
import { displayQRFromPNG } from "../qr-display.js";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { buildMcpServer, startMcpServer } from "./server.js";

const USAGE = `Usage: zalo-mcp <command>

Commands:
  login    Scan a QR code with the Zalo app and save credentials
  logout   Delete saved credentials
  stdio    Run as a local MCP server over stdio (Codex / ChatGPT desktop, Claude Desktop)
  serve    Start the MCP server (Streamable HTTP) for ChatGPT / other MCP clients
  token    Print a random token for ZALO_MCP_TOKEN

Environment (serve):
  PORT                     Listen port (default 8787)
  HOST                     Listen host (default 0.0.0.0)
  ZALO_MCP_TOKEN           Required secret. Endpoint: /mcp/<token> or Bearer header
  ZALO_MCP_ALLOW_NO_AUTH=1 Run without a token (anyone with the URL controls your Zalo)
`;

async function login(): Promise<void> {
  let qrFile: string | null = null;
  await loginWithQR(async (event) => {
    if (event.type === LoginQRCallbackEventType.QRCodeGenerated) {
      qrFile = await displayQRFromPNG(event.data.image);
    } else if (event.type === LoginQRCallbackEventType.QRCodeScanned) {
      console.log("QR code scanned. Confirm on your phone.");
    }
  });
  if (qrFile && fs.existsSync(qrFile)) fs.unlinkSync(qrFile);
  console.log("Login successful. Credentials saved.");
}

async function serve(): Promise<void> {
  const port = Number(process.env.PORT ?? 8787);
  const host = process.env.HOST ?? "0.0.0.0";
  const token = process.env.ZALO_MCP_TOKEN?.trim() || null;

  if (!token && process.env.ZALO_MCP_ALLOW_NO_AUTH !== "1") {
    console.error("ZALO_MCP_TOKEN is required. Generate one with: zalo-mcp token");
    process.exit(1);
  }
  if (!hasStoredCredentials()) {
    console.error("No Zalo credentials found. Run: zalo-mcp login");
    process.exit(1);
  }

  await loginWithCredentials();
  startMcpServer({ host, port, token });

  const path = token ? `/mcp/${token}` : "/mcp";
  console.log(`Zalo MCP server listening on http://${host}:${port}${path}`);
  console.log("Expose it over HTTPS (e.g. cloudflared, ngrok) and add that URL as a ChatGPT connector.");
}

async function stdio(): Promise<void> {
  // stdout carries MCP messages: route all logging to stderr.
  console.log = console.error;
  console.info = console.error;
  const server = buildMcpServer({ openQrViewer: true });
  await server.connect(new StdioServerTransport());
}

const command = process.argv[2];
switch (command) {
  case "login":
    await login();
    process.exit(0);
  case "logout":
    await logout();
    console.log("Credentials deleted.");
    break;
  case "stdio":
    await stdio();
    break;
  case "serve":
    await serve();
    break;
  case "token":
    console.log(randomBytes(24).toString("hex"));
    break;
  default:
    console.log(USAGE);
    process.exit(command ? 1 : 0);
}
