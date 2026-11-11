import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { config } from './config.js';
import { errorHandler } from './middleware/errorHandler.js';
import { sanitizeBody } from './middleware/sanitize.js';
import authRoutes from './routes/auth.js';
import ideasRoutes from './routes/ideas.js';
import metaRoutes from './routes/meta.js';
import notificationsRoutes from './routes/notifications.js';
import usersRoutes from './routes/users.js';

export const app = express();

app.use(helmet());
app.use(
  cors({
    origin: config.clientUrl,
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: '100kb' }));
app.use(sanitizeBody);

app.use('/uploads', express.static(config.uploadsDir));

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/ideas', ideasRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api', metaRoutes);

app.use((req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found.',
    },
  });
});

app.use(errorHandler);
