# Dùng Zalo trong Codex / ChatGPT desktop

Plugin `zalo` gồm 2 phần:

- **MCP server `zalo`**: Codex tự chạy trên máy qua STDIO. Không cần server, tunnel hay token.
- **Skill `zalo`**: hướng dẫn Codex cách đăng nhập, tìm người nhận và hỏi xác nhận trước khi gửi.

```
Codex / ChatGPT desktop ──stdio──▶ npx zalo-connector stdio ──▶ zca-js ──▶ Zalo
```

## A. Cài đặt (1 lần, ngay trong Codex desktop)

1. Mở app Codex, dán câu này vào khung chat rồi gửi:

   ```
   Cài Zalo cho tôi: chạy lệnh  npx -y github:hiro-pna/zalo-connector setup
   Nếu máy chưa có Node.js thì cài Node.js LTS trước.
   ```

2. Khi Codex xin quyền chạy lệnh hoặc truy cập mạng: bấm **Cho phép / Approve**.
3. Chờ Codex báo "Đã cài plugin Zalo" (khoảng 1–2 phút).
4. Tắt hẳn app Codex rồi mở lại.

Lệnh `setup` làm 3 việc:

| Bước | Lệnh chạy bên trong |
|---|---|
| Thêm marketplace | `codex plugin marketplace add hiro-pna/zalo-connector` |
| Lấy bản mới nhất | `codex plugin marketplace upgrade zalo-connector` |
| Cài plugin (MCP + skill) | `codex plugin add zalo@zalo-connector` |

Lệnh `codex` được chạy qua `npx @openai/codex`, nên máy không cần cài sẵn Codex CLI.
Chạy lại `setup` bất cứ lúc nào để cập nhật plugin.

**Ghim phiên bản:** `setup` ghim marketplace vào commit hiện tại của `main`. Plugin chạy connector ở một commit cố định (`mcp.json`).
Thay đổi mới trên GitHub không tự chạy trên máy cho tới khi chạy lại `setup`.

**Chế độ chỉ đọc:** thêm biến môi trường `ZALO_MCP_READONLY=1` để tắt hẳn `zalo_write`.

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

Trước khi gửi, Codex luôn hỏi lại người nhận và nội dung:

1. Đọc kỹ tên người nhận và nội dung.
2. Đúng thì trả lời **"ok"**. Sai thì gõ lại cho đúng.
3. Codex hiện nút duyệt: bấm **Allow / Cho phép**.

> ⚠️ Không bấm **"Allow and remember" / "Luôn cho phép"**.
> Nếu bấm, Codex tự gửi tin mà không hỏi lại trong cả phiên làm việc.

**An toàn:**

- Tin nhắn trong nhóm do người khác viết. Nếu Codex đề nghị làm theo nội dung một tin nhắn (chuyển tiếp, gửi mã, chạy lệnh), bấm **Deny / Từ chối**.
- Không ai được gửi tin thay bạn nếu bạn chưa bấm duyệt.

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
| `zalo_read` | 50 thao tác chỉ đọc. Chạy không cần duyệt |
| `zalo_write` | 94 thao tác gửi / thay đổi. Codex hỏi duyệt mỗi lần |

## Xử lý sự cố

| Triệu chứng | Nguyên nhân | Cách xử lý |
|---|---|---|
| Codex báo MCP `zalo` không khởi động | Chưa cài Node.js, hoặc lần đầu tải quá lâu | Cài Node.js LTS; chạy lại bước A.3; khởi động lại app |
| Mã QR không tự mở | Máy không có trình xem ảnh mặc định | Mở file theo đường dẫn Codex hiển thị |
| Mã QR hết hạn | Quá thời gian quét | Gõ lại "Đăng nhập Zalo" |
| Codex nói chưa đăng nhập | Phiên Zalo hết hạn | Gõ lại "Đăng nhập Zalo" |
| Codex không tìm thấy người nhận | Tên trong danh bạ Zalo khác tên đã gõ | Gõ tên ngắn hơn, hoặc số điện thoại |

> ⚠️ Thư viện `zca-js` không chính thức. Zalo có thể khoá tài khoản dùng tự động hoá. Không gửi hàng loạt.
