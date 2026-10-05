import { readFileSync, writeFileSync, unlinkSync, existsSync, mkdirSync, chmodSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

const CREDENTIALS_PATH = join(homedir(), ".openclaw", "zalo-personal-credentials.json");

export type ZaloPersonalCredentials = {
  imei: string;
  cookie: unknown;
  userAgent: string;
  language?: string;
};

export function saveCredentials(data: ZaloPersonalCredentials): void {
  mkdirSync(dirname(CREDENTIALS_PATH), { recursive: true, mode: 0o700 });
  // Session cookies grant full account access: keep them owner-only.
  writeFileSync(CREDENTIALS_PATH, JSON.stringify(data, null, 2), { encoding: "utf-8", mode: 0o600 });
  chmodSync(CREDENTIALS_PATH, 0o600);
}

export function loadCredentials(): ZaloPersonalCredentials | null {
  if (!existsSync(CREDENTIALS_PATH)) {
    return null;
  }
  try {
    const raw = readFileSync(CREDENTIALS_PATH, "utf-8");
    return JSON.parse(raw) as ZaloPersonalCredentials;
  } catch {
    return null;
  }
}

export function deleteCredentials(): void {
  if (existsSync(CREDENTIALS_PATH)) {
    unlinkSync(CREDENTIALS_PATH);
  }
}

export function hasCredentials(): boolean {
  return existsSync(CREDENTIALS_PATH);
}

export function refreshCredentials(freshCookies: unknown): void {
  const existing = loadCredentials();
  if (!existing) return;
  existing.cookie = freshCookies;
  saveCredentials(existing);
}
