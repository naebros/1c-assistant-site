# 1C AI Assistant Site

Static site for the 1C AI Assistant project. Plain HTML/CSS/JS — no build step.

## Files

- `index.html` — markup
- `style.css` — all styles
- `app.js` — all behavior (i18n, feature rendering, chat)
- `animations.js` — Lottie animation data for feature icons
- `worker.js` — Cloudflare Worker proxy that keeps the Groq API key server-side
- `DEPLOY.md` — how to set up the proxy and connect the site to it

## Local development

```bash
python3 -m http.server 8000
# or: npx serve .
```

Then open http://localhost:8000

The chat widget needs a working `CHAT_ENDPOINT` (see `DEPLOY.md`) to get real
replies; without it you'll see the generic error message, which is expected.

## Deploy

Push to `main` — GitHub Actions/Pages serves the static files directly.
See `DEPLOY.md` for setting up the chat proxy (one-time setup).

## License

MIT
