const cheerio = require('cheerio');
const requestManager = require('../utils/requestManager');

const BASE_URL = 'https://mangapill.com';

class MangaPill {
  constructor() {
    this.baseUrl = BASE_URL;
  }

  async searchManga(query) {
    try {
      const html = await requestManager.request(`${this.baseUrl}/quick-search?q=${encodeURIComponent(query)}`, 'GET', {}, {}, 'axios');
      const $ = cheerio.load(html);
      
      const results = [];
      $('div.grid a > div').each((index, element) => {
        const $element = $(element);
        const $parentLink = $element.closest('a');
        const id = $parentLink.attr('href')?.replace('/manga/', '');
        const title = $(element).find('.ml-3 .flex-col .font-black').text().trim();
        const alternateTitle = $(element).find('.ml-3 .flex-col .text-sm.text-secondary').text().trim();
        const cover = $(element).find('img').attr('src');
        const type = $(element).find('.ml-3 .flex-col .flex-wrap > div:nth-child(1)').text().trim();
        const year = $(element).find('.ml-3 .flex-col .flex-wrap > div:nth-child(2)').text().trim();
        const status = $(element).find('.ml-3 .flex-col .flex-wrap > div:nth-child(3)').text().trim();

        if (title && id) {
          results.push({
            id,
            title,
            alternateTitle,
            cover,
            url: `${this.baseUrl}/manga/${id}`,
            type: type,
            year: year,
            status: status
          });
        }
      });
      
      return results.length > 0 ? results : null;
    } catch (error) {
      console.error('Error searching manga:', error.message);
      throw new Error(`Failed to search manga: ${error.message}`);
    }
  }

  async getMangaById(id) {
    try {
      const html = await requestManager.request(`${this.baseUrl}/manga/${id}`, 'GET', {}, {}, 'axios');
      const $ = cheerio.load(html);
      
      const title = $('h1.font-bold.text-lg.md\\:text-2xl').first().text().trim();
      const alternateTitle = $('.mb-3 div.text-sm.text-secondary').text().trim();
      
      const cover = $('.flex-shrink-0 > img').first().attr('data-src');
      
      const description = $('p.text-sm.text--secondary').text().trim();

      const genres = [];
      $('a.text-sm.mr-1.text-brand').each((index, element) => {
        genres.push($(element).text().trim());
      });
      
      let type = null, status = null, year = null;
      
      $('.grid.grid-cols-1.md\\:grid-cols-3.gap-3.mb-3 div').each((index, element) => {
        const label = $(element).find('label.text-secondary').text().trim().toLowerCase();
        const value = $(element).find('div').text().trim();
        
        switch(label) {
          case 'type':
            type = value;
            break;
          case 'status':
            status = value;
            break;
          case 'year':
            year = value;
            break;
        }
      });
      
      // Extract chapters from the chapters section
      const chapters = [];
      $('#chapters a').each((index, element) => {
        const $element = $(element);
        const title = $element.text().trim();
        const href = $element.attr('href');
        const chapterId = href?.replace('/chapters/', '') || '';
        
        if (title && chapterId) {
          chapters.push({
            id: chapterId,
            title,
            url: `${this.baseUrl}${href}`
          });
        }
      });
      
      return {
        id,
        title,
        alternateTitle,
        cover,
        description,
        genres,
        type,
        status,
        year,
        chapters,
        url: `${this.baseUrl}/manga/${id}`
      };
      
    } catch (error) {
      console.error('Error getting manga by ID:', error.message);
      throw new Error(`Failed to get manga by ID: ${error.message}`);
    }
  }

  async getMangaChapter(chapterId) {
    try {
      const html = await requestManager.request(`${this.baseUrl}/chapters/${chapterId}`, 'GET', {}, {}, 'axios');
      const $ = cheerio.load(html);

      const chapterTitle = $('.container.mb-3 h1').text().trim();
      
      const prevUrl = $('.container .flex.items-center.gap-2 a[data-hotkey="ArrowLeft"]').attr('href');
      const nextUrl = $('.container .flex.items-center.gap-2 a[data-hotkey="ArrowRight"]').attr('href');

      const pages = [];
      $('.lg\\:container chapter-page').each((index, element) => {
        const src = $(element).find('img').attr('data-src');
        if (src) {
          pages.push(src);
        }
      });
      
      const mangaId = chapterId.split('-')[0];
      
      return {
        id: chapterId,
        title: chapterTitle,
        mangaId: mangaId,
        pages,
        url: `${this.baseUrl}/chapters/${chapterId}`,
        prevUrl,
        nextUrl
      };
    } catch (error) {
      console.error('Error getting manga chapter:', error.message);
      throw new Error(`Failed to get manga chapter: ${error.message}`);
    }
  }

  async getTrendingManga() {
    try {
      const html = await requestManager.request(this.baseUrl, 'GET');
      const $ = cheerio.load(html);
      
      const trendingManga = [];
      $('.container.py-4 div.grid > div').each((index, element) => {
        const linkElement = $(element).find('a').first();
        const href = linkElement.attr('href');

        if (href && href.includes('/manga/')) {
          const title = $(element).find('.font-black.leading-tight').first().text().trim();
          const alternateTitle = $(element).find('.line-clamp-2.text-xs.text-secondary.mt-1').text().trim() || null;
          const mangaMatch = href?.match(/\/manga\/([^\/]+)\/(.*)/);
          const id = mangaMatch?.[1] || '';
          const slug = mangaMatch?.[2] || '';
          const cover = $(element).find('figure img').attr('src') || $(element).find('figure img').attr('data-src') || '';
      
          if (title && id) {
            const mangaData = {
              title,
              cover,
              url: `${this.baseUrl}${href}`,
              type: null,
              year: null,
              status: null,
              alternateTitle: alternateTitle
            };
            
            mangaData.id = `${id}/${slug}`;
            
            const infoElements = $(element).find('.flex.flex-wrap.gap-1.mt-1 .text-xs');
            infoElements.each((idx, infoEl) => {
              const info = $(infoEl).text().trim();
              if (['manga', 'manhwa', 'manhua'].includes(info.toLowerCase())) {
                mangaData.type = info;
              } else if (/^\d{4}$/.test(info)) {
                mangaData.year = info;
              } else if (['publishing', 'finished', 'hiatus'].includes(info.toLowerCase())) {
                mangaData.status = info;
              }
            });
            
            trendingManga.push(mangaData);
          }
        }
      });
      
      return trendingManga.length > 0 ? trendingManga : null;
    } catch (error) {
      console.error('Error getting trending manga:', error.message);
      throw new Error(`Failed to get trending manga: ${error.message}`);
    }
  }

  async advancedSearch(query, filters = {}) {
    try {
      let url = `${this.baseUrl}/search?q=${encodeURIComponent(query)}`;
      
      if (filters.status) {
        url += `&status=${filters.status}`;
      }
      if (filters.type) {
        url += `&type=${filters.type}`;
      }
      if (filters.genre) {
        url += `&genre=${filters.genre}`;
      }
      if (filters.page) {
        url += `&page=${filters.page}`;
      }
      
      const html = await requestManager.request(url, 'GET', {}, {}, 'axios');
      const $ = cheerio.load(html);
      
      const results = [];
      $('.container.py-3 .my-3.grid.grid-cols-2 > div').each((index, element) => {
        const title = $(element).find('.flex a .mt-3').text().trim();
        const alternateTitle = $(element).find('.flex a .text-xs').text().trim();
        const id = $(element).find('a').attr('href')?.replace('/manga/', '');
        const cover = $(element).find('img').attr('data-src');
        const type =  $(element).find('.flex > div > div:nth-child(1)').text();
        const year =  $(element).find('.flex > div > div:nth-child(2)').text();
        const status =  $(element).find('.flex > div > div:nth-child(3)').text();

        if (title && id) {
          const mangaData = {
            id,
            title,
            alternateTitle,
            cover,
            url: `${this.baseUrl}/manga/${id}`,
            type,
            year,
            status
          };
          
          results.push(mangaData);
        }
      });
      
      let pagination = null;
      const currentPage = filters.page ? parseInt(filters.page) : 1;
      
      const paginationContainer = $('.flex.items-center.justify-center.my-3.gap-3').first();
      const prevLink = paginationContainer.find('a:contains("Previous")').first();
      const nextLink = paginationContainer.find('a:contains("Next")').first();
      
      const hasPrev = prevLink.length > 0;
      const hasNext = nextLink.length > 0;
      
      let prevPage = null;
      let nextPage = null;
      let prevUrl = null;
      let nextUrl = null;
      
      if (hasPrev) {
        const prevHref = prevLink.attr('href');
        const prevPageMatch = prevHref ? prevHref.match(/page=(\d+)/) : null;
        prevPage = prevPageMatch ? parseInt(prevPageMatch[1]) : null;
        prevUrl = prevHref ? `${this.baseUrl}${prevHref}` : null;
      }
      
      if (hasNext) {
        const nextHref = nextLink.attr('href');
        const nextPageMatch = nextHref ? nextHref.match(/page=(\d+)/) : null;
        nextPage = nextPageMatch ? parseInt(nextPageMatch[1]) : null;
        nextUrl = nextHref ? `${this.baseUrl}${nextHref}` : null;
      }
      
      if (hasPrev || hasNext) {
        pagination = {
          currentPage,
          hasNext,
          hasPrev,
          prevPage,
          nextPage,
          prevUrl,
          nextUrl
        };
      }
      
      return {
        results,
        pagination
      };
    } catch (error) {
      console.error('Error performing advanced search:', error.message);
      throw new Error(`Failed to perform advanced search: ${error.message}`);
    }
  }

  async getNewManga() {
    try {
      const html = await requestManager.request(`${this.baseUrl}/mangas/new`, 'GET', {}, {}, 'axios');
      const $ = cheerio.load(html);
      
      const mangaData = [];
      $('.container.py-3 .grid.grid-cols-2 > div').each((index, element) => {
        const title = $(element).find('div a .mt-3').text().trim();
        const alternateTitle = $(element).find('div a .text-xs').text().trim();
        const mangaId = $(element).find('a').attr('href')?.match(/\/manga\/([^\/]+)\/(.*)/)?.slice(1).join('/');
        const cover = $(element).find('img').attr('data-src');

        if (mangaId) {
          const mangaObj = {
            title,
            alternateTitle,
            id: mangaId,
            cover: cover,
            url: `${this.baseUrl}/manga/${mangaId}`
          };

          const infoElements = $(element).find('.flex .flex-wrap .text-xs');
            infoElements.each((idx, infoEl) => {
              const info = $(infoEl).text().trim();
              if (['manga', 'manhwa', 'manhua'].includes(info.toLowerCase())) {
                mangaObj.type = info;
              } else if (/^\d{4}$/.test(info)) {
                mangaObj.year = info;
              } else if (['publishing', 'finished', 'hiatus'].includes(info.toLowerCase())) {
                mangaObj.status = info;
              }
          });
          
          mangaData.push(mangaObj);
        }
      });
      
      return mangaData.length > 0 ? mangaData : null;
    } catch (error) {
      console.error('Error getting new manga:', error.message);
      throw new Error(`Failed to get new manga: ${error.message}`);
    }
  }

  async getLatest() {
    try {
      const html = await requestManager.request(`${this.baseUrl}/chapters`, 'GET', {}, {}, 'axios');
      const $ = cheerio.load(html);
      
      const latestUpdates = [];
      // .container.py-4 .grid .col-span-4 > .grid div
      $('.container.py-3 .grid.grid-cols-2 > div').each((index, element) => {
        const title = $(element).find('.px-1 a:nth-child(2) > .text-sm').text().trim();
        const alternateTitle = $(element).find('.px-1 a:nth-child(2) > .text-xs').text().trim();
        const chapterId = $(element).find('a').attr('href')?.replace('/chapters/', '');
        const chapterNumber = $(element).find('.px-1 a:nth-child(1) > div').text().trim();
        const mangaId = $(element).find('.px-1 a:nth-child(2)').attr('href')?.match(/\/manga\/([^\/]+)\/(.*)/)?.slice(1).join('/');
        const date = $(element).find('.px-1 > div time-ago').attr("datetime");
        
        if (title && chapterId) {
          latestUpdates.push({
            chapterId,
            title,
            alternateTitle,
            chapterNumber,
            id: mangaId,
            date,
            chapterUrl: `${this.baseUrl}/chapters/${chapterId}`,
            url: mangaId ? `${this.baseUrl}/manga/${mangaId}` : null
          });
        }
      });
      
      const uniqueUpdates = [];
      const seenUrls = new Set();
      
      for (const update of latestUpdates) {
        if (!seenUrls.has(update.url)) {
          seenUrls.add(update.url);
          uniqueUpdates.push(update);
        }
      }
      
      return uniqueUpdates.length > 0 ? uniqueUpdates : null;
    } catch (error) {
      console.error('Error getting latest updates:', error.message);
      throw new Error(`Failed to get latest updates: ${error.message}`);
    }
  }

  async getFeaturedChapters() {
    try {
      const html = await requestManager.request(this.baseUrl, 'GET', {}, {}, 'axios');
      const $ = cheerio.load(html);
      
      const featuredChapters = [];
      $('.bg-card.py-4 .container .featured-grid > div').each((index, element) => {
        const title = $(element).find('.pt-2.text-sm a:nth-child(2) > .text-sm').text().trim();
        const chapterId = $(element).find('a').attr('href')?.replace('/chapters/', '');
        const chapterNumber = $(element).find('.pt-2.text-sm a:nth-child(1) > .text-lg').text().trim();
        const mangaId = $(element).find('.pt-2.text-sm a:nth-child(2)').attr('href')?.match(/\/manga\/([^\/]+)\/(.*)/)?.slice(1).join('/');
        const cover = $(element).find('img').attr('src') || $(element).find('img').attr('data-src') || '';

        if (title && chapterId) {
          featuredChapters.push({
            id: mangaId,
            title,
            chapterId,
            chapterNumber,
            cover,
            chapterUrl: `${this.baseUrl}/chapters/${chapterId}`,
            url: mangaId ? `${this.baseUrl}/manga/${mangaId}` : null
          });
        }
      });
      
      const uniqueChapters = [];
      const seenUrls = new Set();
      
      for (const chapter of featuredChapters) {
        if (!seenUrls.has(chapter.url)) {
          seenUrls.add(chapter.url);
          uniqueChapters.push(chapter);
        }
      }
      
      return uniqueChapters.length > 0 ? uniqueChapters : null;
    } catch (error) {
      console.error('Error getting featured chapters:', error.message);
      throw new Error(`Failed to get featured chapters: ${error.message}`);
    }
  }
}

module.exports = MangaPill;