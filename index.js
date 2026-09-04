/**
 * YomuAPI - Manga Scraper Library
 * 
 * This file serves as the entry point when YomuAPI is used as a library 
 * in another project (e.g., via npm install or local require).
 */

const mangafire = require('./scrapers/mangafire');
const mangapill = require('./scrapers/mangapill');
const mangapark = require('./scrapers/mangapark');
const flamecomics = require('./scrapers/flamecomics');
const weebcentral = require('./scrapers/weebcentral');
const mangadot = require('./scrapers/mangadot');
const novelbuddy = require('./scrapers/novelbuddy');
const novelfire = require('./scrapers/novelfire');
const freewebnovel = require('./scrapers/freewebnovel');

const mangafireModel = require('./models/mangafireModel');
const mangaPillModel = require('./models/mangaPillModel');
const mangaparkModel = require('./models/mangaparkModel');
const flamecomicsModel = require('./models/flamecomicsModel');
const weebcentralModel = require('./models/weebcentralModel');
const mangadotModel = require('./models/mangadotModel');
const novelbuddyModel = require('./models/novelbuddyModel');
const novelfireModel = require('./models/novelfireModel');
const freewebnovelModel = require('./models/freewebnovelModel');

const app = require('./app');
const requestManager = require('./utils/requestManager');
const solver = require('./utils/solver');

module.exports = {
    // Scrapers (Raw data, no cache)
    scrapers: {
        mangafire,
        mangapill,
        mangapark,
        flamecomics,
        weebcentral,
        mangadot,
        novelbuddy,
        novelfire,
        freewebnovel
    },

    // Models (Includes 5-minute caching)
    models: {
        mangafire: mangafireModel,
        mangaPill: mangaPillModel,
        mangapark: mangaparkModel,
        flamecomics: flamecomicsModel,
        weebcentral: weebcentralModel,
        mangadot: mangadotModel,
        novelbuddy: novelbuddyModel,
        novelfire: novelfireModel,
        freewebnovel: freewebnovelModel
    },
    
    // Core App (Express)
    // You can mount this in your own Express app: app.use('/manga', yomu.app)
    app,
    
    // Utilities
    utils: {
        requestManager,
        solver
    }
};

