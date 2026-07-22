/**
 * Cloudflare Worker — Groq proxy for 1C AI Assistant.
 *
 * Keeps the Groq API key server-side. The static site calls this Worker
 * instead of calling Groq directly, so the key never reaches the browser.
 *
 * Deployment: see DEPLOY.md.
 */

const SYSTEM_PROMPT = `You are an AI assistant for the 1C AI Assistant project. Your only task is to help users with questions about this project.

## About the project
1C AI Assistant is a free open-source 1C:Enterprise extension (CFE) with a chat interface and on-premise Go gateway. It connects 1C to LLMs and MCP tools.

## Features
- AI chat inside 1C
- Object context — questions about current catalog, document, report
- Image support (Vision)
- On-premise gateway
- MCP support
- Background request processing
- Chat history

## Supported LLMs
- OpenAI (GPT-4o, GPT-4, GPT-3.5)
- Ollama — local models
- Any OpenAI-compatible API

## Project structure
- cfe/ — 1C configuration extension
- gateway/ — Go gateway (HTTP API + MCP + LLM)
- docs/ — documentation

## Installation
1. Import CFE extension into 1C configuration
2. Deploy and run the Go gateway
3. Set gateway address in 1C settings
4. Open chat form and start talking

## License: MIT
## Repository: https://github.com/voskorbin/1c-ai-assistant

If the question is NOT about 1C AI Assistant, 1C, LLM, MCP, or the gateway, reply: "I don't specialize in this. I focus on the 1C AI Assistant project." Reply concisely in the user's language. Do not use emojis. Reply with plain text only, no HTML/XML tags.`;

const ALLOWED_ORIGINS = [
  'https://naebros.github.io',
];

const MAX_MESSAGES = 20;
const MAX_MESSAGE_CHARS = 4000;

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0] || '*';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function isValidMessage(m) {
  return (
    m &&
    (m.role === 'user' || m.role === 'assistant') &&
    typeof m.content === 'string' &&
    m.content.length > 0 &&
    m.content.length <= MAX_MESSAGE_CHARS
  );
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const headers = corsHeaders(origin);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    const messages = Array.isArray(body.messages) ? body.messages.filter(isValidMessage) : [];
    if (messages.length === 0) {
      return new Response(JSON.stringify({ error: 'No valid messages provided' }), {
        status: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    const trimmedMessages = messages.slice(-MAX_MESSAGES);

    try {
      const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'openai/gpt-oss-120b',
          messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...trimmedMessages],
          max_tokens: 1200,
          temperature: 0.5,
        }),
      });

      if (!groqResponse.ok) {
        console.error('Groq API error:', groqResponse.status, await groqResponse.text());
        return new Response(JSON.stringify({ error: 'Upstream error' }), {
          status: 502,
          headers: { ...headers, 'Content-Type': 'application/json' },
        });
      }

      const data = await groqResponse.json();
      const reply = data.choices?.[0]?.message?.content || '';

      return new Response(JSON.stringify({ reply }), {
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    } catch (err) {
      console.error('Worker error:', err);
      return new Response(JSON.stringify({ error: 'Internal error' }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }
  },
};
