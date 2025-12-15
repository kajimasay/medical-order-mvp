// Upstash Redis対応版 - 安定したデータベース接続（フォールバック付き）
import { Redis } from '@upstash/redis';

// フォールバック用メモリストレージ
let memoryOrders = [];

// Upstash Redis接続
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_KV_REST_API_URL,
  token: process.env.UPSTASH_REDIS_KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  console.log('=== UPSTASH REDIS ORDERS API ===');
  console.log('Method:', req.method);
  console.log('Body:', req.body);
  
  try {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    if (req.method === 'GET') {
      console.log('=== GET ORDERS FROM UPSTASH REDIS ===');
      
      try {
        // Upstash Redisから全ての注文を取得
        const orderKeys = await redis.keys('order:*');
        console.log('Order keys found:', orderKeys.length);
        
        const orders = [];
        for (const key of orderKeys) {
          const order = await redis.get(key);
          if (order) {
            orders.push(order);
          }
        }
        
        // IDでソート（新しい順）
        orders.sort((a, b) => b.id - a.id);
        
        console.log('Orders retrieved from Redis:', orders.length);
        
        return res.status(200).json({
          success: true,
          orders: orders,
          count: orders.length,
          source: 'upstash-redis'
        });
      } catch (redisError) {
        console.error('Upstash Redis error, using memory fallback:', redisError);
        
        // Redisエラー時はメモリフォールバックを使用
        return res.status(200).json({
          success: true,
          orders: memoryOrders,
          count: memoryOrders.length,
          source: 'memory-fallback'
        });
      }
    }

    if (req.method === 'POST') {
      console.log('=== POST ORDER TO UPSTASH REDIS ===');
      
      const formData = req.body || {};
      console.log('Form data:', formData);
      
      const orderData = {
        product: formData.product || "eye-booster",
        quantity: parseInt(formData.quantity) || 1,
        full_name: formData.full_name || "",
        company_name: formData.company_name || "",
        company_phone: formData.company_phone || "",
        company_address: formData.company_address || "",
        home_address: formData.home_address || "",
        home_phone: formData.home_phone || "",
        contact_name: formData.contact_name || "",
        contact_phone: formData.contact_phone || "",
        contact_email: formData.contact_email || "",
        license_file: formData.license_file || null
      };
      
      try {
        // Generate new order ID
        const currentIds = await redis.keys('order:*');
        const ids = currentIds.map(key => {
          const idStr = key.replace('order:', '');
          return parseInt(idStr) || 0;
        });
        const newId = ids.length > 0 ? Math.max(...ids) + 1 : 1001;
        
        const newOrder = {
          id: newId,
          ...orderData,
          status: "pending",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        // Save to Upstash Redis
        await redis.set(`order:${newId}`, newOrder);
        console.log('Order saved to Upstash Redis:', newId);
        
        return res.status(200).json({
          ok: true,
          orderId: newId,
          order: newOrder,
          message: "注文を受け付けました",
          source: "upstash-redis"
        });
      } catch (redisError) {
        console.error('Upstash Redis save error, using memory fallback:', redisError);
        
        // フォールバックでメモリに保存
        const memoryIds = memoryOrders.map(o => o.id);
        const newId = memoryIds.length > 0 ? Math.max(...memoryIds) + 1 : 1001;
        
        const newOrder = {
          id: newId,
          ...orderData,
          status: "pending",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        memoryOrders.unshift(newOrder);
        
        return res.status(200).json({
          ok: true,
          orderId: newId,
          order: newOrder,
          message: "注文を受け付けました",
          source: "memory-fallback"
        });
      }
    }

    if (req.method === 'PATCH') {
      const { orderId, status } = req.body || {};
      
      if (!orderId || !status) {
        return res.status(400).json({
          success: false,
          message: "orderId and status are required"
        });
      }
      
      try {
        // Get existing order
        const existingOrder = await redis.get(`order:${orderId}`);
        
        if (!existingOrder) {
          return res.status(404).json({
            success: false,
            message: `注文 ${orderId} が見つかりませんでした`
          });
        }
        
        // Update order
        const updatedOrder = {
          ...existingOrder,
          status: status,
          updated_at: new Date().toISOString()
        };
        
        await redis.set(`order:${orderId}`, updatedOrder);
        console.log('Order updated in Upstash Redis:', orderId);
        
        return res.status(200).json({
          success: true,
          orderId: orderId,
          newStatus: status,
          updatedOrder: updatedOrder,
          message: `注文 ${orderId} のステータスを ${status} に更新しました`
        });
      } catch (kvError) {
        console.error('Vercel KV update error:', kvError);
        
        return res.status(500).json({
          success: false,
          error: "Failed to update order",
          details: kvError.message
        });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
    
  } catch (error) {
    console.error('Orders API error:', error);
    console.error('Error stack:', error.stack);
    
    return res.status(500).json({
      ok: false,
      error: "Internal server error",
      message: "サーバー内部エラーが発生しました",
      details: error.message
    });
  }
}