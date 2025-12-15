import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';

dotenv.config();

import config from '../backend/src/config/index.js';
import { testConnection } from '../backend/src/config/database.js';
import routes from '../backend/src/routes/index.js';
import { errorHandler, notFoundHandler } from '../backend/src/middleware/errorHandler.js';

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production'
  });
});

// API routes
app.use('/api', routes);

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

export default app;
