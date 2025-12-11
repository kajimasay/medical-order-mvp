// Orders endpoint - with mock data for admin panel
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    // Mock orders data for admin panel
    const dummyOrders = [
      {
        id: 1001,
        product: "eye-booster",
        quantity: 2,
        full_name: "田中 太郎",
        company_name: "田中眼科クリニック",
        contact_name: "田中 太郎",
        contact_phone: "03-1234-5678",
        contact_email: "tanaka@example.com",
        status: "pending",
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 1002,
        product: "exosome-kit",
        quantity: 1,
        full_name: "佐藤 花子",
        company_name: "佐藤総合病院",
        contact_name: "佐藤 花子",
        contact_phone: "03-2345-6789",
        contact_email: "sato@hospital.com",
        status: "processing",
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 1003,
        product: "cm-vial",
        quantity: 3,
        full_name: "鈴木 一郎",
        company_name: "鈴木医院",
        contact_name: "鈴木 一郎",
        contact_phone: "03-3456-7890",
        contact_email: "suzuki@clinic.jp",
        status: "shipped",
        created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 1004,
        product: "eye-booster",
        quantity: 5,
        full_name: "高橋 美咲",
        company_name: "高橋皮膚科",
        contact_name: "高橋 美咲",
        contact_phone: "03-4567-8901",
        contact_email: "takahashi@derma.com",
        status: "delivered",
        created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString()
      }
    ];
    return res.status(200).json(dummyOrders);
  }

  if (req.method === 'POST') {
    console.log("Order POST request received");
    const orderId = Math.floor(Math.random() * 10000);
    return res.status(200).json({ 
      ok: true, 
      orderId: orderId,
      message: "注文を受け付けました"
    });
  }

  if (req.method === 'PATCH') {
    // Handle order status updates (mock implementation)
    const { orderId, status } = req.body;
    console.log(`Order PATCH request: updating order ${orderId} to status ${status}`);
    
    // In a real application, you would update the database here
    // For now, just return success
    return res.status(200).json({ 
      success: true,
      orderId: orderId,
      newStatus: status,
      message: `注文 ${orderId} のステータスを ${status} に更新しました` 
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}