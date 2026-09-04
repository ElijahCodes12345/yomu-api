const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testProvider(provider) {
  console.log(`\n🧪 Testing ${provider} endpoints...`);
  const providerBase = `${BASE_URL}/api/${provider}`;
  
  try {
    // 1. Search
      console.log(`--- Testing Search ---`);
      const q = provider === 'flamecomics' ? 'Solo' : 'One+Piece';
      const searchRes = await axios.get(`${providerBase}/search?q=${q}`);
      console.log(`Search Status: ${searchRes.status}`);

    
    // Check if the response contains 'results' array (either in data or in data.results for some)
    const searchResults = searchRes.data.results || searchRes.data;
    if (Array.isArray(searchResults) && searchResults.length > 0) {
      console.log('✅ Search: PASS');
      const manga = searchResults[0];
      const mangaId = manga.id;
      console.log(`Test Manga ID: ${mangaId}`);

      // 2. Info
      console.log(`--- Testing Manga Info ---`);
      const infoRes = await axios.get(`${providerBase}/manga/${mangaId}`);
      console.log(`Info Status: ${infoRes.status}`);
      // For Mangafire, it returns { mangaInfo: ... } not { results: ... }
      const hasMangaData = provider === 'mangafire' ? (!!infoRes.data.mangaInfo) : (infoRes.data.results && infoRes.data.results.length > 0);
      
      if (hasMangaData) {
        console.log('✅ Info: PASS');
        
        // 3. Chapters
        console.log(`--- Testing Chapters ---`);
        let chapter;
        if (provider === 'mangafire') {
             chapter = await axios.get(`${providerBase}/manga/${mangaId}/chapters/en`);
        } else {
             // FlameComics needs token
             const mangaDetails = infoRes.data.results[0];
             // The API response shows 'token' is directly a property of chapter objects
             const token = mangaDetails.chapters[0].token;
             chapter = await axios.get(`${providerBase}/manga/${mangaId}/chapter/${token}`);
        }

        console.log(`Chapter Status: ${chapter.status}`);
        if (chapter.data) {
            console.log('✅ Chapter: PASS');
            // Log structure to verify
            console.log('Chapter Data Structure Sample:', JSON.stringify(chapter.data, null, 2).substring(0, 200) + '...');
        } else {
            console.log('❌ Chapter: FAIL (No data)');
        }
      } else {
        console.log('❌ Info: FAIL');
      }
    } else {
      console.log('❌ Search: FAIL (No results)');
    }
  } catch (error) {
    console.error(`❌ ${provider} tests failed:`, error.message);
    if (error.response) {
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

async function runAllTests() {
  await testProvider('mangafire');
  await testProvider('flamecomics');
}

runAllTests();
