// SOPEAK Threads 自動發文（官方 Threads API）：文字 / 單圖 / 輪播
// 每篇發完會在「自己這篇」底下貼兩段留言（只回覆自己、不碰任何別人的留言）：
//   ① 即時第一樓 reply：純互動問句，不含連結
//   ② 延遲 promo（5~10 分鐘後）：系統介紹／連結（promoHasLink 控制是否放連結）→ 避免一發文就丟連結被當廣告
// 用法：
//   node publish-threads.mjs --dry-run --all     空跑、印出將發什麼（不需 token）
//   node publish-threads.mjs --day 1             只發 Day 1（先單篇測試）
//   node publish-threads.mjs --day 1 --fast      同上，但延遲留言只等 5 秒（本機測試用）
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
const DUE = args.includes('--due'), ALL = args.includes('--all'), TODAY = args.includes('--today'), FAST = args.includes('--fast');
const posts = JSON.parse(readFileSync('posts.json', 'utf8'));
const posted = existsSync('posted.json') ? JSON.parse(readFileSync('posted.json', 'utf8')) : {};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const twDate = () => new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10); // 台灣日期，不受執行環境時區影響
const promoDelayMs = () => FAST ? 5000 : (300 + Math.floor(Math.random() * 301)) * 1000; // 延遲促購留言：隨機 5~10 分鐘（--fast 時 5 秒，本機測試用）
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
// 在「自己某篇貼文」底下貼一段文字留言（只用於回覆自己，不會去回覆任何別人的貼文/留言）
async function postReply(text, toId) {
  const rc = await api(`${UID}/threads`, { media_type: 'TEXT', text, reply_to_id: toId });
  await waitReady(rc.id);
  return (await api(`${UID}/threads_publish`, { creation_id: rc.id })).id;
}
async function publishPost(p) {
  const urls = p.images.map(f => `${(IMAGE_BASE_URL || 'https://YOUR_IMAGE_HOST').replace(/\/$/, '')}/${f}`);
  console.log(`\n▶ Day ${p.day}　${p.datetime}　${p.images.length ? p.images.length + ' 張圖' : '純文字'}`);
  if (DRY) {
    console.log('  本文首行:', p.text.split('\n')[0]);
    urls.forEach((u, i) => console.log(`  圖${i + 1}: ${u}`));
    if (p.reply) console.log('  即時第一樓(無連結):', p.reply.split('\n')[0]);
    if (p.promo) console.log(`  延遲留言(約5-10分後,${p.promoHasLink ? '含連結' : '無連結'}):`, p.promo.split('\n')[0]);
    return;
  }
  if (!UID || !TOKEN || !IMAGE_BASE_URL) throw new Error('缺 THREADS_USER_ID / THREADS_ACCESS_TOKEN / IMAGE_BASE_URL，請填 .env');
  const cid = await makeContainer(p); await waitReady(cid);
  const pub = await api(`${UID}/threads_publish`, { creation_id: cid });
  console.log(`  ✅ 主貼文 ${pub.id}`);
  // ① 即時第一樓：純互動、無連結
  let replyId = null;
  if (p.reply) { replyId = await postReply(p.reply, pub.id); console.log(`     ↳ 即時第一樓 ${replyId}`); }
  // ② 延遲 5~10 分鐘：系統介紹／連結（一樣只回覆自己這篇）
  let promoId = null;
  if (p.promo) {
    const ms = promoDelayMs();
    console.log(`     ⏳ ${Math.round(ms / 1000)} 秒後貼延遲留言${p.promoHasLink ? '（含連結）' : ''}…`);
    await sleep(ms);
    promoId = await postReply(p.promo, pub.id); console.log(`     ↳ 延遲留言 ${promoId}`);
  }
  posted[p.day] = { id: pub.id, reply: replyId, promo: promoId, at: new Date().toISOString() };
  writeFileSync('posted.json', JSON.stringify(posted, null, 1));
}
const todo = pick();
if (!todo.length) { console.log('沒有要發的（檢查 --day / --due / --all 與 posted.json）'); process.exit(0); }
console.log(`${DRY ? '[DRY] ' : ''}處理 ${todo.length} 篇：Day ${todo.map(p => p.day).join(', ')}`);
for (const p of todo) { try { await publishPost(p); if (!DRY) await sleep(3000); } catch (e) { console.error(`  ❌ Day ${p.day} 失敗：${e.message}`); } }
console.log('\n完成。posted.json 記錄已發，重跑不重發。');
