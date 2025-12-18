// start.cjs - CommonJS wrapper to launch your ESM app on cPanel
import('./server.js').catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});