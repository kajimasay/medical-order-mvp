// Vercel Blob対応版 - フォールバック付き
import { saveOrder, getOrders, updateOrder } from '../lib/kv-database.js';

// フォールバック用メモリストレージ
let fallbackOrders = [
  {
    id: 1001,
    product: "eye-booster",
    quantity: 2,
    full_name: "テスト 太郎",
    company_name: "テスト病院",
    contact_name: "テスト 太郎",
    contact_phone: "03-1234-5678",
    contact_email: "test@example.com",
    status: "pending",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

let useBlobStorage = true;

export default async function handler(req, res) {
  console.log('=== SIMPLE ORDERS API ===');
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
      let orders;
      
      if (useBlobStorage) {
        try {
          console.log('Attempting to get orders from Blob...');
          orders = await getOrders();
          console.log('GET request from Blob, returning orders:', orders.length);
        } catch (blobError) {
          console.error('Blob storage error, falling back to memory:', blobError);
          orders = fallbackOrders;
          useBlobStorage = false;
        }
      } else {
        orders = fallbackOrders;
        console.log('GET request from fallback memory, returning orders:', orders.length);
      }
      
      return res.status(200).json({
        success: true,
        orders: orders,
        count: orders.length
      });
    }

    if (req.method === 'POST') {
      console.log('POST request received');
      
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
      
      let newOrder;
      
      if (useBlobStorage) {
        try {
          console.log('Attempting to save order to Blob...');
          newOrder = await saveOrder(orderData);
          console.log('Order saved to Blob successfully:', newOrder.id);
        } catch (blobError) {
          console.error('Blob save error, falling back to memory:', blobError);
          useBlobStorage = false;
          
          // フォールバックでメモリに保存
          const newId = Math.max(...fallbackOrders.map(o => o.id), 0) + 1;
          newOrder = {
            id: newId,
            ...orderData,
            status: "pending",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          fallbackOrders.unshift(newOrder);
        }
      } else {
        // メモリベース処理
        const newId = Math.max(...fallbackOrders.map(o => o.id), 0) + 1;
        newOrder = {
          id: newId,
          ...orderData,
          status: "pending",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        fallbackOrders.unshift(newOrder);
        console.log('Order saved to fallback memory:', newOrder.id);
      }
      
      return res.status(200).json({
        ok: true,
        orderId: newOrder.id,
        order: newOrder,
        message: "注文を受け付けました"
      });
    }

    if (req.method === 'PATCH') {
      const { orderId, status } = req.body || {};
      
      if (!orderId || !status) {
        return res.status(400).json({
          success: false,
          message: "orderId and status are required"
        });
      }
      
      let updatedOrder;
      
      if (useBlobStorage) {
        try {
          console.log('Attempting to update order in Blob...');
          updatedOrder = await updateOrder(orderId, { status });
          console.log('Order updated in Blob successfully:', orderId);
        } catch (blobError) {
          console.error('Blob update error, falling back to memory:', blobError);
          useBlobStorage = false;
          
          // フォールバックでメモリから更新
          const orderIndex = fallbackOrders.findIndex(order => order.id == orderId);
          if (orderIndex === -1) {
            return res.status(404).json({
              success: false,
              message: `注文 ${orderId} が見つかりませんでした`
            });
          }
          
          fallbackOrders[orderIndex] = {
            ...fallbackOrders[orderIndex],
            status: status,
            updated_at: new Date().toISOString()
          };
          updatedOrder = fallbackOrders[orderIndex];
        }
      } else {
        // メモリベース処理
        const orderIndex = fallbackOrders.findIndex(order => order.id == orderId);
        if (orderIndex === -1) {
          return res.status(404).json({
            success: false,
            message: `注文 ${orderId} が見つかりませんでした`
          });
        }
        
        fallbackOrders[orderIndex] = {
          ...fallbackOrders[orderIndex],
          status: status,
          updated_at: new Date().toISOString()
        };
        updatedOrder = fallbackOrders[orderIndex];
        console.log('Order updated in fallback memory:', orderId);
      }
      
      return res.status(200).json({
        success: true,
        orderId: orderId,
        newStatus: status,
        updatedOrder: updatedOrder,
        message: `注文 ${orderId} のステータスを ${status} に更新しました`
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
    
  } catch (error) {
    console.error('Simple API error:', error);
    console.error('Error stack:', error.stack);
    
    return res.status(500).json({
      ok: false,
      error: "Internal server error",
      message: "サーバー内部エラーが発生しました",
      details: error.message
    });
  }
}