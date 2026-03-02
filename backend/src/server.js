require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const logger = require('./utils/logger');
const { generalLimiter } = require('./middleware/rateLimit');
const { errorHandler } = require('./middleware/errorHandler');

// Routes
const authRoutes = require('./routes/auth');
const fileRoutes = require('./routes/files');
const folderRoutes = require('./routes/folders');
const shareRoutes = require('./routes/share');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Security Headers ────────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
  })
);

// ─── CORS ────────────────────────────────────────────────────────────────────
// FRONTEND_URL can be comma-separated for multiple Vercel domains
const allowedOrigins = [
  ...( (process.env.FRONTEND_URL || 'http://localhost:3000')
        .split(',').map((o) => o.trim()) ),
  'http://localhost:3000',
  'http://localhost:3001',
];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // allow server-to-server / same-origin
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // Allow all Vercel preview deployments for this project
      if (origin.match(/https:\/\/docdrive[a-z0-9-]*\.vercel\.app$/)) return callback(null, true);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true, // Required for cookies
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ─── Body Parsing ────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ─── Logging ─────────────────────────────────────────────────────────────────
app.use(
  morgan('combined', {
    stream: { write: (msg) => logger.info(msg.trim()) },
  })
);

// ─── Rate Limiting ───────────────────────────────────────────────────────────
app.use('/api', generalLimiter);

// ─── Trust Proxy (Render/Railway) ────────────────────────────────────────────
app.set('trust proxy', 1);

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── API Routes ──────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/share', shareRoutes);
app.use('/api/admin', adminRoutes);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint not found' });
});

// ─── Global Error Handler ────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ────────────────────────────────────────────────────────────
const { query: dbQuery } = require('./config/database');

const runStartupMigrations = async () => {
  try {
    await dbQuery(`ALTER TABLE files ADD COLUMN IF NOT EXISTS is_starred BOOLEAN NOT NULL DEFAULT FALSE`);
    logger.info('Startup migrations complete');
  } catch (err) {
    logger.warn('Startup migration warning:', err.message);
  }
};

app.listen(PORT, async () => {
  await runStartupMigrations();
  logger.info(`Doc Drive backend running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});

module.exports = app;
