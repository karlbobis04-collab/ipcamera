const express = require('express');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = parseInt(process.env.PORT || '8888', 10);
const rtspUrl = process.env.RTSP_URL || "rtsp://admin:TA1234567*@69.219.107.207:554/media/video1";
const isLinux = process.platform !== 'win32';

// FFmpeg path: on Ubuntu use /usr/bin/ffmpeg explicitly; on Windows use env or default
let ffmpegPath = process.env.FFMPEG_PATH;
if (!ffmpegPath) {
  if (isLinux && fs.existsSync('/usr/bin/ffmpeg')) {
    ffmpegPath = '/usr/bin/ffmpeg';
  } else if (!isLinux) {
    const winPath = path.join('C:\\', 'ffmpeg', 'bin', 'ffmpeg.exe');
    if (fs.existsSync(winPath)) ffmpegPath = winPath;
  }
}
if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
  console.log('FFmpeg:', ffmpegPath, isLinux ? '(Linux server)' : '(Windows)');
}

const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir);
const outputPath = path.join(publicDir, 'stream.m3u8');

function clearOldHls() {
  try {
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    fs.readdirSync(publicDir).forEach((f) => {
      if (f.startsWith('stream') && f.endsWith('.ts')) {
        fs.unlinkSync(path.join(publicDir, f));
      }
    });
  } catch (e) { console.warn('Clear HLS:', e.message); }
}

// CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const mimeTypes = { '.m3u8': 'application/vnd.apple.mpegurl', '.ts': 'video/MP2T' };
app.use((req, res, next) => {
  const ext = path.extname(req.path);
  if (mimeTypes[ext]) {
    res.setHeader('Content-Type', mimeTypes[ext]);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
  next();
});

app.use(express.static(publicDir));

app.get('/stream-status', (req, res) => {
  res.json({ streamReady: fs.existsSync(outputPath), platform: process.platform });
});

// Options that work on Windows; on Linux/server add extra robustness for remote RTSP
function getFfmpegOptions() {
  const base = [
    '-rtsp_transport tcp',
    '-c:v copy',
    '-f hls',
    '-hls_time 2',
    '-hls_list_size 3',
    '-hls_flags delete_segments'
  ];
  if (isLinux) {
    return [
      ...base,
      '-stimeout 8000000',       // 8s RTSP timeout (server often far from camera)
      '-analyzeduration 2M',
      '-probesize 2M',
      '-fflags +genpts+nobuffer',
      '-max_delay 5000000'
    ];
  }
  return base;
}

function startFfmpeg() {
  clearOldHls();
  ffmpeg(rtspUrl)
    .addOptions(getFfmpegOptions())
    .output(outputPath)
    .on('start', () => console.log('FFmpeg started'))
    .on('error', (err) => {
      console.error('FFmpeg error:', err.message);
      if (isLinux) {
        console.error('Tip: On Ubuntu, ensure the camera is reachable from this server (firewall, IP whitelist).');
        console.log('Restarting in 5s...');
        setTimeout(startFfmpeg, 5000);
      }
    })
    .run();
}

app.listen(PORT, '0.0.0.0', () => {
  console.log('Server:', 'http://localhost:' + PORT + '/');
  console.log('RTSP:', rtspUrl.replace(/:[^:@]+@/, ':***@'));
  startFfmpeg();
});
