# zalo_personal actions

Pass as `action`. Params per action: see the tool input schema descriptions.

| Group | Actions |
|---|---|
| Core | `send`, `send-styled`, `image`, `link`, `friends`, `groups`, `me`, `status`, `block-user`, `unblock-user`, `block-user-in-group`, `unblock-user-in-group`, `list-blocked`, `list-allowed`, `allow-user-in-group`, `unallow-user-in-group`, `list-allowed-in-group` |
| Friend & Stranger | `find-user`, `send-friend-request`, `send-to-stranger` |
| Friends Management | `get-friend-requests`, `accept-friend-request`, `reject-friend-request`, `get-sent-requests`, `undo-friend-request`, `unfriend`, `set-friend-nickname`, `remove-friend-nickname`, `get-online-friends`, `check-friend-status` |
| Groups Management | `list-groups`, `search-groups`, `get-group-info`, `create-group`, `add-to-group`, `remove-from-group`, `leave-group`, `rename-group`, `add-group-admin`, `remove-group-admin` |
| Media | `send-video`, `send-voice`, `send-sticker`, `send-card` |
| User Profile | `get-user-info`, `last-online`, `get-qr` |
| Message Management | `delete-message`, `undo-message`, `forward-message` |
| Reactions | `add-reaction` |
| Polls | `create-poll`, `vote-poll`, `lock-poll`, `get-poll-detail` |
| Reminders | `create-reminder`, `remove-reminder`, `edit-reminder`, `list-reminders` |
| Group Advanced | `change-group-owner`, `disperse-group`, `update-group-settings`, `enable-group-link`, `disable-group-link`, `get-group-link`, `get-pending-members`, `review-pending-members` |
| Conversation | `mute-conversation`, `unmute-conversation`, `pin-conversation`, `unpin-conversation`, `delete-chat` |
| Quick Messages & Auto-Reply | `list-quick-messages`, `add-quick-message`, `remove-quick-message`, `list-auto-replies`, `create-auto-reply`, `delete-auto-reply` |
| Settings | `get-settings`, `update-setting` |
| Misc | `search-stickers`, `parse-link`, `send-report` |
| Profile & Avatar | `update-profile`, `change-avatar`, `delete-avatar`, `get-avatar-list`, `reuse-avatar` |
| Group Invite & Block | `join-group-link`, `invite-to-groups`, `get-group-invites`, `join-group-invite`, `delete-group-invite`, `get-group-blocked`, `block-group-member`, `unblock-group-member`, `get-group-members-info` |
| Conversation Advanced | `hide-conversation`, `unhide-conversation`, `get-hidden-conversations`, `mark-unread`, `unmark-unread`, `get-unread-marks`, `set-auto-delete-chat`, `get-auto-delete-chats`, `get-archived-chats` |
| Zalo Block & Friend Advanced | `zalo-block-user`, `zalo-unblock-user`, `block-view-feed`, `get-friend-recommendations`, `get-alias-list`, `get-related-friend-groups` |
| Notes & Labels | `create-note`, `edit-note`, `get-boards`, `get-labels` |
| Catalogs & Products | `create-catalog`, `update-catalog`, `delete-catalog`, `get-catalogs`, `create-product`, `update-product`, `delete-product`, `get-products` |
| Extended | `send-typing`, `send-bank-card`, `add-poll-options`, `share-poll`, `update-quick-message`, `update-auto-reply`, `update-active-status`, `get-biz-account` |
| zca-js 2.1.0 APIs | `find-user-by-username`, `get-close-friends`, `get-group-chat-history`, `get-multi-users-by-phones`, `search-sticker-detail`, `update-archived-chat`, `update-profile-bio`, `upgrade-group-to-community`, `change-group-avatar`, `get-mute-status`, `get-pinned-conversations` |
| Bot Settings | `group-mention` |
