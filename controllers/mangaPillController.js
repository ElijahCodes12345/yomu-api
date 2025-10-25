const MangaPillModel = require('../models/mangaPillModel');

class MangaPillController {
  constructor() {
    this.model = new MangaPillModel();
  }


  // Search manga by title on MangaPill
  searchManga = async (req, res) => {
    try {
      const { q } = req.query;
      if (!q) {
        return res.status(400).json({ 
          status: 400,
          error: 'Query parameter "q" is required' 
        });
      }
      const results = await this.model.searchManga(q);
      res.json({
        status: 200,
        results: results || []
      });
    } catch (error) {
      res.status(500).json({ 
        status: 500,
        error: error.message 
      });
    }
  }

  advancedSearch = async (req, res) => {
    try {
      const { q, type, status, genre, page} = req.query;
      if (!q) {
        return res.status(400).json({ 
          status: 400,
          error: 'Query parameter "q" is required' 
        });
      }
      const result = await this.model.advancedSearch(q, { type, status, genre, page: page ? parseInt(page) : 1 });
      
      // Transform the pagination URLs from site URLs to API URLs
      if (result.pagination) {
        const { prevUrl, nextUrl, ...paginationData } = result.pagination;
        
        // Transform previous URL if it exists
        let transformedPrevUrl = null;
        if (prevUrl) {
          try {
            const prevSiteUrl = new URL(prevUrl);
            const prevParams = prevSiteUrl.searchParams;
            const apiPrevQuery = prevParams.get('q') || q;
            const apiPrevStatus = prevParams.get('status') || status || '';
            const apiPrevType = prevParams.get('type') || type || '';
            const apiPrevPage = prevParams.get('page') || page || 1;
            
            transformedPrevUrl = `/api/mangapill/search?q=${encodeURIComponent(apiPrevQuery)}&status=${encodeURIComponent(apiPrevStatus)}&type=${encodeURIComponent(apiPrevType)}&page=${apiPrevPage}`;
          } catch (e) {
            transformedPrevUrl = null;
          }
        }
        
        let transformedNextUrl = null;
        if (nextUrl) {
          try {
            const nextSiteUrl = new URL(nextUrl);
            const nextParams = nextSiteUrl.searchParams;
            const apiNextQuery = nextParams.get('q') || q;
            const apiNextStatus = nextParams.get('status') || status || '';
            const apiNextType = nextParams.get('type') || type || '';
            const apiNextPage = nextParams.get('page') || (parseInt(page) + 1);
            
            transformedNextUrl = `/api/mangapill/search?q=${encodeURIComponent(apiNextQuery)}&status=${encodeURIComponent(apiNextStatus)}&type=${encodeURIComponent(apiNextType)}&page=${apiNextPage}`;
          } catch (e) {
            transformedNextUrl = null;
          }
        }
        
        result.pagination = {
          ...paginationData,
          prevUrl: transformedPrevUrl,
          nextUrl: transformedNextUrl
        };
      }
      
      res.json({
        status: 200,
        results: result.results || [],
        pagination: result.pagination || null
      });
    } catch (error) {
      res.status(500).json({ 
        status: 500,
        error: error.message 
      });
    }
  }

  // Get manga by ID from MangaPill
  getMangaById = async (req, res) => {
    try {
      const { id, slug } = req.params;
      const mangaId = slug ? `${id}/${slug}` : id
      const manga = await this.model.getMangaById(mangaId);
      if (!manga) {
        return res.status(404).json({ 
          status: 404,
          error: 'Manga not found' 
        });
      }
      res.json({
        status: 200,
        results: [manga]
      });
    } catch (error) {
      res.status(500).json({ 
        status: 500,
        error: error.message 
      });
    }
  }

  // Get chapter content from MangaPill
  getMangaChapter = async (req, res) => {
    try {
      const { id, slug } = req.params;
      // Extract manga ID from the combined ID (e.g., "5085-10260000" where 5085 is manga ID)
      const idParts = id.split('-');
      const mangaId = idParts[0];
      const chapterId = `${id}/${slug}`; // Combine id and slug to form the complete chapter identifier
      
      const chapter = await this.model.getMangaChapter(mangaId, chapterId); // Pass mangaId and combined ID for chapterId
      
      // Modify the response format to include manga ID as "id" and chapter ID as "chapterId"
      if (chapter) {
        // Create a new response object with manga ID as "id" and chapter ID as "chapterId"
        const finalChapter = {
          id: mangaId,           // manga ID as "id"
          chapterId: chapter.id, // original chapter ID as "chapterId"
          title: chapter.title,
          mangaTitle: chapter.mangaTitle,
          pages: chapter.pages,
          url: chapter.url,
          prevUrl: chapter.prevUrl,
          nextUrl: chapter.nextUrl
        };
        
        res.json({
          status: 200,
          results: [finalChapter]
        });
      } else {
        res.status(404).json({ 
          status: 404,
          error: 'Chapter not found' 
        });
      }
    } catch (error) {
      res.status(500).json({ 
        status: 500,
        error: error.message 
      });
    }
  }

  // Get popular manga from MangaPill
  getTrendingManga = async (req, res) => {
    try {
      const popularManga = await this.model.getTrendingManga();
      res.json({
        status: 200,
        results: popularManga || []
      });
    } catch (error) {
      res.status(500).json({ 
        status: 500,
        error: error.message 
      });
    }
  }

  // Get latest updates from MangaPill
  getLatestUpdates = async (req, res) => {
    try {
      const latestUpdates = await this.model.getLatestUpdates();
      res.json({
        status: 200,
        results: latestUpdates || []
      });
    } catch (error) {
      res.status(500).json({ 
        status: 500,
        error: error.message 
      });
    }
  }

  // Get new manga from MangaPill
  getNewManga = async (req, res) => {
    try {
      const newManga = await this.model.getNewManga();
      res.json({
        status: 200,
        results: newManga || []
      });
    } catch (error) {
      res.status(500).json({ 
        status: 500,
        error: error.message 
      });
    }
  }

  // Get new chapters from MangaPill
  getNewChapters = async (req, res) => {
    try {
      const newChapters = await this.model.getNewChapters();
      res.json({
        status: 200,
        results: newChapters || []
      });
    } catch (error) {
      res.status(500).json({ 
        status: 500,
        error: error.message 
      });
    }
  }

  // Get featured chapters from MangaPill
  getFeaturedChapters = async (req, res) => {
    try {
      const featuredChapters = await this.model.getFeaturedChapters();
      res.json({
        status: 200,
        results: featuredChapters || []
      });
    } catch (error) {
      res.status(500).json({ 
        status: 500,
        error: error.message 
      });
    }
  }
}

module.exports = new MangaPillController();