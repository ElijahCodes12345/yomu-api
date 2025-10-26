# Yomu-API

A flexible Node.js scraper for aggregating manga and novel(later) content from multiple sources. It is still under-construction so only one manga source exist as for now.

## ⚠️ Disclaimer

This project is for **educational purposes only**. Users are responsible for complying with the terms of service of any websites they scrape and applicable copyright laws in their jurisdiction.

## Features

- 🔍 Search manga across multiple sources
- 📚 Get manga details and chapter lists
- 📖 Fetch chapter pages
- 🔥 Trending and new manga
- 💾 Built-in caching (5-minute default)
- 🛡️ Support for multiple scraping methods (axios, cloudscraper, playwright)

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

#### Search Manga
```
GET /api/mangapill/quick-search?q=naruto
```

#### Get Manga Details
```
GET /api/mangapill/:id/:slug
```

#### Get Chapter
```
GET /api/mangapill/chapters/:id/:slug
```

#### Trending Manga
```
GET /api/mangapill/trending
```

#### Advanced Search
```
GET /api/mangapill/search?q=naruto&type=manga&status=publishing&page=1
```

#### New Manga
```
GET /api/mangapill/new
```

#### New Chapters
```
GET /api/mangapill/new-chapters
```

#### Featured Chapters
```
GET /api/mangapill/featured-chapters
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

2. Create a model in `models/` following the same pattern as `mangaPillModel.js`

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

## Contributing

Contributions are welcome! Please ensure:
- Code follows existing patterns
- New sources include proper error handling
- Data is sanitized before returning

## Legal Notice

This tool is provided as-is for educational purposes. The developers:
- Do not host or distribute any manga content
- Do not encourage violation of terms of service
- Are not responsible for how users deploy this software
- Recommend respecting copyright and website policies

Use responsibly and at your own risk.