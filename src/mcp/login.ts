import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { LoginQRCallbackEventType } from "zca-js";
import { getApi, hasStoredCredentials, isAuthenticated, loginWithQR } from "../zalo-client.js";

type LoginState =
  | { status: "idle" }
  | { status: "waiting"; qrPath: string; qrBase64: string; scannedBy?: string }
  | { status: "done" }
  | { status: "failed"; error: string };

const MAX_QR_RETRIES = 3;
let state: LoginState = { status: "idle" };

/** Open a file with the OS default viewer (Preview, Photos, image viewer). */
function openWithSystemViewer(file: string): void {
  const [cmd, args] =
    process.platform === "darwin"
      ? ["open", [file]]
      : process.platform === "win32"
        ? ["cmd", ["/c", "start", "", file]]
        : ["xdg-open", [file]];
  try {
    const child = spawn(cmd, args as string[], { detached: true, stdio: "ignore" });
    child.on("error", () => {}); // e.g. ENOENT: never crash the MCP server over a missing viewer
    child.unref();
  } catch {
    // Viewer not available: the QR is still returned in the tool result.
  }
}

/**
 * Start a QR login and resolve as soon as the first QR code is ready.
 * The login itself finishes in the background once the user scans and confirms.
 */
export async function startQrLogin(opts: { openViewer: boolean }): Promise<LoginState> {
  if (state.status === "waiting") return state;

  const qrPath = path.join(os.tmpdir(), "zalo-connector-qr.png");
  let retries = 0;

  return new Promise<LoginState>((resolve) => {
    let resolved = false;
    const settle = (s: LoginState) => {
      state = s;
      if (!resolved) {
        resolved = true;
        resolve(s);
      }
    };

    loginWithQR((event) => {
      switch (event.type) {
        case LoginQRCallbackEventType.QRCodeGenerated: {
          fs.writeFileSync(qrPath, Buffer.from(event.data.image, "base64"));
          if (opts.openViewer) openWithSystemViewer(qrPath);
          settle({ status: "waiting", qrPath, qrBase64: event.data.image });
          break;
        }
        case LoginQRCallbackEventType.QRCodeExpired:
          if (retries++ < MAX_QR_RETRIES) event.actions.retry();
          else event.actions.abort();
          break;
        case LoginQRCallbackEventType.QRCodeScanned:
          if (state.status === "waiting") state.scannedBy = event.data.display_name;
          break;
        case LoginQRCallbackEventType.QRCodeDeclined:
          settle({ status: "failed", error: "Login declined on the phone." });
          break;
      }
    })
      .then(() => {
        fs.rmSync(qrPath, { force: true });
        settle({ status: "done" });
      })
      .catch((err) => {
        settle({ status: "failed", error: err instanceof Error ? err.message : String(err) });
      });
  });
}

/** Current login status, trying saved credentials first. */
export async function getLoginStatus(): Promise<LoginState> {
  if (state.status === "waiting" || state.status === "failed") return state;
  if (isAuthenticated()) return { status: "done" };
  if (hasStoredCredentials()) {
    try {
      await getApi();
      return { status: "done" };
    } catch (err) {
      return { status: "failed", error: err instanceof Error ? err.message : String(err) };
    }
  }
  return { status: "idle" };
}
