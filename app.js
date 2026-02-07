const express = require('express');
const cors = require('cors');
const mangaPillRoutes = require('./routes/mangaPill');
const flameComicsRoutes = require('./routes/flamecomics');
const mangaparkRoutes = require('./routes/mangapark');
const mangafireRoutes = require('./routes/mangafire');

const app = express();

// CORS configuration
app.use(cors({
  origin: '*', // In production, replace with specific domains
  credentials: true
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/mangapill', mangaPillRoutes);
app.use('/api/flamecomics', flameComicsRoutes);
app.use('/api/mangapark', mangaparkRoutes);
app.use('/api/mangafire', mangafireRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'YomuAPI - Manga Scraper API is running!' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

module.exports = app;