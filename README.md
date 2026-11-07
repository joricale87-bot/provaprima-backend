# ProvaPrima backend

## Avvio locale
1. Installa Node.js 18 o superiore.
2. `npm install`
3. Imposta le variabili (vedi `.env.example`), poi: `OPENAI_API_KEY=sk-... npm start`
4. Prova: apri `http://localhost:3000/health`

## Hosting (Render, Railway, Fly, ecc.)
Carica la cartella, comando di avvio `npm start`, e aggiungi `OPENAI_API_KEY` nelle variabili d'ambiente del servizio.
Poi incolla l'indirizzo pubblico (https://...) nella Home di ProvaPrima, campo "Indirizzo del backend".
Imposta `ALLOWED_ORIGIN` sul dominio da cui apri la pagina.

## Endpoint
- GET  /health
- POST /api/stylist  { messages, lang }   -> OpenAI (funziona con la sola chiave)
- POST /api/vision   { image }            -> OpenAI, da foto a query di ricerca
- GET  /api/catalog/search                -> richiede un provider (providers/catalog.js)
- POST /api/tryon    { person, garment }  -> richiede un provider (providers/tryon.js)

Catalogo e camerino rispondono 501 finché non implementi un provider reale. Nessun dato finto.
La chiave API resta solo qui, mai nel frontend. Non pubblicare mai il file .env.
