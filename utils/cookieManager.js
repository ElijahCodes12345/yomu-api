const fs = require('fs/promises');
const path = require('path');
const os = require('os');

const COOKIE_DIR = path.join(os.tmpdir(), 'yomu_cookies');

/**
 * Manages simple JSON-based cookie persistence in the system's temp directory.
 */
class CookieManager {
    static async ensureDir() {
        try {
            await fs.mkdir(COOKIE_DIR, { recursive: true });
        } catch (err) {
            // Ignore if exists
        }
    }

    static getFilePath(domain) {
        const safeDomain = domain.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        return path.join(COOKIE_DIR, `${safeDomain}.json`);
    }

    static async saveCookies(domain, cookies, userAgent = null) {
        await this.ensureDir();
        const filePath = this.getFilePath(domain);
        const data = {
            timestamp: Date.now(),
            cookies: cookies,
            userAgent: userAgent
        };
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    }

    static async getCookies(domain, maxAgeMs = 1000 * 60 * 60 * 24 * 30) { // Default 30 days
        const filePath = this.getFilePath(domain);
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            const data = JSON.parse(content);
            
            // Check expiry
            if (Date.now() - data.timestamp > maxAgeMs) {
                return null;
            }
            
            return { cookies: data.cookies, userAgent: data.userAgent };
        } catch (err) {
            return null;
        }
    }


    static async clearCookies(domain) {
        const filePath = this.getFilePath(domain);
        try {
            await fs.unlink(filePath);
        } catch (err) {
            // Ignore
        }
    }
}

module.exports = CookieManager;
