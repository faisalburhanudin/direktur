import { type Request, type Response } from 'express';
import BrowserManager from '../automation/browser-manager.js';
import ScreenshotCapture from '../automation/screenshot-capture.js';
import ScreenshotWebSocketServer from './websocket-server.js';

const browserManager = new BrowserManager();
const screenshotCaptures = new Map<string, ScreenshotCapture>();

export const launchBrowser = async (_req: Request, res: Response) => {
    try {
        await browserManager.launch();
        res.json({ 
            success: true, 
            message: 'Browser launched successfully',
            isRunning: browserManager.isRunning()
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: 'Failed to launch browser',
            details: error instanceof Error ? error.message : String(error)
        });
    }
};

export const navigateToPage = async (req: Request, res: Response) => {
    try {
        const { url, pageId = 'default' } = req.body;
        
        if (!url) {
            return res.status(400).json({ 
                success: false, 
                error: 'URL is required' 
            });
        }

        const page = await browserManager.navigateTo(url, pageId);
        const title = await page.title();
        
        res.json({ 
            success: true, 
            message: `Navigated to ${url}`,
            pageId,
            title,
            url: page.url()
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: 'Failed to navigate to page',
            details: error instanceof Error ? error.message : String(error)
        });
    }
};

export const closePage = async (req: Request, res: Response) => {
    try {
        const { pageId = 'default' } = req.body;
        
        await browserManager.closePage(pageId);
        
        res.json({ 
            success: true, 
            message: `Page ${pageId} closed successfully`
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: 'Failed to close page',
            details: error instanceof Error ? error.message : String(error)
        });
    }
};

export const restartBrowser = async (_req: Request, res: Response) => {
    try {
        await browserManager.restart();
        
        res.json({ 
            success: true, 
            message: 'Browser restarted successfully',
            isRunning: browserManager.isRunning()
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: 'Failed to restart browser',
            details: error instanceof Error ? error.message : String(error)
        });
    }
};

export const closeBrowser = async (_req: Request, res: Response) => {
    try {
        await browserManager.close();
        
        res.json({ 
            success: true, 
            message: 'Browser closed successfully',
            isRunning: browserManager.isRunning()
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: 'Failed to close browser',
            details: error instanceof Error ? error.message : String(error)
        });
    }
};

export const getBrowserStatus = async (_req: Request, res: Response) => {
    try {
        res.json({ 
            success: true, 
            isRunning: browserManager.isRunning()
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: 'Failed to get browser status',
            details: error instanceof Error ? error.message : String(error)
        });
    }
};

export const startScreenshotStream = async (req: Request, res: Response, wsServer: ScreenshotWebSocketServer) => {
    try {
        const { pageId = 'default', options = {} } = req.body;
        
        // Get the page from browser manager
        const page = await browserManager.getPage(pageId);
        if (!page) {
            return res.status(404).json({
                success: false,
                error: `Page ${pageId} not found. Please navigate to a page first.`
            });
        }

        // Create screenshot capture instance
        const screenshotCapture = new ScreenshotCapture(options);
        await screenshotCapture.initialize(page);

        // Set up event listener to broadcast screenshots
        screenshotCapture.on('screenshot', (data) => {
            wsServer.broadcastScreenshot(data.data, data.trigger, pageId);
        });

        // Store the capture instance
        screenshotCaptures.set(pageId, screenshotCapture);

        // Notify WebSocket clients
        wsServer.broadcastStatus(`Screenshot streaming started for page ${pageId}`, pageId);

        res.json({
            success: true,
            message: `Screenshot streaming started for page ${pageId}`,
            pageId,
            connectedClients: wsServer.getConnectedClientsCount()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to start screenshot streaming',
            details: error instanceof Error ? error.message : String(error)
        });
    }
};

export const stopScreenshotStream = async (req: Request, res: Response) => {
    try {
        const { pageId = 'default' } = req.body;
        
        const screenshotCapture = screenshotCaptures.get(pageId);
        if (!screenshotCapture) {
            return res.status(404).json({
                success: false,
                error: `No screenshot stream found for page ${pageId}`
            });
        }

        await screenshotCapture.destroy();
        screenshotCaptures.delete(pageId);

        res.json({
            success: true,
            message: `Screenshot streaming stopped for page ${pageId}`,
            pageId
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to stop screenshot streaming',
            details: error instanceof Error ? error.message : String(error)
        });
    }
};

export const getScreenshotStreamStatus = async (_req: Request, res: Response) => {
    try {
        const activeStreams = Array.from(screenshotCaptures.entries()).map(([pageId, capture]) => ({
            pageId,
            isActive: capture.isInitialized()
        }));

        res.json({
            success: true,
            activeStreams,
            totalStreams: activeStreams.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to get screenshot stream status',
            details: error instanceof Error ? error.message : String(error)
        });
    }
};

export const clickAtCoordinate = async (req: Request, res: Response) => {
    try {
        const { x, y, pageId = 'default' } = req.body;
        
        if (typeof x !== 'number' || typeof y !== 'number') {
            return res.status(400).json({ 
                success: false, 
                error: 'x and y coordinates are required and must be numbers' 
            });
        }

        const page = await browserManager.getPage(pageId);
        if (!page) {
            return res.status(404).json({
                success: false,
                error: `Page ${pageId} not found. Please navigate to a page first.`
            });
        }

        // Get viewport size for debugging
        const viewport = page.viewportSize();
        console.log('Browser viewport:', viewport);
        console.log(`Clicking at coordinates: (${x}, ${y})`);
        
        await page.mouse.click(x, y);
        
        res.json({ 
            success: true, 
            message: `Clicked at coordinates (${x}, ${y}) on page ${pageId}`,
            x,
            y,
            pageId,
            viewport
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: 'Failed to click at coordinates',
            details: error instanceof Error ? error.message : String(error)
        });
    }
};

export const scrapeHackerNewsJobs = async (req: Request, res: Response) => {
    try {
        const { pageId = 'default' } = req.body;
        
        // Navigate to HackerNews jobs page
        const page = await browserManager.navigateTo('https://news.ycombinator.com/jobs', pageId);
        
        // Wait for page to load
        await page.waitForTimeout(2000);
        
        // Simple scraping - get all job links
        const jobs = await page.evaluate(() => {
            const jobElements = document.querySelectorAll('tr.athing');
            const jobData: any[] = [];
            
            jobElements.forEach((element, index) => {
                const titleElement = element.querySelector('.titleline > a');
                const title = titleElement?.textContent?.trim() || '';
                const url = titleElement?.getAttribute('href') || '';
                const rank = element.querySelector('.rank')?.textContent?.replace('.', '') || '';
                
                if (title) {
                    jobData.push({
                        rank: rank || (index + 1).toString(),
                        title,
                        url: url.startsWith('http') ? url : `https://news.ycombinator.com/${url}`,
                        id: element.id || `job-${index}`
                    });
                }
            });
            
            return jobData;
        });
        
        res.json({
            success: true,
            message: `Scraped ${jobs.length} jobs from HackerNews`,
            jobs,
            pageId,
            url: page.url()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to scrape HackerNews jobs',
            details: error instanceof Error ? error.message : String(error)
        });
    }
};