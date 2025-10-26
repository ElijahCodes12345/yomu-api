const MangaPillModel = require('./models/mangaPillModel');
const model = new MangaPillModel();

model.cache.clear();
console.log('Cache cleared successfully.');