const cheerio = require('cheerio');
const requestManager = require('../utils/requestManager');

const BASE_URL = 'https://weebcentral.com';

class WeebCentral {
  constructor() {
    this.baseUrl = BASE_URL;
  }

  /**
   * Search manga by query string with optional pagination
   */
  async searchManga(query, page = 1) {
    try {
      const offset = (Math.max(1, parseInt(page, 10)) - 1) * 32;
      const url = `${this.baseUrl}/search/data?text=${encodeURIComponent(query)}&limit=32&offset=${offset}`;
      const html = await requestManager.request(url, 'GET', {}, {}, 'axios');
      const $ = cheerio.load(html);

      const results = [];
      $('article').each((index, element) => {
        const $el = $(element);
        const link = $el.find('a[href*="/series/"]').first();
        const href = link.attr('href');
        const idMatch = href ? href.match(/\/series\/([^\/]+)/) : null;
        const id = idMatch ? idMatch[1] : null;
        const title = $el.find('img').attr('alt')?.replace(/\s+cover$/i, '').trim() || link.text().trim();
        const cover = $el.find('img').attr('src');

        if (id && title) {
          results.push({
            id,
            title,
            cover,
            url: href.startsWith('http') ? href : `${this.baseUrl}${href}`
          });
        }
      });

      return results;
    } catch (error) {
      console.error('Error searching manga on WeebCentral:', error.message);
      throw new Error(`Failed to search manga: ${error.message}`);
    }
  }

  /**
   * Get detailed manga information by ID
   */
  async getMangaInfo(id) {
    try {
      const url = `${this.baseUrl}/series/${id}`;
      const html = await requestManager.request(url, 'GET', {}, {}, 'axios');
      const $ = cheerio.load(html);

      const title = $('h1').first().text().trim();
      if (!title) {
        return null;
      }

      const cover = $('picture img, img[alt*="cover"], article img').first().attr('src') || null;

      let description = '';
      $('p').each((idx, el) => {
        const pText = $(el).text().trim();
        if (pText.length > description.length && !pText.includes('Only verified users') && !pText.includes("Can't add this emoji")) {
          description = pText;
        }
      });

      let author = null;
      let type = null;
      let status = null;
      let year = null;
      const genres = [];

      $('ul li, div, section').each((idx, el) => {
        const fullText = $(el).text().trim();

        if (fullText.startsWith('Author(s):') || fullText.startsWith('Author:')) {
          author = fullText.replace(/^Author(\(s\))?:\s*/i, '').replace(/\s+/g, ' ').trim();
        }
        if (fullText.startsWith('Type:')) {
          type = fullText.replace(/^Type:\s*/i, '').replace(/\s+/g, ' ').trim();
        }
        if (fullText.startsWith('Status:')) {
          status = fullText.replace(/^Status:\s*/i, '').replace(/\s+/g, ' ').trim();
        }
        if (fullText.startsWith('Released:')) {
          year = fullText.replace(/^Released:\s*/i, '').replace(/\s+/g, ' ').trim();
        }
      });

      $('a[href*="/search/data?included_tag="], a[href*="tag="]').each((idx, el) => {
        const g = $(el).text().trim();
        if (g && !genres.includes(g)) {
          genres.push(g);
        }
      });

      return {
        id,
        title,
        cover,
        author,
        type,
        status,
        year,
        genres,
        description,
        url
      };
    } catch (error) {
      console.error(`Error getting manga info for ${id} on WeebCentral:`, error.message);
      throw new Error(`Failed to get manga info: ${error.message}`);
    }
  }

  /**
   * Fetch a random manga series
   */
  async getRandomManga() {
    try {
      const axios = require('axios');
      const response = await axios.get(`${this.baseUrl}/series/random`, {
        headers: requestManager.defaultHeaders,
        maxRedirects: 5
      });
      const finalUrl = response.request?.res?.responseUrl || response.config.url;
      const idMatch = finalUrl.match(/\/series\/([^\/]+)/);
      const id = idMatch ? idMatch[1] : null;

      if (!id) {
        throw new Error('Failed to resolve random manga series ID');
      }

      return await this.getMangaInfo(id);
    } catch (error) {
      console.error('Error fetching random manga on WeebCentral:', error.message);
      throw new Error(`Failed to fetch random manga: ${error.message}`);
    }
  }

  /**
   * Get all chapters for a manga by ID
   */
  async getChapters(id) {
    try {
      const url = `${this.baseUrl}/series/${id}/full-chapter-list`;
      const html = await requestManager.request(url, 'GET', {}, {}, 'axios');
      const $ = cheerio.load(html);

      const chapters = [];
      $('a[href*="/chapters/"]').each((idx, el) => {
        const href = $(el).attr('href');
        const chapIdMatch = href ? href.match(/\/chapters\/([^\/]+)/) : null;
        const chapterId = chapIdMatch ? chapIdMatch[1] : null;
        
        // Extract title/name
        const name = $(el).find('span').first().text().trim() || $(el).text().trim().split('\n')[0].trim();
        const date = $(el).find('time').attr('datetime') || $(el).find('time').text().trim() || null;

        if (chapterId) {
          chapters.push({
            chapterId,
            title: name,
            name,
            date,
            url: href.startsWith('http') ? href : `${this.baseUrl}${href}`
          });
        }
      });

      return {
        mangaId: id,
        totalChapters: chapters.length,
        chapters
      };
    } catch (error) {
      console.error(`Error getting chapters for ${id} on WeebCentral:`, error.message);
      throw new Error(`Failed to get chapters: ${error.message}`);
    }
  }

  /**
   * Get reader images for a chapter by chapter ID
   */
  async getChapterImages(chapterId) {
    try {
      const url = `${this.baseUrl}/chapters/${chapterId}/images?is_prev=False&current_page=1&reading_style=long_strip`;
      const html = await requestManager.request(url, 'GET', {}, {}, 'axios');
      const $ = cheerio.load(html);

      const images = [];
      $('img').each((idx, el) => {
        const src = $(el).attr('src');
        if (src && !src.includes('logo') && !src.includes('avatar')) {
          images.push({
            page: idx + 1,
            image: src
          });
        }
      });

      return {
        chapterId,
        totalImages: images.length,
        images
      };
    } catch (error) {
      console.error(`Error getting chapter images for ${chapterId} on WeebCentral:`, error.message);
      throw new Error(`Failed to get chapter images: ${error.message}`);
    }
  }

  /**
   * Get latest updated manga
   */
  async getLatestUpdates(page = 1) {
    try {
      const offset = (Math.max(1, parseInt(page, 10)) - 1) * 32;
      const url = `${this.baseUrl}/search/data?sort=Latest+Updates&order=Descending&limit=32&offset=${offset}`;
      const html = await requestManager.request(url, 'GET', {}, {}, 'axios');
      const $ = cheerio.load(html);

      const results = [];
      $('article').each((index, element) => {
        const $el = $(element);
        const link = $el.find('a[href*="/series/"]').first();
        const href = link.attr('href');
        const idMatch = href ? href.match(/\/series\/([^\/]+)/) : null;
        const id = idMatch ? idMatch[1] : null;
        const title = $el.find('img').attr('alt')?.replace(/\s+cover$/i, '').trim() || link.text().trim();
        const cover = $el.find('img').attr('src');

        if (id && title) {
          results.push({
            id,
            title,
            cover,
            url: href.startsWith('http') ? href : `${this.baseUrl}${href}`
          });
        }
      });

      return results;
    } catch (error) {
      console.error('Error getting latest updates on WeebCentral:', error.message);
      throw new Error(`Failed to get latest updates: ${error.message}`);
    }
  }

  /**
   * Get home page recommendations/popular/latest
   */
  async getHomePage() {
    try {
      const html = await requestManager.request(this.baseUrl, 'GET', {}, {}, 'axios');
      const $ = cheerio.load(html);

      const popular = [];
      const latest = [];

      // Carousel / Featured
      $('section:first-of-type article, .carousel article, [id*="popular"] article').each((i, el) => {
        const link = $(el).find('a[href*="/series/"]').first();
        const href = link.attr('href');
        const idMatch = href ? href.match(/\/series\/([^\/]+)/) : null;
        const id = idMatch ? idMatch[1] : null;
        const title = $(el).find('img').attr('alt')?.replace(/\s+cover$/i, '').trim() || link.text().trim();
        const cover = $(el).find('img').attr('src');

        if (id && title) {
          popular.push({ id, title, cover, url: href.startsWith('http') ? href : `${this.baseUrl}${href}` });
        }
      });

      // Latest feed fallback
      if (popular.length === 0) {
        const latestItems = await this.getLatestUpdates(1);
        return {
          featured: latestItems.slice(0, 10),
          latestUpdates: latestItems
        };
      }

      const latestUpdates = await this.getLatestUpdates(1);

      return {
        popular,
        latestUpdates
      };
    } catch (error) {
      console.error('Error getting home page on WeebCentral:', error.message);
      throw new Error(`Failed to get home page: ${error.message}`);
    }
  }
}

module.exports = WeebCentral;
