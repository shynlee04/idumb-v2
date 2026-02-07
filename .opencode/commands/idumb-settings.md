---
description: "Cấu hình iDumb — thay đổi chế độ quản trị, ngôn ngữ, trình độ"
agent: idumb-meta-builder
---

Read the current `.idumb/config.json` and present the current settings to the user.

Then ask what they would like to change. Available settings:
- governance.mode: balanced | strict | autonomous
- user.experienceLevel: beginner | guided | expert
- user.language.communication: en | vi
- user.language.documents: en | vi

After the user confirms changes, update `.idumb/config.json` and confirm.

$ARGUMENTS
