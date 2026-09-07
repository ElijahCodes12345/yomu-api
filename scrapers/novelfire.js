const requestManager = require('../utils/requestManager');
const cheerio = require('cheerio');

const BASE_URL = 'https://novelfire.net';

class NovelFire {
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
   * Search novels by query string
   */
  async searchNovels(query, page = 1) {
    try {
      const url = `${this.baseUrl}/search?keyword=${encodeURIComponent(query)}&page=${page}`;
      const html = await requestManager.request(url, 'GET', {}, {}, 'axios');
      const $ = cheerio.load(html);

      const results = [];
      $('.novel-item, .book-item, .list-novel .row, .col-novel, .item').each((i, el) => {
        const title = $(el).find('h3, .novel-title, .title a, .tit a').text().trim();
        const href = $(el).find('a[href*="/book/"]').attr('href');
        const cover = $(el).find('img').attr('data-src') || $(el).find('img').attr('src');
        const rating = $(el).find('.rating, .score').text().trim();
        const latestChapter = $(el).find('.chapter, .latest-chapter').text().trim();

        if (href) {
          const id = href.replace(/^\/book\//, '').replace(/^\//, '');
          if (!results.some(r => r.id === id)) {
            results.push({
              id,
              title: title || id,
              cover: this.formatUrl(cover),
              rating: rating ? parseFloat(rating) : 0,
              latestChapter: latestChapter || null,
              url: this.formatUrl(href)
            });
          }
        }
      });

      if (results.length === 0) {
        $('a[href*="/book/"]').each((i, el) => {
          const href = $(el).attr('href');
          const title = $(el).text().trim() || $(el).find('img').attr('alt') || '';
          const cover = $(el).find('img').attr('data-src') || $(el).find('img').attr('src');
          if (href) {
            const id = href.replace(/^\/book\//, '').replace(/^\//, '');
            if (id && !results.some(r => r.id === id)) {
              results.push({
                id,
                title: title.replace(/\s+/g, ' ').trim() || id,
                cover: this.formatUrl(cover),
                url: this.formatUrl(href)
              });
            }
          }
        });
      }

      return results;
    } catch (error) {
      console.error('Error searching novels on NovelFire:', error.message);
      throw new Error(`Failed to search novels on NovelFire: ${error.message}`);
    }
  }

  /**
   * Get detailed novel information
   */
  async getNovelInfo(id) {
    try {
      const slug = id.replace(/^\/book\//, '').replace(/^\//, '');
      const url = `${this.baseUrl}/book/${slug}`;
      const html = await requestManager.request(url, 'GET', {}, {}, 'axios');
      const $ = cheerio.load(html);

      const title = $('h1, .novel-title, .book-info h1').text().trim() || slug;
      const cover = this.formatUrl($('.cover img, .book-img img, .novel-cover img').attr('data-src') || $('.cover img, .book-img img, .novel-cover img').attr('src'));
      
      let author = $('.author a, a[href*="/author/"]').map((i, el) => $(el).text().trim()).get().join(', ');
      if (!author) {
        const authorText = $('.author, .book-info .author').text().trim();
        author = authorText.replace(/^Author:\s*/i, '').trim() || null;
      }

      const genres = $('.categories a, .genres a, a[href*="/genre/"], a[href*="/genre-"]').map((i, el) => $(el).text().trim()).get();
      const status = $('.status, .book-info .status').text().replace(/^Status:\s*/i, '').trim() || 'Ongoing';
      const ratingText = $('.rating, .score, .rating-num').text().trim();
      const rating = ratingText ? parseFloat(ratingText) : 0;
      
      const description = $('.summary, .description, #info-tab, .novel-summary').text().replace(/^Summary\s*/i, '').trim();

      const latestChapterText = $('.latest-chapter, .chapter a, a[href*="/chapter-"]').first().text().trim();

      return {
        id: slug,
        title,
        author: author || null,
        cover,
        status,
        rating,
        genres: [...new Set(genres)],
        description,
        latestChapter: latestChapterText || null,
        url: `${this.baseUrl}/book/${slug}`
      };
    } catch (error) {
      console.error(`Error getting novel info for ${id} on NovelFire:`, error.message);
      throw new Error(`Failed to get novel info from NovelFire: ${error.message}`);
    }
  }

  /**
   * Get chapters for a novel with pagination support
   */
  async getChapters(id, page = 1) {
    try {
      const slug = id.replace(/^\/book\//, '').replace(/^\//, '');
      const currentPage = parseInt(page, 10) || 1;
      const url = `${this.baseUrl}/book/${slug}/chapters?page=${currentPage}`;
      const html = await requestManager.request(url, 'GET', {}, {}, 'axios');
      const $ = cheerio.load(html);

      const chapters = [];
      $('a[href*="/chapter-"]').each((i, el) => {
        const href = $(el).attr('href');
        const titleAttr = $(el).attr('title');
        const strongTitle = $(el).find('.chapter-title, strong.chapter-title, strong').text().trim();
        
        let title = strongTitle || titleAttr || $(el).text().trim();
        // Remove trailing date text if present
        title = title.replace(/\s*\d+\s+(?:years?|months?|days?|hours?|mins?|minutes?|seconds?)\s+ago.*$/i, '').trim();
        // Clean duplicate leading numbers
        title = title.replace(/^\d+\s*(Chapter\s+\d+)/i, '$1');

        const chSlugMatch = href ? href.match(/\/([^\/]+)$/) : null;
        const chapterId = chSlugMatch ? chSlugMatch[1] : `chapter-${i + 1}`;
        const chNumMatch = title ? title.match(/Chapter\s+(\d+(?:\.\d+)?)/i) : null;
        const date = $(el).find('time').attr('datetime') || $(el).find('time, .chapter-update').text().trim() || null;

        if (href && !chapters.some(c => c.chapterId === chapterId)) {
          chapters.push({
            chapterId,
            chapterNumber: chNumMatch ? parseFloat(chNumMatch[1]) : (i + 1),
            title: title.replace(/\s+/g, ' ').trim(),
            date: date || null,
            url: this.formatUrl(href)
          });
        }
      });

      // Calculate pagination
      let totalPages = currentPage;
      $('a[href*="page="]').each((i, el) => {
        const href = $(el).attr('href');
        const pMatch = href ? href.match(/page=(\d+)/) : null;
        if (pMatch) {
          const p = parseInt(pMatch[1], 10);
          if (p > totalPages) totalPages = p;
        }
      });

      const hasPrevious = Boolean($('.pagination a[rel="prev"]').length || currentPage > 1);
      const hasNext = Boolean($('.pagination a[rel="next"]').length || currentPage < totalPages);
      const totalChaptersEstimate = totalPages > 1 ? (totalPages - 1) * 100 + chapters.length : chapters.length;

      return {
        novelId: slug,
        pagination: {
          currentPage,
          totalPages,
          totalChapters: totalChaptersEstimate,
          hasPrevious,
          hasNext,
          limit: chapters.length
        },
        totalChapters: totalChaptersEstimate,
        chapters
      };
    } catch (error) {
      console.error(`Error getting chapters for ${id} on NovelFire:`, error.message);
      throw new Error(`Failed to get chapters from NovelFire: ${error.message}`);
    }
  }

  /**
   * Read chapter text content
   */
  async getChapterContent(novelId, chapterId) {
    try {
      const nSlug = novelId.replace(/^\/book\//, '').replace(/^\//, '');
      let cSlug = chapterId.replace(/^\//, '');

      if (!cSlug.startsWith('chapter-') && !cSlug.includes('/')) {
        cSlug = `chapter-${cSlug}`;
      }

      const url = `${this.baseUrl}/book/${nSlug}/${cSlug}`;
      const html = await requestManager.request(url, 'GET', {}, {}, 'axios');
      const $ = cheerio.load(html);

      const title = $('h1, h2, .chapter-title, .title').text().replace(/\s+/g, ' ').trim() || `${nSlug} ${cSlug}`;
      const contentEl = $('#chapter-container, .chapter-content, #content, .reading-content, #chr-content');
      
      // Clean ads and scripts
      contentEl.find('script, style, iframe, .ads, .ads-holder, div[style*="text-align:center"]').remove();

      const paragraphs = [];
      contentEl.find('p').each((i, el) => {
        const text = $(el).text().trim();
        if (text && !text.toLowerCase().includes('restore scroll position') && !text.toLowerCase().includes('novelfire')) {
          paragraphs.push(text);
        }
      });

      if (paragraphs.length === 0) {
        const rawText = contentEl.text().trim();
        rawText.split('\n').map(p => p.trim()).filter(Boolean).forEach(p => {
          if (!p.toLowerCase().includes('restore scroll position')) {
            paragraphs.push(p);
          }
        });
      }

      const prevHref = $('a.prev-chap, a.prev, a[rel="prev"]').attr('href');
      const nextHref = $('a.next-chap, a.next, a[rel="next"]').attr('href');

      return {
        novelId: nSlug,
        chapterId: cSlug,
        title,
        wordCount: paragraphs.join(' ').split(/\s+/).length,
        readingTimeMinutes: Math.ceil(paragraphs.join(' ').split(/\s+/).length / 200),
        paragraphs,
        html: contentEl.html() || '',
        prevChapterId: prevHref ? prevHref.match(/\/([^\/]+)$/)?.[1] || null : null,
        nextChapterId: nextHref ? nextHref.match(/\/([^\/]+)$/)?.[1] || null : null
      };
    } catch (error) {
      console.error(`Error reading chapter ${chapterId} of ${novelId} on NovelFire:`, error.message);
      throw new Error(`Failed to read chapter from NovelFire: ${error.message}`);
    }
  }

  /**
   * Helper to parse book cards from list pages
   */
  async parseBookList(url) {
    const html = await requestManager.request(url, 'GET', {}, {}, 'axios');
    const $ = cheerio.load(html);

    const results = [];
    $('.novel-item, .book-item, .col-novel, .item, .list-novel .row, li.novel-item').each((i, el) => {
      const title = $(el).find('h3, .novel-title, .title a, .tit a').text().trim();
      const href = $(el).find('a[href*="/book/"]').attr('href');
      const cover = $(el).find('img').attr('data-src') || $(el).find('img').attr('src');
      const rating = $(el).find('.rating, .score').text().trim();

      if (href) {
        const id = href.replace(/^\/book\//, '').replace(/^\//, '');
        if (!results.some(r => r.id === id)) {
          results.push({
            id,
            title: title || id,
            cover: this.formatUrl(cover),
            rating: rating ? parseFloat(rating) : 0,
            url: this.formatUrl(href)
          });
        }
      }
    });

    if (results.length === 0) {
      $('a[href*="/book/"]').each((i, el) => {
        const href = $(el).attr('href');
        const title = $(el).text().trim() || $(el).find('img').attr('alt') || '';
        const cover = $(el).find('img').attr('data-src') || $(el).find('img').attr('src');
        if (href) {
          const id = href.replace(/^\/book\//, '').replace(/^\//, '');
          if (id && !results.some(r => r.id === id)) {
            results.push({
              id,
              title: title.replace(/\s+/g, ' ').trim() || id,
              cover: this.formatUrl(cover),
              url: this.formatUrl(href)
            });
          }
        }
      });
    }

    return results;
  }

  /**
   * Get latest released novels
   */
  async getLatest(page = 1) {
    try {
      const url = `${this.baseUrl}/genre-all/sort-new/status-all/all-novel?page=${page}`;
      return await this.parseBookList(url);
    } catch (error) {
      console.error('Error getting latest novels on NovelFire:', error.message);
      throw new Error(`Failed to get latest novels from NovelFire: ${error.message}`);
    }
  }

  /**
   * Get ranking / top rated novels
   */
  async getRanking(page = 1) {
    try {
      const url = `${this.baseUrl}/ranking?page=${page}`;
      return await this.parseBookList(url);
    } catch (error) {
      console.error('Error getting ranking novels on NovelFire:', error.message);
      throw new Error(`Failed to get ranking novels from NovelFire: ${error.message}`);
    }
  }

  /**
   * Get all available genres
   */
  async getGenres() {
    try {
      const url = `${this.baseUrl}/genre-all/sort-popular/status-all/all-novel`;
      const html = await requestManager.request(url, 'GET', {}, {}, 'axios');
      const $ = cheerio.load(html);

      const genres = [];
      $('a[href*="/genre-"], a[href*="/genre/"]').each((i, el) => {
        const href = $(el).attr('href');
        const name = $(el).text().trim();
        const slugMatch = href ? href.match(/\/genre-([^\/]+)\//) || href.match(/\/genre\/([^\/]+)/) : null;
        const slug = slugMatch ? slugMatch[1] : name.toLowerCase().replace(/\s+/g, '-');
        if (name && slug && slug !== 'all' && !genres.some(g => g.slug === slug)) {
          genres.push({
            name,
            slug,
            url: this.formatUrl(href)
          });
        }
      });

      return genres;
    } catch (error) {
      console.error('Error getting genres on NovelFire:', error.message);
      throw new Error(`Failed to get genres from NovelFire: ${error.message}`);
    }
  }

  /**
   * Get novels by genre
   */
  async getNovelsByGenre(genre, page = 1) {
    try {
      const gSlug = genre.toLowerCase().replace(/\s+/g, '-');
      const url = `${this.baseUrl}/genre-${gSlug}/sort-popular/status-all/all-novel?page=${page}`;
      return await this.parseBookList(url);
    } catch (error) {
      console.error(`Error getting novels for genre ${genre} on NovelFire:`, error.message);
      throw new Error(`Failed to get novels for genre from NovelFire: ${error.message}`);
    }
  }

  /**
   * Get homepage featured & latest
   */
  async getHomePage() {
    try {
      const [ranking, latest] = await Promise.all([
        this.getRanking(1),
        this.getLatest(1)
      ]);

      return {
        featured: ranking.slice(0, 6),
        ranking: ranking.slice(0, 10),
        latestUpdates: latest
      };
    } catch (error) {
      console.error('Error getting home page on NovelFire:', error.message);
      throw new Error(`Failed to get home page from NovelFire: ${error.message}`);
    }
  }
}

module.exports = NovelFire;
