const app = require('./app');
const config = require('./config');

const server = app.listen(config.PORT, () => {
  console.log(`[LifeLink] Backend API running on port ${config.PORT}`);
  console.log(`[LifeLink] Environment: Production-Ready Node.js + SQLite Engine`);
});

process.on('SIGINT', () => {
  server.close(() => {
    console.log('[LifeLink] Gracefully shutting down');
    process.exit(0);
  });
});
