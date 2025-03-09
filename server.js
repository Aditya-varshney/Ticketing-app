const express = require('express');
const http = require('http');
const next = require('next');
const { createProxyMiddleware } = require('http-proxy-middleware');
const initSocket = require('./src/lib/socket/socket').default;

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = express();

  // Set up API proxy for development - Fixed configuration
  // Remove this proxy middleware as it's causing issues
  // Next.js App Router handles API routes internally
  
  // Handle all routes with Next.js
  server.all('*', (req, res) => {
    return handle(req, res);
  });

  // Create HTTP server
  const httpServer = http.createServer(server);

  // Initialize Socket.io
  initSocket(httpServer);

  // Start the server
  const PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${PORT}`);
  });
});
