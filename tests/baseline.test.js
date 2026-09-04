const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testMangafire() {
  console.log('🧪 Testing Mangafire endpoints...');
  try {
    // Search
    const searchRes = await axios.get(`${BASE_URL}/api/mangafire/search?q=One+Piece`);
    console.log('✅ Search (One Piece):', searchRes.status === 200 ? 'PASS' : 'FAIL');
    
    // Info
    const mangaId = searchRes.data.results[0].id;
    const infoRes = await axios.get(`${BASE_URL}/api/mangafire/manga/${mangaId}`);
    console.log('✅ Manga Info:', infoRes.status === 200 ? 'PASS' : 'FAIL');
    
    console.log('🎉 Mangafire baseline tests passed.');
  } catch (error) {
    console.error('❌ Mangafire baseline tests failed:', error.message);
  }
}

testMangafire();
