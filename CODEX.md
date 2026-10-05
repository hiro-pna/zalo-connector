# Dùng Zalo trong Codex / ChatGPT desktop

Plugin `zalo` gồm 2 phần:

- **MCP server `zalo`**: Codex tự chạy trên máy qua STDIO. Không cần server, tunnel hay token.
- **Skill `zalo`**: hướng dẫn Codex cách đăng nhập, tìm người nhận và hỏi xác nhận trước khi gửi.

```
Codex / ChatGPT desktop ──stdio──▶ npx zalo-connector stdio ──▶ zca-js ──▶ Zalo
```

## A. Cài đặt (người rành máy tính làm 1 lần)

1. Cài **Node.js LTS** từ https://nodejs.org.
2. Mở Terminal (macOS) hoặc PowerShell (Windows).
3. Tải trước connector (lần đầu mất khoảng 20–60 giây):
   ```bash
   npx -y github:hiro-pna/zalo-connector token
   ```
   > Bỏ qua bước này thì lần đầu Codex có thể báo MCP server khởi động quá thời gian (mặc định 10 giây).
4. Thêm marketplace và cài plugin:
   ```bash
   codex plugin marketplace add hiro-pna/zalo-connector
   codex plugin add zalo@zalo-connector
   ```
   Nếu máy không có lệnh `codex`: mở app → **Plugins** → thêm marketplace `hiro-pna/zalo-connector` → cài **Zalo**.
5. Khởi động lại app Codex / ChatGPT.
6. Đăng nhập Zalo lần đầu (xem phần B), rồi bàn giao.

Cập nhật bản mới:

```bash
codex plugin marketplace upgrade zalo-connector
```

## B. Sử dụng hằng ngày

Chỉ cần gõ tiếng Việt bình thường trong Codex.

**Đăng nhập (chỉ lần đầu hoặc khi Zalo bị đăng xuất):**

1. Gõ: **"Đăng nhập Zalo"**.
2. Mã QR hiện lên màn hình.
3. Trên điện thoại: mở app **Zalo** → bấm biểu tượng **quét QR** → quét mã → bấm **Đăng nhập**.
4. Gõ: **"Xong rồi"**.

**Ví dụ câu lệnh:**

| Muốn làm | Gõ |
|---|---|
| Nhắn tin | "Nhắn cho chị Lan: chiều nay 5h đón con nhé" |
| Nhắn vào nhóm | "Nhắn vào nhóm Gia Đình: cuối tuần về quê" |
| Đọc nhóm | "Nhóm Lớp 5A hôm nay nói gì?" |
| Xem ai online | "Ai đang online trên Zalo?" |
| Lời mời kết bạn | "Có ai gửi lời mời kết bạn không?" |
| Nhắc lịch nhóm | "Nhắc nhóm Gia Đình 8h tối mai gọi video" |

Trước khi gửi, Codex luôn hỏi lại người nhận và nội dung. Trả lời **"ok"** để gửi, hoặc sửa lại nếu sai.

**Không làm được:**

- Đọc tin nhắn 1-1. Chỉ đọc được tin nhắn nhóm.
- Tự báo khi có tin mới. Codex chỉ làm khi được yêu cầu.

## C. Cách thủ công (không dùng plugin)

Codex desktop → **Settings** → **MCP servers** → **Add server**:

| Ô | Giá trị |
|---|---|
| Name | `zalo` |
| Type | `STDIO` |
| Command | `npx` |
| Arguments | `-y` `github:hiro-pna/zalo-connector` `stdio` |

Hoặc thêm vào `~/.codex/config.toml`:

```toml
[mcp_servers.zalo]
command = "npx"
args = ["-y", "github:hiro-pna/zalo-connector", "stdio"]
startup_timeout_sec = 180
```

Cách này chỉ có MCP server, không có skill.
Muốn có skill: copy thư mục `plugins/zalo/skills/zalo` vào `~/.agents/skills/zalo`.

## Tool có sẵn

| Tool | Chức năng |
|---|---|
| `zalo_login` | Tạo mã QR, mở trên màn hình |
| `zalo_login_status` | Kiểm tra đã đăng nhập chưa |
| `zalo_personal` | 141 thao tác Zalo (gửi tin, nhóm, bạn bè, …) |

## Xử lý sự cố

| Triệu chứng | Nguyên nhân | Cách xử lý |
|---|---|---|
| Codex báo MCP `zalo` không khởi động | Chưa cài Node.js, hoặc lần đầu tải quá lâu | Cài Node.js LTS; chạy lại bước A.3; khởi động lại app |
| Mã QR không tự mở | Máy không có trình xem ảnh mặc định | Mở file theo đường dẫn Codex hiển thị |
| Mã QR hết hạn | Quá thời gian quét | Gõ lại "Đăng nhập Zalo" |
| Codex nói chưa đăng nhập | Phiên Zalo hết hạn | Gõ lại "Đăng nhập Zalo" |
| Codex không tìm thấy người nhận | Tên trong danh bạ Zalo khác tên đã gõ | Gõ tên ngắn hơn, hoặc số điện thoại |

> ⚠️ Thư viện `zca-js` không chính thức. Zalo có thể khoá tài khoản dùng tự động hoá. Không gửi hàng loạt.
