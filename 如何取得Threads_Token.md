# 如何拿到 Threads 自動發文的 Token＋帳號 ID

> 目標：拿到兩樣東西 —— **THREADS_USER_ID（帳號 ID）** 和 **一組 60 天長效 TOKEN**，寫進 `.env`，之後程式就能自動幫 @sopeak.tw 發文。
> 全程約 15 分鐘，**不用會寫程式**，照著做就好。最後兩個指令我都幫你包好了。

---

## ⚠️ 先講安全（很重要，只講一次）

- **可以給別人看的**：App ID、帳號 ID、授權網址。
- **絕對不能外流 / 不要貼到聊天室的**：**App Secret、code、token**。這三個等於你帳號的鑰匙。
- 這三個機密只填在 `.setup.env`／`.env` 這兩個檔案裡，我已經設定好讓它們**不會被上傳**（`.gitignore`）。
- 所以下面叫你「填進 .setup.env」的東西，**填在檔案裡就好，不用貼給我看**。

---

## 第 1 步：確認 @sopeak.tw 有 Threads 帳號

- 手機打開 Threads App，確認 **@sopeak.tw** 已經能登入、有發過至少 1 篇（全新帳號有時候 API 會卡）。
- 順便確認這個 Threads 是綁在哪個 Instagram / Facebook 帳號上的，等下登入 Meta 後台要用同一個人。

---

## 第 2 步：建立一個 Meta 開發者 App

1. 電腦瀏覽器打開 👉 **https://developers.facebook.com/apps**
2. 用「能管理 @sopeak.tw 的那個 FB/IG 帳號」登入。第一次會要你同意開發者條款、驗證手機，照做。
3. 按右上角 **「建立應用程式 / Create App」**。
4. 問你「**要使用哪些用途 / use case**」時，選 👉 **「Access the Threads API」**（存取 Threads API）。
   - 如果沒看到這個選項，先選「其他 / Other」→「Business / 商業」，建立後再到左側選單找 **Threads** 產品按「設定 Set up」。
5. 應用程式名稱隨便取（例如 `SOPEAK Threads`），建立完成。

---

## 第 3 步：開啟發文權限（threads_content_publish）

1. 進到 App 後台後，左側選單找到 **Threads** → **Use cases / 用途** 或 **Permissions / 權限**。
2. 確認有勾選這兩個權限：
   - **`threads_basic`**（基本：讀帳號）
   - **`threads_content_publish`**（**發文**用，這個最重要）
3. 開發 / 測試階段這兩個權限**不需要送審**就能用在「自己的測試帳號」上，所以先不用管 App Review。

---

## 第 4 步：設定「跳轉網址」＋把 @sopeak.tw 加成測試者

這步是最多人卡關的地方，慢慢來。

**(A) 設定 Redirect URI（跳轉網址）**
1. 左側 **Threads** → **Settings / 設定**（Threads 專屬的設定頁，不是 App 的基本資料）。
2. 找到 **「Redirect Callback URLs」/「重新導向 URI」** 欄位，填入：
   ```
   https://oauth.pstmn.io/v1/browser-callback
   ```
   （這是 Postman 的公用接收頁，授權完它只會把網址顯示給你看，安全。）
3. 存檔。**這個網址等一下 .setup.env 裡要填得一模一樣**，多一個斜線都不行。

**(B) 把 @sopeak.tw 加成 Threads 測試者**
1. 同一頁（或 **App Roles / 角色** → **Roles**）找到 **「Threads Testers」/「新增測試者」**。
2. 輸入 **@sopeak.tw**（你的 Threads 帳號名稱）送出邀請。
3. 然後到 👉 **https://www.threads.net/settings/account**（用 @sopeak.tw 登入）→ **「Website permissions / 網站權限」** → **「Invites / 邀請」**，**接受**剛剛那個邀請。
   - ⚠️ 沒接受邀請的話，第 6 步授權會失敗。

---

## 第 5 步：把 App ID / App Secret 填進 .setup.env

1. 到 App 後台 **App settings / 設定 → Basic / 基本資料**，會看到：
   - **App ID**（一串數字）
   - **App secret**（按「顯示 Show」才看得到）
2. 打開這個資料夾裡的 **`.setup.env.example`**，把它**改名成 `.setup.env`**（去掉 `.example`）。
3. 用記事本 / 編輯器打開 `.setup.env`，填成這樣（**填完存檔，不用貼給我**）：
   ```
   THREADS_APP_ID=這裡填你的App ID
   THREADS_APP_SECRET=這裡填你的App Secret
   REDIRECT_URI=https://oauth.pstmn.io/v1/browser-callback
   AUTH_CODE=
   ```
   - `REDIRECT_URI` 要和第 4 步填的**一模一樣**。
   - `AUTH_CODE` **第一次先留空**，下一步才會拿到。

---

## 第 6 步：跑第一次指令 → 拿授權網址

在這個資料夾打開「終端機 / Terminal」，貼上：

```bash
node get-threads-token.mjs
```

它會印出一條 **授權網址**，長得像 `https://threads.net/oauth/authorize?...`。

1. 把那條網址**複製到瀏覽器打開**（用 @sopeak.tw 登入），按 **「允許 / Authorize」**。
2. 畫面會跳到一個 Postman 的頁面，網址列會變成像：
   ```
   https://oauth.pstmn.io/v1/browser-callback?code=AQDxxxxxxxx...#_
   ```
3. 把 **`code=` 後面那一長串複製起來**（如果結尾有 `#_` 就不要複製進去）。
   - 👉 這串 `code` 是機密，**只貼進 .setup.env，不要貼到聊天室。**

---

## 第 7 步：把 code 填回去 → 跑第二次 → 完成 🎉

1. 打開 `.setup.env`，把剛剛的 code 貼進去：
   ```
   AUTH_CODE=AQDxxxxxxxx...
   ```
   存檔。
2. 再跑一次同一個指令：
   ```bash
   node get-threads-token.mjs
   ```
3. 它會自動做完三件事，最後印出 `✅ 完成！帳號 @sopeak.tw 已寫入 .env`：
   - 用 code 換「短期 token」
   - 把短期 token 換成 **60 天長效 token**
   - 抓到 **帳號 ID（THREADS_USER_ID）**
   - 全部寫進 **`.env`**

> ⚠️ code 只能用一次、而且幾分鐘就過期。如果第二次跑出現「code 過期 / invalid」，回到第 6 步重新拿一個新的 code 就好。

---

## 完成後你有什麼

`.env` 裡會自動長出：
```
THREADS_USER_ID=你的帳號ID
THREADS_ACCESS_TOKEN=長效token
IMAGE_BASE_URL=https://YOUR_IMAGE_HOST/threads   ← 這個還要改（見下方）
```

---

## 最後一塊拼圖：圖片要有「公開網址」（IMAGE_BASE_URL）

Threads API 發圖時，**不能直接上傳本機檔案**，必須給它一個「網路上看得到的圖片網址」。
我們的 69 張圖已經放在 `public-images/` 資料夾。你只要把它們放上任何能公開讀取的空間，拿到網址前綴填進 `.env` 的 `IMAGE_BASE_URL` 即可。最簡單的幾種：

- **GitHub（推薦、免費）**：把 `public-images/` 上傳到一個 public repo，網址前綴像
  `https://raw.githubusercontent.com/你的帳號/repo/main/public-images`
- Cloudflare R2 / Imgur / 自己的網站 / Cloudinary 都可以。

填好後，前綴 + 檔名要能直接在瀏覽器打開圖片，就成功了。

---

## 驗收：先「空跑」確認，再真的發 Day 1

```bash
node publish-threads.mjs --dry-run --day 1   # 空跑，不會真的發，只印出會發什麼
node publish-threads.mjs --day 1             # 確認沒問題後，真的發 Day 1 測試
```

Day 1 發成功後，我再幫你把「每天自動發」的排程（GitHub Actions）設定好。

---

**卡關了就把終端機印出來的錯誤訊息貼給我**（但記得 token / code / secret 那幾行用 `xxx` 蓋掉再貼），我幫你看。
