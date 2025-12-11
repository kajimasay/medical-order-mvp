// api/index.js - Vercel Serverless Functions用API
console.log("API module loading...");

// Vercel Serverless Functions用のエクスポート - 修正版
export default async function handler(req, res) {
  console.log(`API Called: ${req.method} ${req.url}`);
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { pathname } = new URL(req.url, `http://${req.headers.host}`);
    console.log(`Parsed pathname: ${pathname}`);

    // ルートマッチング - /api プレフィックスを考慮
    if (pathname === '/api/test' || pathname === '/test') {
      if (req.method === 'GET') {
        return res.status(200).json({ 
          status: "ok", 
          message: "API is working from Vercel!", 
          timestamp: new Date().toISOString(),
          environment: "vercel",
          pathname: pathname
        });
      }
    }

    if (pathname === '/api/orders' || pathname === '/orders') {
      if (req.method === 'GET') {
        const dummyOrders = [{
          id: 1,
          product: "eye-booster",
          quantity: 2,
          full_name: "テスト太郎",
          contact_email: "test@example.com",
          created_at: new Date().toISOString()
        }];
        return res.status(200).json(dummyOrders);
      }

      if (req.method === 'POST') {
        console.log("Order POST request received");
        const orderId = Math.floor(Math.random() * 10000);
        return res.status(200).json({ 
          ok: true, 
          orderId: orderId,
          message: "注文を受け付けました（Vercel）",
          pathname: pathname
        });
      }
    }

    // デフォルトルート
    if (pathname === '/api' || pathname === '/') {
      return res.status(200).json({
        message: "Medical Order API - Vercel Functions",
        endpoints: {
          "GET /api/test": "API status test",
          "POST /api/orders": "Create new order",
          "GET /api/orders": "List all orders"
        },
        pathname: pathname
      });
    }

    // 404
    console.log(`404 - Route not found: ${req.method} ${pathname}`);
    return res.status(404).json({ 
      error: `Route not found: ${req.method} ${pathname}`,
      availableRoutes: ['/api/test', '/api/orders'],
      receivedUrl: req.url,
      receivedPathname: pathname
    });

  } catch (error) {
    console.error('Handler error:', error);
    return res.status(500).json({ 
      error: 'サーバー内部エラー',
      details: error.message,
      url: req.url 
    });
  }
}