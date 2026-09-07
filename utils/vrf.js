const { JSDOM } = require('jsdom');
const requestManager = require('./requestManager');

let cachedSession = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes

/**
 * Initializes or retrieves cached JSDOM session with MangaFire's VM interceptor
 */
async function getMangaFireSession(forceRefresh = false) {
    const now = Date.now();
    if (!forceRefresh && cachedSession && (now - cacheTimestamp < CACHE_TTL_MS)) {
        return cachedSession;
    }

    try {
        const homeHtml = await requestManager.request('https://mangafire.to', 'GET', {}, {}, 'cloudscraper');
        
        const configMatch = homeHtml.match(/window\.__config\s*=\s*["']([^"']+)["']/);
        const buildMatch = homeHtml.match(/window\.__build\s*=\s*["']([^"']+)["']/);
        const polyfillMatch = homeHtml.match(/https:\/\/s\.mfcdn\.nl\/build\/mf\/assets\/polyfill-[^"']+\.js/);

        if (!configMatch || !polyfillMatch) {
            throw new Error('Failed to extract __config or polyfill URL from MangaFire');
        }

        const configValue = configMatch[1];
        const buildValue = buildMatch ? buildMatch[1] : '';
        const polyfillUrl = polyfillMatch[0];

        const polyfillJs = await requestManager.request(polyfillUrl, 'GET', {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://mangafire.to/'
        }, {}, 'cloudscraper');

        const dom = new JSDOM(`<!DOCTYPE html><html><head></head><body><div id="app-root"></div></body></html>`, {
            url: 'https://mangafire.to/',
            referrer: 'https://mangafire.to/',
            contentType: 'text/html',
            runScripts: 'dangerously'
        });

        const { window } = dom;
        window.TextEncoder = TextEncoder;
        window.TextDecoder = TextDecoder;
        if (globalThis.crypto) window.crypto = globalThis.crypto;

        window.__config = configValue;
        window.__build = buildValue;
        window.__theme = { logo: '/assets/mangafire/logo.png' };

        const runnableScript = polyfillJs.replace(
            /export\s*\{\s*d\s+as\s+a[^}]*\};?/,
            'window.__setupInterceptor = d;'
        );

        window.eval(runnableScript);

        let interceptorCallback = null;
        const mockAxios = {
            interceptors: {
                request: { use: (fn) => { interceptorCallback = fn; } },
                response: { use: () => {} }
            },
            defaults: { headers: {} }
        };

        if (typeof window.__setupInterceptor === 'function') {
            window.__setupInterceptor(mockAxios);
        }

        if (!interceptorCallback) {
            throw new Error('Interceptor setup failed');
        }

        cachedSession = { interceptorCallback };
        cacheTimestamp = now;
        return cachedSession;
    } catch (error) {
        console.error('[VRF] Error initializing MangaFire session:', error.message);
        throw error;
    }
}

/**
 * Sign a MangaFire API request and generate VRF token
 * @param {string} url e.g. '/titles' or '/titles/dr-stone/chapters'
 * @param {object} params query params object e.g. { keyword: 'dr stone', page: 1 }
 * @param {string} method HTTP method e.g. 'get'
 * @returns {Promise<string>} Generated VRF string
 */
async function generate_vrf_v2(url = '/titles', params = {}, method = 'get') {
    let session = await getMangaFireSession();
    try {
        const signed = await session.interceptorCallback({
            method: method.toLowerCase(),
            url,
            baseURL: '/api',
            params: { ...params },
            headers: {}
        });
        return signed.params?.vrf || '';
    } catch (e) {
        // Try once with refreshed session
        session = await getMangaFireSession(true);
        const signed = await session.interceptorCallback({
            method: method.toLowerCase(),
            url,
            baseURL: '/api',
            params: { ...params },
            headers: {}
        });
        return signed.params?.vrf || '';
    }
}

/**
 * Legacy compatibility wrapper
 * @param {string} input 
 * @returns {string}
 */
function generate_vrf(input) {
    // For legacy callers passing string
    return '';
}

module.exports = {
    generate_vrf,
    generate_vrf_v2,
    getMangaFireSession
};
