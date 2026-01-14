const axios = require('axios');
const BypassSolver = require('./solver');

const CookieManager = require('./cookieManager');

class RequestManager {
  constructor() {
    this.defaultHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'document',
      'sec-fetch-mode': 'navigate',
      'sec-fetch-site': 'none',
      'sec-fetch-user': '?1',
      'upgrade-insecure-requests': '1'
    };
  }

  async request(url, method = 'GET', data = {}, options = {}, scrapingMethod = 'axios') {
    console.log(`[${scrapingMethod}] ${url}`);
    
    // Determine if we should use Cloudflare bypass
    const useCloudflare = options.useCloudflare || scrapingMethod === 'playwright-cf' || scrapingMethod === 'cloudscraper';
    const domain = new URL(url).hostname;

    const executeRequest = async (currentCookies = null, customUA = null, forcePlaywright = false) => {
      const headers = { ...this.defaultHeaders, ...options.headers };
      if (currentCookies) {
        headers['Cookie'] = BypassSolver.formatCookieString(currentCookies);
      }
      if (customUA) {
        headers['User-Agent'] = customUA;
      }

      if (scrapingMethod === 'playwright' || options.forcePlaywright || forcePlaywright) {
        const { launchBrowser } = require('./browser');
        const browser = await launchBrowser();
        const context = await browser.newContext({ userAgent: headers['User-Agent'] });
        
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


        if (currentCookies) await context.addCookies(currentCookies);
        const page = await context.newPage();
        
        // Use a longer timeout and safer wait strategy
        const timeout = options.timeout || 60000;
        page.setDefaultNavigationTimeout(timeout);
        
        try {
          console.log(`[RequestManager] Playwright navigating with ${timeout}ms timeout...`);
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
          
          // Wait for title transition and content to not be a challenge
          const start = Date.now();
          const limit = 50000; // max extra 50s wait
          let content = '';
          
          while (Date.now() - start < limit) {
              content = await page.content();
              const title = await page.title();
              
              const isChallenge = title.includes('Just a moment') || 
                                title.includes('Checking your browser') ||
                                content.includes('cf-challenge') || 
                                content.includes('__cf_chl_opt') ||
                                content.includes('ray-id');

              if (!isChallenge) {
                  break;
              }
              
              if (Date.now() - start > limit - 5000) {
                 throw new Error(`Cloudflare challenge resolution timed out after ${limit}ms for ${url}`);
              }

              // Small human-like interaction
              await page.mouse.move(Math.random() * 400, Math.random() * 400);
              
              console.log(`[RequestManager] Playwright still on challenge page... waiting. (Title: "${title}")`);
              await page.waitForTimeout(4000);
          }

          
          // Final check or extra wait for JS heavy sites
          await page.waitForTimeout(options.waitForTimeout || 3000);
          content = await page.content();


          const innerText = await page.evaluate(() => document.body?.innerText || '');

          // Try to parse text as JSON first
          const cleanText = (innerText || '').trim();
          if (cleanText.startsWith('{') && cleanText.endsWith('}')) {
              try {
                  const jsonData = JSON.parse(cleanText);
                  console.log(`[RequestManager] Successfully extracted JSON from Playwright innerText.`);
                  return jsonData;
              } catch (e) {}
          }

          const bodyMatch = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
          const bodyContent = bodyMatch ? bodyMatch[1].trim() : (content || '').trim();

          console.log(`[RequestManager] Playwright result obtained. Snippet: ${typeof content === 'string' ? content.substring(0, 200).replace(/\n/g, ' ') : 'Object'}`);


          // Check if body content looks like a complete JSON object
          if (bodyContent.startsWith('{') && bodyContent.endsWith('}')) {
              try {
                  return JSON.parse(bodyContent);
              } catch (e) {}
          }
          
          return content;
        } finally {
          await browser.close();
        }

      }

      // Default to axios
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
      const result = response.data;

      // Check if we hit a challenge page despite 200 status
      if (useCloudflare && typeof result === 'string') {
        const isChallenge = result.includes('id="cf-challenge"') || 
                          result.includes('__cf_chl_opt') || 
                          result.includes('<title>Just a moment...</title>') ||
                          result.includes('Checking your browser');
        
        if (isChallenge) {
          throw new Error('Cloudflare challenge detected in response');
        }
      }


      return result;
    };

    try {
      let cookies = null;
      let cachedUA = null;
      if (useCloudflare) {
        const cached = await CookieManager.getCookies(domain);
        if (cached) {
            cookies = cached.cookies;
            cachedUA = cached.userAgent;
        }
      }

      return await executeRequest(cookies, cachedUA);

    } catch (error) {
      const is403 = error.response && error.response.status === 403;
      const isCF = error.message.includes('Cloudflare') || error.message.includes('challenge');

      if (useCloudflare && (is403 || isCF)) {
        console.log(`[RequestManager] 403 or Cloudflare detected for ${domain}. Attempting bypass...`);
        try {
          const { cookies: freshCookies, userAgent, content, text } = await BypassSolver.getCookies(url, true);
          
          if (content) {
            console.log(`[RequestManager] Bypass successful. Returning content directly from browser.`);
            
            // Try to parse text as JSON first (common for direct JSON routes)
            const cleanText = (text || '').trim();
            if (cleanText.startsWith('{') && cleanText.endsWith('}')) {
                try {
                    const jsonData = JSON.parse(cleanText);
                    console.log(`[RequestManager] Successfully extracted JSON from bypass innerText.`);
                    return jsonData;
                } catch (e) {}
            }

            // Fallback: Check if body content looks like a complete JSON object
            const bodyMatch = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
            const bodyContent = bodyMatch ? bodyMatch[1].trim() : (content || '').trim();

            if (bodyContent.startsWith('{') && bodyContent.endsWith('}')) {
                try {
                    return JSON.parse(bodyContent);
                } catch (e) {}
            }
            return content;
          }


          console.log(`[RequestManager] Bypass successful. Retrying request with fresh cookies (UA Sync)...`);
          
          try {
            return await executeRequest(freshCookies, userAgent);
          } catch (retryError) {
             console.log(`[RequestManager] Axios retry failed even with fresh cookies. Falling back to Playwright for this request.`);
             return await executeRequest(freshCookies, userAgent, true);
          }

        } catch (bypassError) {
          console.error(`[RequestManager] Bypass failed:`, bypassError.message);
          throw new Error(`Cloudflare bypass failed for ${url}: ${bypassError.message}`);
        }
      }


      if (error.response) {
        console.error('Error Response Data:', error.response.data);
      }
      throw new Error(`${method.toUpperCase()} request with ${scrapingMethod} failed: ${error.message}`);
    }
  }
}

module.exports = new RequestManager();