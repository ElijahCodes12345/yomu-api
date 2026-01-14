const { chromium } = require('playwright');

async function runDirectPlaywrightTest() {
    console.log('--- Direct Playwright Debug Test ---');
    console.log('Environment: Headless FALSE');
    
    // Launch browser visibly
    const browser = await chromium.launch({ 
        headless: false,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled'
        ]
    });

    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    // Apply the same evasions we use on Vercel
    await context.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        window.chrome = { runtime: {} };
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => (
            parameters.name === 'notifications' ?
                Promise.resolve({ state: Notification.permission }) :
                originalQuery(parameters)
        );
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
        Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    });

    const page = await context.newPage();

    try {
        console.log('Navigating to flamecomics.xyz...');
        await page.goto('https://flamecomics.xyz', { waitUntil: 'domcontentloaded' });
        
        console.log('\nPage Title:', await page.title());
        
        // Monitoring loop
        const start = Date.now();
        const maxWait = 120000; // 2 minutes

        while (Date.now() - start < maxWait) {
            const title = await page.title();
            const content = await page.content();
            const cookies = await context.cookies();
            const hasClearance = cookies.some(c => c.name === 'cf_clearance');

            console.log(`[${new Date().toLocaleTimeString()}] Title: "${title}" | Clearance: ${hasClearance}`);

            if (!title.includes('Just a moment') && !content.includes('cf-challenge') && hasClearance) {
                console.log('\n✅ BROWSER PASSED CHALLENGE');
                break;
            }

            // Simulate minor movement like we do on Vercel
            await page.mouse.move(Math.random() * 500, Math.random() * 500);
            await new Promise(r => setTimeout(r, 4000));
        }

        console.log('\nTest finished. Keeping browser open for observation. Press Enter in terminal to close...');
        await new Promise(resolve => process.stdin.once('data', resolve));

    } catch (error) {
        console.error('Test Error:', error);
    } finally {
        await browser.close();
        process.exit();
    }
}

runDirectPlaywrightTest();
