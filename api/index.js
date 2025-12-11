// api/index.js - Vercel Serverless Functions用API
console.log("API module loading...");

// Vercel Serverless Functions用のエクスポート
export default function handler(req, res) {
  // VercelのサーバーレスランタイムではExpressを直接使えないため
  // 手動でルーティングを処理
  console.log(`${req.method} ${req.url} called`);
  
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  try {
    // ルートマッチング
    if (req.url === '/api' || req.url === '/api/') {
      return res.json({
        message: "Medical Order API",
        endpoints: {
          "GET /api/test": "API status test",
          "POST /api/orders": "Create new order",
          "GET /api/orders": "List all orders"
        }
      });
    }

    if (req.url === '/api/test') {
      if (req.method === 'GET') {
        return res.json({ 
          status: "ok", 
          message: "API is working", 
          timestamp: new Date().toISOString(),
          environment: "vercel"
        });
      }
      if (req.method === 'POST') {
        return res.json({ 
          status: "ok", 
          message: "POST is working", 
          received: req.body 
        });
      }
    }

    if (req.url === '/api/orders') {
      if (req.method === 'GET') {
        const dummyOrders = [{
          id: 1,
          product: "eye-booster",
          quantity: 2,
          full_name: "テスト太郎",
          contact_email: "test@example.com",
          created_at: new Date().toISOString()
        }];
        return res.json(dummyOrders);
      }

      if (req.method === 'POST') {
        // Vercelでは multipart/form-data の処理が複雑なので
        // 一旦JSONでのテストレスポンスを返す
        console.log("Order creation request received");
        
        const orderId = Math.floor(Math.random() * 10000);
        return res.json({ 
          ok: true, 
          orderId: orderId,
          message: "注文を受け付けました（テスト）" 
        });
      }
    }

    // 404ハンドラー
    console.log(`404 - Route not found: ${req.method} ${req.url}`);
    return res.status(404).json({ 
      error: `Route not found: ${req.method} ${req.url}`,
      availableRoutes: ['/api/test', '/api/orders']
    });

  } catch (error) {
    console.error('Handler error:', error);
    return res.status(500).json({ 
      error: 'サーバー内部エラー',
      details: error.message 
    });
  }
}