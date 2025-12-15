// Vercel KV Database utilities for orders and files
import { kv } from '@vercel/kv';

// Keys for data storage
const ORDERS_KEY = 'orders';
const FILES_KEY = 'files';
const COUNTER_KEY = 'order_counter';

// Check if KV is available
export function isKVAvailable() {
  return !!(process.env.REDIS_URL || process.env.KV_URL || process.env.KV_REST_API_URL);
}

// Initialize counter if it doesn't exist
async function initCounter() {
  const counter = await kv.get(COUNTER_KEY);
  if (counter === null) {
    await kv.set(COUNTER_KEY, 1000); // Start from 1001
  }
}

// Get next order ID
export async function getNextOrderId() {
  await initCounter();
  const nextId = await kv.incr(COUNTER_KEY);
  return nextId;
}

// Save order to KV
export async function saveOrder(orderData) {
  try {
    const orderId = await getNextOrderId();
    const order = {
      id: orderId,
      ...orderData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Save individual order
    await kv.hset(`${ORDERS_KEY}:${orderId}`, order);
    
    // Add to orders list
    await kv.lpush(ORDERS_KEY, orderId);
    
    console.log('Order saved to KV:', orderId);
    return { success: true, orderId, order };
  } catch (error) {
    console.error('Error saving order to KV:', error);
    return { success: false, error: error.message };
  }
}

// Get all orders from KV
export async function getOrders() {
  try {
    // Get list of order IDs
    const orderIds = await kv.lrange(ORDERS_KEY, 0, -1);
    
    if (!orderIds || orderIds.length === 0) {
      return [];
    }

    // Get all order data
    const orders = [];
    for (const orderId of orderIds) {
      const order = await kv.hgetall(`${ORDERS_KEY}:${orderId}`);
      if (order && Object.keys(order).length > 0) {
        orders.push(order);
      }
    }

    // Sort by created_at descending
    orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    console.log('Retrieved orders from KV:', orders.length);
    return orders;
  } catch (error) {
    console.error('Error fetching orders from KV:', error);
    return [];
  }
}

// Get single order by ID
export async function getOrderById(orderId) {
  try {
    const order = await kv.hgetall(`${ORDERS_KEY}:${orderId}`);
    return order && Object.keys(order).length > 0 ? order : null;
  } catch (error) {
    console.error('Error fetching order from KV:', error);
    return null;
  }
}

// Update order status
export async function updateOrder(orderId, updateData) {
  try {
    const existingOrder = await kv.hgetall(`${ORDERS_KEY}:${orderId}`);
    
    if (!existingOrder || Object.keys(existingOrder).length === 0) {
      return { success: false, error: 'Order not found' };
    }

    const updatedOrder = {
      ...existingOrder,
      ...updateData,
      updated_at: new Date().toISOString()
    };

    await kv.hset(`${ORDERS_KEY}:${orderId}`, updatedOrder);
    
    console.log('Order updated in KV:', orderId);
    return { success: true, order: updatedOrder };
  } catch (error) {
    console.error('Error updating order in KV:', error);
    return { success: false, error: error.message };
  }
}

// Save file metadata to KV
export async function saveFile(fileData) {
  try {
    const fileId = fileData.id || `file_${Date.now()}`;
    
    await kv.hset(`${FILES_KEY}:${fileId}`, fileData);
    
    // Add to files list
    await kv.lpush(FILES_KEY, fileId);
    
    console.log('File metadata saved to KV:', fileId);
    return { success: true, fileId };
  } catch (error) {
    console.error('Error saving file to KV:', error);
    return { success: false, error: error.message };
  }
}

// Get all files from KV
export async function getFiles() {
  try {
    const fileIds = await kv.lrange(FILES_KEY, 0, -1);
    
    if (!fileIds || fileIds.length === 0) {
      return [];
    }

    const files = [];
    for (const fileId of fileIds) {
      const file = await kv.hgetall(`${FILES_KEY}:${fileId}`);
      if (file && Object.keys(file).length > 0) {
        files.push(file);
      }
    }

    // Sort by upload date descending
    files.sort((a, b) => new Date(b.uploadDate || 0) - new Date(a.uploadDate || 0));
    
    console.log('Retrieved files from KV:', files.length);
    return files;
  } catch (error) {
    console.error('Error fetching files from KV:', error);
    return [];
  }
}

// Get file by ID
export async function getFileById(fileId) {
  try {
    const file = await kv.hgetall(`${FILES_KEY}:${fileId}`);
    return file && Object.keys(file).length > 0 ? file : null;
  } catch (error) {
    console.error('Error fetching file from KV:', error);
    return null;
  }
}

// Get files by order ID
export async function getFilesByOrderId(orderId) {
  try {
    const allFiles = await getFiles();
    return allFiles.filter(file => file.orderId == orderId);
  } catch (error) {
    console.error('Error fetching files by order ID from KV:', error);
    return [];
  }
}

// Delete order (optional - for cleanup)
export async function deleteOrder(orderId) {
  try {
    await kv.del(`${ORDERS_KEY}:${orderId}`);
    await kv.lrem(ORDERS_KEY, 1, orderId);
    
    console.log('Order deleted from KV:', orderId);
    return { success: true };
  } catch (error) {
    console.error('Error deleting order from KV:', error);
    return { success: false, error: error.message };
  }
}