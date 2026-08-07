const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Setup directories (use /tmp on Vercel serverless environment)
const UPLOADS_DIR = process.env.VERCEL ? '/tmp/uploads' : path.join(__dirname, 'uploads');
const DATA_FILE = process.env.VERCEL ? '/tmp/data_store.json' : path.join(__dirname, 'data_store.json');
const PUBLIC_DIR = path.join(__dirname, 'public');


if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use(express.static(PUBLIC_DIR));
app.use('/uploads', express.static(UPLOADS_DIR));

// Storage Engine for Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 200 * 1024 * 1024 } // 200MB max per file
});

// Load / Save Data Persistence
let clips = [];

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      clips = JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error reading data store:', err);
    clips = [];
  }
}

function saveData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(clips, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing data store:', err);
  }
}

loadData();

// Cleanup Expired Clips
function cleanupExpired() {
  const now = Date.now();
  let modified = false;
  
  clips = clips.filter(clip => {
    if (clip.expiresAt && clip.expiresAt < now) {
      modified = true;
      if (clip.type === 'file' && clip.fileInfo && clip.fileInfo.path) {
        try {
          if (fs.existsSync(clip.fileInfo.path)) {
            fs.unlinkSync(clip.fileInfo.path);
          }
        } catch (e) {
          console.error('Error deleting expired file:', e);
        }
      }
      return false; // Remove
    }
    return true; // Keep
  });

  if (modified) {
    saveData();
  }
}

// Run cleanup every 60 seconds
setInterval(cleanupExpired, 60000);

// Helper: Generate Unique Numeric PIN (4 digits or 6 digits)
function generateUniquePin() {
  cleanupExpired();
  let pin;
  let attempts = 0;
  do {
    pin = Math.floor(1000 + Math.random() * 9000).toString();
    attempts++;
    if (attempts > 50) {
      pin = Math.floor(100000 + Math.random() * 900000).toString();
    }
  } while (clips.some(c => c.pin === pin));
  return pin;
}

// REST API Endpoints

// 1. Create Text / Link Clip
app.post('/api/clip', (req, res) => {
  const { title, content, expiryMinutes } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Content is required' });
  }

  const durationMs = (expiryMinutes && parseInt(expiryMinutes) > 0) 
    ? parseInt(expiryMinutes) * 60 * 1000 
    : 30 * 60 * 1000; // 30 Minutes default

  const isUrl = /^(http|https):\/\/[^ "]+$/.test(content.trim());

  const newClip = {
    id: 'clip_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    pin: generateUniquePin(),
    type: isUrl ? 'url' : 'text',
    title: title || (isUrl ? 'Shared Web Link' : 'Quick Clipboard Note'),
    content: content.trim(),
    createdAt: Date.now(),
    expiresAt: Date.now() + durationMs,
    views: 0
  };

  clips.unshift(newClip);
  saveData();

  res.json({ success: true, clip: newClip });
});

// 2. Upload File Clip with Error Handling & Extended Timeout
app.post('/api/upload', (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      console.error('Multer upload error:', err);
      return res.status(400).json({ error: `Upload limit exceeded: ${err.message}` });
    } else if (err) {
      console.error('File processing error:', err);
      return res.status(500).json({ error: `File upload error: ${err.message}` });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const expiryMinutes = req.body.expiryMinutes || 30; // 30 Minutes default
    const durationMs = parseInt(expiryMinutes) * 60 * 1000;

    
    const originalName = req.file.originalname;
    const ext = path.extname(originalName).toLowerCase();
    
    let fileCategory = 'document';
    if (['.ppt', '.pptx', '.key', '.odp'].includes(ext)) fileCategory = 'presentation';
    else if (['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'].includes(ext)) fileCategory = 'image';
    else if (['.mp4', '.mov', '.avi', '.mkv', '.webm'].includes(ext)) fileCategory = 'video';
    else if (['.mp3', '.wav', '.aac', '.m4a', '.ogg', '.flac'].includes(ext)) fileCategory = 'audio';
    else if (['.pdf'].includes(ext)) fileCategory = 'pdf';
    else if (['.zip', '.rar', '.7z', '.tar', '.gz'].includes(ext)) fileCategory = 'archive';
    else if (['.js', '.py', '.html', '.css', '.json', '.cpp', '.java', '.txt'].includes(ext)) fileCategory = 'code';

    const newClip = {
      id: 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      pin: generateUniquePin(),
      type: 'file',
      title: req.body.title || originalName,
      category: fileCategory,
      createdAt: Date.now(),
      expiresAt: Date.now() + durationMs,
      views: 0,
      fileInfo: {
        originalName: originalName,
        storedName: req.file.filename,
        mimeType: req.file.mimetype,
        size: req.file.size,
        path: req.file.path,
        url: `/uploads/${req.file.filename}`
      }
    };

    clips.unshift(newClip);
    saveData();

    res.json({ success: true, clip: newClip });
  });
});


// 3. Fetch Clip by PIN
app.get('/api/pin/:pin', (req, res) => {
  cleanupExpired();
  const pin = req.params.pin.trim();
  const clip = clips.find(c => c.pin === pin);

  if (!clip) {
    return res.status(404).json({ error: 'PIN not found or clip has expired!' });
  }

  clip.views = (clip.views || 0) + 1;
  saveData();

  res.json({ success: true, clip });
});

// 4. Get all active clips for Vault view
app.get('/api/clips', (req, res) => {
  cleanupExpired();
  res.json({ success: true, clips });
});

// 5. Delete a clip
app.delete('/api/clips/:id', (req, res) => {
  const clipId = req.params.id;
  const index = clips.findIndex(c => c.id === clipId);

  if (index === -1) {
    return res.status(404).json({ error: 'Clip not found' });
  }

  const [removed] = clips.splice(index, 1);
  if (removed.type === 'file' && removed.fileInfo && removed.fileInfo.path) {
    try {
      if (fs.existsSync(removed.fileInfo.path)) {
        fs.unlinkSync(removed.fileInfo.path);
      }
    } catch (e) {
      console.error('Error removing file on delete:', e);
    }
  }

  saveData();
  res.json({ success: true, message: 'Deleted successfully' });
});

// 6. Download file endpoint
app.get('/api/download/:id', (req, res) => {
  cleanupExpired();
  const clip = clips.find(c => c.id === req.params.id);

  if (!clip || clip.type !== 'file' || !clip.fileInfo) {
    return res.status(404).send('File not found or expired.');
  }

  const filePath = clip.fileInfo.path;
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File missing from disk.');
  }

  res.download(filePath, clip.fileInfo.originalName);
});

// 7. Get Cloud Server Stats
app.get('/api/stats', (req, res) => {
  cleanupExpired();
  const totalClips = clips.length;
  const fileClips = clips.filter(c => c.type === 'file');
  const textClips = clips.filter(c => c.type !== 'file');
  
  let totalBytes = 0;
  fileClips.forEach(f => {
    if (f.fileInfo && f.fileInfo.size) {
      totalBytes += f.fileInfo.size;
    }
  });

  res.json({
    success: true,
    stats: {
      totalClips,
      fileCount: fileClips.length,
      textCount: textClips.length,
      totalBytes,
      formattedStorage: formatBytes(totalBytes),
      uptime: process.uptime()
    }
  });
});

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

const HOST = process.env.HOST || '127.0.0.1';

// Export app for Vercel Serverless deployment
module.exports = app;

if (require.main === module) {
  app.listen(PORT, HOST, () => {
    console.log(`=======================================================`);
    console.log(`⚡ Personal Cloud Server is running on http://${HOST}:${PORT}`);
    console.log(`=======================================================`);
  });
}


