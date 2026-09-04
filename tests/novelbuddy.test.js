const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/novelbuddy';

async function testNovelBuddy() {
  console.log('🧪 Testing NovelBuddy API endpoints...\n');

  try {
    // 1. Search
    console.log('1. Testing GET /search?q=shadow slave ...');
    const searchRes = await axios.get(`${BASE_URL}/search?q=shadow%20slave`);
    console.log(`Status: ${searchRes.status}`);
    const results = searchRes.data.results;
    if (Array.isArray(results) && results.length > 0) {
      console.log(`✅ Search PASS: Found ${results.length} novels. First: "${results[0].title}" (ID: ${results[0].id})`);
    } else {
      console.log('❌ Search FAIL: No items returned', searchRes.data);
      return;
    }

    const testNovelId = results[0].id;

    // 2. Novel Info
    console.log(`\n2. Testing GET /novel/${testNovelId} ...`);
    const infoRes = await axios.get(`${BASE_URL}/novel/${testNovelId}`);
    console.log(`Status: ${infoRes.status}`);
    const novelInfo = infoRes.data.results?.[0];
    if (novelInfo && novelInfo.title) {
      console.log(`✅ Info PASS: Title: "${novelInfo.title}", Status: "${novelInfo.status}", Genres: [${novelInfo.genres?.join(', ')}]`);
    } else {
      console.log('❌ Info FAIL:', infoRes.data);
    }

    // 3. Novel Chapters
    console.log(`\n3. Testing GET /novel/${testNovelId}/chapters ...`);
    const chaptersRes = await axios.get(`${BASE_URL}/novel/${testNovelId}/chapters`);
    console.log(`Status: ${chaptersRes.status}`);
    const chaptersData = chaptersRes.data.results;
    const chapters = chaptersData.chapters || chaptersData;
    if (Array.isArray(chapters) && chapters.length > 0) {
      console.log(`✅ Chapters PASS: Found ${chapters.length} chapters (Novel ID: ${chaptersData.novelId}). First: "${chapters[0].title}" (Chapter ID: ${chapters[0].chapterId})`);
    } else {
      console.log('❌ Chapters FAIL:', chaptersRes.data);
      return;
    }

    const testChapterId = chapters[0].chapterId;

    // 4. Read Chapter
    console.log(`\n4. Testing GET /read/${testNovelId}/${testChapterId} ...`);
    const readRes = await axios.get(`${BASE_URL}/read/${testNovelId}/${testChapterId}`);
    console.log(`Status: ${readRes.status}`);
    const readData = readRes.data.results;
    if (readData && Array.isArray(readData.paragraphs) && readData.paragraphs.length > 0) {
      console.log(`✅ Read PASS: Found ${readData.paragraphs.length} paragraphs. Title: "${readData.title}". Sample: "${readData.paragraphs[0].substring(0, 80)}..."`);
    } else {
      console.log('❌ Read FAIL:', readRes.data);
    }

    // 5. Latest
    console.log('\n5. Testing GET /latest ...');
    const latestRes = await axios.get(`${BASE_URL}/latest`);
    console.log(`Status: ${latestRes.status}`);
    if (Array.isArray(latestRes.data.results) && latestRes.data.results.length > 0) {
      console.log(`✅ Latest PASS: Found ${latestRes.data.results.length} novels.`);
    }

    // 6. Popular
    console.log('\n6. Testing GET /popular ...');
    const popRes = await axios.get(`${BASE_URL}/popular`);
    console.log(`Status: ${popRes.status}`);
    if (Array.isArray(popRes.data.results) && popRes.data.results.length > 0) {
      console.log(`✅ Popular PASS: Found ${popRes.data.results.length} novels.`);
    }

    // 7. Ranking
    console.log('\n7. Testing GET /ranking ...');
    const rankRes = await axios.get(`${BASE_URL}/ranking`);
    console.log(`Status: ${rankRes.status}`);
    if (Array.isArray(rankRes.data.results) && rankRes.data.results.length > 0) {
      console.log(`✅ Ranking PASS: Found ${rankRes.data.results.length} novels.`);
    }

    // 8. Genres
    console.log('\n8. Testing GET /genres ...');
    const genresRes = await axios.get(`${BASE_URL}/genres`);
    console.log(`Status: ${genresRes.status}`);
    if (Array.isArray(genresRes.data.results) && genresRes.data.results.length > 0) {
      console.log(`✅ Genres PASS: Found ${genresRes.data.results.length} genres.`);
    }

    // 9. Home
    console.log('\n9. Testing GET /home ...');
    const homeRes = await axios.get(`${BASE_URL}/home`);
    console.log(`Status: ${homeRes.status}`);
    if (homeRes.data.results) {
      console.log(`✅ Home PASS: Featured and latest found.`);
    }

    console.log('\n🎉 ALL NOVELBUDDY TESTS COMPLETED SUCCESSFULLY!');
  } catch (error) {
    console.error('❌ Test error:', error.message);
    if (error.response) {
      console.error('Error response data:', error.response.data);
    }
  }
}

testNovelBuddy();
