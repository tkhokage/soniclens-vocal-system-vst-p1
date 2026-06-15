const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');

const app = express();
app.use(bodyParser.json({ limit: '5mb' }));

// simple in-memory stream registry
const streams = new Map();

app.post('/chat', (req, res) => {
  const { message } = req.body || {};
  const id = crypto.randomBytes(8).toString('hex');

  // create a simple stream buffer
  streams.set(id, { clients: [], buffer: [] });

  // enqueue a simple assistant reply (placeholder logic)
  // In production you can call OpenAI here and stream chunks into the SSE clients
  const reply = generateAssistantReply(message);

  // push simulated chunks
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

function generateAssistantReply(message) {
  // Basic rule-based replies to surface site/plugin info.
  if (!message) return 'Hi — ask me about an uploaded file or the plugin chain used for a song.';
  const m = message.toLowerCase();
  if (m.includes('plugins') || m.includes('plugin')) {
    return 'This project recommends plugin chains such as AutoTune (pitch correction), FabFilter Pro-Q (eq), Waves CLA-2A (compressor). Preset configs: Retune Speed 0ms; EQ: boost 2k by 2dB; Comp ratio 4:1. You can find these plugins in typical plugin stores (Antares, FabFilter, Waves).';
  }
  if (m.includes('youtube') || m.includes('link')) {
    return 'For YouTube links we extract audio and run stem separation. The recommended workflow: extract with yt-dlp, run local separation (spleeter/uvr) and then apply the DAW preset chain from the UI.';
  }
  return "I can summarise the website, list the plugin chain used by an uploaded file (if you uploaded metadata), and show where to find the plugins. Try asking 'what plugins were used on the uploaded file?'.";
}

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => console.log(`AI chat server running on http://localhost:${PORT}`));
