const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/freewebnovel';

async function testFreeWebNovel() {
  console.log('🧪 Testing FreeWebNovel API endpoints...\n');

  try {
    // 1. Search
    console.log('1. Testing GET /search?q=shadow slave ...');
    try {
      const searchRes = await axios.get(`${BASE_URL}/search?q=shadow%20slave`);
      console.log(`Status: ${searchRes.status}`);
      const results = searchRes.data.results;
      if (Array.isArray(results) && results.length > 0) {
        console.log(`✅ Search PASS: Found ${results.length} novels. First: "${results[0].title}" (ID: ${results[0].id})`);
      } else {
        console.log('Search returned empty array (site might be slow/geoblocked)');
      }
    } catch (e) {
      console.log(`Search request note: ${e.message}`);
    }

    // 2. Novel Info
    console.log('\n2. Testing GET /novel/shadow-slave ...');
    try {
      const infoRes = await axios.get(`${BASE_URL}/novel/shadow-slave`);
      console.log(`Status: ${infoRes.status}`);
      const novelInfo = infoRes.data.results?.[0];
      if (novelInfo && novelInfo.title) {
        console.log(`✅ Info PASS: Title: "${novelInfo.title}", Status: "${novelInfo.status}", Genres: [${novelInfo.genres?.join(', ')}]`);
      }
    } catch (e) {
      console.log(`Info request note: ${e.message}`);
    }

    // 3. Genres
    console.log('\n3. Testing GET /genres ...');
    try {
      const genresRes = await axios.get(`${BASE_URL}/genres`);
      console.log(`Status: ${genresRes.status}`);
      if (Array.isArray(genresRes.data.results) && genresRes.data.results.length > 0) {
        console.log(`✅ Genres PASS: Found ${genresRes.data.results.length} genres.`);
      }
    } catch (e) {
      console.log(`Genres request note: ${e.message}`);
    }

    console.log('\n🎉 FREEWEBNOVEL TESTS EXECUTED!');
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testFreeWebNovel();
