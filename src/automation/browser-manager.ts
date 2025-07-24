import { chromium, Browser, Page } from 'patchright';

class BrowserManager {
    private browser: Browser | null = null;
    private pages: Map<string, Page> = new Map();

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
                '--disable-setuid-sandbox'
            ]
        });

        return this.browser;
    }

    async createPage(pageId: string = 'default'): Promise<Page> {
        if (!this.browser) {
            await this.launch();
        }

        const page = await this.browser!.newPage();
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
        }

        await page.goto(url);
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