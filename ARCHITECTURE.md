# YomuAPI Architecture

## Overview
YomuAPI is a manga scraping API that supports multiple sources. The architecture follows the MVC (Model-View-Controller) pattern with additional scraper modules.

## Components

### 1. Scraper Layer (`/scrapers`)
- **Role**: Contains the actual scraping logic for each manga source
- **Responsibilities**:
  - Handle HTTP requests to the source website
  - Parse HTML responses using Cheerio
  - Extract manga data (title, description, chapters, images, etc.)
  - Handle anti-bot measures if needed
- **Location**: `/scrapers/<source-name>.js`

### 2. Model Layer (`/models`)
- **Role**: Acts as an abstraction layer between controllers and scrapers
- **Responsibilities**:
  - Provide a consistent interface to access different sources
  - Handle caching strategies
  - Handle rate limiting
  - Provide fallback mechanisms if a source fails
- **Location**: `/models/<source-name>Model.js`

### 3. Controller Layer (`/controllers`)
- **Role**: Handle HTTP requests and responses
- **Responsibilities**:
  - Validate incoming request parameters
  - Call the appropriate model methods
  - Format responses according to API standards
  - Handle errors and return appropriate HTTP status codes
- **Location**: `/controllers/<source-name>Controller.js`

### 4. Route Layer (`/routes`)
- **Role**: Define API endpoints
- **Responsibilities**:
  - Map HTTP endpoints to controller methods
  - Apply middleware where needed
  - Handle endpoint-specific validations
- **Location**: `/routes/<feature>.js`

## API Structure
- `/api/manga` - Generic manga endpoints that can work with multiple sources
- `/api/manga/pill` - Specific endpoints for MangaPill

## Adding New Sources
To add a new manga source:
1. Create a scraper in `/scrapers/<new-source>.js`
2. Create a model in `/models/<new-source>Model.js`
3. Create a controller in `/controllers/<new-source>Controller.js`
4. Create routes in `/routes/<new-source>.js`
5. Register the routes in `app.js`