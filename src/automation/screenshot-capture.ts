import { type Page, type CDPSession } from 'patchright';
import { EventEmitter } from 'events';

// Extend Window interface for custom properties
declare global {
    interface Window {
        __screenshotCaptureEvent?: boolean;
        __screenshotMutationObserver?: MutationObserver;
    }
}

export interface ScreenshotCaptureOptions {
    quality?: number;
    format?: 'png' | 'jpeg';
    periodicInterval?: number;
    enableEventCapture?: boolean;
    enableMutationObserver?: boolean;
}

export class ScreenshotCapture extends EventEmitter {
    private page: Page | null = null;
    private cdpSession: CDPSession | null = null;
    private periodicTimer: NodeJS.Timeout | null = null;
    private options: Required<ScreenshotCaptureOptions>;
    private mutationObserverScript: string;

    constructor(options: ScreenshotCaptureOptions = {}) {
        super();
        this.options = {
            quality: options.quality ?? 80,
            format: options.format ?? 'png',
            periodicInterval: options.periodicInterval ?? 2000,
            enableEventCapture: options.enableEventCapture ?? true,
            enableMutationObserver: options.enableMutationObserver ?? true,
        };

        this.mutationObserverScript = `
            (function() {
                if (window.__screenshotMutationObserver) return;
                
                const observer = new MutationObserver(() => {
                    window.__screenshotCaptureEvent = true;
                });
                
                observer.observe(document.body, {
                    childList: true,
                    subtree: true,
                    attributes: true,
                    attributeOldValue: false,
                    characterData: true,
                    characterDataOldValue: false
                });
                
                window.__screenshotMutationObserver = observer;
            })();
        `;
    }

    async initialize(page: Page): Promise<void> {
        this.page = page;
        
        try {
            // Initialize CDP session
            this.cdpSession = await page.context().newCDPSession(page);
            await this.cdpSession.send('Page.enable');
            await this.cdpSession.send('Runtime.enable');
        } catch (error) {
            console.warn('CDP session initialization failed, using Playwright fallback:', error);
        }

        // Set up event listeners
        if (this.options.enableEventCapture) {
            await this.setupEventCapture();
        }

        // Set up MutationObserver
        if (this.options.enableMutationObserver) {
            await this.setupMutationObserver();
        }

        // Start periodic capture
        this.startPeriodicCapture();
    }

    private async setupEventCapture(): Promise<void> {
        if (!this.page) return;

        // Capture on page interactions
        this.page.on('console', () => this.captureScreenshot('console'));
        
        // Add event listeners for user interactions
        await this.page.addInitScript(() => {
            window.addEventListener('scroll', () => {
                window.__screenshotCaptureEvent = true;
            }, { passive: true });
            
            window.addEventListener('click', () => {
                window.__screenshotCaptureEvent = true;
            }, { passive: true });
            
            window.addEventListener('keydown', () => {
                window.__screenshotCaptureEvent = true;
            }, { passive: true });
            
            window.addEventListener('resize', () => {
                window.__screenshotCaptureEvent = true;
            }, { passive: true });
        });
    }

    private async setupMutationObserver(): Promise<void> {
        if (!this.page) return;

        try {
            await this.page.addInitScript(this.mutationObserverScript);
        } catch (error) {
            console.warn('Failed to setup MutationObserver:', error);
        }
    }

    private async captureScreenshotCDP(): Promise<Buffer | null> {
        if (!this.cdpSession) return null;

        try {
            const result = await this.cdpSession.send('Page.captureScreenshot', {
                format: this.options.format,
                quality: this.options.quality,
                captureBeyondViewport: false,
            });

            return Buffer.from(result.data, 'base64');
        } catch (error) {
            console.warn('CDP screenshot capture failed:', error);
            return null;
        }
    }

    private async captureScreenshotPlaywright(): Promise<Buffer | null> {
        if (!this.page) return null;

        try {
            return await this.page.screenshot({
                type: this.options.format,
                quality: this.options.format === 'jpeg' ? this.options.quality : undefined,
                fullPage: false,
            });
        } catch (error) {
            console.warn('Playwright screenshot capture failed:', error);
            return null;
        }
    }

    async captureScreenshot(trigger: string = 'manual'): Promise<Buffer | null> {
        if (!this.page) {
            console.warn('Page not initialized for screenshot capture');
            return null;
        }

        // Try CDP first, fallback to Playwright
        let screenshot = await this.captureScreenshotCDP();
        if (!screenshot) {
            screenshot = await this.captureScreenshotPlaywright();
        }

        if (screenshot) {
            this.emit('screenshot', {
                data: screenshot,
                trigger,
                timestamp: Date.now(),
            });
        }

        return screenshot;
    }

    private startPeriodicCapture(): void {
        if (this.periodicTimer) {
            clearInterval(this.periodicTimer);
        }

        this.periodicTimer = setInterval(async () => {
            if (!this.page) return;

            try {
                // Check if there was any activity
                const hasActivity = await this.page.evaluate(() => {
                    if (window.__screenshotCaptureEvent) {
                        window.__screenshotCaptureEvent = false;
                        return true;
                    }
                    return false;
                });

                // Always capture periodically, but mark the trigger appropriately
                const trigger = hasActivity ? 'activity' : 'periodic';
                await this.captureScreenshot(trigger);
            } catch (error) {
                if ((error as Error).message?.includes('Execution context was destroyed') || 
                    (error as Error).message?.includes('because of a navigation')) {
                    console.warn('Screenshot capture skipped due to navigation');
                } else {
                    console.warn('Periodic screenshot capture failed:', error);
                }
            }
        }, this.options.periodicInterval);
    }

    async forceCapture(): Promise<Buffer | null> {
        return this.captureScreenshot('forced');
    }

    async updateOptions(newOptions: Partial<ScreenshotCaptureOptions>): Promise<void> {
        this.options = { ...this.options, ...newOptions };
        
        if (newOptions.periodicInterval !== undefined) {
            this.startPeriodicCapture();
        }
    }

    async destroy(): Promise<void> {
        if (this.periodicTimer) {
            clearInterval(this.periodicTimer);
            this.periodicTimer = null;
        }

        if (this.cdpSession) {
            try {
                await this.cdpSession.detach();
            } catch (error) {
                console.warn('Error detaching CDP session:', error);
            }
            this.cdpSession = null;
        }

        // Clean up MutationObserver
        if (this.page && this.options.enableMutationObserver) {
            try {
                await this.page.evaluate(() => {
                    if (window.__screenshotMutationObserver) {
                        window.__screenshotMutationObserver.disconnect();
                        delete window.__screenshotMutationObserver;
                    }
                });
            } catch (error) {
                if ((error as Error).message?.includes('Execution context was destroyed') || 
                    (error as Error).message?.includes('because of a navigation')) {
                    console.warn('MutationObserver cleanup skipped due to navigation');
                } else {
                    console.warn('Error cleaning up MutationObserver:', error);
                }
            }
        }

        this.page = null;
        this.removeAllListeners();
    }

    isInitialized(): boolean {
        return this.page !== null;
    }

    getPage(): Page | null {
        return this.page;
    }
}

export default ScreenshotCapture;