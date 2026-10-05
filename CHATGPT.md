# Kết nối Zalo với ChatGPT (MCP)

`zalo-mcp` chạy một MCP server (Streamable HTTP) dùng lại toàn bộ action của tool `zalo-personal`.
ChatGPT gọi server này qua tính năng **custom connector** (Developer mode).

## Luồng hoạt động

```
ChatGPT ──HTTPS──▶ Tunnel / reverse proxy ──HTTP──▶ zalo-mcp serve (:8787) ──▶ zca-js ──▶ Zalo
```

## Yêu cầu

- Node.js ≥ 22 (khuyến nghị 24 LTS)
- Một URL **HTTPS công khai** trỏ về server (ChatGPT không gọi được `localhost`)
- Tài khoản ChatGPT có bật Developer mode cho connector

## Các bước

1. Cài đặt:
   ```bash
   git clone https://github.com/hiro-pna/zalo-connector && cd zalo-connector
   npm install
   ```
2. Đăng nhập Zalo (quét QR bằng app Zalo):
   ```bash
   node bin/zalo-mcp.mjs login
   ```
   Credentials lưu tại `~/.openclaw/zalo-personal-credentials.json`.
3. Tạo token bí mật:
   ```bash
   export ZALO_MCP_TOKEN=$(node bin/zalo-mcp.mjs token)
   ```
4. Chạy server:
   ```bash
   node bin/zalo-mcp.mjs serve
   ```
5. Mở HTTPS tunnel, ví dụ Cloudflare:
   ```bash
   cloudflared tunnel --url http://localhost:8787
   ```
6. Trong ChatGPT: **Settings → Apps & Connectors → Advanced → bật Developer mode**.
7. Tạo connector mới:
   - **MCP Server URL**: `https://<tunnel-domain>/mcp/<ZALO_MCP_TOKEN>`
   - **Authentication**: `No authentication` (token đã nằm trong URL)
8. Trong cuộc chat, bật connector rồi yêu cầu, ví dụ: *"Liệt kê nhóm Zalo của tôi"*.

> ⚠️ Ai có URL chứa token sẽ điều khiển được tài khoản Zalo của bạn.
> Không chia sẻ URL. Nếu lộ, đổi `ZALO_MCP_TOKEN` và khởi động lại server.

## Biến môi trường

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `PORT` | `8787` | Cổng lắng nghe |
| `HOST` | `0.0.0.0` | Địa chỉ lắng nghe |
| `ZALO_MCP_TOKEN` | — | Bắt buộc. Nhận qua path `/mcp/<token>` hoặc header `Authorization: Bearer <token>` |
| `ZALO_MCP_ALLOW_NO_AUTH` | — | Đặt `1` để chạy không token (không khuyến nghị) |

## Endpoint

| Path | Mô tả |
|---|---|
| `POST /mcp/<token>` | MCP endpoint cho ChatGPT |
| `POST /mcp` + Bearer | MCP endpoint cho client hỗ trợ header (Claude, MCP Inspector) |
| `GET /healthz` | Health check |

## Docker

```bash
docker build -t zalo-connector .
docker run -it --rm -v zalo-data:/root/.openclaw zalo-connector login
docker run -d -p 8787:8787 -v zalo-data:/root/.openclaw -e ZALO_MCP_TOKEN=<token> zalo-connector
```

## Tool được expose

Một tool duy nhất: `zalo_personal`, tham số `action` + các tham số tuỳ action
(giống tool `zalo-personal` trong OpenClaw). Ví dụ:

```json
{ "action": "send", "threadId": "Nguyễn Văn A", "message": "Chào bạn" }
```
