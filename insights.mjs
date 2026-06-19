// SOPEAK Threads 流量監測：直接抓「帳號實際貼文」＋對回 Day 編號，拉每篇與帳號層級數據，存進 metrics-log.json
// 不依賴 posted.json（雲端排程發的也抓得到）。用法：node insights.mjs
// 需 .env 的 THREADS_USER_ID / THREADS_ACCESS_TOKEN（需 threads_manage_insights 權限）
import { readFileSync, writeFileSync, existsSync } from 'fs';
if (existsSync('.env')) for (const l of readFileSync('.env', 'utf8').split('\n')) { const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); }
const { THREADS_USER_ID: UID, THREADS_ACCESS_TOKEN: TOKEN } = process.env;
const G = 'https://graph.threads.net/v1.0';
if (!UID || !TOKEN) { console.error('缺 THREADS_USER_ID / THREADS_ACCESS_TOKEN，請填 .env'); process.exit(1); }
const j = async u => (await fetch(u)).json();
const val = d => (d.total_value?.value) ?? (d.values && d.values[0]?.value) ?? 0;
const norm = s => (s || '').replace(/\s/g, '').slice(0, 16);
const METRIC = 'views,likes,replies,reposts,quotes';
// 建「本文前 16 字 → Day」對照，用來把帳號上的貼文對回是第幾天
const posts = existsSync('posts.json') ? JSON.parse(readFileSync('posts.json', 'utf8')) : [];
const dayOf = new Map(posts.map(p => [norm(p.text), p.day]));
(async () => {
  // 帳號層級
  const acc = {};
  try { const a = await j(`${G}/${UID}/threads_insights?metric=${METRIC},followers_count&access_token=${TOKEN}`); (a.data || []).forEach(d => acc[d.name] = val(d)); } catch (e) { }
  // 抓帳號最近貼文（含回覆，等下用本文比對只留主貼文）
  const list = await j(`${G}/${UID}/threads?fields=id,text,timestamp,permalink&limit=100&access_token=${TOKEN}`);
  if (list.error) { console.error('抓貼文失敗：', list.error.message); process.exit(1); }
  const rows = [];
  for (const t of (list.data || [])) {
    const day = dayOf.get(norm(t.text));
    if (!day) continue; // 只統計對得到 Day 的主貼文（跳過留言/促購回覆）
    const ins = await j(`${G}/${t.id}/insights?metric=${METRIC}&access_token=${TOKEN}`);
    const v = {}; (ins.data || []).forEach(d => v[d.name] = val(d));
    rows.push({ day, id: t.id, link: t.permalink, views: v.views || 0, likes: v.likes || 0, replies: v.replies || 0, reposts: v.reposts || 0, quotes: v.quotes || 0 });
  }
  rows.sort((a, b) => b.views - a.views);
  console.log('\n=== 每篇主貼文成效（依瀏覽排序）===');
  console.log('Day   views   likes  replies reposts quotes');
  rows.forEach(r => console.log(`${String(r.day).padEnd(5)} ${String(r.views).padEnd(7)} ${String(r.likes).padEnd(6)} ${String(r.replies).padEnd(7)} ${String(r.reposts).padEnd(7)} ${r.quotes}`));
  if (!rows.length) console.log('（尚無對得到 Day 的主貼文數據）');
  const sum = rows.reduce((a, r) => ({ views: a.views + r.views, likes: a.likes + r.likes, replies: a.replies + r.replies }), { views: 0, likes: 0, replies: 0 });
  console.log(`\n已發 ${rows.length} 篇｜總瀏覽 ${sum.views}｜總讚 ${sum.likes}｜總留言 ${sum.replies}`);
  console.log('=== 帳號層級 ===', Object.keys(acc).length ? JSON.stringify(acc) : '（暫無）');
  const log = existsSync('metrics-log.json') ? JSON.parse(readFileSync('metrics-log.json', 'utf8')) : [];
  log.push({ at: new Date().toISOString(), account: acc, posts: rows });
  writeFileSync('metrics-log.json', JSON.stringify(log, null, 1));
  console.log('\n📈 已存快照進 metrics-log.json（每次跑累積一筆，可看趨勢）');
})();
