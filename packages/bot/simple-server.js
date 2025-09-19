const restify = require('restify');

// Simple test server
const server = restify.createServer();
server.use(restify.plugins.bodyParser());

// Test endpoint
server.get('/', (req, res, next) => {
  res.send('Awale Bot Test Server is running!');
  return next();
});

server.post('/api/messages', (req, res, next) => {
  console.log('Received message:', req.body);
  res.send({
    type: 'message',
    text: 'Hello from Awale Bot! Send "new game" to start playing.'
  });
  return next();
});

server.get('/api/messages', (req, res, next) => {
  res.send('Bot endpoint is active. Use POST for messages.');
  return next();
});

const port = process.env.PORT || 3978;
server.listen(port, () => {
  console.log(`Awale Bot Test Server listening on port ${port}`);
  console.log('Environment:', process.env.NODE_ENV);
  console.log('App ID:', process.env.MICROSOFT_APP_ID);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Server shutting down...');
  server.close(() => {
    process.exit(0);
  });
});

module.exports = server;