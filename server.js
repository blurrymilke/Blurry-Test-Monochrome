const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// API base pública de Monochrome / Tidal Provider
const MONOCHROME_API_BASE = 'https://api.monochrome.tf/v1';

app.use(express.json());

// Permitir peticiones desde BitChord (CORS)
app.use((req, res, next) => {
res.header('Access-Control-Allow-Origin', '*');
res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
next();
});

// -------------------------------------------------------------
// 1. MANIFEST JSON (BitChord lee esto al pegar el enlace)
// -------------------------------------------------------------
app.get('/manifest.json', (req, res) => {
const protocol = req.protocol;
const host = req.get('host');
const baseUrl = ${protocol}://${host};

res.json({
id: "com.monochrome.hires.downloader",
name: "Monochrome Hi-Res",
version: "1.1.0",
description: "Módulo Hi-Res FLAC (24-bit/96kHz) con streaming y descargas.",
author: "Custom Addon",
type: "music_provider",
capabilities: ["search", "streaming", "download"],
endpoints: {
health: ${baseUrl}/health, search: ``${baseUrl}/search?q={query},
stream: ${baseUrl}/stream/{id}, download: ``${baseUrl}/download/{id}
}
});
});

// -------------------------------------------------------------
// 2. HEALTH CHECK
// -------------------------------------------------------------
app.get('/health', (req, res) => {
res.json({ status: 'ok', name: 'Monochrome Hi-Res Addon' });
});

// -------------------------------------------------------------
// 3. BÚSQUEDA DE CANCIONES
// -------------------------------------------------------------
app.get('/search', async (req, res) => {
const { q } = req.query;
if (!q) return res.status(400).json({ error: 'Parámetro de búsqueda requerido' });

try {
const response = await axios.get(${MONOCHROME_API_BASE}/search`, {
params: { query: q, type: 'track', limit: 20 },
timeout: 5000
});

const tracks = response.data.tracks || response.data.data || [];

const results = tracks.map(track => {
const title = track.title || 'Track';
const artist = track.artist?.name || track.artists?.[0]?.name || 'Artist';
const trackId = String(track.id);

return {
id: trackId,
title: title,
artist: artist,
album: track.album?.title || '',
duration: track.duration || 0,
cover_url: track.album?.cover_big || track.album?.cover || '',
quality: 'FLAC_24BIT',
download_url: /download/${trackId}?title={encodeURIComponent(artist)}`
};
});

res.json({ success: true, results });
} catch (error) {
res.status(500).json({ success: false, error: 'Error al buscar en Monochrome' });
}
});

// -------------------------------------------------------------
// 4. STREAMING DE AUDIO FLAC
// -------------------------------------------------------------
app.get('/stream/:id', async (req, res) => {
const { id } = req.params;

try {
const response = await axios.get(${MONOCHROME_API_BASE}/track/${id}/stream, {
params: { quality: 'HI_RES' },
timeout: 8000
});

const streamUrl = response.data.url || response.data.stream_url;

if (!streamUrl) {
return res.status(404).json({ success: false, error: 'Audio no encontrado' });
}

res.json({
success: true,
stream_url: streamUrl,
format: 'FLAC',
bit_depth: 24,
sample_rate: 96000
});
} catch (error) {
res.status(500).json({ success: false, error: 'Error al obtener el stream FLAC' });
}
});

// -------------------------------------------------------------
// 5. DESCARGA DIRECTA DE ARCHIVO .FLAC
// -------------------------------------------------------------
app.get('/download/:id', async (req, res) => {
const { id } = req.params;
const title = req.query.title || 'Track';
const artist = req.query.artist || 'Artist';

try {
const streamResponse = await axios.get(${MONOCHROME_API_BASE}/track/${id}/stream, {
params: { quality: 'HI_RES' },
timeout: 8000
});

const fileUrl = streamResponse.data.url || streamResponse.data.stream_url;

if (!fileUrl) {
return res.status(404).json({ error: 'No se encontró el archivo de descarga' });
}

const safeFilename = ${artist} - ${title}.replace(/[/\?%*:|"<>]/g, '');

res.setHeader('Content-Type', 'audio/flac');
res.setHeader('Content-Disposition', attachment; filename="${safeFilename}.flac"`);

const audioStream = await axios.get(fileUrl, { responseType: 'stream' });
audioStream.data.pipe(res);

} catch (error) {
res.status(500).json({ error: 'Error procesando la descarga' });
}
});

app.listen(PORT, () => {
console.log(Addon corriendo en puerto${PORT}`);
});