const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
app.use(bodyParser.json({ limit: '50mb' }));
const fs = require('fs');

// simple in-memory stream registry
const streams = new Map();

app.post('/chat', async (req, res) => {
  const { message, context } = req.body || {};
  const id = crypto.randomBytes(8).toString('hex');

  // create a simple stream buffer
  streams.set(id, { clients: [], buffer: [] });

  // If OPENAI_API_KEY is present, use OpenAI streaming API
  if (process.env.OPENAI_API_KEY) {
    try {
      // Build system prompt using context
      const system = buildSystemPrompt(context);
      const payload = {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: message }
        ],
        stream: true
      };

      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify(payload)
      });

      if (!resp.ok) {
        const text = await resp.text();
        console.error('OpenAI error', text);
      }

      // stream response chunks to registered clients
      (async () => {
        const reader = resp.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let done = false;
        let buffer = '';
        while (!done) {
          const { value, done: d } = await reader.read();
          done = d;
          if (value) {
            buffer += decoder.decode(value, { stream: true });
            const parts = buffer.split('\n\n');
            buffer = parts.pop();
            for (const part of parts) {
              if (part.startsWith('data: ')) {
                const payload = part.replace(/^data: /, '').trim();
                if (payload === '[DONE]') {
                  const doneMsg = JSON.stringify({ event: 'done' });
                  streams.get(id)?.clients.forEach((c) => c.write(`data: ${doneMsg}\n\n`));
                  continue;
                }
                try {
                  const parsed = JSON.parse(payload);
                  const delta = parsed.choices?.[0]?.delta?.content || '';
                  if (delta) {
                    const data = JSON.stringify({ event: 'chunk', text: delta });
                    streams.get(id)?.clients.forEach((c) => c.write(`data: ${data}\n\n`));
                  }
                } catch (err) {
                  console.error('parse stream chunk error', err);
                }
              }
            }
          }
        }
      })();

      res.json({ id });
      return;
    } catch (err) {
      console.error('streaming error', err);
    }
  }

  // Fallback: simulated reply when no API key
  const reply = generateAssistantReply(message, context);
  const chunks = chunkString(reply, 120);
  let i = 0;
  const iv = setInterval(() => {
    const s = streams.get(id);
    if (!s) return clearInterval(iv);
    const data = JSON.stringify({ event: 'chunk', text: chunks[i] });
    s.clients.forEach((c) => c.write(`data: ${data}\n\n`));
    i++;
    if (i >= chunks.length) {
      const done = JSON.stringify({ event: 'done' });
      s.clients.forEach((c) => c.write(`data: ${done}\n\n`));
      clearInterval(iv);
    }
  }, 220);

  res.json({ id });
});

// Analyze uploaded audio file and return simulated plugin chain
app.post('/analyze', (req, res) => {
  try {
    const { filename, url } = req.body || {};
    const name = filename || (url ? url : 'uploaded_audio.wav');
    const lower = String(name).toLowerCase();

    let detectedChain = [];
    if (lower.includes('youtube') || lower.includes('youtu.')) {
      // YouTube URL: simulate extraction + separation and return recommended chain
      detectedChain = [
        { pluginName: 'Auto-Tune Pro', category: 'Pitch Correction', purpose: 'Pitch correction for vocals', keySettings: 'Retune Speed: 0ms', knobSettings: { 'Retune Speed': 0 } },
        { pluginName: 'FabFilter Pro-Q 3', category: 'EQ', purpose: 'Vocal presence boost', keySettings: 'Boost 2.2kHz +3dB', knobSettings: { '2.2kHz': '+3dB' } },
        { pluginName: 'Waves CLA-2A', category: 'Compressor', purpose: 'Vocal leveling', keySettings: 'Ratio 4:1', knobSettings: { 'Ratio': 4 } },
      ];
    } else if (lower.includes('vocal') || lower.includes('vox') || lower.includes('singer')) {
      detectedChain = [
        { pluginName: 'Auto-Tune Pro', category: 'Pitch Correction', purpose: 'Pitch correction', keySettings: 'Retune Speed: 0ms', knobSettings: { 'Retune Speed': 0 } },
        { pluginName: 'FabFilter Pro-Q 3', category: 'EQ', purpose: 'Presence boost', keySettings: 'Boost 2.2kHz +3dB', knobSettings: { '2.2kHz': '+3dB' } },
        { pluginName: 'Waves CLA-2A', category: 'Compressor', purpose: 'Vocal leveling', keySettings: 'Ratio 4:1', knobSettings: { 'Ratio': 4 } },
      ];
    } else if (lower.includes('mix') || lower.includes('full')) {
      detectedChain = [
        { pluginName: 'FabFilter Pro-Q 3', category: 'EQ', purpose: 'Mastering EQ', keySettings: 'Low cut 30Hz', knobSettings: { 'Low cut': 30 } },
        { pluginName: 'Valhalla VintageVerb', category: 'Reverb', purpose: 'Space', keySettings: 'Decay 2.1s', knobSettings: { 'Decay': 2.1 } },
      ];
    } else {
      // Generic heuristic based on filename
      detectedChain = [
        { pluginName: 'Auto-Tune Pro', category: 'Pitch Correction', purpose: 'Subtle pitch', keySettings: 'Retune Speed: 12ms', knobSettings: { 'Retune Speed': 12 } },
        { pluginName: 'Saturation (Decapitator)', category: 'Saturation', purpose: 'Warmth', keySettings: 'Drive: 24%', knobSettings: { 'Drive': 24 } },
      ];
    }

    res.json({ detectedChain });
  } catch (err) {
    console.error('analyze error', err);
    res.status(500).json({ error: 'analysis failed' });
  }
});

app.get('/stream/:id', (req, res) => {
  const { id } = req.params;
  const s = streams.get(id);
  if (!s) return res.status(404).send('not found');

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  s.clients.push(res);

  req.on('close', () => {
    s.clients = s.clients.filter((c) => c !== res);
  });
});

function chunkString(str, length) {
  const result = [];
  for (let i = 0, charsLength = str.length; i < charsLength; i += length) {
    result.push(str.substring(i, i + length));
  }
  return result;
}

function buildSystemPrompt(context) {
  const parts = [
    'You are an assistant that knows about the Voice Analyzer web app and audio plugin chains. Provide concise, actionable answers.'
  ];
  if (context) {
    if (context.activeRecipe) {
      parts.push(`Active recipe: ${JSON.stringify(context.activeRecipe)}`);
    }
    if (context.uploadedFiles) {
      parts.push(`Uploaded files: ${JSON.stringify(context.uploadedFiles)}`);
    }
    if (context.settings) {
      parts.push(`Current settings: ${JSON.stringify(context.settings)}`);
    }
  }
  return parts.join('\n');
}

function generateAssistantReply(message, context) {
  if (!message) return 'Hi — ask me about an uploaded file or the plugin chain used for a song.';
  const m = message.toLowerCase();
  if (m.includes('plugins') || m.includes('plugin')) {
    // If we have context, try to summarise plugin chains from it
    if (context && context.activeRecipe && context.activeRecipe.detectedChain) {
      const chain = context.activeRecipe.detectedChain.map((p) => `${p.pluginName} (${p.category}) — ${p.keySettings || ''}`).join('; ');
      return `Detected plugin chain: ${chain}`;
    }
    return 'This project recommends plugin chains such as AutoTune (pitch correction), FabFilter Pro-Q (eq), Waves CLA-2A (compressor). Typical settings: Retune Speed 0ms; EQ boost around 2k +2dB; Compressor ratio 4:1.';
  }
  if (m.includes('youtube') || m.includes('link')) {
    return 'For YouTube links we extract audio and run stem separation. Recommended workflow: extract with yt-dlp, run separation (Spleeter/UVR), then apply DAW presets from the UI.';
  }
  return "I can summarise the website, list the plugin chain used by an uploaded file (if you uploaded metadata), and show where to find the plugins. Try asking 'what plugins were used on the uploaded file?'.";
}

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => console.log(`AI chat server running on http://localhost:${PORT}`));
