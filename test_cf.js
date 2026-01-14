const requestManager = require('./utils/requestManager');
const { launchBrowser } = require('./utils/browser');

async function testProcess() {
    const url = 'https://flamecomics.xyz';
    console.log(`--- Testing process for ${url} ---`);
    console.log('Mode: Headless FALSE (Visible)');
    
    // Set env to see browser 
    process.env.CHROME_HEADLESS = 'false';
    
    try {
        console.log('Starting search test (Scraping Method: playwright)...');
        // Use 'playwright' directly to test the Playwright flow
        const result = await requestManager.request(url, 'GET', {}, {timeout: 60000}, 'playwright');
        
        console.log('\nSUCCESS!');
        console.log('Result length:', result.length);
        console.log('Result snippet:', result.substring(0, 5000).replace(/\n/g, ' '));
        
    } catch (error) {
        console.error('\nPROCESS FAILED:', error.message);
    } finally {
        console.log('\nTest complete. Press Enter to exit.');
        await new Promise(resolve => process.stdin.once('data', resolve));
        process.exit();
    }
}

testProcess();
