import { BotFrameworkAdapter, ConversationState, MemoryStorage, TurnContext } from 'botbuilder';
import { AwaleBot } from './awaleBot';
import * as restify from 'restify';

// Create adapter and conversation state
const adapter = new BotFrameworkAdapter({
  appId: process.env.MICROSOFT_APP_ID,
  appPassword: process.env.MICROSOFT_APP_PASSWORD
});

// Create storage and conversation state
const memoryStorage = new MemoryStorage();
const conversationState = new ConversationState(memoryStorage);

// Create the main bot instance
const bot = new AwaleBot(conversationState);

// Error handling
adapter.onTurnError = async (context: TurnContext, error: Error) => {
  console.error('[onTurnError]:', error);
  await context.sendActivity('Sorry, it looks like something went wrong. Please try again.');
  
  // Log conversation state for debugging
  if (conversationState) {
    try {
      await conversationState.delete(context);
    } catch (err) {
      console.error('[onTurnError] Error deleting conversation state:', err);
    }
  }
};

// Create HTTP server
const server = restify.createServer();
server.use(restify.plugins.bodyParser());

// Listen for incoming requests
server.post('/api/messages', async (req, res) => {
  try {
    await adapter.processActivity(req, res, async (context) => {
      await bot.run(context);
    });
  } catch (error) {
    console.error('Error processing activity:', error);
    res.status(500);
    res.end();
  }
});

// Health check endpoint
server.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Start server
const port = process.env.PORT || 3978;
server.listen(port, () => {
  console.log(`🎮 Awale Teams Bot is running on port ${port}`);
  console.log(`🔗 Bot endpoint: http://localhost:${port}/api/messages`);
  console.log(`❤️ Health check: http://localhost:${port}/health`);
});

export default server;