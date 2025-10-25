const axios = require('axios');

class RequestManager {
  constructor() {
    this.defaultHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    };
  }

  async request(url, method = 'GET', data = {}, options = {}, scrapingMethod = 'axios') {
    console.log(`[${scrapingMethod}] ${url}`);
    const headers = { ...this.defaultHeaders, ...options.headers };

    try {
      if (scrapingMethod === 'axios') {
        const config = {
          method,
          url,
          headers,
          ...options
        };

        if (['POST', 'PUT'].includes(method.toUpperCase())) {
          config.data = data;
        }

        const response = await axios(config);
        return response.data;
      } 
      
      if (scrapingMethod === 'cloudscraper') {
        const cloudscraper = require('cloudscraper');
        return await cloudscraper({
          method,
          url,
          headers,
          body: ['POST', 'PUT'].includes(method.toUpperCase()) ? data : undefined,
          ...options
        });
      }
      
      if (scrapingMethod === 'playwright') {
        const playwright = require('playwright');
        const browser = await playwright.chromium.launch({ headless: true });
        const context = await browser.newContext({ userAgent: headers['User-Agent'] });
        const page = await context.newPage();
        
        await page.goto(url, { waitUntil: 'networkidle' });
        if (options.waitForSelector) {
          await page.waitForSelector(options.waitForSelector);
        }
        
        const html = await page.content();
        await browser.close();
        return html;
      }
      
      throw new Error(`Scraping method '${scrapingMethod}' not supported`);
    } catch (error) {
      throw new Error(`${method.toUpperCase()} request with ${scrapingMethod} failed: ${error.message}`);
    }
  }
}

module.exports = new RequestManager();