import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { LoginQRCallbackEventType } from "zca-js";
import { hasStoredCredentials, loginWithCredentials, loginWithQR, logout } from "../zalo-client.js";
import { displayQRFromPNG } from "../qr-display.js";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { buildMcpServer, startMcpServer } from "./server.js";

const USAGE = `Usage: zalo-mcp <command>

Commands:
  setup    Install the zalo plugin (MCP server + skill) into Codex / ChatGPT desktop
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

Environment (stdio, serve):
  ZALO_MCP_READONLY=1      Expose only zalo_read (no sending or changes)
`;

const MARKETPLACE_REPO = "hiro-pna/zalo-connector";
// Pinned: setup must not pull whatever @openai/codex happens to be latest.
const CODEX_CLI = "@openai/codex@0.160.0";

/** Run the Codex CLI via npx, so no global `codex` install is needed. */
function codex(args: string[], quiet = false): boolean {
  if (!quiet) console.log(`> codex ${args.join(" ")}`);
  const r = spawnSync("npx", ["-y", CODEX_CLI, ...args], {
    stdio: quiet ? "ignore" : "inherit",
    shell: process.platform === "win32",
  });
  return r.status === 0;
}

/** Commit SHA of the repo's default branch, so the install is pinned to what exists right now. */
async function currentMainSha(): Promise<string | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${MARKETPLACE_REPO}/commits/HEAD`, {
      headers: { accept: "application/vnd.github.sha" },
    });
    const sha = res.ok ? (await res.text()).trim() : "";
    return /^[0-9a-f]{40}$/.test(sha) ? sha : null;
  } catch {
    return null;
  }
}

/**
 * Download the exact pinned package the plugin's mcp.json runs, so Codex's first
 * start of the MCP server is served from the npx cache (Codex waits 10 s by default).
 */
function warmPluginServer(): void {
  const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
  const pluginDir = path.join(codexHome, "plugins", "cache", "zalo-connector", "zalo");
  try {
    const versions = fs
      .readdirSync(pluginDir)
      .map((v) => path.join(pluginDir, v, "mcp.json"))
      .filter((f) => fs.existsSync(f))
      .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
    const server = JSON.parse(fs.readFileSync(versions[0], "utf-8")).mcpServers.zalo;
    const args: string[] = server.args.filter((a: string) => a !== "stdio");
    console.log("> Tải sẵn Zalo connector…");
    spawnSync(server.command, args, { stdio: "ignore", shell: process.platform === "win32" });
  } catch {
    // Not fatal: Codex will download it on first start.
  }
}

async function setup(): Promise<void> {
  const refIdx = process.argv.indexOf("--ref");
  // Pin the marketplace to an exact commit: later pushes to the repo do not reach this
  // machine until setup is run again.
  const ref = refIdx > 0 ? process.argv[refIdx + 1] : await currentMainSha();
  if (!ref) {
    console.error("Không lấy được phiên bản từ GitHub. Kiểm tra mạng rồi chạy lại.");
    process.exit(1);
  }
  // Re-add so a re-run moves the pin to the new commit (add alone keeps the old ref).
  codex(["plugin", "marketplace", "remove", "zalo-connector"], true); // fails harmlessly on first install
  const ok =
    codex(["plugin", "marketplace", "add", MARKETPLACE_REPO, "--ref", ref]) &&
    codex(["plugin", "add", "zalo@zalo-connector"]);

  if (ok) warmPluginServer();

  if (!ok) {
    console.error("\nCài plugin thất bại. Xem lỗi ở trên.");
    process.exit(1);
  }
  console.log("\nĐã cài plugin Zalo. Khởi động lại app Codex, rồi gõ: Đăng nhập Zalo");
}

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
  const readOnly = process.env.ZALO_MCP_READONLY === "1";

  if (!token && process.env.ZALO_MCP_ALLOW_NO_AUTH !== "1") {
    console.error("ZALO_MCP_TOKEN is required. Generate one with: zalo-mcp token");
    process.exit(1);
  }
  if (token && token.length < 32) {
    console.error("Warning: ZALO_MCP_TOKEN is shorter than 32 characters. Use: zalo-mcp token");
  }
  if (!hasStoredCredentials()) {
    console.error("No Zalo credentials found. Run: zalo-mcp login");
    process.exit(1);
  }

  await loginWithCredentials();
  startMcpServer({ host, port, token, readOnly });

  // Never print the token: server logs (Docker, Railway, tunnels) are often shared.
  const path = token ? "/mcp/<ZALO_MCP_TOKEN>" : "/mcp";
  console.log(`Zalo MCP server listening on http://${host}:${port}${path}`);
  console.log("Expose it over HTTPS (e.g. cloudflared, ngrok) and add that URL as a ChatGPT connector.");
}

async function stdio(): Promise<void> {
  // stdout carries MCP messages: route all logging to stderr.
  console.log = console.error;
  console.info = console.error;
  const server = buildMcpServer({
    openQrViewer: true,
    allowLogin: true,
    readOnly: process.env.ZALO_MCP_READONLY === "1",
  });
  await server.connect(new StdioServerTransport());
}

const command = process.argv[2];
switch (command) {
  case "setup":
    await setup();
    break;
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
