const cheerio = require('cheerio');
const RequestManager = require('../utils/requestManager');

class Mangapark {
  constructor() {
    this.baseUrl = 'https://mangapark.com';
    this.apiUrl = `${this.baseUrl}/apo/`;
  }

  /**
   * Execute GraphQL query
   */
  async graphqlRequest(query, variables = {}) {
    try {
      const response = await RequestManager.request(
        this.apiUrl,
        'POST',
        { query, variables },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        },
        'axios'
      );
      return response.data;
    } catch (error) {
      throw new Error(`GraphQL request failed: ${error.message}`);
    }
  }

  /**
   * Search manga by title
   */
  async searchManga(query, page = 1, size = 10) {
    const searchQuery = `
      query get_searchComic($select: SearchComic_Select) {
        get_searchComic(select: $select) {
          reqPage reqSize reqSort reqWord
          newPage
          paging {
            total pages page init size skip limit prev next
          }
          items {
            id
            data {
              id dbStatus name
              origLang tranLang
              urlPath urlCover600 urlCoverOri
              genres altNames authors artists
              is_hot is_new sfw_result
              score_val follows reviews comments_total
              max_chapterNode {
                id
                data {
                  id dateCreate dbStatus isFinal sfw_result
                  dname urlPath is_new
                  userId
                  userNode {
                    id
                    data {
                      id name uniq avatarUrl urlPath
                    }
                  }
                }
              }
            }
            sser_follow
            sser_lastReadChap {
              date
              chapterNode {
                id
                data {
                  id dbStatus isFinal sfw_result
                  dname urlPath is_new
                  userId
                  userNode {
                    id
                    data {
                      id name uniq avatarUrl urlPath
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const variables = {
      select: {
        word: query,
        size,
        page,
        sortby: 'field_score'
      }
    };

    const data = await this.graphqlRequest(searchQuery, variables);

    return {
      results: data.get_searchComic.items.map(item => this.formatSearchResult(item)),
      pagination: data.get_searchComic.paging
    };
  }

  /**
   * Advanced search with pagination and sorting - using HTML scraping
   */
  async advancedSearch(query, filters = {}) {
    const {
      page = 1,
      sortby = 'field_score',
      genres_include = [],
      genres_exclude = [],
      orig = '',
      lang = '',
      status = '',
      upload = ''
    } = filters;

    let genres = '';
    if (genres_include.length > 0 || genres_exclude.length > 0) {
      const included = genres_include.length > 0 ? genres_include.join(',') : '';
      const excluded = genres_exclude.length > 0 ? genres_exclude.join(',') : '';

      if (included && excluded) {
        genres = `${included}|${excluded}`;
      } else if (included) {
        genres = included;
      } else if (excluded) {
        genres = `|${excluded}`;
      }
    }

    const params = new URLSearchParams();
    if (query && query.trim()) params.append('word', query.trim());
    if (genres) params.append('genres', genres);
    if (orig) params.append('orig', orig);
    if (lang) params.append('lang', lang);
    if (status) params.append('status', status);
    if (upload) params.append('upload', upload);
    if (sortby) params.append('sortby', sortby);
    params.append('page', page);

    const searchUrl = `${this.baseUrl}/search?${params.toString()}`;

    return await this.scrapeAdvancedSearch(searchUrl);
  }

  /**
   * Scrape advanced search results from HTML
   */
  async scrapeAdvancedSearch(url) {
    try {
      const html = await RequestManager.request(url, 'GET', {}, {}, 'axios');
      const $ = cheerio.load(html);

      const mangaResults = [];

      $('.grid.gap-5.grid-cols-1.border-t.border-t-base-200.pt-5 > div').each((index, elem) => {
        const $elem = $(elem);

        if (!$elem.find('h3 a').length) return;

        const titleLink = $elem.find('h3 a').first();
        const titleUrl = titleLink.attr('href');
        const id = titleUrl ? titleUrl.match(/\/title\/(\d+)-/)?.[1] : null;

        const title = titleLink.find('span').first().text().trim();

        const cover = $elem.find('img').first().attr('src');

        const altNamesDiv = $elem.find('.text-xs.opacity-80.line-clamp-2').first();
        const altNames = [];
        if (altNamesDiv.length > 0) {
          altNamesDiv.contents().each((i, node) => {
            if (node.type === 'text' && node.data && node.data.trim()) {
              const text = node.data.trim();
              if (text.includes(' / ')) {
                text.split(' / ').forEach(altName => {
                  const cleanName = altName.trim();
                  if (cleanName && cleanName !== title && !altNames.includes(cleanName)) {
                    altNames.push(cleanName);
                  }
                });
              } else if (text && text !== title && !altNames.includes(text)) {
                altNames.push(text);
              }
            }
          });

          altNamesDiv.find('span:not([class*="opacity-60"])').each((i, span) => {
            const altName = $(span).text().trim();
            if (altName && altName !== title && !altNames.includes(altName)) {
              altNames.push(altName);
            }
          });
        }

        const authorsDiv = $elem.find('.text-xs.opacity-80.line-clamp-2').eq(1);
        const authors = [];
        if (authorsDiv.length > 0) {
          authorsDiv.contents().each((i, node) => {
            if (node.type === 'text' && node.data && node.data.trim()) {
              const text = node.data.trim();
              if (text.includes(' / ')) {
                // Split by ' / ' to get individual authors
                text.split(' / ').forEach(author => {
                  const cleanAuthor = author.trim();
                  if (cleanAuthor && !authors.includes(cleanAuthor)) {
                    authors.push(cleanAuthor);
                  }
                });
              } else if (text && !authors.includes(text)) {
                authors.push(text);
              }
            }
          });

          authorsDiv.find('span:not([class*="opacity-60"])').each((i, span) => {
            const author = $(span).text().trim();
            if (author && !authors.includes(author)) {
              authors.push(author);
            }
          });
        }

        const rating = parseFloat($elem.find('.flex.flex-nowrap.items-center.space-x-2.text-sm .font-bold').first().text()) || 0;

        const followsText = $elem.find(`#comic-follow-swap-${id} .ml-1`).first().text().trim();
        let follows = 0;
        if (followsText) {
          if (followsText.endsWith('K')) {
            follows = parseFloat(followsText) * 1000;
          } else if (followsText.endsWith('M')) {
            follows = parseFloat(followsText) * 1000000;
          } else {
            follows = parseInt(followsText) || 0;
          }
        }

        const reviewsText = $elem.find('i[name="rate-review"] + span.ml-1').text().trim();
        let reviews = 0;
        if (reviewsText) {
          if (reviewsText.endsWith('K')) {
            reviews = parseFloat(reviewsText) * 1000;
          } else if (reviewsText.endsWith('M')) {
            reviews = parseFloat(reviewsText) * 1000000;
          } else {
            reviews = parseInt(reviewsText) || 0;
          }
        }

        const commentsText = $elem.find('i[name="comments"] + span.ml-1').text().trim();
        let comments = 0;
        if (commentsText) {
          if (commentsText.endsWith('K')) {
            comments = parseFloat(commentsText) * 1000;
          } else if (commentsText.endsWith('M')) {
            comments = parseFloat(commentsText) * 1000000;
          } else {
            comments = parseInt(commentsText) || 0;
          }
        }

        const genres = [];
        $elem.find('.flex.flex-wrap.text-xs.opacity-70 .whitespace-nowrap').each((i, genreSpan) => {
          const genre = $(genreSpan).text().trim();
          if (genre && genre !== ',' && genre !== 'Manga' && genre !== 'Manhwa' && genre !== 'Manhua' && !genres.includes(genre)) {
            genres.push(genre);
          }
        });

        let type = 'Manga';
        const typeSpan = $elem.find('.flex.flex-wrap.text-xs.opacity-70 .whitespace-nowrap.font-bold').first();
        const typeText = typeSpan.text().trim();
        if (typeText.toLowerCase().includes('manhwa')) type = 'Manhwa';
        if (typeText.toLowerCase().includes('manhua')) type = 'Manhua';

        const latestChapterLink = $elem.find('.line-clamp-1.space-x-1 a').first();
        const latestChapterTitle = latestChapterLink.text().trim();
        const latestChapterUrl = latestChapterLink.attr('href');

        // Extract uploader and date information from the latest chapter section
        let uploader = null;
        // Look for the avatar section which contains the uploader link
        const avatarContainer = $elem.find('.inline-flex.items-center.flex-nowrap.space-x-1 .avatar a').first();

        // Check for a robot icon which indicates bot upload
        const hasRobotIcon = $elem.find('i[name="robot"]').length > 0;

        if (avatarContainer.length > 0) {
          // Human uploader
          const uploaderUrl = avatarContainer.attr('href');

          // Extract username from URL as the name
          const urlMatch = uploaderUrl ? uploaderUrl.match(/\/u\/([^\/]+)/) : null;
          const uploaderName = urlMatch ? urlMatch[1] : null;

          // Get avatar image
          let uploaderAvatar = null;
          const avatarImg = avatarContainer.find('img').first();
          if (avatarImg.length > 0) {
            uploaderAvatar = avatarImg.attr('src');
            if (uploaderAvatar && !uploaderAvatar.startsWith('http')) {
              uploaderAvatar = `${this.baseUrl}${uploaderAvatar}`;
            }
          }

          uploader = {
            name: uploaderName,
            url: uploaderUrl ? `${this.baseUrl}${uploaderUrl}` : null,
            avatar: uploaderAvatar,
            is_bot: hasRobotIcon
          };
        } else {
          // No user link means it's a bot upload
          uploader = {
            name: 'Bot',
            url: null,
            avatar: null,
            is_bot: true
          };
        }

        let releaseDate = null;
        const timeElement = $elem.find('time[data-time]').first();
        if (timeElement.length > 0) {
          const timestamp = timeElement.attr('data-time');
          if (timestamp) {
            const date = new Date(parseInt(timestamp));
            releaseDate = date.toISOString();
          }
        }

        // Check if the latest chapter has an "End" badge indicating it's the final chapter
        const hasEndBadge = $elem.find('.badge:contains("End"), .badge:contains("end"), .badge.badge-xs:contains("End"), .badge.badge-xs:contains("end"), .badge.badge-info:contains("End"), .badge.badge-info:contains("end"), .badge.badge-warning:contains("End"), .badge.badge-warning:contains("end")').length > 0;

        const latestChapter = latestChapterTitle && latestChapterUrl ? {
          title: latestChapterTitle,
          url: `${this.baseUrl}${latestChapterUrl}`,
          urlPath: latestChapterUrl,
          is_final: hasEndBadge, // Indicates if this is the final chapter (has "End" badge)
          uploader: uploader,
          release_date: releaseDate
        } : null;

        const languageIcon = $elem.find('.font-family-NotoColorEmoji').first();
        const languageCode = languageIcon.text().trim();
        let language = 'English';
        if (languageCode.includes('🇯🇵')) language = 'Japanese';
        else if (languageCode.includes('🇰🇷')) language = 'Korean';
        else if (languageCode.includes('🇨🇳')) language = 'Chinese';

        const isHot = $elem.find('.bg-error:contains("HOT")').length > 0;

        const isNew = $elem.find('.bg-success:contains("NEW")').length > 0;

        const isSfw = $elem.find('.absolute.inset-0').length === 0;

        // Check if the manga is completed by looking for the "End" badge
        const isCompleted = $elem.find('.badge:contains("End")').length > 0;

        if (title) {
          mangaResults.push({
            id: id,
            title: title,
            url: titleUrl ? `${this.baseUrl}${titleUrl}` : null,
            urlPath: titleUrl,
            cover: cover ? (cover.startsWith('http') ? cover : `${this.baseUrl}${cover}`) : null,
            coverOriginal: cover ? (cover.startsWith('http') ? cover : `${this.baseUrl}${cover}`) : null,
            language: language,
            type: type,
            country: languageCode,
            genres: genres,
            altNames: altNames,
            authors: authors,
            is_hot: isHot,
            is_new: isNew,
            sfw_result: isSfw,
            isCompleted: isCompleted,
            score: rating,
            follows: follows,
            reviews: reviews,
            comments: comments,
            latest_chapter: latestChapter
          });
        }
      });

      const currentUrl = new URL(url);
      const currentPage = parseInt(currentUrl.searchParams.get('page')) || 1;

      let totalPages = 1;
      let hasNext = false;

      const paginationContainer = $('.flex.items-center.flex-wrap.space-x-1.my-10');
      if (paginationContainer.length > 0) {
        paginationContainer.find('a[href*="page="]').each((i, link) => {
          const href = $(link).attr('href');
          if (href) {
            const pageMatch = href.match(/page=(\d+)/);
            if (pageMatch) {
              const page = parseInt(pageMatch[1]);
              if (page > totalPages) totalPages = page;
            }
          }
        });

        const selectElement = paginationContainer.find('select');
        if (selectElement.length > 0) {
          const maxPageOption = selectElement.find('option').last();
          if (maxPageOption.length > 0) {
            const maxPage = parseInt(maxPageOption.attr('value'));
            if (maxPage > totalPages) totalPages = maxPage;
          }
        }

        hasNext = currentPage < totalPages;
      }

      return {
        results: mangaResults,
        pagination: {
          current: currentPage,
          total: totalPages,
          hasNext: hasNext,
          hasPrev: currentPage > 1
        }
      };
    } catch (error) {
      console.error(`Failed to scrape advanced search results from ${url}:`, error.message);
      throw new Error(`Failed to scrape advanced search results: ${error.message}`);
    }
  }

  /**
   * Get latest releases (popular, uploads, or by release date)
   */
  async getLatestReleases(options = {}) {
    const {
      where = 'popular',
      page = 1,
      size = 24,
      init = Math.floor(size / 2),
      genres_incs = [],
      genres_excs = [],
      genre = '',
      multi = null
    } = options;

    const isUploadOrRelease = ['uploads', 'release'].includes(where);

    const query = `
      query get_latestReleases($select: LatestReleases_Select) {
        get_latestReleases(select: $select) {
          paging {
            total pages page init size skip limit prev next
          }
          items {
            id
            data {
              id dbStatus name
              origLang tranLang
              urlPath urlCover600 urlCoverOri
              ${isUploadOrRelease ? 'genres' : ''}
              sfw_result is_hot is_new follows
              ${isUploadOrRelease ? 'score_val reviews comments_total' : ''}
              ${isUploadOrRelease ? 'last_chapterNodes' : 'last_userChapterNodes'}(amount:1) {
                id
                data {
                  id dateCreate dbStatus isFinal
                  dname urlPath is_new
                  ${isUploadOrRelease ? `
                    userId
                    userNode {
                      id
                      data {
                        id name uniq avatarUrl urlPath
                      }
                    }
                  ` : ''}
                }
              }
            }
            sser_follow
            ${isUploadOrRelease ? `
              sser_lastReadChap {
                date
                chapterNode {
                  id
                  data {
                    id dbStatus isFinal dname urlPath is_new
                    userId
                    userNode {
                      id
                      data { id name uniq avatarUrl urlPath }
                    }
                  }
                }
              }
            ` : ''}
          }
        }
      }
    `;

    const variables = {
      select: {
        where,
        init,
        size,
        page,
        ...(where === 'release' && { genre, multi, genres_incs, genres_excs })
      }
    };

    const data = await this.graphqlRequest(query, variables);
    return data.get_latestReleases;
  }

  /**
   * Get manga by ID (detailed view) - Cheerio based scraping
   */
  async getMangaById(id) {
    const url = `${this.baseUrl}/title/${id}`;

    try {
      const html = await RequestManager.request(url, 'GET', {}, {}, 'axios');
      const $ = cheerio.load(html);

      const title = $('.grow.pl-3.space-y-2 h3 a').text().trim();
      const altTitleElements = $('.grow.pl-3.space-y-2.md\\:hidden div.mt-1.text-xs.md\\:text-base.opacity-80 span:not([class*="opacity-30"])').map((i, el) => $(el).text().trim()).get();
      const altTitles = altTitleElements.filter(title => title && title !== $('.grow.pl-3.space-y-2 h3 a').text().trim());
      const description = $('react-island .limit-html.prose').text().trim();
      const cover = $('main .flex img').attr('src');
      console.log(cover);
      const genres = [];
      $('.whitespace-nowrap.font-bold').each((i, elem) => {
        const genre = $(elem).text().trim();
        if (genre && !genres.includes(genre)) {
          genres.push(genre);
        }
      });

      const type = $('.whitespace-nowrap.font-bold:contains("Manhwa")').length ? 'Manhwa' :
                   $('.whitespace-nowrap.font-bold:contains("Manga")').length ? 'Manga' :
                   $('.whitespace-nowrap.font-bold:contains("Manhua")').length ? 'Manhua' : 'Manga';

      // Get publication and MPark status from the detailed manga page
      let origPubStatus = null;
      let mParkStatus = null;

      // Specific selectors for the exact HTML structure
      const origPubStatusElement = $('.md\\:inline-block:contains("Original Publication:")+span.font-bold.uppercase').first();
      origPubStatus = origPubStatusElement.text().trim();

      const mParkStatusElement = $('.md\\:inline-block:contains("MPark Upload Status:")+span.font-bold.uppercase').first();
      mParkStatus = mParkStatusElement.text().trim();

      // Alternative selectors using the q:key approach
      if (!origPubStatus) {
        origPubStatus = $('[q\\:key="Yn_5"]').text().trim();
      }
      if (!mParkStatus) {
        mParkStatus = $('[q\\:key="Yn_9"]').text().trim();
      }

      const status = origPubStatus || mParkStatus || 'Unknown';

      // Check if the manga is complete by looking for an 'end' badge in the chapter list
      const hasEndBadge = $('.badge:contains("end"), .badge:contains("End"), .badge.badge-xs:contains("end"), .badge.badge-xs:contains("End"), .badge.badge-info:contains("End"), .badge.badge-info:contains("end"), .px-2.py-2.flex.flex-wrap .badge').length > 0;
      const isCompleted = (origPubStatus && origPubStatus.toLowerCase() === 'completed') || hasEndBadge;

      const langInfo = $('.whitespace-nowrap.overflow-hidden span.mr-1');
      const language = langInfo.first().next().text().trim() || 'English';
      const country = langInfo.eq(2).next().text().trim();

      const authors = [];
      $('.mt-2.text-sm.md\\:text-base.opacity-80 a').each((i, elem) => {
        const authorText = $(elem).text().trim();
        if (authorText) {
          authors.push(authorText);
        }
      });

      const scoreText = $('.text-yellow-500.font-black.text-\\[2\\.0rem\\].md\\:text-\\[2\\.5rem\\]').text().trim();
      const score = parseFloat(scoreText) || 0;

      const followsMatch = $('.whitespace-nowrap:contains("follows")').text().match(/(\d+(?:\.\d+)?[KMB]?)/);
      const follows = followsMatch ? (followsMatch[1].endsWith('K') ?
        parseFloat(followsMatch[1]) * 1000 :
        followsMatch[1].endsWith('M') ? parseFloat(followsMatch[1]) * 1000000 :
        parseInt(followsMatch[1])) : 0;

      const externalLinks = [];
      $('.lg\\:col-span-3.flex.flex-wrap.gap-3 a').each((i, elem) => {
        const link = {
          name: $(elem).find('.text-sm').text().trim(),
          url: $(elem).attr('href')
        };
        if (link.name && link.url) {
          externalLinks.push(link);
        }
      });

      const reviewsElement = $('.flex.flex-nowrap.items-center.space-x-2.text-sm span i[name="rate-review"] + span.ml-1').first().text().trim();
      const reviewsMatch = reviewsElement.match(/(\d+(?:\.\d+)?[KMB]?)/);
      const reviews = reviewsMatch ? (reviewsMatch[1].endsWith('K') ?
        parseFloat(reviewsMatch) * 1000 :
        reviewsMatch[1].endsWith('M') ? parseFloat(reviewsMatch[1]) * 1000000 :
        parseInt(reviewsMatch[1])) : 0;

      const commentsElement = $('.flex.flex-nowrap.items-center.space-x-2.text-sm span i[name="comments"] + span.ml-1').first().text().trim();
      const commentsMatch = commentsElement.match(/(\d+(?:\.\d+)?[KMB]?)/);
      const comments = commentsMatch ? (commentsMatch[1].endsWith('K') ?
        parseFloat(commentsMatch[1]) * 1000 :
        commentsMatch[1].endsWith('M') ? parseFloat(commentsMatch[1]) * 1000000 :
        parseInt(commentsMatch[1])) : 0;

      console.log(comments);

      const chapters = []; // Loop through chapter elements using the new HTML structure
      $('.scrollable-panel .px-2.py-2.flex.flex-wrap').each((i, elem) => {
        const $elem = $(elem);
        const chapterLink = $elem.find('a.link-hover.link-primary').first();
        const chapterTitle = chapterLink.text().trim();
        const chapterUrl = chapterLink.attr('href');
        const timeElement = $elem.find('time[data-time]').first();
        const releaseDate = timeElement ? timeElement.find('span').text().trim() : null;

        const uploaderElement = $elem.find('.inline-flex.items-center.space-x-1 a.link-hover.link-primary');
        const uploaderName = uploaderElement.find('span').text().trim();
        const uploaderUrl = uploaderElement.attr('href');
        let uploaderAvatar = null;
        const avatarElement = $elem.find('.avatar img');
        if (avatarElement.length > 0) {
          uploaderAvatar = avatarElement.attr('src');
          if (uploaderAvatar && !uploaderAvatar.startsWith('http')) {
            uploaderAvatar = `${this.baseUrl}${uploaderAvatar}`;
          }
        }

        const isBot = $elem.find('i[name="robot"]').length > 0;

        const commentSpan = $elem.find('i[name="comments"] + span.ml-1').first();
        const commentCount = commentSpan.length > 0 ? parseInt(commentSpan.text().trim()) || 0 : 0;

        const viewSpan = $elem.find('i[name="eye"] + span.ml-1').first();
        const viewCountText = viewSpan.length > 0 ? viewSpan.text().trim() : '';
        let viewCount = 0;
        let totalViewCount = 0;
        if (viewCountText) {
          const parts = viewCountText.split('+');
          if (parts.length >= 1) {
            const firstPart = parts[0].trim();
            if (firstPart.endsWith('K')) {
              viewCount = parseFloat(firstPart) * 1000;
            } else if (firstPart.endsWith('M')) {
              viewCount = parseFloat(firstPart) * 1000000;
            } else {
              viewCount = parseInt(firstPart) || 0;
            }
          }
          if (parts.length >= 2) {
            const secondPart = parts[1].trim();
            if (secondPart.endsWith('K')) {
              totalViewCount = parseFloat(secondPart) * 1000;
            } else if (secondPart.endsWith('M')) {
              totalViewCount = parseFloat(secondPart) * 1000000;
            } else {
              totalViewCount = parseInt(secondPart) || 0;
            }
          }
        }

        if (chapterTitle && chapterUrl) {
          let parsedReleaseDate = null;
          if (releaseDate) {
            const dateMatch = releaseDate.match(/(\d+)\s+(day|hour|minute|second|week|month|year)s?\s+ago/);
            if (dateMatch) {
              const [_, count, unit] = dateMatch;
              const now = new Date();
              switch (unit) {
                case 'second':
                  now.setSeconds(now.getSeconds() - parseInt(count));
                  break;
                case 'minute':
                  now.setMinutes(now.getMinutes() - parseInt(count));
                  break;
                case 'hour':
                  now.setHours(now.getHours() - parseInt(count));
                  break;
                case 'day':
                  now.setDate(now.getDate() - parseInt(count));
                  break;
                case 'week':
                  now.setDate(now.getDate() - (parseInt(count) * 7));
                  break;
                case 'month':
                  now.setMonth(now.getMonth() - parseInt(count));
                  break;
                case 'year':
                  now.setFullYear(now.getFullYear() - parseInt(count));
                  break;
              }
              parsedReleaseDate = now.toISOString();
            } else {
              const timestamp = timeElement.attr('data-time');
              if (timestamp) {
                parsedReleaseDate = new Date(parseInt(timestamp)).toISOString();
              } else {
                const dateObj = new Date(releaseDate);
                if (!isNaN(dateObj.getTime())) {
                  parsedReleaseDate = dateObj.toISOString();
                }
              }
            }
          }

          const hasEndBadge = $elem.find('.badge:contains("End"), .badge:contains("end"), .badge.badge-xs:contains("End"), .badge.badge-xs:contains("end"), .badge.badge-info:contains("End"), .badge.badge-info:contains("end"), .badge.badge-warning:contains("End"), .badge.badge-warning:contains("end")').length > 0;

          chapters.push({
            chapter: chapterTitle,
            title: chapterTitle,
            url: chapterUrl ? `${this.baseUrl}${chapterUrl}` : null,
            urlPath: chapterUrl,
            release_date: parsedReleaseDate,
            token: chapterUrl ? chapterUrl.split('/').pop() : null,
            is_final: hasEndBadge, // Indicates if this is the final chapter (has "End" badge)
            uploader: uploaderName ? {
              name: uploaderName,
              url: uploaderUrl ? `${this.baseUrl}${uploaderUrl}` : null,
              avatar: uploaderAvatar,
              is_bot: isBot
            } : null,
            comments: commentCount,
            views: viewCount,
            additionalViews: totalViewCount
          });
        }
      });

      return {
        id: id,
        title: title,
        url: url,
        urlPath: `/title/${id}`,
        altTitles: Array.isArray(altTitles) ? altTitles : (altTitles ? [altTitles] : []),
        description: description,
        externalLinks: externalLinks,
        cover: cover ? (cover.startsWith('http') ? cover : `${this.baseUrl}${cover}`) : null,
        coverOriginal: cover ? (cover.startsWith('http') ? cover : `${this.baseUrl}${cover}`) : null,
        language: language,
        type: type,
        tags: genres,
        country: country,
        author: authors,
        status: origPubStatus || null,
        mParkStatus: mParkStatus || null,
        isCompleted: isCompleted || false,
        score: score,
        follows: follows,
        reviews: reviews,
        comments: comments,
        sfw_result: true,
        chapters: chapters
      };
    } catch (error) {
      console.error(`Failed to scrape manga details for ID ${id}:`, error.message);
      throw new Error(`Failed to fetch manga details: ${error.message}`);
    }
  }

  /**
   * Get manga chapter
   * TODO: Implement chapter page scraping for images
   */
  async getMangaChapter(mangaId, token) {
    const chapterUrl = `${this.baseUrl}/title/${mangaId}/${token}`;

    try {
      const html = await RequestManager.request(
        chapterUrl,
        'GET',
        {},
        {},
        'axios'
      );

      const $ = cheerio.load(html);

      let title;
      const headerElement = $('h6 a span.opacity-80');
      if (headerElement.length > 0) {
        title = headerElement.contents().filter(function() {
          return this.nodeType == 3; 
        }).first().text().trim();
      }

      let pages = [];

      const qwikScript = $('script[type="qwik/json"]');
      
      if (qwikScript.length > 0) {
        const qwikData = JSON.parse(qwikScript.html());

        const imagesFromKwik = await this.extractImagesFromQwik(qwikData);

        pages.push(...imagesFromKwik); 
      }

      console.log(pages);

      // Deprecated: Try traditional img tag extraction if no images found which won't and doesn't work
      if (pages.length === 0) {
        $('#images div [data-name="image-item"] > div img').each((index, elem) => {
          const imgSrc = $(elem).attr('src');
          if (imgSrc) {
            const imageUrl = imgSrc.startsWith('http') ? imgSrc : `${this.baseUrl}${imgSrc}`;
            pages.push(imageUrl);
          }
        });
      }

      const nextChapterLink = $('.btn[href*="chapter"]:contains("Next")').attr('href');
      const prevChapterLink = $('.btn[href*="chapter"]:contains("Prev")').attr('href');

      return {
        id: mangaId,
        chapterId: token,
        title: title,
        pages: pages,
        url: chapterUrl,
        prevUrl: prevChapterLink ? `${this.baseUrl}${prevChapterLink}` : null,
        nextUrl: nextChapterLink ? `${this.baseUrl}${nextChapterLink}` : null
      };
    } catch (error) {
      throw new Error(`Failed to fetch chapter: ${error.message}`);
    }
  }

  async extractImagesFromQwik(qwikData) {
    const pages = [];
    const objs = qwikData.objs || [];

    const imageUrlPattern = /^https:\/\/s\d+\.mp[a-z]+\.[a-z]+\/media\/.*\.(jpeg|jpg|png|webp)$/i;

    function scanObject(obj) {
      if (typeof obj === 'string') {
        if (imageUrlPattern.test(obj)) {
          pages.push(obj);
        }
      } else if (Array.isArray(obj)) {
        obj.forEach(scanObject);
      } else if (obj && typeof obj === 'object') {
        Object.values(obj).forEach(scanObject);
      }
    }

    scanObject(objs);

    return [...new Set(pages)];
  }

  fixImageUrls(imageUrls) {
    if (!Array.isArray(imageUrls)) return imageUrls;

    return imageUrls.map(url => {
      if (typeof url !== 'string' || !url.startsWith('http')) {
        return url;
      }

      return url.replace(/^https:\/\/s\d{2}\.mp[a-z]+\.[a-z]+\/media\//, (match) => {
        const domainMatch = match.match(/s\d{2}\.(mp[a-z]+\.[a-z]+)/);
        if (domainMatch) {
          return match.replace(domainMatch[0], `s01.${domainMatch[1]}`);
        }
        return match;
      });
    });
  }

  /**
   * Get popular manga with pagination
   */
  async getPopularManga(page = 1, size = 24) {
    const result = await this.getLatestReleases({
      where: 'popular',
      page,
      size
    });

    return {
      popularEntries: {
        blocks: [{
          series: result.items.map(item => this.formatSeriesItem(item))
        }]
      },
      pagination: result.paging
    };
  }

  /**
   * Get new manga with pagination
   */
  async getNewManga(page = 1, size = 36) {
    const result = await this.getLatestReleases({
      where: 'uploads',
      page,
      size
    });

    return {
      results: result.items.map(item => this.formatMangaItem(item)),
      pagination: result.paging
    };
  }

  /**
   * Get latest updates with pagination
   */
  async getLatest(page = 1, size = 36) {
    const result = await this.getLatestReleases({
      where: 'uploads',
      page,
      size,
      init: 18
    });

    return {
      latestEntries: {
        blocks: [{
          series: result.items.map(item => this.formatSeriesWithChapters(item))
        }]
      },
      pagination: result.paging
    };
  }

  async getLatestAnime() {
    try {
      const cacheBuster = Math.random();
      const url = `https://anixl.to/aok/anixl_updates.js?type=series_list&version=v3x&r=${cacheBuster}`;

      const jsResponse = await RequestManager.request(url, 'GET', {}, {}, 'axios');

      const htmlMatch = jsResponse.match(/innerHTML\s*=\s*`([\s\S]*)`/);

      if (!htmlMatch || !htmlMatch[1]) {
        throw new Error('Failed to extract HTML from response');
      }

      const html = htmlMatch[1];
      const cheerio = require('cheerio');
      const $ = cheerio.load(html);

      const animeList = [];

      $('.flex.border-b').each((index, element) => {
        const $el = $(element);

        // Extract data
        const titleLink = $el.find('h3 a');
        const title = titleLink.find('span').text().trim();
        const url = titleLink.attr('href');
        const id = url?.match(/\/title\/(\d+)-/)?.[1];

        const cover = $el.find('img').attr('src');
        const coverAlt = $el.find('img').attr('alt');

        const genres = [];
        $el.find('.flex.flex-wrap.text-xs span').each((i, genreEl) => {
          const genre = $(genreEl).text().trim();
          if (genre && genre !== ',') {
            genres.push(genre);
          }
        });

        const episodeLink = $el.find('.line-clamp-1 a');
        const episodeTitle = episodeLink.find('span').text().trim();
        const episodeUrl = episodeLink.attr('href');
        const episodeId = episodeUrl?.match(/\/(\d+-[^/]+)$/)?.[1];

        const timeText = $el.find('time span').text().trim();

        if (title && url) {
          animeList.push({
            id: id,
            title: title,
            url: url,
            cover: cover,
            coverAlt: coverAlt,
            genres: genres,
            latest_episode: {
              title: episodeTitle,
              url: episodeUrl,
              id: episodeId
            },
            updated: timeText
          });
        }
      });

      return animeList;
    } catch (error) {
      throw new Error(`Failed to fetch latest anime: ${error.message}`);
    }
  }

  /**
   * Format search result with ALL important fields
   */
  formatSearchResult(item) {
    const manga = item.data;
    const maxChapter = manga.max_chapterNode?.data;

    return {
      id: manga.id,
      title: manga.name,
      url: `${this.baseUrl}${manga.urlPath}`,
      urlPath: manga.urlPath,
      language: manga.tranLang,
      type: this.getTypeFromLang(manga.origLang),
      country: manga.origLang,
      status: manga.dbStatus,
      mParkStatus: manga.mParkStatus || null,
      cover: manga.urlCover600 ? `${this.baseUrl}${manga.urlCover600}` : null,
      coverOriginal: manga.urlCoverOri ? `${this.baseUrl}${manga.urlCoverOri}` : null,
      follows: manga.follows || 0,
      isCompleted: manga.isCompleted || false, // This comes from search results HTML, not GraphQL
      score: manga.score_val || 0,
      reviews: manga.reviews || 0,
      comments: manga.comments_total || 0,
      genres: manga.genres || [],
      altNames: manga.altNames || [],
      authors: manga.authors || [],
      artists: manga.artists || [],
      is_hot: manga.is_hot,
      is_new: manga.is_new,
      sfw_result: manga.sfw_result, // Added SFW flag
      last_edit: maxChapter?.dateCreate || null,
      updated: maxChapter?.dateCreate || null,
      latest_chapter: maxChapter ? {
        id: maxChapter.id,
        title: maxChapter.dname,
        url: `${this.baseUrl}${maxChapter.urlPath}`,
        urlPath: maxChapter.urlPath,
        date: maxChapter.dateCreate,
        is_new: maxChapter.is_new,
        is_final: maxChapter.isFinal,
        uploader: maxChapter.userNode ? {
          id: maxChapter.userNode.data.id,
          name: maxChapter.userNode.data.name,
          username: maxChapter.userNode.data.uniq,
          avatar: `${this.baseUrl}${maxChapter.userNode.data.avatarUrl}`,
          url: `${this.baseUrl}${maxChapter.userNode.data.urlPath}`
        } : null
      } : null
    };
  }

  /**
   * Format manga item for lists with ALL important fields
   */
  formatMangaItem(item) {
    const manga = item.data;
    const lastChapter = manga.last_chapterNodes?.[0]?.data;

    return {
      id: manga.id,
      title: manga.name,
      url: `${this.baseUrl}${manga.urlPath}`,
      urlPath: manga.urlPath,
      language: manga.tranLang,
      type: this.getTypeFromLang(manga.origLang),
      country: manga.origLang,
      status: manga.dbStatus,
      mParkStatus: manga.mParkStatus || null,
      cover: manga.urlCover600 ? `${this.baseUrl}${manga.urlCover600}` : null,
      coverOriginal: manga.urlCoverOri ? `${this.baseUrl}${manga.urlCoverOri}` : null,
      follows: manga.follows || 0,
      isCompleted: manga.isCompleted || false, // This comes from search results HTML, not GraphQL
      is_hot: manga.is_hot, // Added is_hot flag
      is_new: manga.is_new,
      sfw_result: manga.sfw_result, // Added SFW flag
      last_edit: lastChapter?.dateCreate || null,
      updated: lastChapter?.dateCreate || null,
      latest_chapter: lastChapter ? {
        id: lastChapter.id,
        title: lastChapter.dname,
        url: `${this.baseUrl}${lastChapter.urlPath}`,
        urlPath: lastChapter.urlPath,
        date: lastChapter.dateCreate,
        is_new: lastChapter.is_new,
        is_final: lastChapter.isFinal
      } : null
    };
  }

  /**
   * Format manga details with ALL important fields
   */
  formatMangaDetails(item) {
    const manga = item.data;
    const maxChapter = manga.max_chapterNode?.data;

    return {
      id: manga.id,
      title: manga.name,
      url: `${this.baseUrl}${manga.urlPath}`,
      urlPath: manga.urlPath,
      altTitles: manga.altNames || [],
      description: null, // TODO: Scrape from manga page
      language: manga.tranLang,
      type: this.getTypeFromLang(manga.origLang),
      tags: manga.genres || [],
      country: manga.origLang,
      author: manga.authors || [],
      artist: manga.artists || [],
      status: manga.dbStatus,
      mParkStatus: manga.mParkStatus || null,
      cover: manga.urlCover600 ? `${this.baseUrl}${manga.urlCover600}` : null,
      coverOriginal: manga.urlCoverOri ? `${this.baseUrl}${manga.urlCoverOri}` : null,
      score: manga.score_val || 0,
      follows: manga.follows || 0,
      isCompleted: manga.isCompleted || false, // This comes from search results HTML, not GraphQL
      reviews: manga.reviews || 0,
      comments: manga.comments_total || 0,
      is_hot: manga.is_hot,
      is_new: manga.is_new,
      sfw_result: manga.sfw_result,
      chapters: maxChapter ? [{
        chapter_id: maxChapter.id,
        chapter: maxChapter.dname,
        title: maxChapter.dname,
        url: `${this.baseUrl}${maxChapter.urlPath}`,
        urlPath: maxChapter.urlPath,
        release_date: new Date(maxChapter.dateCreate).toISOString(),
        token: maxChapter.urlPath.split('/').pop(),
        is_new: maxChapter.is_new,
        is_final: maxChapter.isFinal
      }] : []
    };
  }

  /**
   * Format series item (for popular manga) with ALL important fields
   */
  formatSeriesItem(item) {
    const manga = item.data;
    const lastChapter = manga.last_chapterNodes?.[0]?.data || manga.last_userChapterNodes?.[0]?.data;

    return {
      series_id: manga.id,
      id: manga.id,
      title: manga.name,
      url: `${this.baseUrl}${manga.urlPath}`,
      urlPath: manga.urlPath,
      follows: manga.follows || 0,
      isCompleted: manga.isCompleted || false, // This comes from search results HTML, not GraphQL
      status: manga.dbStatus,
      mParkStatus: manga.mParkStatus || null,
      cover: manga.urlCover600 ? `${this.baseUrl}${manga.urlCover600}` : null,
      coverOriginal: manga.urlCoverOri ? `${this.baseUrl}${manga.urlCoverOri}` : null,
      country: manga.origLang,
      language: manga.tranLang,
      type: this.getTypeFromLang(manga.origLang),
      is_hot: manga.is_hot,
      is_new: manga.is_new,
      sfw_result: manga.sfw_result,
      last_edit: lastChapter?.dateCreate || null,
      time: lastChapter?.dateCreate || null,
      latest_chapter: lastChapter ? {
        id: lastChapter.id,
        title: lastChapter.dname,
        url: `${this.baseUrl}${lastChapter.urlPath}`,
        urlPath: lastChapter.urlPath,
        date: lastChapter.dateCreate,
        is_new: lastChapter.is_new,
        is_final: lastChapter.isFinal
      } : null
    };
  }

  /**
   * Format series with chapters (for latest updates) with ALL important fields
   */
  formatSeriesWithChapters(item) {
    const manga = item.data;
    const lastChapter = manga.last_chapterNodes?.[0] || manga.last_userChapterNodes?.[0];

    return {
      series_id: manga.id,
      id: manga.id,
      title: manga.name,
      url: `${this.baseUrl}${manga.urlPath}`,
      urlPath: manga.urlPath,
      follows: manga.follows || 0,
      isCompleted: manga.isCompleted || false, // This comes from search results HTML, not GraphQL
      status: manga.dbStatus,
      mParkStatus: manga.mParkStatus || null,
      cover: manga.urlCover600 ? `${this.baseUrl}${manga.urlCover600}` : null,
      coverOriginal: manga.urlCoverOri ? `${this.baseUrl}${manga.urlCoverOri}` : null,
      country: manga.origLang,
      language: manga.tranLang,
      type: this.getTypeFromLang(manga.origLang),
      is_hot: manga.is_hot,
      is_new: manga.is_new,
      sfw_result: manga.sfw_result,
      last_edit: lastChapter?.data?.dateCreate || null,
      time: lastChapter?.data?.dateCreate || null,
      chapters: lastChapter ? [{
        id: manga.id,
        chapter: lastChapter.data.dname,
        title: lastChapter.data.dname,
        url: `${this.baseUrl}${lastChapter.data.urlPath}`,
        urlPath: lastChapter.data.urlPath,
        language: manga.tranLang,
        release_date: new Date(lastChapter.data.dateCreate).toISOString(),
        token: lastChapter.data.urlPath.split('/').pop(),
        is_new: lastChapter.data.is_new,
        is_final: lastChapter.data.isFinal
      }] : []
    };
  }

  /**
   * Helper: Get manga type from language code
   */
  getTypeFromLang(langCode) {
    const typeMap = {
      'ja': 'Manga',
      'ko': 'Manhwa',
      'zh': 'Manhua',
      'en': 'Comic'
    };
    return typeMap[langCode] || 'Unknown';
  }
}

module.exports = Mangapark;