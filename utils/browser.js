const fs = require('fs/promises');
const path = require('path');
const { existsSync } = require('fs');
const os = require('os');

let chromiumBinary = null;
let chromium = null;
let useServerlessChromium = false;

// Attempt to load dependencies for serverless environment
// Helper to get raw chromium
function getRawChromium() {
    try {
        return require('playwright-core').chromium;
    } catch (e) {
        try {
            return require('playwright').chromium;
        } catch (err) {
            return null;
        }
    }
}

/**
 * Launches a Chromium browser with appropriate settings for the current environment.
 * Uses @sparticuz/chromium for serverless and raw playwright for local.
 */
async function launchBrowser() {
    const isServerless = !!(process.env.VERCEL || process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME);
    const chromium = getRawChromium();
    
    if (!chromium) {
        throw new Error('Playwright chromium not found. Please install playwright-core.');
    }

    let chromiumBinary;
    try {
        chromiumBinary = require('@sparticuz/chromium');
    } catch (e) {
        // Ignored if not serverless
    }

    const envHeadless = process.env.CHROME_HEADLESS !== undefined 
        ? String(process.env.CHROME_HEADLESS).toLowerCase() === 'true'
        : null;

    const launchOptions = {
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-blink-features=AutomationControlled',
            '--disable-gpu',
            '--no-zygote',
            '--single-process'
        ],
        headless: envHeadless !== null ? envHeadless : true,
        timeout: 60000
    };

    if (isServerless && chromiumBinary) {
        console.log('Using @sparticuz/chromium configuration');
        try {
            launchOptions.executablePath = await chromiumBinary.executablePath();
            launchOptions.args = [...chromiumBinary.args, ...launchOptions.args];
            // If binary has a specific headless requirement, use it
            if (chromiumBinary.headless !== undefined) {
                launchOptions.headless = envHeadless !== null ? envHeadless : chromiumBinary.headless;
            }
        } catch (error) {
            console.error('Error getting serverless path:', error);
        }
    }


    // Clean and dedupe args
    launchOptions.args = [...new Set(launchOptions.args)];

    // Ensure User Agent is present
    if (!launchOptions.args.some(a => a.includes('--user-agent'))) {
        launchOptions.args.push('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    }

    console.log(`Launching browser (Serverless: ${isServerless}, Headless: ${launchOptions.headless})`);
    
    try {
        return await chromium.launch(launchOptions);
    } catch (error) {
        console.error('Browser launch failed:', error.message);
        
        // Final desperate attempt with zero custom args
        console.log('Final fallback attempt...');
        const minimalOptions = { 
            headless: true,
            executablePath: launchOptions.executablePath 
        };
        return await chromium.launch(minimalOptions);
    }
}



module.exports = { launchBrowser };
