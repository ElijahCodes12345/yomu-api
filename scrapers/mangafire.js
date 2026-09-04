const requestManager = require('../utils/requestManager');
const vrfManager = require('../utils/vrf');

const BASE_URL = 'https://mangafire.to';

const defaultHeaders = {
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    'Referer': `${BASE_URL}/`
};

let cachedFilterOptions = null;

/**
 * Fetch and cache filter options (genres, types, statuses, etc.)
 */
const getFilterOptions = async () => {
    if (cachedFilterOptions) return cachedFilterOptions;

    try {
        const vrf = await vrfManager.generate_vrf_v2('/filter-options', {});
        const data = await requestManager.request(
            `${BASE_URL}/api/filter-options?vrf=${encodeURIComponent(vrf)}`,
            'GET',
            { ...defaultHeaders, Referer: `${BASE_URL}/browse` },
            {},
            'cloudscraper'
        );

        const responseJson = typeof data === 'string' ? JSON.parse(data) : data;
        cachedFilterOptions = responseJson.data || responseJson;
        return cachedFilterOptions;
    } catch (error) {
        console.error('[MangaFire] Failed to fetch filter options:', error.message);
        return null;
    }
};

/**
 * Helper to resolve genre name or slug to genre ID
 */
const resolveGenreId = async (genreName) => {
    if (!genreName) return null;
    if (!isNaN(genreName)) return Number(genreName); // already an ID

    const options = await getFilterOptions();
    if (options) {
        const allLists = [
            ...(options.genres || []),
            ...(options.themes || []),
            ...(options.demographics || [])
        ];
        const normalized = String(genreName).toLowerCase().replace(/[-_]/g, ' ').trim();
        const found = allLists.find(g => 
            g.name.toLowerCase() === normalized || 
            g.name.toLowerCase().replace(/\s+/g, '-') === String(genreName).toLowerCase() ||
            (g.slug && g.slug.toLowerCase() === String(genreName).toLowerCase())
        );
        if (found) return found.id;
    }
    return null;
};

/**
 * Browse / Filter Titles with comprehensive filters
 * @param {object} filters
 */
const browse = async (filters = {}) => {
    try {
        const params = {};
        
        if (filters.keyword || filters.q) params.keyword = filters.keyword || filters.q;
        if (filters.page) params.page = filters.page;
        if (filters.limit) params.limit = filters.limit;

        // Types (manga, manhwa, manhua)
        const types = filters.types || filters.type;
        if (types) {
            params.types = Array.isArray(types) ? types : [types];
        }

        // Statuses (releasing, finished, on_hiatus, discontinued, not_yet_released)
        const statuses = filters.statuses || filters.status;
        if (statuses) {
            params.statuses = Array.isArray(statuses) ? statuses : [statuses];
        }

        // Genres Include - auto resolve names/slugs to integer IDs
        const genresIn = filters.genres_in || filters.genresInclude || filters.genre;
        if (genresIn) {
            const raw = Array.isArray(genresIn) ? genresIn : [genresIn];
            const resolved = [];
            for (const item of raw) {
                const id = await resolveGenreId(item);
                if (id === null || id === undefined) {
                    throw new Error(`Invalid genre '${item}'. Check /api/mangafire/filter-options for a list of valid genres.`);
                }
                resolved.push(Number(id));
            }
            params.genres_in = resolved;
        }

        // Genres Exclude - auto resolve names/slugs to integer IDs
        const genresEx = filters.genres_ex || filters.genresExclude;
        if (genresEx) {
            const raw = Array.isArray(genresEx) ? genresEx : [genresEx];
            const resolved = [];
            for (const item of raw) {
                const id = await resolveGenreId(item);
                if (id === null || id === undefined) {
                    throw new Error(`Invalid genre '${item}' in genres_ex. Check /api/mangafire/filter-options for a list of valid genres.`);
                }
                resolved.push(Number(id));
            }
            params.genres_ex = resolved;
        }

        // Content Rating (safe, suggestive, erotica, etc.)
        const contentRating = filters.content_rating || filters.contentRating;
        if (contentRating) {
            params.content_rating = Array.isArray(contentRating) ? contentRating : [contentRating];
        }

        // Languages
        const languages = filters.languages || filters.language;
        if (languages) {
            params.languages = Array.isArray(languages) ? languages : [languages];
        }

        // Years & Chapters
        if (filters.year_from || filters.yearFrom) params.year_from = filters.year_from || filters.yearFrom;
        if (filters.year_to || filters.yearTo) params.year_to = filters.year_to || filters.yearTo;
        if (filters.min_chap || filters.minChapter) params.min_chap = filters.min_chap || filters.minChapter;

        // Authors & Artists
        if (filters.authors || filters.author) params.authors = filters.authors || filters.author;
        if (filters.artists || filters.artist) params.artists = filters.artists || filters.artist;

        // Sorting / Order
        if (filters.sort || filters.order) {
            const sort = filters.sort || filters.order;
            if (typeof sort === 'object') {
                params.order = sort;
            } else if (sort === 'random') {
                params['order[random]'] = 'desc';
            } else if (sort === 'most_viewed') {
                params['order[views]'] = 'desc';
            } else if (sort === 'scores') {
                params['order[scores]'] = 'desc';
            } else if (sort === 'recently_updated') {
                params['order[chapter_updated_at]'] = 'desc';
            } else if (sort === 'newest') {
                params['order[created_at]'] = 'desc';
            } else {
                params.order = sort;
            }
        }

        const vrf = await vrfManager.generate_vrf_v2('/titles', params);
        
        // Build URL query string properly encoding array params with %5B%5D
        const queryParts = [];
        for (const [key, value] of Object.entries(params)) {
            if (Array.isArray(value)) {
                value.forEach(val => {
                    queryParts.push(`${encodeURIComponent(key)}%5B%5D=${encodeURIComponent(val)}`);
                });
            } else if (typeof value === 'object' && value !== null) {
                for (const [subKey, subVal] of Object.entries(value)) {
                    queryParts.push(`${encodeURIComponent(key)}%5B${encodeURIComponent(subKey)}%5D=${encodeURIComponent(subVal)}`);
                }
            } else if (value !== undefined && value !== null) {
                queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
            }
        }
        queryParts.push(`vrf=${encodeURIComponent(vrf)}`);

        const data = await requestManager.request(
            `${BASE_URL}/api/titles?${queryParts.join('&')}`,
            'GET',
            { ...defaultHeaders, Referer: `${BASE_URL}/browse` },
            {},
            'cloudscraper'
        );

        const responseJson = typeof data === 'string' ? JSON.parse(data) : data;
        const items = responseJson.items || [];
        const meta = responseJson.meta || {};

        const totalItems = meta.total || items.length;
        const limit = meta.limit || 30;
        const totalPages = meta.total ? Math.ceil(totalItems / limit) : 1;

        const results = items.map(item => ({
            id: item.slug && item.hid ? `${item.slug}.${item.hid}` : (item.hid || item.slug || `${item.id}`),
            hid: item.hid,
            slug: item.slug,
            title: item.title,
            poster: item.poster
                ? { small: item.poster.small || null, medium: item.poster.medium || null, large: item.poster.large || null }
                : null,
            type: item.type || null,
            status: item.status ?? '',
            year: item.year || null,
            rank: item.rank ?? null,
            latestChapter: item.latestChapter ?? null,
            chapterUpdatedAt: item.chapterUpdatedAt || null,
            url: item.url || `/title/${item.hid}-${item.slug}`,
        }));

        return {
            currentPage: Number(filters.page || 1),
            totalPages,
            totalItems,
            results
        };
    } catch (error) {
        throw new Error(error.message);
    }
};

/**
 * Search/Filter Manga
 * @param {string} keyword
 * @param {number} page
 */
const search = async (keyword, page = 1) => {
    return await browse({ keyword, page });
};

/**
 * Helper to extract HID from various ID formats (e.g. "naruto.92kk8", "92kk8-naruto", "92kk8")
 */
const extractHid = (id) => {
    if (!id) return '';
    if (id.includes('.')) {
        const parts = id.split('.');
        return parts[parts.length - 1].length <= 6 ? parts[parts.length - 1] : parts[0];
    }
    if (id.includes('-')) {
        const parts = id.split('-');
        return parts[0].length <= 6 ? parts[0] : parts[parts.length - 1];
    }
    return id;
};

/**
 * Get Random Manga Title
 */
const getRandomManga = async () => {
    try {
        const vrf = await vrfManager.generate_vrf_v2('/titles', { 'order[random]': 'desc', limit: 1 });
        const data = await requestManager.request(
            `${BASE_URL}/api/titles?order[random]=desc&limit=1&vrf=${encodeURIComponent(vrf)}`,
            'GET',
            defaultHeaders,
            {},
            'cloudscraper'
        );

        const responseJson = typeof data === 'string' ? JSON.parse(data) : data;
        const items = responseJson.items || [];
        if (items.length === 0) return null;

        const randomItem = items[0];
        return await scrapeMangaInfo(randomItem.hid || randomItem.id);
    } catch (error) {
        throw new Error(error.message);
    }
};

/**
 * Scrape Manga Info
 * @param {string} id - Manga HID, slug.hid, or slug (e.g. "92kk8", "naruto.92kk8")
 */
const scrapeMangaInfo = async (id) => {
    try {
        const idPart = extractHid(id);

        const vrf = await vrfManager.generate_vrf_v2(`/titles/${idPart}`, {});
        const data = await requestManager.request(
            `${BASE_URL}/api/titles/${idPart}?vrf=${encodeURIComponent(vrf)}`,
            'GET',
            { ...defaultHeaders, Referer: `${BASE_URL}/title/${id}` },
            {},
            'cloudscraper'
        );

        const responseJson = typeof data === 'string' ? JSON.parse(data) : data;
        const titleData = responseJson.data || responseJson;

        // Clean HTML description if present
        let cleanDescription = '';
        if (titleData.synopsisHtml) {
            cleanDescription = titleData.synopsisHtml
                .replace(/<br\s*[\/]?>/gi, '\n')
                .replace(/<[^>]+>/g, '')
                .trim();
        } else if (titleData.synopsis || titleData.description) {
            cleanDescription = (titleData.synopsis || titleData.description).trim();
        }

        const altTitles = Array.isArray(titleData.altTitles)
            ? titleData.altTitles
            : (titleData.altTitles ? [titleData.altTitles] : (titleData.alt_titles ? (Array.isArray(titleData.alt_titles) ? titleData.alt_titles : [titleData.alt_titles]) : []));

        const mangaInfo = {
            id: titleData.slug && titleData.hid ? `${titleData.slug}.${titleData.hid}` : (titleData.hid || titleData.id),
            hid: titleData.hid,
            slug: titleData.slug,
            title: titleData.title || '',
            altTitles,
            poster: titleData.poster?.large || titleData.poster?.medium || titleData.poster?.small || null,
            status: titleData.status || '',
            type: titleData.type || '',
            contentRating: titleData.contentRating || '',
            description: cleanDescription,
            author: Array.isArray(titleData.authors) ? titleData.authors.map(a => a.title || a.name || a).join(', ') : '',
            artist: Array.isArray(titleData.artists) ? titleData.artists.map(a => a.title || a.name || a).join(', ') : '',
            published: titleData.year ? `${titleData.year}` : '',
            genres: Array.isArray(titleData.genres) ? titleData.genres.map(g => g.title || g.name || g) : [],
            demographics: Array.isArray(titleData.demographics) ? titleData.demographics.map(d => d.title || d.name || d) : [],
            rating: titleData.rating ? `${titleData.rating}` : '',
            ratingCount: titleData.ratingCount || 0,
            follows: titleData.follows || 0,
            rank: titleData.rank ? `#${titleData.rank}` : null,
            totalChapters: titleData.latestChapter || null,
            hasVolumes: !!titleData.hasVolumes,
            languages: titleData.languages || [],
            links: titleData.links || {}
        };

        const similarManga = (titleData.related || titleData.similar || []).map(item => ({
            id: item.slug && item.hid ? `${item.slug}.${item.hid}` : (item.hid || item.slug || `${item.id}`),
            hid: item.hid,
            slug: item.slug,
            name: item.title,
            poster: item.poster?.medium || item.poster?.large || null
        }));

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
 * @param {string} mangaId - Manga HID or slug.hid
 * @param {string} language - e.g. "en"
 * @param {number|string} page - Chapter page number (default 1) or 'all'
 */
const getChapters = async (mangaId, language = 'en', page = 1) => {
    try {
        const idPart = extractHid(mangaId);
        const lang = language && language !== 'all' ? language.toLowerCase() : 'en';

        // Helper to fetch a single chapters page
        const fetchPage = async (p = 1) => {
            const params = { language: lang, page: p };
            const vrf = await vrfManager.generate_vrf_v2(`/titles/${idPart}/chapters`, params);
            const data = await requestManager.request(
                `${BASE_URL}/api/titles/${idPart}/chapters?language=${lang}&page=${p}&vrf=${encodeURIComponent(vrf)}`,
                'GET',
                { ...defaultHeaders, Referer: `${BASE_URL}/title/${mangaId}` },
                {},
                'cloudscraper'
            );
            return typeof data === 'string' ? JSON.parse(data) : data;
        };

        if (page === 'all') {
            // Fetch all pages
            const firstPageData = await fetchPage(1);
            const items = [...(firstPageData.items || [])];
            const lastPage = firstPageData.meta?.lastPage || 1;

            if (lastPage > 1) {
                for (let p = 2; p <= lastPage; p++) {
                    const nextPageData = await fetchPage(p);
                    if (nextPageData.items) {
                        items.push(...nextPageData.items);
                    }
                }
            }

            return items.map(ch => ({
                id: `${ch.id}`,
                chapterId: `${ch.id}`,
                number: `${ch.number || ''}`,
                title: ch.name || `Chapter ${ch.number}`,
                language: ch.language || lang,
                releaseDate: ch.createdAt ? new Date(ch.createdAt * 1000).toISOString() : null
            }));
        }

        const pageNum = Number(page) || 1;
        const pageData = await fetchPage(pageNum);
        const items = pageData.items || [];
        const meta = pageData.meta || {};

        const chapters = items.map(ch => ({
            id: `${ch.id}`,
            chapterId: `${ch.id}`,
            number: `${ch.number || ''}`,
            title: ch.name || `Chapter ${ch.number}`,
            language: ch.language || lang,
            releaseDate: ch.createdAt ? new Date(ch.createdAt * 1000).toISOString() : null
        }));

        // Attach pagination metadata
        chapters.meta = {
            currentPage: meta.page || pageNum,
            totalPages: meta.lastPage || 1,
            totalChapters: meta.total || chapters.length,
            hasNextPage: !!meta.hasNext,
            hasPrevPage: !!meta.hasPrev
        };

        return chapters;
    } catch (error) {
        throw new Error(error.message);
    }
};

/**
 * Get Languages available for a title
 * @param {string} mangaId 
 */
const getLanguages = async (mangaId) => {
    try {
        const mangaDetails = await scrapeMangaInfo(mangaId);
        if (mangaDetails.mangaInfo && mangaDetails.mangaInfo.languages.length > 0) {
            return mangaDetails.mangaInfo.languages.map(lang => ({
                id: lang,
                title: lang.toUpperCase()
            }));
        }
        return [{ id: 'en', title: 'EN' }];
    } catch (error) {
        return [{ id: 'en', title: 'English' }];
    }
};

/**
 * Get Chapter Images
 * @param {string} chapterId 
 */
const getChapterImages = async (chapterId) => {
    try {
        const vrf = await vrfManager.generate_vrf_v2(`/chapters/${chapterId}`, {});
        const data = await requestManager.request(
            `${BASE_URL}/api/chapters/${chapterId}?vrf=${encodeURIComponent(vrf)}`,
            'GET',
            { ...defaultHeaders, Referer: `${BASE_URL}/read/${chapterId}` },
            {},
            'cloudscraper'
        );

        const responseJson = typeof data === 'string' ? JSON.parse(data) : data;
        const chapterData = responseJson.data || responseJson;
        const pages = chapterData.pages || chapterData.images || [];

        return pages.map(page => typeof page === 'string' ? page : (page.url || page.src || page[0]));
    } catch (error) {
        throw new Error(error.message);
    }
};

/**
 * Scrape Home Page / Trending Feeds
 */
const scrapeHomePage = async () => {
    try {
        const vrfTop = await vrfManager.generate_vrf_v2('/top-titles', { days: 7, limit: 15 });
        const topData = await requestManager.request(
            `${BASE_URL}/api/top-titles?days=7&limit=15&vrf=${encodeURIComponent(vrfTop)}`,
            'GET',
            defaultHeaders,
            {},
            'cloudscraper'
        );

        const vrfRecent = await vrfManager.generate_vrf_v2('/titles', { page: 1, limit: 15 });
        const recentData = await requestManager.request(
            `${BASE_URL}/api/titles?page=1&limit=15&vrf=${encodeURIComponent(vrfRecent)}`,
            'GET',
            defaultHeaders,
            {},
            'cloudscraper'
        );

        const topJson = typeof topData === 'string' ? JSON.parse(topData) : topData;
        const recentJson = typeof recentData === 'string' ? JSON.parse(recentData) : recentData;

        const formatItem = (item) => ({
            id: item.hid || item.slug || `${item.id}`,
            name: item.title,
            title: item.title,
            poster: item.poster?.large || item.poster?.medium || null,
            status: item.status || null,
            type: item.type || null
        });

        const topItems = (topJson.items || []).map(formatItem);
        const recentItems = (recentJson.items || []).map(formatItem);

        return {
            releasingManga: topItems.slice(0, 5),
            mostViewedManga: {
                day: topItems.slice(0, 5),
                week: topItems.slice(5, 10),
                month: topItems.slice(10, 15)
            },
            recentlyUpdatedManga: recentItems,
            newReleaseManga: recentItems.slice(0, 6)
        };
    } catch (error) {
        throw new Error(error.message);
    }
};

/**
 * Scrape Latest Page
 */
const scrapeLatestPage = async (pageType = 'recently-updated', page = 1) => {
    let order = 'recently_updated';
    if (pageType === 'newest') order = 'newest';
    if (pageType === 'added') order = 'newest';
    return await browse({ order, page });
};

/**
 * Scrape Category Page
 */
const scrapeCategory = async (category, page = 1) => {
    return await browse({ types: [category], page });
};

/**
 * Scrape Genre Page
 */
const scrapeGenre = async (genre, page = 1) => {
    const genreId = await resolveGenreId(genre);
    if (genreId) {
        return await browse({ genres_in: [genreId], page });
    }
    // Fallback if not found in genre options
    return await search(genre, page);
};

/**
 * Get Volumes (legacy compatibility)
 */
const getVolumes = async (mangaId, language = 'en') => {
    try {
        let idPart = mangaId;
        if (mangaId.includes('-')) idPart = mangaId.split('-')[0];
        else if (mangaId.includes('.')) idPart = mangaId.split('.')[0];

        const vrf = await vrfManager.generate_vrf_v2(`/titles/${idPart}/volumes`, {});
        const data = await requestManager.request(
            `${BASE_URL}/api/titles/${idPart}/volumes?vrf=${encodeURIComponent(vrf)}`,
            'GET',
            { ...defaultHeaders, Referer: `${BASE_URL}/title/${mangaId}` },
            {},
            'cloudscraper'
        );

        const responseJson = typeof data === 'string' ? JSON.parse(data) : data;
        return responseJson.items || [];
    } catch (error) {
        return [];
    }
};

module.exports = {
    search,
    browse,
    getFilterOptions,
    getRandomManga,
    scrapeMangaInfo,
    getChapters,
    getLanguages,
    getChapterImages,
    scrapeHomePage,
    scrapeLatestPage,
    scrapeCategory,
    scrapeGenre,
    getVolumes
};
