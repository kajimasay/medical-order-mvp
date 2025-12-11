// Orders endpoint
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

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
    console.log("Order POST request received in pages/api");
    const orderId = Math.floor(Math.random() * 10000);
    return res.status(200).json({ 
      ok: true, 
      orderId: orderId,
      message: "注文を受け付けました（Vercel Pages API）"
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}