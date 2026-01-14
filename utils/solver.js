const { launchBrowser } = require('./browser');
const CookieManager = require('./cookieManager');

/**
 * Reusable utility to bypass bot protection and get valid session cookies.
 */
class BypassSolver {
    /**
     * Attempts to get valid session cookies for a given domain.
     * @param {string} url The target URL
     * @param {boolean} forceRefresh Whether to bypass cache and fetch new cookies
     */
    static async getCookies(url, forceRefresh = false) {
        const domain = new URL(url).hostname;
        
        if (!forceRefresh) {
            const cached = await CookieManager.getCookies(domain);
            if (cached) {
                console.log(`[Solver] Using cached cookies/UA for ${domain}`);
                return { cookies: cached.cookies, userAgent: cached.userAgent };
            }
        }

        console.log(`[Solver] Fetching new session for ${domain}...`);
        const browser = await launchBrowser();
        try {
            const context = await browser.newContext();
            
            // Manual evasion: Hide properties that flag automation
            await context.addInitScript(() => {
                // Hide webdriver
                Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
                // Mock Chrome
                window.chrome = { runtime: {} };
                // Mock Permissions
                const originalQuery = window.navigator.permissions.query;
                window.navigator.permissions.query = (parameters) => (
                    parameters.name === 'notifications' ?
                        Promise.resolve({ state: Notification.permission }) :
                        originalQuery(parameters)
                );
                // Mock Plugins/Languages
                Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
                Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
            });

            const page = await context.newPage();
            const userAgent = await page.evaluate(() => navigator.userAgent);

            // Set a generous navigation timeout
            page.setDefaultNavigationTimeout(60000);

            console.log(`[Solver] Navigating to ${url} to solve challenge...`);
            await page.goto(url, { waitUntil: 'domcontentloaded' });
            
            // Wait for potential challenges to resolve
            const startTime = Date.now();
            const maxWait = 45000;
            let finalContent = null;

            while (Date.now() - startTime < maxWait) {
                const title = await page.title();
                const cookies = await context.cookies();
                const clearance = cookies.find(c => c.name === 'cf_clearance');
                
                finalContent = await page.content();
                const isChallenge = title.includes('Just a moment') || 
                                  title.includes('Checking your browser') || 
                                  finalContent.includes('cf-challenge') ||
                                  finalContent.includes('ray-id');

                if (!isChallenge) {
                    console.log(`[Solver] Successfully bypassed protection for ${domain}`);
                    const text = await page.evaluate(() => document.body?.innerText || '');
                    
                    // Save ALL cookies and the User-Agent
                    await CookieManager.saveCookies(domain, cookies, userAgent);
                    
                    return { cookies, userAgent, content: finalContent, text };
                }

                // Try to handle Turnstile if detected
                if (finalContent.includes('cf-turnstile') || finalContent.includes('ray-id')) {
                    await page.mouse.move(Math.random() * 500, Math.random() * 500);
                }
                
                console.log(`[Solver] Waiting for session... (Cookie: ${!!clearance}, Page: "${title}")`);
                await new Promise(r => setTimeout(r, 3000));
            }

            console.warn(`[Solver] Timed out waiting for bypass for ${domain}`);
            const text = await page.evaluate(() => document.body?.innerText || '');
            return { cookies: await context.cookies(), userAgent, content: await page.content(), text };

        } catch (error) {
            console.error(`[Solver] Error during bypass for ${domain}:`, error.message);
            throw error;
        } finally {
            if (browser) await browser.close();
        }
    }

    /**
     * Formats Playwright cookies for use in Axios or other request libs.
     * @param {Array} cookies 
     * @returns {string} Cookie string
     */
    static formatCookieString(cookies) {
        return cookies.map(c => `${c.name}=${c.value}`).join('; ');
    }
}

module.exports = BypassSolver;
