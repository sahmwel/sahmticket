// app.js - Entry point for CloudLinux
require('./preload.cjs');

// Now import your main server (ES module)
import('./server.js').catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
});