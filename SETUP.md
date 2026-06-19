# SOPEAK Threads 自動發文 — 設定（給你或工程師）

用 **Threads 官方 API** 自動發文＋自動把「第一樓 CTA」貼成回覆。設定一次，之後排程每天自動發。

## 需要 3 樣
1. **Threads 權限 Token + 帳號 ID**
   - developers.facebook.com 建 App → 加 **Threads API** → 在 Threads「使用權」授權 `threads_basic`、`threads_content_publish`（、`threads_manage_replies`）。
   - 用 Threads 登入流程取得 token → 換 60 天長效 → 取 `THREADS_USER_ID`（`GET /me`）。（這段我可以帶你做。）
2. **圖片公開網址**：把本資料夾 `public-images/`（69 張）丟到任一靜態主機（Vercel/Netlify/Cloudflare Pages/你的伺服器），例如 `https://guide.sopeak.tw/threads/`，填進 `IMAGE_BASE_URL`。
3. **一台一直開著的排程主機**（你的伺服器、或 GitHub Actions 雲端）來每天定時觸發。

## 指令
```bash
cp .env.example .env        # 填 3 個值
node make-manifest.mjs      # 由計劃產生 posts.json（已產好；改文案後再跑）
node publish-threads.mjs --dry-run --all   # 空跑檢查（不需 token）
node publish-threads.mjs --day 1           # 真的發 Day 1（先單篇測）
node publish-threads.mjs --due             # 發「今天到期、還沒發過」的（給排程用）
```
`posted.json` 記錄已發，重跑不重發。文字日發純文字、有圖天發單圖或輪播，發完自動回一則「第一樓 CTA」。

## 自動排程（每天到點自動發）
Threads API 只能「立刻發」，所以用「每天定時跑 --due」達成排程。發文時段多在晚上，可每天 20:00 跑：
- 伺服器 cron：`0 20 * * *  cd /path/auto-publish && node publish-threads.mjs --due >> log.txt 2>&1`
- 或 GitHub Actions（token 放 repo Secrets，cron 每天觸發）：見 schedule.github.yml

## ⚠ 重要：自動發 ≠ 自動經營
Threads 會不會紅，**關鍵是發文後 30 分鐘你有沒有回留言、衝互動**（這是演算法主要訊號）。
機器人只能幫你「準時把貼文＋第一樓 CTA 發出去」，**不能也不該假裝回覆真人留言**。
建議「半自動」：**自動發文，但你出現去回留言**。純無人值守會讓 Threads 成效大打折扣。

## 合規
- token / .env 勿外流（已 gitignore）；長效 token 約 60 天到期要換。
- 帳號剛養、又每天用 API 發，建議前期搭配手動、別一次排太密，降低被判機器人風險。
