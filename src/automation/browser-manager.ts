import { chromium, type Browser, type Page } from 'patchright';

class BrowserManager {
    private browser: Browser | null = null;
    private pages: Map<string, Page> = new Map();
    
    // Standard viewport dimensions for consistent screenshots
    private readonly VIEWPORT_WIDTH = 1920;
    private readonly VIEWPORT_HEIGHT = 1080;

    async launch(): Promise<Browser> {
        if (this.browser) {
            return this.browser;
        }

        this.browser = await chromium.launch({
            headless: false,
            args: [
                '--disable-web-security',
                '--disable-blink-features=AutomationControlled',
                '--disable-dev-shm-usage',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                `--window-size=${this.VIEWPORT_WIDTH},${this.VIEWPORT_HEIGHT}`,
                '--force-device-scale-factor=1',
                '--disable-extensions',
                '--disable-plugins'
            ]
        });

        return this.browser;
    }

    async createPage(pageId: string = 'default'): Promise<Page> {
        if (!this.browser) {
            await this.launch();
        }

        const page = await this.browser!.newPage();
        
        // Set viewport to consistent dimensions
        await page.setViewportSize({ width: this.VIEWPORT_WIDTH, height: this.VIEWPORT_HEIGHT });
        
        this.pages.set(pageId, page);
        
        return page;
    }

    async getPage(pageId: string = 'default'): Promise<Page | undefined> {
        return this.pages.get(pageId);
    }

    async navigateTo(url: string, pageId: string = 'default'): Promise<Page> {
        let page = this.pages.get(pageId);
        
        if (!page) {
            page = await this.createPage(pageId);
        } else {
            // Ensure existing page has correct viewport
            const currentViewport = page.viewportSize();
            if (!currentViewport || currentViewport.width !== this.VIEWPORT_WIDTH || currentViewport.height !== this.VIEWPORT_HEIGHT) {
                await page.setViewportSize({ width: this.VIEWPORT_WIDTH, height: this.VIEWPORT_HEIGHT });
            }
        }

        try {
            await page.goto(url, { waitUntil: 'load', timeout: 30000 });
        } catch (error: any) {
            if (error.message?.includes('ERR_ABORTED') || error.message?.includes('net::ERR_ABORTED')) {
                console.warn(`Navigation to ${url} was aborted, but continuing with page`);
            } else {
                throw error;
            }
        }
        return page;
    }

    async closePage(pageId: string = 'default'): Promise<void> {
        const page = this.pages.get(pageId);
        if (page) {
            await page.close();
            this.pages.delete(pageId);
        }
    }

    async restart(): Promise<void> {
        await this.close();
        await this.launch();
    }

    async close(): Promise<void> {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.pages.clear();
        }
    }

    isRunning(): boolean {
        return this.browser !== null;
    }
}

export default BrowserManager;