# Dùng Zalo trong Codex / ChatGPT desktop

Codex tự chạy Zalo connector trên máy (chế độ STDIO).
Không cần server, tunnel hay token.

```
Codex desktop ──stdio──▶ npx zalo-connector stdio ──▶ zca-js ──▶ Zalo
```

## Phần người cài đặt làm (1 lần)

1. Cài **Node.js LTS** từ https://nodejs.org (bấm nút tải bản LTS, cài mặc định).
2. Mở Codex desktop → **Settings** → **MCP servers** → **Add server**.
3. Điền:

   | Ô | Giá trị |
   |---|---|
   | Name | `zalo` |
   | Type | `STDIO` |
   | Command | `npx` |
   | Arguments | `-y` `github:hiro-pna/zalo-connector` `stdio` |

4. Bấm **Restart**.

Hoặc thêm vào file `~/.codex/config.toml` (Windows: `C:\Users\<tên>\.codex\config.toml`):

```toml
[mcp_servers.zalo]
command = "npx"
args = ["-y", "github:hiro-pna/zalo-connector", "stdio"]
startup_timeout_sec = 180
tool_timeout_sec = 120
```

> Lần chạy đầu, `npx` tải thư viện mất khoảng 20–60 giây.
> `startup_timeout_sec = 180` tránh Codex báo lỗi quá thời gian.

## Phần người dùng làm

1. Gõ trong Codex: **"Đăng nhập Zalo giúp tôi"**.
2. Mã QR tự mở trên màn hình.
3. Trên điện thoại: mở app Zalo → biểu tượng **quét QR** → quét mã → bấm **Đăng nhập**.
4. Gõ: **"Kiểm tra đã đăng nhập Zalo chưa"**.

Sau đó dùng tiếng Việt bình thường, ví dụ:

- "Liệt kê các nhóm Zalo của tôi"
- "Gửi cho Nguyễn Văn A: tối nay về muộn nhé"
- "Tóm tắt thông tin nhóm Gia Đình"

Chỉ cần đăng nhập 1 lần. Thông tin đăng nhập lưu ở `~/.openclaw/zalo-personal-credentials.json`.

## Tool có sẵn

| Tool | Chức năng |
|---|---|
| `zalo_login` | Tạo mã QR, mở trên màn hình |
| `zalo_login_status` | Kiểm tra đã đăng nhập chưa |
| `zalo_personal` | 141 thao tác Zalo (gửi tin, nhóm, bạn bè, …) |

## Xử lý sự cố

| Triệu chứng | Nguyên nhân | Cách xử lý |
|---|---|---|
| Codex báo server không khởi động | Chưa cài Node.js, hoặc lần đầu tải quá lâu | Cài Node.js LTS; đặt `startup_timeout_sec = 180` |
| Mã QR không tự mở | Máy không có trình xem ảnh mặc định | Mở file theo đường dẫn Codex hiển thị |
| Mã QR hết hạn | Quá thời gian quét | Gõ lại "Đăng nhập Zalo" |
| Báo "Not authenticated" | Phiên Zalo hết hạn | Gõ lại "Đăng nhập Zalo" |

> ⚠️ Thư viện `zca-js` không chính thức. Zalo có thể khoá tài khoản dùng tự động hoá.
