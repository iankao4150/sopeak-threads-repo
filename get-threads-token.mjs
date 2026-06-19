// 取得 Threads 長效 token + 帳號 ID，寫進 .env
// 步驟：① 在 .setup.env 填 THREADS_APP_ID / THREADS_APP_SECRET / REDIRECT_URI
//        ② 執行 node get-threads-token.mjs  → 印出「授權網址」，用瀏覽器打開、授權
//        ③ 從跳轉後網址列複製 code=... 的值，填進 .setup.env 的 AUTH_CODE
//        ④ 再執行 node get-threads-token.mjs → 自動換短期→長效 token + 抓 user id，寫進 .env
import { readFileSync, writeFileSync, existsSync } from 'fs';
if (existsSync('.setup.env')) for (const l of readFileSync('.setup.env','utf8').split('\n')) { const m=l.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/); if(m) process.env[m[1]]=m[2].replace(/^["']|["']$/g,''); }
const { THREADS_APP_ID:ID, THREADS_APP_SECRET:SEC } = process.env;
const REDIRECT = process.env.REDIRECT_URI || 'https://oauth.pstmn.io/v1/browser-callback';
let CODE = (process.env.AUTH_CODE||'').split('#')[0].trim();
const mask = t => t ? t.slice(0,8)+'…'+t.slice(-4) : '(空)';
if (!ID || !SEC) { console.error('請先在 .setup.env 填 THREADS_APP_ID 與 THREADS_APP_SECRET'); process.exit(1); }
if (!CODE) {
  const url = `https://threads.net/oauth/authorize?client_id=${ID}&redirect_uri=${encodeURIComponent(REDIRECT)}&scope=threads_basic,threads_content_publish&response_type=code`;
  console.log('\n① 用瀏覽器打開這個「授權網址」，登入 @sopeak.tw 並按允許：\n');
  console.log('   '+url+'\n');
  console.log('② 授權後會跳到一個網址，把網址裡 code= 後面那串複製起來（若結尾有 #_ 去掉）。');
  console.log('③ 貼進 .setup.env 的 AUTH_CODE=，再執行一次 node get-threads-token.mjs\n');
  process.exit(0);
}
try {
  console.log('交換短期 token …');
  const f = new URLSearchParams({ client_id:ID, client_secret:SEC, grant_type:'authorization_code', redirect_uri:REDIRECT, code:CODE });
  let r = await fetch('https://graph.threads.net/oauth/access_token',{method:'POST',body:f});
  let j = await r.json(); if(j.error||j.error_message) throw new Error(JSON.stringify(j));
  const short=j.access_token, uid=j.user_id; console.log('  短期 token：',mask(short),'｜user_id：',uid);
  console.log('交換 60 天長效 token …');
  r = await fetch(`https://graph.threads.net/access_token?grant_type=th_exchange_token&client_secret=${SEC}&access_token=${short}`);
  j = await r.json(); if(j.error) throw new Error(JSON.stringify(j));
  const long=j.access_token; console.log('  長效 token：',mask(long),j.expires_in?`（約 ${Math.round(j.expires_in/86400)} 天）`:'');
  const me = await (await fetch(`https://graph.threads.net/v1.0/me?fields=id,username&access_token=${long}`)).json();
  const lines = existsSync('.env') ? readFileSync('.env','utf8').split('\n').filter(l=>!/^(THREADS_USER_ID|THREADS_ACCESS_TOKEN)=/.test(l)) : ['IMAGE_BASE_URL=https://YOUR_IMAGE_HOST/threads'];
  lines.push(`THREADS_USER_ID=${me.id||uid}`, `THREADS_ACCESS_TOKEN=${long}`);
  writeFileSync('.env', lines.filter(Boolean).join('\n')+'\n');
  console.log(`\n✅ 完成！帳號 @${me.username||'?'}（id ${me.id||uid}）已寫入 .env。`);
  console.log('   下一步：填好 .env 的 IMAGE_BASE_URL，再跑  node publish-threads.mjs --dry-run --day 1');
} catch(e){ console.error('\n❌ 失敗：',e.message,'\n（常見：code 過期請重拿、redirect_uri 要和 App 設定完全一致、帳號要先加成 Threads Tester 並接受邀請）'); process.exit(1); }
