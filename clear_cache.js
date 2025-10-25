const MangaPillModel = require('./models/mangaPillModel');
const model = new MangaPillModel();

// Clear the cache to ensure fresh data
model.cache.clear();
console.log('Cache cleared for trending manga');