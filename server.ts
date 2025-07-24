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
  getScreenshotStreamStatus
} from './src/services/automation-api.js';
import ScreenshotWebSocketServer from './src/services/websocket-server.js';

dotenv.config();

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
    const { message, url } = req.body;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY!,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `You are helping analyze a webpage at ${url}. The user asks: ${message}`
        }]
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'API request failed');
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
app.post('/api/browser/close-page', closePage);
app.post('/api/browser/restart', restartBrowser);
app.post('/api/browser/close', closeBrowser);
app.get('/api/browser/status', getBrowserStatus);

// Screenshot streaming endpoints
app.post('/api/screenshots/start', (req, res) => startScreenshotStream(req, res, wsServer));
app.post('/api/screenshots/stop', stopScreenshotStream);
app.get('/api/screenshots/status', getScreenshotStreamStatus);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket server available at ws://localhost:${PORT}/screenshots`);
});