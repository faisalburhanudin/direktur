import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { 
  launchBrowser, 
  navigateToPage, 
  closePage, 
  restartBrowser, 
  closeBrowser, 
  getBrowserStatus,
  startScreenshotStream,
  stopScreenshotStream,
  getScreenshotStreamStatus,
  clickAtCoordinate,
  scrapeHackerNewsJobs
} from './src/services/automation-api.js';
import ScreenshotWebSocketServer from './src/services/websocket-server.js';

dotenv.config();

// Check for required environment variables
if (!process.env.CLAUDE_API_KEY) {
  console.error('❌ Error: CLAUDE_API_KEY environment variable is required');
  console.error('Please set your Claude API key in a .env file or environment variable');
  process.exit(1);
}

const app = express();
const PORT = 3001;
const server = createServer(app);

// Initialize WebSocket server
const wsServer = new ScreenshotWebSocketServer({
  server,
  path: '/screenshots'
});

// Start WebSocket server
wsServer.start().catch(console.error);

app.use(cors());
app.use(express.json());

app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { message, url, automationData } = req.body;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY!,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: automationData 
            ? `You are analyzing HackerNews job data. Here are the jobs I found:\n\n${JSON.stringify(automationData, null, 2)}\n\nUser request: ${message}`
            : `You are helping analyze a webpage at ${url}. The user asks: ${message}`
        }]
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Claude API error response:', data);
      throw new Error(data.error?.message || `API request failed with status ${response.status}`);
    }

    res.json({ 
      response: data.content[0].text 
    });
  } catch (error) {
    console.error('Chat API error:', error);
    res.status(500).json({ 
      error: 'Failed to get response from Claude',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Browser automation endpoints
app.post('/api/browser/launch', launchBrowser);
app.post('/api/browser/navigate', navigateToPage);
app.post('/api/browser/click', clickAtCoordinate);
app.post('/api/browser/close-page', closePage);
app.post('/api/browser/restart', restartBrowser);
app.post('/api/browser/close', closeBrowser);
app.get('/api/browser/status', getBrowserStatus);

// Screenshot streaming endpoints
app.post('/api/screenshots/start', (req, res) => startScreenshotStream(req, res, wsServer));
app.post('/api/screenshots/stop', stopScreenshotStream);
app.get('/api/screenshots/status', getScreenshotStreamStatus);

// HackerNews scraping endpoint
app.post('/api/hackernews/scrape-jobs', scrapeHackerNewsJobs);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket server available at ws://localhost:${PORT}/screenshots`);
});