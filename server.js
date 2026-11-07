import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import * as catalog from './providers/catalog.js';
import * as tryon from './providers/tryon.js';

const app = express();
const { OPENAI_API_KEY, OPENAI_MODEL = 'gpt-4o-mini', ALLOWED_ORIGIN = '*', PORT = 3000 } = process.env;

app.use(cors({ origin: ALLOWED_ORIGIN }));
app.use(express.json({ limit: '12mb' }));
app.use(rateLimit({ windowMs: 60_000, limit: 40 }));

const LANGS = { it: 'Italian', en: 'English', fr: 'French', de: 'German', es: 'Spanish', ro: 'Romanian', ar: 'Arabic', ru: 'Russian' };

async function openai(messages) {
  if (!OPENAI_API_KEY) { const e = new Error('OPENAI_API_KEY non impostata sul server'); e.status = 501; throw e; }
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + OPENAI_API_KEY },
    body: JSON.stringify({ model: OPENAI_MODEL, messages, temperature: 0.7 })
  });
  if (!r.ok) { const e = new Error('OpenAI ' + r.status); e.status = 502; throw e; }
  const d = await r.json();
  return d.choices?.[0]?.message?.content ?? '';
}

app.get('/health', (_q, res) => res.json({
  ok: true, openai: !!OPENAI_API_KEY, catalog: !!process.env.CATALOG_PROVIDER, tryon: !!process.env.TRYON_PROVIDER
}));

// Stilista AI
app.post('/api/stylist', async (req, res, next) => {
  try {
    const msgs = Array.isArray(req.body.messages) ? req.body.messages.slice(-12) : [];
    const clean = msgs.filter(m => ['user', 'assistant'].includes(m.role) && typeof m.content === 'string').map(m => ({ role: m.role, content: m.content.slice(0, 2000) }));
    if (!clean.length) return res.status(400).json({ error: 'messages mancanti' });
    const lang = LANGS[req.body.lang] || 'Italian';
    const system = `You are ProvaPrima's personal fashion stylist. Reply in ${lang}. Suggest complete outfits (pieces, colors, occasions). Never invent shops, prices, availability or links: describe items generically so the user can search for them.`;
    const reply = await openai([{ role: 'system', content: system }, ...clean]);
    res.json({ reply });
  } catch (e) { next(e); }
});

// Da foto di un capo a termini di ricerca (modello con visione)
app.post('/api/vision', async (req, res, next) => {
  try {
    const { image } = req.body;
    if (typeof image !== 'string' || !image.startsWith('data:image/')) return res.status(400).json({ error: 'image (data URL) mancante' });
    const text = await openai([{ role: 'user', content: [
      { type: 'text', text: 'Describe this garment as a short product search query (type, color, material, style). Reply with the query only.' },
      { type: 'image_url', image_url: { url: image } }] }]);
    res.json({ query: text.trim() });
  } catch (e) { next(e); }
});

app.get('/api/catalog/search', async (req, res, next) => {
  try { res.json({ items: await catalog.search(req.query) }); } catch (e) { next(e); }
});

app.post('/api/tryon', async (req, res, next) => {
  try {
    const { person, garment } = req.body;
    if (![person, garment].every(x => typeof x === 'string' && x.startsWith('data:image/'))) return res.status(400).json({ error: 'person e garment (data URL) richiesti' });
    res.json(await tryon.tryOn({ person, garment }));
  } catch (e) { next(e); }
});

app.use((e, _q, res, _n) => {
  console.error(new Date().toISOString(), e.status || 500, e.message);
  res.status(e.status || 500).json({ error: e.message });
});

app.listen(PORT, () => console.log('ProvaPrima backend su porta ' + PORT));
