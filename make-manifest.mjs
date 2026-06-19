// 由計劃產生 posts.json（每天：台灣本地時段、本文、圖、第一樓CTA、主題標籤）
import { readFileSync, writeFileSync } from 'fs';
const cal = JSON.parse(readFileSync('../threads-calendar.json', 'utf8'));
const imgs = JSON.parse(readFileSync('../threads-images.json', 'utf8'));
const byday = {}; for (const im of imgs) (byday[im.day] = byday[im.day] || []).push(im);
const START = new Date('2026-06-23T00:00:00');
const pad = n => String(n).padStart(2, '0');
const slot = d => { const w = d.getDay(); return w === 4 ? '20:00' : [2,3,5].includes(w) ? '20:30' : w === 1 ? '12:30' : w === 6 ? '11:00' : '21:00'; };
const posts = cal.map(e => {
  const d = new Date(START.getTime() + (e.day - 1) * 86400000);
  const datetime = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${slot(d)}`;
  const images = (byday[e.day] || []).sort((a,b)=>a.idx-b.idx).map(x => x.file);
  return { day: e.day, datetime, topic: e.topicTag, images, text: e.body, reply: e.replyFirstComment };
});
writeFileSync('posts.json', JSON.stringify(posts, null, 1));
console.log('posts.json:', posts.length, '天；含圖', posts.filter(p=>p.images.length).length, '；純文字', posts.filter(p=>!p.images.length).length);
