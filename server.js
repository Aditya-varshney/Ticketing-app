const express = require('express');
const http = require('http');
const next = require('next');
const initSocket = require('./src/lib/socket/socket');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = express();
  
  // Create HTTP server
  const httpServer = http.createServer(server);
  
  // Initialize Socket.io with proper path
  const io = initSocket(httpServer);
  
  // Performance optimization for static files
  const cacheTime = dev ? 0 : '7d'; // 7 days cache in production
  server.use(express.static('public', {
    maxAge: cacheTime,
    etag: true,
    lastModified: true,
    immutable: !dev,
  }));
  
  // Add cache headers for API responses
  server.use((req, res, next) => {
    // Don't cache auth routes
    if (req.url.startsWith('/api/auth')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    } else if (req.url.startsWith('/api/') && !req.url.includes('socket.io')) {
      // Short cache for other API routes (5 seconds)
      res.setHeader('Cache-Control', 'public, max-age=5, s-maxage=10');
    }
    next();
  });
  
  // Handle all routes with Next.js
  server.all('*', (req, res) => {
    return handle(req, res);
  });

  // Start the server
  const PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${PORT}`);
  });
});
