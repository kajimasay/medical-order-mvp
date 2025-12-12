import fs from 'fs';
import path from 'path';

// Data persistence functions
const DATA_DIR = '/tmp/cvg-data'; // Vercel /tmp directory for temporary storage
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');

// Ensure data directory exists
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Load orders from file
function loadOrders() {
  ensureDataDir();
  try {
    if (fs.existsSync(ORDERS_FILE)) {
      const data = fs.readFileSync(ORDERS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading orders:', error);
  }
  
  // Return default mock data if file doesn't exist or has errors
  return [
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
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString()
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
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString()
    }
  ];
}

// Save orders to file
function saveOrders(orders) {
  ensureDataDir();
  try {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error saving orders:', error);
    return false;
  }
}

// Load orders at startup
let mockOrders = loadOrders();

export default async function handler(req, res) {
  try {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    if (req.method === 'GET') {
      // Return current mock orders with updated statuses
      return res.status(200).json([...mockOrders]);
    }

  if (req.method === 'POST') {
    try {
      console.log("Order POST request received");
      console.log("Request body:", req.body);
      
      // Extract form data from request body
      const formData = req.body || {};
      
      // Safe way to create new order ID
      let newOrderId = 1;
      if (mockOrders && mockOrders.length > 0) {
        const existingIds = mockOrders.map(o => o.id || 0);
        newOrderId = Math.max(...existingIds, 0) + 1;
      }
      
      // Create new order from actual form data with safe defaults
      const newOrder = {
        id: newOrderId,
        product: formData.product || "eye-booster",
        quantity: Math.max(parseInt(formData.quantity) || 1, 1),
        full_name: (formData.full_name || "").toString(),
        company_name: (formData.company_name || "").toString(),
        company_phone: (formData.company_phone || "").toString(),
        company_address: (formData.company_address || "").toString(),
        home_address: (formData.home_address || "").toString(),
        home_phone: (formData.home_phone || "").toString(),
        contact_name: (formData.contact_name || "").toString(),
        contact_phone: (formData.contact_phone || "").toString(),
        contact_email: (formData.contact_email || "").toString(),
        status: "pending",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    
      // Add new order to the beginning of the array (most recent first)
      mockOrders.unshift(newOrder);
      
      // Save to persistent storage
      const saved = saveOrders(mockOrders);
      console.log("New order added:", newOrder);
      console.log("Total orders now:", mockOrders.length);
      console.log("Data saved to disk:", saved);
      
      // メール通知を送信（非同期で実行、失敗してもレスポンスをブロックしない）
      try {
        const notificationResponse = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/send-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orderData: formData,
            orderId: newOrderId
          })
        });
        
        if (notificationResponse.ok) {
          console.log("Email notification sent successfully");
        } else {
          console.log("Email notification failed, but order was saved");
        }
      } catch (emailError) {
        console.error("Email notification error:", emailError);
        // メール送信失敗でも注文処理は成功として扱う
      }
      
      return res.status(200).json({ 
        ok: true, 
        orderId: newOrderId,
        order: newOrder,
        message: "注文を受け付けました"
      });
    } catch (error) {
      console.error("POST request error:", error);
      return res.status(500).json({
        ok: false,
        error: "Internal server error",
        message: "注文処理中にエラーが発生しました"
      });
    }
  }

  if (req.method === 'PATCH') {
    try {
      // Handle order status updates with actual data modification
      const { orderId, status } = req.body || {};
      
      if (!orderId || !status) {
        return res.status(400).json({ 
          success: false,
          message: "orderId and status are required" 
        });
      }
      
      console.log(`Order PATCH request: updating order ${orderId} to status ${status}`);
      
      // Find and update the order in mock data
      const orderIndex = mockOrders.findIndex(order => order.id == orderId);
      
      if (orderIndex === -1) {
        return res.status(404).json({ 
          success: false,
          message: `注文 ${orderId} が見つかりませんでした` 
        });
      }
      
      // Update the order status
      mockOrders[orderIndex].status = status;
      mockOrders[orderIndex].updated_at = new Date().toISOString();
      
      // Save to persistent storage
      const saved = saveOrders(mockOrders);
      console.log(`Successfully updated order ${orderId} to ${status}`);
      console.log("Order status update saved to disk:", saved);
      
      return res.status(200).json({ 
        success: true,
        orderId: orderId,
        newStatus: status,
        updatedOrder: mockOrders[orderIndex],
        message: `注文 ${orderId} のステータスを ${status} に更新しました` 
      });
    } catch (error) {
      console.error("PATCH request error:", error);
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "ステータス更新中にエラーが発生しました"
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error("Handler error:", error);
    return res.status(500).json({
      ok: false,
      error: "Internal server error",
      message: "サーバー内部エラーが発生しました"
    });
  }
}