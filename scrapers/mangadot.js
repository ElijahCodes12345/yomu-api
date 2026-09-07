const crypto = require('crypto');
const requestManager = require('../utils/requestManager');

const BASE_URL = 'https://mangadot.net';

class MangaDot {
  constructor() {
    this.baseUrl = BASE_URL;
  }

  /**
   * Helper to ensure URLs are absolute
   */
  formatUrl(path) {
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    return `${this.baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
  }

  /**
   * Generates HMAC-SHA256 signature for secured requests
   */
  signHMAC(key, data) {
    return crypto.createHmac('sha256', key).update(data).digest('hex');
  }

  /**
   * Search manga by query string
   */
  async searchManga(query, page = 1) {
    try {
      const url = `${this.baseUrl}/api/search?search=${encodeURIComponent(query)}&page=${page}&limit=20`;
      const data = await requestManager.request(url, 'GET', {}, {}, 'axios');

      const mangaList = data.manga_list || [];
      const results = mangaList.map((item) => ({
        id: item.id,
        title: item.title,
        cover: this.formatUrl(item.photo),
        genres: item.genres || [],
        status: item.status || null,
        year: item.year || null,
        rating: item.avg_rating || 0,
        chapterCount: item.chapter_count || 0,
        url: `${this.baseUrl}/manga/${item.id}`
      }));

      return results;
    } catch (error) {
      console.error('Error searching manga on MangaDot:', error.message);
      throw new Error(`Failed to search manga on MangaDot: ${error.message}`);
    }
  }

  /**
   * Get detailed manga information by ID
   */
  async getMangaInfo(id) {
    try {
      const url = `${this.baseUrl}/api/manga/${id}`;
      const data = await requestManager.request(url, 'GET', {}, {}, 'axios');

      if (!data || !data.manga) {
        return null;
      }

      const m = data.manga;
      return {
        id: m.id,
        title: m.title,
        cover: this.formatUrl(m.photo),
        description: m.description || '',
        genres: m.genres || [],
        status: m.status || data.status_text || null,
        dateAdded: m.date_added || data.date_added_formatted || null,
        totalChapters: data.total_chapters || 0,
        latestChapterNumber: data.latest_chapter_number || null,
        firstChapterId: data.first_chapter_id || null,
        firstChapterSource: data.first_chapter_source || null,
        url: `${this.baseUrl}/manga/${m.id}`
      };
    } catch (error) {
      console.error(`Error getting manga info for ${id} on MangaDot:`, error.message);
      throw new Error(`Failed to get manga info from MangaDot: ${error.message}`);
    }
  }

  /**
   * Get all chapters for a manga by ID
   */
  async getChapters(id, language = 'all') {
    try {
      let url = `${this.baseUrl}/api/manga/${id}/chapters/list`;
      if (language && language !== 'all') {
        url += `?lang=${encodeURIComponent(language)}`;
      }

      const list = await requestManager.request(url, 'GET', {}, {}, 'axios');

      if (!Array.isArray(list)) {
        return {
          mangaId: parseInt(id, 10) || id,
          totalChapters: 0,
          chapters: []
        };
      }

      const chapters = list.map((item) => ({
        chapterId: item.id,
        chapterNumber: item.chapter_number,
        title: item.chapter_title ? `Chapter ${item.chapter_number}: ${item.chapter_title}` : `Chapter ${item.chapter_number}`,
        chapterTitle: item.chapter_title || null,
        volumeNumber: item.volume_number || null,
        language: item.language || 'en',
        scanlator: item.scanlator_name || item.group_name || null,
        date: item.date_added || null,
        pageCount: item.page_count || 0,
        source: item.source || null,
        url: `${this.baseUrl}/chapter/${item.id}`
      }));

      return {
        mangaId: parseInt(id, 10) || id,
        totalChapters: chapters.length,
        chapters
      };
    } catch (error) {
      console.error(`Error getting chapters for ${id} on MangaDot:`, error.message);
      throw new Error(`Failed to get chapters from MangaDot: ${error.message}`);
    }
  }

  /**
   * Get reader images for a chapter
   */
  async getChapterImages(chapterId) {
    try {
      const fetchImagesForType = async (type) => {
        let tokenData = { page_token: '', signing_key: '' };
        try {
          const tokenUrl = `${this.baseUrl}/api/token/generate?chapter_id=${chapterId}&type=${type}`;
          tokenData = await requestManager.request(tokenUrl, 'GET', {}, {}, 'axios');
        } catch (e) {
          // Token generation is optional if endpoints are open
        }

        const urlPath = type === 'upload' ? `/api/uploads/${chapterId}/images` : `/api/chapters/${chapterId}/images`;
        const headers = {
          'Referer': `${this.baseUrl}/chapter/${chapterId}`
        };

        if (tokenData?.page_token && tokenData?.signing_key) {
          const nonce = crypto.randomUUID();
          const timestamp = Math.floor(Date.now() / 1000);
          const payload = `${nonce}|${timestamp}|${urlPath}`;
          const signature = this.signHMAC(tokenData.signing_key, payload);

          headers['X-Page-Token'] = tokenData.page_token;
          headers['X-Nonce'] = nonce;
          headers['X-Timestamp'] = String(timestamp);
          headers['X-Signature'] = signature;
        }

        return await requestManager.request(`${this.baseUrl}${urlPath}`, 'GET', {}, { headers }, 'axios');
      };

      let responseData = null;
      try {
        responseData = await fetchImagesForType('chapter');
      } catch (chapterErr) {
        // Fallback to upload type
        responseData = await fetchImagesForType('upload');
      }

      if (!responseData || !Array.isArray(responseData.images)) {
        throw new Error('No images found in chapter response');
      }

      const images = responseData.images.map((img, idx) => ({
        page: idx + 1,
        image: typeof img === 'string' ? this.formatUrl(img) : this.formatUrl(img.url),
        width: typeof img === 'object' ? img.w || null : null,
        height: typeof img === 'object' ? img.h || null : null
      }));

      return {
        chapterId: parseInt(chapterId, 10) || chapterId,
        totalImages: images.length,
        images,
        prevChapterId: responseData.prev_chapter_id || null,
        nextChapterId: responseData.next_chapter_id || null
      };
    } catch (error) {
      console.error(`Error getting chapter images for ${chapterId} on MangaDot:`, error.message);
      throw new Error(`Failed to get chapter images from MangaDot: ${error.message}`);
    }
  }

  /**
   * Get latest updated manga
   */
  async getLatestUpdates(page = 1) {
    try {
      const url = `${this.baseUrl}/api/search?q=&page=${page}&limit=20`;
      const data = await requestManager.request(url, 'GET', {}, {}, 'axios');

      const mangaList = data.manga_list || [];
      return mangaList.map((item) => ({
        id: item.id,
        title: item.title,
        cover: this.formatUrl(item.photo),
        genres: item.genres || [],
        status: item.status || null,
        year: item.year || null,
        rating: item.avg_rating || 0,
        chapterCount: item.chapter_count || 0,
        url: `${this.baseUrl}/manga/${item.id}`
      }));
    } catch (error) {
      console.error('Error getting latest updates on MangaDot:', error.message);
      throw new Error(`Failed to get latest updates from MangaDot: ${error.message}`);
    }
  }

  /**
   * Get homepage featured & latest
   */
  async getHomePage() {
    try {
      const latest = await this.getLatestUpdates(1);
      return {
        featured: latest.slice(0, 5),
        latestUpdates: latest
      };
    } catch (error) {
      console.error('Error getting home page on MangaDot:', error.message);
      throw new Error(`Failed to get home page from MangaDot: ${error.message}`);
    }
  }
}

module.exports = MangaDot;
