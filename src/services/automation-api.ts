import { Request, Response } from 'express';
import BrowserManager from '../automation/browser-manager.js';

const browserManager = new BrowserManager();

export const launchBrowser = async (req: Request, res: Response) => {
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

export const restartBrowser = async (req: Request, res: Response) => {
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

export const closeBrowser = async (req: Request, res: Response) => {
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

export const getBrowserStatus = async (req: Request, res: Response) => {
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