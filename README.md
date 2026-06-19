# SOPEAK Threads 自動發文

@sopeak.tw 的 Threads 60 天行銷貼文 —— 圖片 + 文案 + 每日自動發文排程，全部放在這一個 repo。

## 這個 repo 在做什麼
- `public-images/`：69 張貼文圖。設成 **public** repo 後，GitHub 會用 `raw.githubusercontent.com` 直接當圖片公開網址（Threads 發圖需要）。
- `posts.json`：60 天的文案、圖片、第一樓 CTA、排程時間（台灣時間）。
- `publish-threads.mjs`：發文程式（文字／單圖／輪播，發完自動把 CTA 貼成第一樓回覆）。
- `.github/workflows/schedule.yml`：每天台灣 20:00 自動跑，只發「今天該發的那篇」。

## 一次性設定（在 GitHub 網站上做）
到 repo 的 **Settings → Secrets and variables → Actions → New repository secret**，新增 3 個：

| 名稱 | 值 |
|------|----|
| `THREADS_USER_ID` | 你的 Threads 帳號 ID |
| `THREADS_ACCESS_TOKEN` | 60 天長效 token |
| `IMAGE_BASE_URL` | `https://raw.githubusercontent.com/<你的帳號>/<repo名>/main/public-images` |

> ⚠️ token 是機密，**只放在 Secrets，不要寫進任何檔案**。`.env` / `.setup.env` / `posted.json` 已被 `.gitignore` 擋住、不會上傳。

設好後，到 **Actions** 分頁可手動按 **Run workflow** 測一次；之後每天會自動發。

## 本機測試（在自己電腦跑）
```bash
cp .env.example .env          # 填 THREADS_USER_ID / THREADS_ACCESS_TOKEN / IMAGE_BASE_URL
node publish-threads.mjs --dry-run --day 1   # 空跑，只印出會發什麼，不會真發
node publish-threads.mjs --day 1             # 真的發 Day 1（單篇測試）
node publish-threads.mjs --today             # 發「今天該發的那篇」（排程用的就是這個）
```

## token 怎麼拿
見 `如何取得Threads_Token.md`（圖文步驟）。長效 token 約 60 天到期，到期前重新產一個換掉 Secret 即可。
