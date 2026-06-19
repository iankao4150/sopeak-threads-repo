// SOPEAK Threads 自動發文（官方 Threads API）：文字 / 單圖 / 輪播，發完自動把「第一樓 CTA」貼成回覆
// 用法：
//   node publish-threads.mjs --dry-run --all     空跑、印出將發什麼（不需 token）
//   node publish-threads.mjs --day 1             只發 Day 1（先單篇測試）
//   node publish-threads.mjs --due               發「排程到、且還沒發過」的（本機用，靠 posted.json 記錄）
//   node publish-threads.mjs --today             只發「今天(台灣日期)該發的那篇」（無狀態，給 GitHub Actions 每日排程用）
// 設定 .env：THREADS_USER_ID、THREADS_ACCESS_TOKEN、IMAGE_BASE_URL（圖片公開網址前綴）
import { readFileSync, writeFileSync, existsSync } from 'fs';
if (existsSync('.env')) for (const l of readFileSync('.env', 'utf8').split('\n')) { const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); }
const { THREADS_USER_ID: UID, THREADS_ACCESS_TOKEN: TOKEN, IMAGE_BASE_URL } = process.env;
const G = `https://graph.threads.net/v1.0`;
const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const onlyDay = args.includes('--day') ? +args[args.indexOf('--day') + 1] : null;
const DUE = args.includes('--due'), ALL = args.includes('--all'), TODAY = args.includes('--today');
const posts = JSON.parse(readFileSync('posts.json', 'utf8'));
const posted = existsSync('posted.json') ? JSON.parse(readFileSync('posted.json', 'utf8')) : {};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const twDate = () => new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10); // 台灣日期，不受執行環境時區影響
const pick = () => onlyDay ? posts.filter(p => p.day === onlyDay)
  : TODAY ? posts.filter(p => p.datetime.slice(0, 10) === twDate())
  : DUE ? posts.filter(p => !posted[p.day] && p.datetime.slice(0, 10) <= twDate())
  : ALL ? posts.filter(p => !posted[p.day]) : [];
async function api(path, params) {
  const body = new URLSearchParams({ ...params, access_token: TOKEN });
  const r = await fetch(`${G}/${path}`, { method: 'POST', body });
  const j = await r.json(); if (!r.ok || j.error) throw new Error(JSON.stringify(j.error || j)); return j;
}
async function waitReady(id) { for (let i = 0; i < 20; i++) { const r = await fetch(`${G}/${id}?fields=status&access_token=${TOKEN}`); const j = await r.json(); if (j.status === 'FINISHED') return; if (j.status === 'ERROR') throw new Error('container ERROR'); await sleep(3000); } }
async function makeContainer(p) {
  const urls = p.images.map(f => `${IMAGE_BASE_URL.replace(/\/$/, '')}/${f}`);
  if (urls.length === 0) return (await api(`${UID}/threads`, { media_type: 'TEXT', text: p.text, ...(p.topic ? { topic_tag: p.topic } : {}) })).id;
  if (urls.length === 1) return (await api(`${UID}/threads`, { media_type: 'IMAGE', image_url: urls[0], text: p.text, ...(p.topic ? { topic_tag: p.topic } : {}) })).id;
  const children = [];
  for (const u of urls) { children.push((await api(`${UID}/threads`, { media_type: 'IMAGE', image_url: u, is_carousel_item: 'true' })).id); process.stdout.write('.'); }
  return (await api(`${UID}/threads`, { media_type: 'CAROUSEL', children: children.join(','), text: p.text, ...(p.topic ? { topic_tag: p.topic } : {}) })).id;
}
async function publishPost(p) {
  const urls = p.images.map(f => `${(IMAGE_BASE_URL || 'https://YOUR_IMAGE_HOST').replace(/\/$/, '')}/${f}`);
  console.log(`\n▶ Day ${p.day}　${p.datetime}　${p.images.length ? p.images.length + ' 張圖' : '純文字'}`);
  if (DRY) { console.log('  本文首行:', p.text.split('\n')[0]); urls.forEach((u, i) => console.log(`  圖${i + 1}: ${u}`)); console.log('  第一樓CTA:', p.reply.split('\n')[0], '…'); return; }
  if (!UID || !TOKEN || !IMAGE_BASE_URL) throw new Error('缺 THREADS_USER_ID / THREADS_ACCESS_TOKEN / IMAGE_BASE_URL，請填 .env');
  const cid = await makeContainer(p); await waitReady(cid);
  const pub = await api(`${UID}/threads_publish`, { creation_id: cid });
  // 第一樓 CTA（回覆自己這篇）
  let replyId = null;
  if (p.reply) { const rc = await api(`${UID}/threads`, { media_type: 'TEXT', text: p.reply, reply_to_id: pub.id }); await waitReady(rc.id); replyId = (await api(`${UID}/threads_publish`, { creation_id: rc.id })).id; }
  posted[p.day] = { id: pub.id, reply: replyId, at: new Date().toISOString() };
  writeFileSync('posted.json', JSON.stringify(posted, null, 1));
  console.log(`  ✅ 已發佈 ${pub.id}${replyId ? ` + 第一樓CTA ${replyId}` : ''}`);
}
const todo = pick();
if (!todo.length) { console.log('沒有要發的（檢查 --day / --due / --all 與 posted.json）'); process.exit(0); }
console.log(`${DRY ? '[DRY] ' : ''}處理 ${todo.length} 篇：Day ${todo.map(p => p.day).join(', ')}`);
for (const p of todo) { try { await publishPost(p); if (!DRY) await sleep(3000); } catch (e) { console.error(`  ❌ Day ${p.day} 失敗：${e.message}`); } }
console.log('\n完成。posted.json 記錄已發，重跑不重發。');
