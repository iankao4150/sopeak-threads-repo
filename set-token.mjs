// 把「用戶權杖產生器」拿到的長效 token 存進 .env（自動補上帳號 ID，不用手動編輯檔案）
// 用法：node set-token.mjs   → 提示你貼上 token，按 Enter 就好
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createInterface } from 'readline';
const G = 'https://graph.threads.net/v1.0';
const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = q => new Promise(r => rl.question(q, a => r(a.trim())));
const token = (await ask('\n貼上你從「用戶權杖產生器」拿到的長效 token，然後按 Enter：\n> ')).replace(/^["']|["']$/g, '');
rl.close();
if (!token) { console.error('沒有輸入 token，結束。'); process.exit(1); }
try {
  const me = await (await fetch(`${G}/me?fields=id,username&access_token=${encodeURIComponent(token)}`)).json();
  if (me.error || !me.id) throw new Error(JSON.stringify(me.error || me));
  const lines = existsSync('.env')
    ? readFileSync('.env', 'utf8').split('\n').filter(l => !/^(THREADS_USER_ID|THREADS_ACCESS_TOKEN)=/.test(l))
    : ['IMAGE_BASE_URL=https://YOUR_IMAGE_HOST/threads'];
  lines.push(`THREADS_USER_ID=${me.id}`, `THREADS_ACCESS_TOKEN=${token}`);
  writeFileSync('.env', lines.filter(Boolean).join('\n') + '\n');
  console.log(`\n✅ 完成！帳號 @${me.username || '?'}（id ${me.id}）已寫進 .env。`);
  console.log('   下一步：設定圖片公開網址（IMAGE_BASE_URL），再跑  node publish-threads.mjs --dry-run --day 1');
} catch (e) {
  console.error('\n❌ 失敗：', e.message, '\n（多半是 token 複製不完整或已過期，回「用戶權杖產生器」重新產一次再貼）');
  process.exit(1);
}
