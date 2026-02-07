# Yomu-API

A flexible Node.js scraper for aggregating manga and novel(later) content from multiple sources. It is still under-construction.



## Features

- 🔍 Search manga across multiple sources
- 📚 Get manga details and chapter lists
- 📖 Fetch chapter pages
- 🔥 Trending and new manga
- 💾 Built-in caching (5-minute default)
- 🛡️ Support for multiple scraping methods (axios, cloudscraper, playwright)

| Source | Status |
|--------|--------|
| MangaPill | ✅ |
| FlameComics | ✅ |
| MangaPark | ✅ |
| MangaFire | ✅ |

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

#### MangaPark Endpoints

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
GET /api/mangafire/search?q=naruto
```

##### Get Manga Details
```
GET /api/mangafire/manga/:id
```

##### Get Chapters
```
GET /api/mangafire/manga/:id/chapters/:lang?
```

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
GET /api/mangafire/genre/:genre
```

##### Get Category
```
GET /api/mangafire/category/:category
```
*(eg: manga, manhwa)*

##### Get Volumes
```
GET /api/mangafire/volumes/:id/:lang?
```

##### Get Latest/Trending/Updated
```
GET /api/mangafire/:pageType
```
*(pageType can be: updated, newest, added)*

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