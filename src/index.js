import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { securityMiddleware, globalRateLimit, authRateLimit } from './middleware/security.js';

import authRoutes from './routes/auth.routes.js';
import usersRoutes from './routes/users.routes.js';
import propertiesRoutes from './routes/properties.routes.js';
import invoicesRoutes from './routes/invoices.routes.js';
import categoriesRoutes from './routes/categories.routes.js';
import bookingsRoutes from './routes/bookings.routes.js';
import errorHandler from './middleware/errorHandler.js';

const app = express();

// ─── Security & utility middleware ───────────────────────────────────────────
app.use(...securityMiddleware);
app.use(cors({ origin: config.corsOrigins, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(globalRateLimit);
app.use('/api/auth', authRateLimit);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/properties', propertiesRoutes);
app.use('/api/invoices', invoicesRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/bookings', bookingsRoutes);

// ─── 404 & error handler ─────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`🚀  DalaliMkononi API running on port ${config.port} [${config.nodeEnv}]`);
  console.log(`    Health check: http://localhost:${config.port}/health`);
});
