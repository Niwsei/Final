import { createApp } from './app';
import { logger } from './utils/logger';
import * as dotenv from 'dotenv';

dotenv.config();

const port = process.env.PORT || 3001;
const app = createApp();

const server = app.listen(port, () => {
  logger.info(`Server is running at http://localhost:${port}`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
  });
});
