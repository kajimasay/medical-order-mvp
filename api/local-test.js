// local-test.js - ローカルテスト用Express サーバー
import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3001;

// CORS設定
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

console.log("Starting local API server...");

// APIルーティング - Vercel functions APIをテスト用にラップ
import handler from './index.js';

// すべてのAPIリクエストをhandlerに渡す
app.all('/api/*', async (req, res) => {
  console.log(`Handling ${req.method} ${req.url}`);
  
  // Vercel handler関数を呼び出し
  try {
    await handler(req, res);
  } catch (error) {
    console.error('Handler error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// フロントエンドの static files
app.use(express.static('../client/dist'));

// Catch all handler: send back React's index.html file for SPA routing
app.get('*', (req, res) => {
  res.sendFile('index.html', { root: '../client/dist' });
});

app.listen(PORT, () => {
  console.log(`✅ Local server running on http://localhost:${PORT}`);
  console.log('API endpoints:');
  console.log('- GET  http://localhost:' + PORT + '/api/test');
  console.log('- POST http://localhost:' + PORT + '/api/orders');
});