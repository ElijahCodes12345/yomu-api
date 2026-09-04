# Yomu-API

A flexible Node.js scraper for aggregating manga and novel(later) content from multiple sources. It is still under-construction.



## Features

- 🔍 Search manga across multiple sources
- 📚 Get manga details and chapter lists
- 📖 Fetch chapter pages
- 🔥 Trending and new manga
- 💾 Built-in caching (5-minute default)
- 🛡️ Support for multiple scraping methods (axios, cloudscraper, playwright)

| Source | Type | Status |
|--------|------|--------|
| MangaPill | Manga | ✅ |
| FlameComics | Manga | ✅ |
| MangaPark | Manga | ❌ (Shutdown) |
| MangaFire | Manga | ✅ |
| WeebCentral | Manga | ✅ |
| MangaDot | Manga | ✅ |
| NovelBuddy | Novel | ✅ |
| NovelFire | Novel | ✅ |

## Installation

```bash
npm install
```

## Usage

### Start the server

```bash
npm start
```

Server runs on `http://localhost:3000` (or your configured port)

### API Endpoints

#### MangaPill Endpoints

##### Search Manga
```
GET /api/mangapill/quick-search?q=naruto
```

##### Get Manga Details
```
GET /api/mangapill/:id/:slug
```

##### Get Chapter
```
GET /api/mangapill/chapters/:id/:slug
```

##### Trending Manga
```
GET /api/mangapill/trending
```

##### Advanced Search
```
GET /api/mangapill/search?q=naruto&type=manga&status=publishing&page=1
```

##### New Manga
```
GET /api/mangapill/new
```

##### New Chapters
```
GET /api/mangapill/new-chapters
```

##### Featured Chapters
```
GET /api/mangapill/featured-chapters
```

#### FlameComics Endpoints

##### Search Manga/Novel
```
GET /api/flamecomics/search?q=naruto
```

##### Advanced Search
```
GET /api/flamecomics/advanced-search?q=naruto&type=manga&status=publishing&genre=action
```

##### Get Manga Details
```
GET /api/flamecomics/manga/:id
```

##### Get Novel Details
```
GET /api/flamecomics/novel/:id
```

##### Get Manga Chapter
```
GET /api/flamecomics/manga/:mangaId/chapter/:token
```

##### Get Popular Manga
```
GET /api/flamecomics/popular
```

##### Get New Manga
```
GET /api/flamecomics/new-manga
```

##### Get Latest Updates
```
GET /api/flamecomics/latest
```

##### Get Staff Picks
```
GET /api/flamecomics/staff-picks
```

##### Get Novels
```
GET /api/flamecomics/novels
```

#### MangaPark Endpoints *(Shutdown / Unoperational)*

##### Search Manga
```
GET /api/mangapark/search?q=naruto
```

##### Advanced Search
```
GET /api/mangapark/advanced-search?q=naruto&genres_include=action,adventure&genres_exclude=ecchi&orig=ja&lang=en&status=ongoing&upload=ongoing&sortby=field_score&page=1
```

##### Get Manga Details
```
GET /api/mangapark/manga/:id
```

##### Get Manga Chapter
```
GET /api/mangapark/manga/:mangaId/chapter/:chapterId
```
*Note: Image URLs are automatically fixed to use the most stable subdomain for reliable loading.*

##### Get Popular Manga
```
GET /api/mangapark/popular
```

##### Get New Manga
```
GET /api/mangapark/new-manga
```

##### Get Latest Updates
```
GET /api/mangapark/latest
```

##### Get Latest Anime
```
GET /api/mangapark/latest-anime
```

#### MangaFire Endpoints

##### Search Manga
```
GET /api/mangafire/search?q=naruto&page=1
```

##### Browse / Filter Manga
```
GET /api/mangafire/browse?type=manga&status=finished&genres_in=isekai&sort=recently_updated&year_from=2015&page=1
```
* **Supported Query Parameters:**
  - `keyword` / `q`: Search string
  - `type` / `types`: Filter by type (`manga`, `manhwa`, `manhua`)
  - `status` / `statuses`: Filter by status (`releasing`, `finished`, `on_hiatus`, `discontinued`, `not_yet_released`)
  - `genres_in`: Included genres (accepts integer IDs or names/slugs like `isekai`, `action`, `comedy`)
  - `genres_ex`: Excluded genres (accepts integer IDs or names/slugs like `horror`)
  - `content_rating`: Content rating (`safe`, `suggestive`, `erotica`, `hentai`)
  - `languages`: Translation languages (`en`, `fr`, `ja`, etc.)
  - `year_from` / `year_to`: Release year bounds (e.g. `2015`, `2024`)
  - `min_chap`: Minimum number of chapters
  - `author` / `artist`: Creator names
  - `sort`: Sort order (`recently_updated`, `most_viewed`, `scores`, `newest`, `random`)
  - `page`: Page number (default: `1`)

##### Filter Options
```
GET /api/mangafire/filter-options
```
Returns available genres, themes, demographics, types, statuses, content ratings, and sort choices.

##### Random Manga
```
GET /api/mangafire/random
```

##### Get Manga Details
```
GET /api/mangafire/manga/:id
```
*(Accepts `id` in `slug.hid` format like `naruto.92kk8`, or hash ID `92kk8`)*

##### Get Available Languages
```
GET /api/mangafire/manga/:id/languages
```

##### Get Chapters
```
GET /api/mangafire/manga/:id/chapters?page=1
GET /api/mangafire/manga/:id/chapters/:lang?page=1
```
*(Defaults to English `en` if `:lang` is omitted; supports pagination with 60 chapters per page)*

##### Get Chapter Images
```
GET /api/mangafire/read/:chapterId
```

##### Get Home Page
```
GET /api/mangafire/home
```

##### Get Genre
```
GET /api/mangafire/genre/:genre?page=1
```
*(Accepts genre names like `isekai`, `action`, or IDs)*

##### Get Category
```
GET /api/mangafire/category/:category?page=1
```
*(e.g.: `manga`, `manhwa`, `manhua`)*

##### Get Volumes
```
GET /api/mangafire/volumes/:id/:lang?
```

##### Get Latest/Trending/Updated
```
GET /api/mangafire/:pageType?page=1
```
*(pageType can be: `updated`, `newest`, `added`)*

#### WeebCentral Endpoints

##### Search Manga
```
GET /api/weebcentral/search?q=naruto&page=1
```

##### Random Manga
```
GET /api/weebcentral/random
```

##### Get Manga Details
```
GET /api/weebcentral/manga/:id
```

##### Get Chapters
```
GET /api/weebcentral/manga/:id/chapters
```

##### Read Chapter Images
```
GET /api/weebcentral/read/:chapterId
```

##### Latest Updates
```
GET /api/weebcentral/latest?page=1
```

##### Home Page
```
GET /api/weebcentral/home
```

#### MangaDot Endpoints

##### Search Manga
```
GET /api/mangadot/search?q=naruto&page=1
```

##### Get Manga Details
```
GET /api/mangadot/manga/:id
```

##### Get Chapters
```
GET /api/mangadot/manga/:id/chapters
GET /api/mangadot/manga/:id/chapters/:lang
```

##### Read Chapter Images
```
GET /api/mangadot/read/:chapterId
```

##### Latest Updates
```
GET /api/mangadot/latest?page=1
```

##### Home Page
```
GET /api/mangadot/home
```

---

### Novel Endpoints

#### NovelBuddy (`/api/novelbuddy`)

- **Search**: `GET /api/novelbuddy/search?q=shadow+slave&page=1`
- **Novel Info**: `GET /api/novelbuddy/novel/:id`
- **Novel Chapters**: `GET /api/novelbuddy/novel/:id/chapters`
- **Read Chapter**: `GET /api/novelbuddy/read/:novelSlug/:chapterSlug`
- **Latest Releases**: `GET /api/novelbuddy/latest?page=1`
- **Popular**: `GET /api/novelbuddy/popular?page=1`
- **Rankings**: `GET /api/novelbuddy/ranking?page=1`
- **Genres**: `GET /api/novelbuddy/genres`
- **Filter by Genre**: `GET /api/novelbuddy/genre/:genre?page=1`
- **Home Feed**: `GET /api/novelbuddy/home`

#### NovelFire (`/api/novelfire`)

- **Search**: `GET /api/novelfire/search?q=shadow+slave&page=1`
- **Novel Info**: `GET /api/novelfire/novel/:id`
- **Novel Chapters**: `GET /api/novelfire/novel/:id/chapters?page=1`
- **Read Chapter**: `GET /api/novelfire/read/:novelId/:chapterId`
- **Latest Releases**: `GET /api/novelfire/latest?page=1`
- **Rankings**: `GET /api/novelfire/ranking?page=1`
- **Genres**: `GET /api/novelfire/genres`
- **Filter by Genre**: `GET /api/novelfire/genre/:genre?page=1`
- **Home Feed**: `GET /api/novelfire/home`

---

## Library Usage

YomuAPI can be used as a library in other Node.js projects.

### Installation

If you are using it from another local directory:
```bash
npm install github:ElijahCodes12345/yomu-api
```

### Programmatic Usage

```javascript
const yomu = require('yomu-api');

async function example() {
    // 1. Use scrapers directly (no caching)
    const hotManga = await yomu.scrapers.mangafire.scrapeHomePage();
    
    // 2. Use models (includes built-in 5-minute caching)
    const results = await yomu.models.mangafire.search('Naruto');
    console.log(`Found ${results.length} results`);

    // 3. Use utilities
    const vrf = yomu.utils.solver.generateVrf('some-id');
}
```

### Mounting the API in your own Express app

You can easily mount the YomuAPI routes into your existing Express server:

```javascript
const express = require('express');
const yomu = require('yomu-api');

const app = express();

// Mount all YomuAPI routes under /api
app.use('/api', yomu.app);

app.listen(4000, () => {
    console.log('Main server running on port 4000');
});
```


## Project Structure

```
├── scrapers/          # Website-specific scraping logic
├── models/            # Data processing and caching layer
├── controllers/       # Request handling
├── routes/            # API route definitions
└── utils/             # Shared utilities (request manager, data processor)
```

## Adding New Sources

1. Create a new scraper in `scrapers/`:
```javascript
class NewSource {
  constructor() {
    this.baseUrl = 'https://example.com';
  }

  async searchManga(query) {
    // Implement search logic
  }
  
  // Implement other required methods
}

module.exports = NewSource;
```

2. Create a model in `models/` following the same pattern as for example `mangaPillModel.js`

3. Add routes and controller

## Configuration

- **Cache timeout**: Edit `cacheTimeout` in model files (default: 5 minutes)
- **Scraping method**: Change in `requestManager.request()` calls (`'axios'`, `'cloudscraper'`, `'playwright'`)

## Note

To access the images for some sources, you must past a referrer url. Eg: mangapill.com

## Dependencies

- `express` - Web framework
- `cheerio` - HTML parsing
- `axios` - HTTP client
- `cloudscraper` (optional) - Cloudflare bypass
- `playwright` (optional) - Browser automation

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev
```

## License Recommendation

See [LICENSE](LICENSE) file.

## Acknowledgments

Special thanks to the following repositories for their logic and implementation details which helped in the development of this scraper:
- [shafat-96/mangafire](https://github.com/shafat-96/mangafire)
- [m2k3a/mangayomi-extensions](https://github.com/m2k3a/mangayomi-extensions)

## Contributing

Contributions are welcome! Please ensure:
- Code follows existing patterns
- New sources include proper error handling
- Data is sanitized before returning

## ⚖️ Legal Notice

This tool is for **educational purposes only**. The developers do not host any content, do not encourage the violation of terms of service, and are not responsible for how users deploy this software. Use responsibly and at your own risk.