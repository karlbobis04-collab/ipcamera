const express = require('express');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
ffmpeg.setFfmpegPath('C:/ffmpeg/bin/ffmpeg.exe');
const app = express();
const PORT = 3000;
const rtspUrl = "rtsp://admin:TA1234567*@69.219.107.207:554/media/video1";

// create public folder if not exists
if (!fs.existsSync('public')) {
    fs.mkdirSync('public');
}

const outputPath = path.join(__dirname, "public/stream.m3u8");

// Correct MIME types for HLS (required for playback in browsers)
const mimeTypes = {
  '.m3u8': 'application/vnd.apple.mpegurl',
  '.ts': 'video/MP2T'
};
app.use((req, res, next) => {
  const ext = path.extname(req.path);
  if (mimeTypes[ext]) res.setHeader('Content-Type', mimeTypes[ext]);
  next();
});

ffmpeg(rtspUrl)
  .addOptions([
    '-rtsp_transport tcp',
    '-c:v copy',
    '-f hls',
    '-hls_time 2',
    '-hls_list_size 3',
    '-hls_flags delete_segments'
  ])
  .output(outputPath)
  .on('start', () => console.log('FFmpeg started'))
  .on('error', err => console.error(err))
  .run();

app.use(express.static('public'));

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running. Open in browser (video player):`);
    console.log(`  http://localhost:${PORT}/`);
    console.log(`  http://192.168.145.76:${PORT}/`);
});
