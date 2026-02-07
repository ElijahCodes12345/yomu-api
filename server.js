require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 YomuAPI Server running at http://localhost:${PORT}`);
    console.log(`📁 Library mode also enabled`);
});
