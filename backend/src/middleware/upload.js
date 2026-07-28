const path = require('node:path');
const fs = require('node:fs');
const multer = require('multer');
const { newId } = require('../utils/ids');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', '..', 'data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${newId('img')}${ext}`);
  },
});

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new Error('Formato de imagem não suportado.'));
    }
    cb(null, true);
  },
});

// Relative path stored in DB / served statically from /uploads
function relativeUploadPath(filename) {
  return `/uploads/${filename}`;
}

module.exports = { upload, relativeUploadPath, UPLOAD_DIR };
