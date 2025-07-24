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