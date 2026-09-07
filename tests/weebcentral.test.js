const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/weebcentral';

async function testWeebCentral() {
  console.log('🧪 Testing WeebCentral API endpoints...\n');

  try {
    // 1. Search with ?q=
    console.log('1. Testing GET /search?q=naruto ...');
    const searchRes = await axios.get(`${BASE_URL}/search?q=naruto`);
    console.log(`Status: ${searchRes.status}`);
    const results = searchRes.data.results;
    if (Array.isArray(results) && results.length > 0) {
      console.log(`✅ Search PASS: Found ${results.length} mangas. First: "${results[0].title}" (ID: ${results[0].id})`);
    } else {
      console.log('❌ Search FAIL: No items returned', searchRes.data);
      return;
    }

    const testMangaId = results[0].id;

    // 2. Random Series
    console.log('\n2. Testing GET /random ...');
    const randomRes = await axios.get(`${BASE_URL}/random`);
    console.log(`Status: ${randomRes.status}`);
    const randomManga = randomRes.data.results?.[0];
    if (randomManga && randomManga.title) {
      console.log(`✅ Random PASS: "${randomManga.title}" (ID: ${randomManga.id})`);
    } else {
      console.log('❌ Random FAIL:', randomRes.data);
    }

    // 3. Manga Info
    console.log(`\n3. Testing GET /manga/${testMangaId} ...`);
    const infoRes = await axios.get(`${BASE_URL}/manga/${testMangaId}`);
    console.log(`Status: ${infoRes.status}`);
    const mangaInfo = infoRes.data.results?.[0];
    if (mangaInfo && mangaInfo.title) {
      console.log(`✅ Info PASS: Title: "${mangaInfo.title}", Author: "${mangaInfo.author}", Status: "${mangaInfo.status}", Genres: [${mangaInfo.genres.join(', ')}]`);
    } else {
      console.log('❌ Info FAIL:', infoRes.data);
    }

    // 4. Manga Chapters
    console.log(`\n4. Testing GET /manga/${testMangaId}/chapters ...`);
    const chaptersRes = await axios.get(`${BASE_URL}/manga/${testMangaId}/chapters`);
    console.log(`Status: ${chaptersRes.status}`);
    const chaptersData = chaptersRes.data.results;
    const chapters = chaptersData.chapters || chaptersData;
    if (Array.isArray(chapters) && chapters.length > 0) {
      console.log(`✅ Chapters PASS: Found ${chapters.length} chapters (Manga ID: ${chaptersData.mangaId}). First: "${chapters[0].title}" (ID: ${chapters[0].chapterId})`);
    } else {
      console.log('❌ Chapters FAIL:', chaptersRes.data);
      return;
    }

    const testChapterId = chapters[0].chapterId;

    // 5. Chapter Images / Read
    console.log(`\n5. Testing GET /read/${testChapterId} ...`);
    const readRes = await axios.get(`${BASE_URL}/read/${testChapterId}`);
    console.log(`Status: ${readRes.status}`);
    const readData = readRes.data.results;
    if (readData && Array.isArray(readData.images) && readData.images.length > 0) {
      console.log(`✅ Read PASS: Found ${readData.images.length} scan images. Sample page 1: ${readData.images[0].image}`);
    } else {
      console.log('❌ Read FAIL:', readRes.data);
    }

    // 6. Latest Updates
    console.log('\n6. Testing GET /latest ...');
    const latestRes = await axios.get(`${BASE_URL}/latest`);
    console.log(`Status: ${latestRes.status}`);
    const latestItems = latestRes.data.results;
    if (Array.isArray(latestItems) && latestItems.length > 0) {
      console.log(`✅ Latest Updates PASS: Found ${latestItems.length} mangas. First: "${latestItems[0].title}"`);
    } else {
      console.log('❌ Latest Updates FAIL:', latestRes.data);
    }

    // 7. Home Page
    console.log('\n7. Testing GET /home ...');
    const homeRes = await axios.get(`${BASE_URL}/home`);
    console.log(`Status: ${homeRes.status}`);
    if (homeRes.data.results) {
      console.log(`✅ Home PASS: Featured/Latest items found.`);
    } else {
      console.log('❌ Home FAIL:', homeRes.data);
    }

    console.log('\n🎉 ALL WEEBCENTRAL TESTS COMPLETED SUCCESSFULLY!');
  } catch (error) {
    console.error('❌ Test error:', error.message);
    if (error.response) {
      console.error('Error response data:', error.response.data);
    }
  }
}

testWeebCentral();
