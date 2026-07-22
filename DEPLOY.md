# Деплой: сайт + прокси

Сайт — статика (`index.html`, `style.css`, `app.js`, `animations.js`). Ключ Groq больше
нигде не хранится на клиенте — за него отвечает отдельный Cloudflare Worker (`worker.js`).

## 1. Разверни Worker (один раз)

Нужен бесплатный аккаунт на [cloudflare.com](https://dash.cloudflare.com) и `npm`.

```bash
npm install -g wrangler
wrangler login
```

В папке с `worker.js` создай `wrangler.toml`:

```toml
name = "1c-ai-proxy"
main = "worker.js"
compatibility_date = "2026-07-01"
```

Задай секрет (ключ никогда не попадёт в код или в git):

```bash
wrangler secret put GROQ_API_KEY
# вставь свой ключ Groq, когда попросит
```

Открой `worker.js` и впиши домен(ы), с которых сайт будет обращаться к прокси,
в `ALLOWED_ORIGINS` — например:

```js
const ALLOWED_ORIGINS = [
  'https://voskorbin.github.io',
];
```

Задеплой:

```bash
wrangler deploy
```

Wrangler выведет URL вида `https://1c-ai-proxy.<твой-субдомен>.workers.dev` — это твой `CHAT_ENDPOINT`.

## 2. Укажи endpoint в сайте

В `index.html`, прямо перед подключением `app.js`, добавь:

```html
<script>window.CHAT_ENDPOINT = 'https://1c-ai-proxy.<твой-субдомен>.workers.dev';</script>
<script src="app.js"></script>
```

(Либо просто поменяй `const CHAT_ENDPOINT = window.CHAT_ENDPOINT || '/api/chat';`
в `app.js` на прямой URL воркера — оба варианта рабочие, первый удобнее, если
захочешь разные endpoint для локальной разработки и прод.)

## 3. Задеплой сайт как обычно

Push в `main` → GitHub Pages подхватит статику. Никакие GitHub Secrets для
фронта больше не нужны — секрет живёт только в Cloudflare (`wrangler secret`).

## Важно

- **Старый ключ `gsk_...`, который был в `config.js`, нужно отозвать в Groq
  Console** (Settings → API Keys) и создать новый — именно его вписывать в
  `wrangler secret put GROQ_API_KEY`. Раскрытый ключ считается скомпрометированным,
  даже если сайт ещё не был опубликован.
- `config.js` из старой версии сайта больше не нужен — удали его, ключ теперь
  нигде не лежит в статике.
- Проверить, что Worker жив: `curl -X POST https://<worker-url> -H "Content-Type: application/json" -d '{"messages":[{"role":"user","content":"привет"}]}'`
