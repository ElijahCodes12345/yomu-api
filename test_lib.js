const yomu = require('./index');

async function testLibrary() {
    console.log('--- Testing YomuAPI as a Library ---');
    console.log('Available Scrapers:', Object.keys(yomu.scrapers));
    
    try {
        console.log('Fetching Mangafire Home Page via Library...');
        const homepage = await yomu.scrapers.mangafire.scrapeHomePage();
        console.log('✅ Scraper call successful!');
        console.log('Trending Manga Count:', homepage.trending?.length || 0);

        console.log('\nTesting Mangafire Search via Library Models (Cached)...');
        const searchResults = await yomu.models.mangafire.search('Naruto');
        console.log('✅ Model search successful!');
        console.log('Found:', searchResults.results?.length || 0, 'results');
        if (searchResults.results?.length > 0) {
            console.log('First Result:', searchResults.results[0].title);
        }

    } catch (error) {
        console.error('❌ Library call failed:', error.message);
    }
}


testLibrary();
