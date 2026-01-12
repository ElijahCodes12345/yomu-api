const cheerio = require('cheerio');
const requestManager = require('../utils/requestManager');
const vrfManager = require('../utils/vrf');

const BASE_URL = 'https://mangafire.to';

/**
 * Search/Filter Manga
 * @param {string} keyword
 * @param {number} page
 */
const search = async (keyword, page = 1) => {
    try {
        const vrf = vrfManager.generate_vrf(keyword);
        const html = await requestManager.request(`${BASE_URL}/filter?keyword=${keyword}&page=${page}&vrf=${vrf}`, 'GET', {}, {}, 'cloudscraper');
        const $ = cheerio.load(html);

        const results = [];
        let totalPages = 0;

        // Pagination logic ported from searchPage.ts
        const pageLinks = $('ul.pagination > li.page-item > a');
        if (pageLinks.length > 0) {
            pageLinks.each((i, el) => {
                const pageNum = parseInt($(el).text());
                if (!isNaN(pageNum) && pageNum > totalPages) {
                    totalPages = pageNum;
                }
            });
        }

        if (totalPages === 0) {
            const totalMangasText = $('section.mt-5 > .head > span').text();
            const totalMangas = parseInt(totalMangasText.replace('mangas', '').trim());
            const resultsOnPage = $('div.original.card-lg > div.unit').length;
            if (!isNaN(totalMangas) && resultsOnPage > 0) {
                totalPages = Math.ceil(totalMangas / resultsOnPage);
            } else if (!isNaN(totalMangas) && totalMangas === 0) {
                totalPages = 0;
            } else {
                totalPages = 1;
            }
        }

        $('div.original.card-lg > div.unit').each((i, el) => {
            const searchResult = {
                id: $(el).find('a.poster').attr('href')?.replace('/manga/', '') || null,
                title: $(el).find('div.info > a').text().trim() || null,
                poster: $(el).find('a.poster > div > img').attr('src')?.trim() || null,
                type: $(el).find('div.info > div > span.type').text().trim() || null,
                chapters: [],
            };

            $(el).find('ul.content[data-name="chap"] > li').each((i, chapEl) => {
                searchResult.chapters.push({
                    url: $(chapEl).find('a').attr('href') || null,
                    title: $(chapEl).find('a').attr('title') || null,
                    chapter: $(chapEl).find('a > span:first-child').text().trim() || null,
                    releaseDate: $(chapEl).find('a > span:last-child').text().trim() || null,
                });
            });

            results.push(searchResult);
        });

        return {
            currentPage: page,
            totalPages,
            results
        };

    } catch (error) {
        throw new Error(error.message);
    }
};

/**
 * Scrape Manga Info
 * @param {string} id
 */
const scrapeMangaInfo = async (id) => {
    try {
        const html = await requestManager.request(`${BASE_URL}/manga/${id}`, 'GET', {}, {}, 'cloudscraper');
        const $ = cheerio.load(html);

        const mangaInfo = {
            title: $('h1[itemprop="name"]').text().trim(),
            altTitles: $('h1[itemprop="name"]').siblings('h6').text().trim(),
            poster: $('.poster img')?.attr('src')?.trim() || null,
            status: $('.info > p').first().text().trim(),
            type: $('.min-info a').first().text().trim(),
            description: $('.description').text().replace('Read more +', '').trim(),
            author: $('.meta div:contains("Author:") a').text().trim(),
            published: $('.meta div:contains("Published:")').text().replace('Published:', '').trim(),
            genres: $('.meta div:contains("Genres:") a').map((i, el) => $(el).text().trim()).get(),
            rating: $('.rating-box .live-score').text().trim(),
        };

        const similarManga = [];
        // Scraping Similar Manga (Trending)
        $('section.side-manga.default-style div.original.card-sm.body a.unit').each((i, el) => {
            similarManga.push({
                id: $(el).attr('href')?.split('/').pop() || null,
                name: $(el).find('.info h6').text().trim() || null,
                poster: $(el).find('.poster img').attr('src')?.trim() || null,
            });
        });

        return {
            mangaInfo,
            similarManga
        };

    } catch (error) {
        throw new Error(error.message);
    }
};

/**
 * Get Chapters
 * @param {string} mangaId
 * @param {string} language
 */
const getChapters = async (mangaId, language) => {
    if (!language) {
        return getLanguages(mangaId);
    }

    try {
        let idPart = mangaId;
        if (mangaId.includes('.')) {
             const parts = mangaId.split('.');
             idPart = parts[parts.length - 1];
        }

        const vrf = vrfManager.generate_vrf(`${idPart}@chapter@${language.toLowerCase()}`);
        const data = await requestManager.request(
            `${BASE_URL}/ajax/read/${idPart}/chapter/${language.toLowerCase()}?vrf=${vrf}`,
            'GET',
            {},
            {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Referer': `${BASE_URL}/manga/${mangaId}`
                }
            },
            'cloudscraper'
        );

        const responseJson = typeof data === 'string' ? JSON.parse(data) : data; 
        if (!responseJson.result || !responseJson.result.html) {
            throw new Error('Failed to get chapters list from MangaFire');
        }
        const $ = cheerio.load(responseJson.result.html);
        const chapters = [];

        $("li").each((_, li) => {
            const a = $(li).find("a");
            const title = a.find('span:first-child').text().trim();
            const releaseDate = a.find('span:last-child').text().trim();

            chapters.push({
                number: $(a).attr("data-number") ?? "",
                title: title,
                chapterId: $(a).attr("data-id") ?? "",
                language: language,
                releaseDate: releaseDate || null
            });
        });
        return chapters;

    } catch (error) {
         throw new Error(error.message);
    }
};

const getLanguages = async (mangaId) => {
    try {
        const html = await requestManager.request(`${BASE_URL}/manga/${mangaId}`, 'GET', {}, {}, 'cloudscraper');
        const $ = cheerio.load(html);
        const languages = [];

        $('div[data-name="chapter"] .dropdown-menu a').each((_, el) => {
            const item = $(el);
            const text = item.text().trim();
            const chaptersMatch = text.match(/\((\d+)\s*Chapters?\)/i);

            languages.push({
                id: item.attr('data-code') || null,
                title: item.attr('data-title') || null,
                chapters: chaptersMatch ? `${chaptersMatch[1]} Chapters` : null,
            });
        });

        return languages;
    } catch (error) {
        throw new Error(error.message);
    }
};

const getChapterImages = async (chapterId) => {
    try {
        const vrf = vrfManager.generate_vrf(`chapter@${chapterId}`);
        const data = await requestManager.request(
            `${BASE_URL}/ajax/read/chapter/${chapterId}?vrf=${vrf}`,
            'GET',
            {},
            {
                 headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Referer': `${BASE_URL}/read/${chapterId}`
                }
            },
            'cloudscraper'
        );

        const responseJson = typeof data === 'string' ? JSON.parse(data) : data;
        if (!responseJson.result || !responseJson.result.images) {
            throw new Error('Failed to get chapter images from MangaFire');
        }
        return responseJson.result.images.map((image) => image[0]);
    } catch (error) {
        throw new Error(error.message);
    }
};

/**
 * Scrape Home Page
 */
const scrapeHomePage = async () => {
    try {
        const html = await requestManager.request(`${BASE_URL}/home`, 'GET', {}, {}, 'cloudscraper');
        const $ = cheerio.load(html);

        const res = {
            releasingManga: [],
            mostViewedManga: {
                day: [],
                week: [],
                month: []
            },
            recentlyUpdatedManga: [],
            newReleaseManga: []
        };

        const releasingSelector = '#top-trending .container .swiper .swiper-wrapper .swiper-slide';
        const mostViewedDaySelector = '#most-viewed .tab-content[data-name="day"] .swiper-slide.unit';
        const mostViewedWeekSelector = '#most-viewed .tab-content[data-name="week"] .swiper-slide.unit';
        const mostViewedMonthSelector = '#most-viewed .tab-content[data-name="month"] .swiper-slide.unit';
        const recentlyUpdatedSelector = '.tab-content[data-name="all"] .unit';
        const newReleaseSelector = '.swiper-container .swiper.completed .card-md .swiper-slide.unit';

        $(releasingSelector).each((i, el) => {
            res.releasingManga.push({
                id: $(el).find('.info .above a')?.attr('href')?.replace('/manga/', '') || null,
                status: $(el).find('.info .above span')?.text()?.trim() || null,
                name: $(el).find('.info .above a')?.text()?.trim() || null,
                description: $(el).find('.info .below span')?.text()?.trim() || null,
                currentChapter: $(el).find('.info .below p')?.text()?.trim() || null,
                genres: $(el).find('.info .below div a')?.map((i, el) => $(el).text().trim()).get() || [],
                poster: $(el).find('.swiper-inner a div img')?.attr('src')?.trim() || null
            });
        });

        $(mostViewedDaySelector).each((i, el) => {
            res.mostViewedManga.day.push({
                id: $(el).find('a')?.attr('href')?.replace('/manga/', '') || null,
                name: $(el).find('a span')?.text()?.trim() || null,
                rank: $(el).find('a b')?.text()?.trim() || null,
                poster: $(el).find('a .poster img')?.attr('src')?.trim() || null
            });
        });

        $(mostViewedWeekSelector).each((i, el) => {
            res.mostViewedManga.week.push({
                id: $(el).find('a')?.attr('href')?.replace('/manga/', '') || null,
                name: $(el).find('a span')?.text()?.trim() || null,
                rank: $(el).find('a b')?.text()?.trim() || null,
                poster: $(el).find('a .poster img')?.attr('src')?.trim() || null
            });
        });

        $(mostViewedMonthSelector).each((i, el) => {
            res.mostViewedManga.month.push({
                id: $(el).find('a')?.attr('href')?.replace('/manga/', '') || null,
                name: $(el).find('a span')?.text()?.trim() || null,
                rank: $(el).find('a b')?.text()?.trim() || null,
                poster: $(el).find('a .poster img')?.attr('src')?.trim() || null
            });
        });

        $(recentlyUpdatedSelector).each((i, el) => {
            res.recentlyUpdatedManga.push({
                id: $(el).find('.inner > a')?.attr('href')?.replace('/manga/', '') || null,
                name: $(el).find('.info > a')?.text()?.trim() || null,
                poster: $(el).find('.inner > a img')?.attr('src')?.trim() || null,
                type: $(el).find('.inner .info div .type')?.text()?.trim() || null,
                latestChapters: $(el).find('.info .content[data-name="chap"] li')?.map((i, chapterEl) => ({
                    id: $(chapterEl).find('a')?.attr('href')?.replace('/read/', '') || null,
                    chapterName: $(chapterEl).find('a span').first().text().trim(),
                    releaseTime: $(chapterEl).find('a span').last().text().trim()
                })).get() || []
            });
        });

        $(newReleaseSelector).each((i, el) => {
            res.newReleaseManga.push({
                id: $(el).find('a')?.attr('href')?.replace('/manga/', '') || null,
                name: $(el).find('a span')?.text()?.trim() || null,
                poster: $(el).find('a .poster img')?.attr('src')?.trim() || null
            });
        });

        return res;

    } catch (error) {
        throw new Error(error.message);
    }
};

/**
 * Scrape Latest Page (updated, newest, added)
 * @param {string} pageType
 * @param {number} page
 */
const scrapeLatestPage = async (pageType, page = 1) => {
    try {
        const html = await requestManager.request(`${BASE_URL}/${pageType}?page=${page}`, 'GET', {}, {}, 'cloudscraper');
        const $ = cheerio.load(html);

        const results = [];
        const totalMangaText = $('section.mt-5 > .head > span').text().trim();
        const totalMangaMatch = totalMangaText.match(/(\d{1,3}(,\d{3})*)/);
        const totalManga = totalMangaMatch ? parseInt(totalMangaMatch[0].replace(/,/g, '')) : 0;

        const mangaOnPage = $('div.original.card-lg > div.unit').length;

        let totalPages = 1;
        if (totalManga > 0 && mangaOnPage > 0) {
            totalPages = Math.ceil(totalManga / mangaOnPage);
        }

        $('div.original.card-lg > div.unit').each((i, el) => {
            const manga = {
                id: $(el).find('a.poster').attr('href')?.replace('/manga/', '') || null,
                title: $(el).find('div.info > a').text().trim() || null,
                poster: $(el).find('a.poster > div > img').attr('src')?.trim() || null,
                type: $(el).find('div.info > div > span.type').text().trim() || null,
                chapters: [],
            };

            $(el).find('ul.content[data-name="chap"] > li').each((i, chapEl) => {
                manga.chapters.push({
                    url: $(chapEl).find('a').attr('href') || null,
                    title: $(chapEl).find('a').attr('title') || null,
                    chapter: $(chapEl).find('a > span:first-child').text().trim() || null,
                    releaseDate: $(chapEl).find('a > span:last-child').text().trim() || null,
                });
            });

            results.push(manga);
        });

        return {
            results,
            currentPage: page,
            totalPages,
            hasNextPage: page < totalPages
        };
    } catch (error) {
        throw new Error(error.message);
    }
};

/**
 * Scrape Category Page
 * @param {string} category
 * @param {number} page
 */
const scrapeCategory = async (category, page = 1) => {
    try {
        const html = await requestManager.request(`${BASE_URL}/type/${category}?page=${page}`, 'GET', {}, {}, 'cloudscraper');
        const $ = cheerio.load(html);

        const results = [];
        const totalMangaText = $('section.mt-5 > .head > span').text().trim();
        const totalMangaMatch = totalMangaText.match(/(\d{1,3}(,\d{3})*)/);
        const totalManga = totalMangaMatch ? parseInt(totalMangaMatch[0].replace(/,/g, '')) : 0;

        const mangaOnPage = $('div.original.card-lg > div.unit').length;

        let totalPages = 1;
        if (totalManga > 0 && mangaOnPage > 0) {
            totalPages = Math.ceil(totalManga / mangaOnPage);
        }

        $('div.original.card-lg > div.unit').each((i, el) => {
            const manga = {
                id: $(el).find('a.poster').attr('href')?.replace('/manga/', '') || null,
                title: $(el).find('div.info > a').text().trim() || null,
                poster: $(el).find('a.poster > div > img').attr('src')?.trim() || null,
                type: $(el).find('div.info > div > span.type').text().trim() || null,
                chapters: [],
            };

            $(el).find('ul.content[data-name="chap"] > li').each((i, chapEl) => {
                manga.chapters.push({
                    url: $(chapEl).find('a').attr('href') || null,
                    title: $(chapEl).find('a').attr('title') || null,
                    chapter: $(chapEl).find('a > span:first-child').text().trim() || null,
                    releaseDate: $(chapEl).find('a > span:last-child').text().trim() || null,
                });
            });

            results.push(manga);
        });

        return {
            results,
            currentPage: page,
            totalPages,
            hasNextPage: page < totalPages,
            category
        };
    } catch (error) {
        throw new Error(error.message);
    }
};

/**
 * Scrape Genre Page
 * @param {string} genre
 * @param {number} page
 */
const scrapeGenre = async (genre, page = 1) => {
    try {
        const html = await requestManager.request(`${BASE_URL}/genre/${genre}?page=${page}`, 'GET', {}, {}, 'cloudscraper');
        const $ = cheerio.load(html);

        const results = [];
        const totalMangaText = $('section.mt-5 > .head > span').text().trim();
        const totalMangaMatch = totalMangaText.match(/(\d{1,3}(,\d{3})*)/);
        const totalManga = totalMangaMatch ? parseInt(totalMangaMatch[0].replace(/,/g, '')) : 0;

        const mangaOnPage = $('div.original.card-lg > div.unit').length;

        let totalPages = 1;
        if (totalManga > 0 && mangaOnPage > 0) {
            totalPages = Math.ceil(totalManga / mangaOnPage);
        }

        $('div.original.card-lg > div.unit').each((i, el) => {
            const manga = {
                id: $(el).find('a.poster').attr('href')?.replace('/manga/', '') || null,
                title: $(el).find('div.info > a').text().trim() || null,
                poster: $(el).find('a.poster > div > img').attr('src')?.trim() || null,
                type: $(el).find('div.info > div > span.type').text().trim() || null,
                chapters: [],
            };

            $(el).find('ul.content[data-name="chap"] > li').each((i, chapEl) => {
                manga.chapters.push({
                    url: $(chapEl).find('a').attr('href') || null,
                    title: $(chapEl).find('a').attr('title') || null,
                    chapter: $(chapEl).find('a > span:first-child').text().trim() || null,
                    releaseDate: $(chapEl).find('a > span:last-child').text().trim() || null,
                });
            });

            results.push(manga);
        });

        return {
            results,
            currentPage: page,
            totalPages,
            hasNextPage: page < totalPages,
            genre
        };
    } catch (error) {
        throw new Error(error.message);
    }
};

/**
 * Get Volumes
 * @param {string} mangaId
 * @param {string} language
 */
const getVolumes = async (mangaId, language = 'en') => {
    try {
        let idPart = mangaId;
        if (mangaId.includes('.')) {
            idPart = mangaId.split('.').pop();
        }

        const data = await requestManager.request(
            `${BASE_URL}/ajax/manga/${idPart}/volume/${language.toLowerCase()}`,
            'GET',
            {},
            {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Referer': `${BASE_URL}/manga/${mangaId}`
                }
            },
            'cloudscraper'
        );

        const responseJson = typeof data === 'string' ? JSON.parse(data) : data;
        const $ = cheerio.load(responseJson.result);
        const volumes = [];

        $('.unit').each((_, element) => {
            const image = $(element).find('img').attr('src');
            volumes.push({
                id: $(element).find('a').attr('href') || null,
                image: image?.startsWith('http') ? image : `${BASE_URL}${image}`,
            });
        });

        return volumes;
    } catch (error) {
        throw new Error(error.message);
    }
};

module.exports = {
    search,
    scrapeMangaInfo,
    getChapters,
    getChapterImages,
    scrapeHomePage,
    scrapeLatestPage,
    scrapeCategory,
    scrapeGenre,
    getVolumes
};
