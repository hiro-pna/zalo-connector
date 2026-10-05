# Changelog

All notable changes to the zalo-personal OpenClaw extension will be documented in this file.

## [2.5.0] - 2026-10-05

### Added
- **MCP server for ChatGPT** (`bin/zalo-mcp.mjs`, `src/mcp/`), built on MCP TypeScript SDK v2 (`@modelcontextprotocol/server` + `@modelcontextprotocol/node`, `createMcpHandler`): exposes every `zalo-personal` action as one MCP tool `zalo_personal` over Streamable HTTP, so ChatGPT custom connectors (Developer mode) and other MCP clients can use the Zalo account without OpenClaw.
  - CLI commands: `login` (QR), `logout`, `serve`, `token`.
  - Auth: shared secret `ZALO_MCP_TOKEN` via `/mcp/<token>` path or `Authorization: Bearer` header.
  - `GET /healthz` endpoint.
- **STDIO mode** (`zalo-mcp stdio`) for Codex / ChatGPT desktop: Codex launches it via `npx -y github:hiro-pna/zalo-connector stdio`; no server, tunnel or token.
- **`zalo_login` / `zalo_login_status` tools**: QR login from inside the chat; the QR opens in the OS image viewer and is also returned as an image.
- **Codex / ChatGPT plugin `zalo`** (`plugins/zalo/`, Agent Plugins 1.0.0): bundles the stdio MCP server and the `zalo` skill (login flow, recipient lookup, confirm-before-send rules, action reference). Repo marketplace at `.agents/plugins/marketplace.json`; install with `codex plugin marketplace add hiro-pna/zalo-connector` then `codex plugin add zalo@zalo-connector`.
- **`zalo-mcp setup`**: one command (`npx -y github:hiro-pna/zalo-connector setup`) adds the marketplace, upgrades it and installs the plugin via `npx @openai/codex`; can be run by Codex desktop itself from a single chat message. Idempotent; re-run to update.
- `Dockerfile`, `CHATGPT.md` and `CODEX.md` setup guides.
- GitHub Actions workflow that creates a GitHub Release with the `npm pack` tarball on `v*` tags.

### Changed
- Package renamed to `zalo-connector` for the `hiro-pna/zalo-connector` fork; repository URLs updated. Plugin id stays `zalo-personal`.
- `openclaw` peer dependency is now optional.
- Dependencies bumped: `zca-js` ^2.2.0, `sharp` ^0.35.5, `zod` ^4.6.5; Docker + CI on Node 24 LTS; `engines.node` >=22; Actions `checkout@v7`, `setup-node@v7`, `action-gh-release@v3`.

### Fixed
- `saveCredentials` creates `~/.openclaw/` when missing (standalone installs).

### Security
- Credentials file written with mode `0600` (directory `0700`); it holds session cookies with full account access.
- QR image written to a private per-login temp dir (`0700`, file `0600`) instead of a fixed path in shared `/tmp`, preventing symlink overwrite and QR snooping by other local users.
- Windows QR viewer opened via `explorer.exe` instead of `cmd /c start`, avoiding shell parsing of the path.
- `serve` no longer prints the token in its startup log; warns when `ZALO_MCP_TOKEN` is shorter than 32 characters.
- `zalo` skill: treat Zalo message content as untrusted data (prompt-injection guard).

## [2.4.2] - 2026-07-15

### Added
- **Tool contract declaration**: the plugin now advertises `contracts: { tools: ["zalo-personal"] }` in both `index.ts` and `openclaw.plugin.json`, so newer OpenClaw builds can discover the `zalo-personal` tool from the manifest during contract resolution.

### Fixed
- **`openclaw.plugin.json` formatting**: restored clean 2-space JSON (removed a UTF-8 BOM and `'`-escaped apostrophes introduced by a Windows/PowerShell round-trip) so the manifest stays diff-friendly and BOM-free.

## [2.4.1] - 2026-05-31

### Fixed
- **OpenClaw 2026.4.29+ channel discovery**: added `channelConfigs` metadata to `openclaw.plugin.json`. Newer OpenClaw builds the channel registry for CLI surfaces (`channels list`, `channels login`) from the manifest *before* the runtime loads; without `channelConfigs` the channel was invisible to the CLI and `openclaw channels login --channel zalo-personal` failed with `Unsupported channel: zalo-personal`. Runtime/gateway registration was unaffected.

## [2.4.0] - 2026-05-13

### Added
- **Self-reply support**: Bot can react to its own messages in opt-in groups, enabling a 1-person "command group" used as a terminal.
  - `zalo-client.ts`: pass `selfListen: true` when constructing `Zalo` so zca-js delivers own-message events.
  - `config-schema.ts`: new optional `allowSelf` field on per-group config.
  - `monitor.ts`: `resolveGroupAllowSelf()` + listener gate that drops self messages unless the originating group sets `allowSelf: true`.
- **Outbound loop guard**: prevent echo loops when self-reply is enabled.
  - New `outbound-tracker.ts` module: tracks bot-sent msgIds with a 5-minute TTL and 1000-entry cap.
  - `send.ts`: every send path calls `markOutboundMsgId(msgId)` after a successful send.
  - `monitor.ts`: inbound listener short-circuits when the incoming msgId was recently outbound.
- **Per-thread history store**: append-only log of every inbound message so the agent can recall older context with its Read tool, regardless of `dmPolicy` or mention requirements.
  - New `history-store.ts` module: JSONL log at `~/.openclaw/workspace/threads/<threadId>/messages.jsonl`, 5MB rolling cap (archives to `messages.prev.jsonl`).
  - Maintains `~/.openclaw/workspace/peers/zalo-personal.json` index of seen users and groups.
  - `monitor.ts`: `appendThreadHistory()` + `rememberPeer()` called on every inbound event, in a try/catch so logging failure never blocks the reply pipeline.

## [1.5.0] - 2026-03-10

### Added
- **Group Mention Gating**: Bot only replies when @mentioned in groups (default)
  - Per-group `requireMention` config: `true` (default) or `false`
  - Wildcard `"*"` support for global default
  - Non-mentioned messages buffered for context (max 50 msgs, 4h TTL)
  - When @mentioned, buffered context injected so AI understands conversation
  - Control commands bypass mention requirement for authorized admins
  - New `group-mention` tool action for admin to configure via chat
- **Thinking/Reasoning Filter**: Strip AI thinking blocks from Zalo replies
  - Check `isReasoning` flag, detect `<think>` tags, strip embedded thinking
- **Rich Text Auto-Convert**: Markdown → Zalo styles in replies
  - New `send-styled` tool action for explicit rich text formatting

### Changed
- `resolveRequireMention` reads from per-group config instead of hardcoding `true`
- Default `dmPolicy` changed to `"open"` with `allowFrom: ["*"]`

## [1.3.1] - 2026-02-14

### Fixed
- **Native Image Detection**: Fixed image detection in current prompt vs history
  - Images now properly recognized as "in prompt" instead of "in history"
  - LLM vision/analysis now uses the correct uploaded image
  - Resolved issue where bot analyzed old images instead of new ones

## [1.3.0] - 2026-02-14

### Added
- **Native Image Input Support**: Download images from Zalo messages for use as input to AI skills
  - New `image-downloader.ts` module for downloading images from URLs
  - Automatic download of images sent by users to local files
  - Images saved to `~/.openclaw/workspace/media/` with timestamped filenames
  - Full integration with nano-banana and other image-processing skills
  - Support for multiple images (multi-image composition up to 14 images)
  - Proper error handling and fallback to URLs if download fails

### Technical Details
- Downloaded images replace URL references in message context
- Local file paths passed to OpenClaw's native image system
- Works seamlessly with image editing, analysis, and composition tasks

## [1.2.4] - 2026-02-14

### Fixed
- **Race Condition**: Fixed auto-cleanup deleting files before OpenClaw processing
  - Changed `cleanupAfterUpload` default from `true` to `false`
  - Prevents file deletion before MEDIA: token processing completes
  - OpenClaw now manages file lifecycle correctly
  - Fixes issue where nano-banana couldn't find generated images

## [1.2.3] - 2026-02-14

### Added
- **Image Metadata Support**: Added `imageMetadataGetter` for zca-js v2.0+ compatibility
  - Uses `sharp` library to read image dimensions (width, height, size)
  - Required for zca-js uploadAttachment to work correctly
  - Fixes "Missing imageMetadataGetter" error when uploading images

## [1.2.2] - 2026-02-14

### Fixed
- **Session Routing**: Fixed DM messages incorrectly routed to per-channel sessions
  - Bug: Both DM and group messages were set as `kind: "group"`
  - Fix: DM messages now correctly use `kind: "direct"`
  - DM messages now appear in main:main session like Telegram
  - Messages now visible in OpenClaw webui
  - Proper integration with `session.dmScope = "main"` configuration

## [1.2.1] - 2026-02-14

### Added
- **Local File Upload**: Upload local images generated by AI skills to Zalo
  - New `uploadAndSendLocalImage()` function for direct file uploads
  - Auto-detection of local file paths in message sending
  - Integration with zca-js `sendMessage` attachments parameter
  - Support for AI-generated images from skills like nano-banana
  - Automatic cleanup option for local files after upload (optional)

### Features
- Seamless workflow: AI generates image → upload to Zalo → send to user
- Works with all image formats supported by zca-js
- Local path detection: automatically uploads if path starts with `/` and file exists

## [1.2.0] - 2026-02-13

### Added
- Initial media support groundwork
- Prepared infrastructure for image handling

---

## [1.1.2] - Previous Stable

### Features
- QR Code login via zca-js
- Pairing mode for access control
- Group and direct message support
- Automatic QR cleanup
- Gateway restart prompt
- Blocklist/Denylist support

