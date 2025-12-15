// Direct Redis connection for RedisLabs endpoint
import { createClient } from 'redis';

let redisClient = null;

// Initialize Redis connection with timeout protection
async function getRedisClient() {
  if (redisClient) {
    return redisClient;
  }

  try {
    // Use environment variables for Redis connection
    const redisUrl = process.env.REDIS_URL;
    
    if (!redisUrl) {
      throw new Error('REDIS_URL not configured');
    }

    console.log('Connecting to Redis with timeout protection...');
    
    // Create client with aggressive timeout settings
    redisClient = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 3000, // 3 second connection timeout
        commandTimeout: 2000, // 2 second command timeout
        reconnectStrategy: false, // Disable reconnection for faster failure
      }
    });

    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
      redisClient = null;
    });

    redisClient.on('connect', () => {
      console.log('Redis connected successfully');
    });

    redisClient.on('disconnect', () => {
      console.log('Redis disconnected');
      redisClient = null;
    });

    // Connect with timeout wrapper
    const connectPromise = redisClient.connect();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Redis connection timeout')), 4000)
    );

    await Promise.race([connectPromise, timeoutPromise]);
    
    console.log('Redis client initialized successfully');
    return redisClient;
  } catch (error) {
    console.error('Failed to initialize Redis client:', error);
    redisClient = null;
    throw error;
  }
}

// Keys for data storage
const ORDERS_KEY = 'orders';
const FILES_KEY = 'files';
const COUNTER_KEY = 'order_counter';

// Check if Redis is available
export function isRedisAvailable() {
  return !!process.env.REDIS_URL;
}

// Initialize counter if it doesn't exist
async function initCounter() {
  const client = await getRedisClient();
  const counter = await client.get(COUNTER_KEY);
  if (counter === null) {
    await client.set(COUNTER_KEY, 1000); // Start from 1001
  }
}

// Get next order ID
export async function getNextOrderId() {
  await initCounter();
  const client = await getRedisClient();
  const nextId = await client.incr(COUNTER_KEY);
  return nextId;
}

// Save order to Redis with timeout protection
export async function saveOrder(orderData) {
  try {
    // Timeout wrapper for the entire operation
    const saveOperation = async () => {
      const client = await getRedisClient();
      const orderId = await getNextOrderId();
      
      const order = {
        id: orderId,
        ...orderData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Save individual order as hash
      await client.hSet(`${ORDERS_KEY}:${orderId}`, order);
      
      // Add to orders list
      await client.lPush(ORDERS_KEY, orderId.toString());
      
      console.log('Order saved to Redis:', orderId);
      return { success: true, orderId, order };
    };

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Redis save operation timeout')), 5000)
    );

    return await Promise.race([saveOperation(), timeoutPromise]);
  } catch (error) {
    console.error('Error saving order to Redis:', error);
    return { success: false, error: error.message };
  }
}

// Get all orders from Redis
export async function getOrders() {
  try {
    const client = await getRedisClient();
    
    // Get list of order IDs
    const orderIds = await client.lRange(ORDERS_KEY, 0, -1);
    
    if (!orderIds || orderIds.length === 0) {
      return [];
    }

    // Get all order data
    const orders = [];
    for (const orderId of orderIds) {
      const order = await client.hGetAll(`${ORDERS_KEY}:${orderId}`);
      if (order && Object.keys(order).length > 0) {
        orders.push(order);
      }
    }

    // Sort by created_at descending
    orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    console.log('Retrieved orders from Redis:', orders.length);
    return orders;
  } catch (error) {
    console.error('Error fetching orders from Redis:', error);
    return [];
  }
}

// Get single order by ID
export async function getOrderById(orderId) {
  try {
    const client = await getRedisClient();
    const order = await client.hGetAll(`${ORDERS_KEY}:${orderId}`);
    return order && Object.keys(order).length > 0 ? order : null;
  } catch (error) {
    console.error('Error fetching order from Redis:', error);
    return null;
  }
}

// Update order
export async function updateOrder(orderId, updateData) {
  try {
    const client = await getRedisClient();
    const existingOrder = await client.hGetAll(`${ORDERS_KEY}:${orderId}`);
    
    if (!existingOrder || Object.keys(existingOrder).length === 0) {
      return { success: false, error: 'Order not found' };
    }

    const updatedOrder = {
      ...existingOrder,
      ...updateData,
      updated_at: new Date().toISOString()
    };

    await client.hSet(`${ORDERS_KEY}:${orderId}`, updatedOrder);
    
    console.log('Order updated in Redis:', orderId);
    return { success: true, order: updatedOrder };
  } catch (error) {
    console.error('Error updating order in Redis:', error);
    return { success: false, error: error.message };
  }
}

// Save file metadata to Redis
export async function saveFile(fileData) {
  try {
    const client = await getRedisClient();
    const fileId = fileData.id || `file_${Date.now()}`;
    
    await client.hSet(`${FILES_KEY}:${fileId}`, fileData);
    
    // Add to files list
    await client.lPush(FILES_KEY, fileId);
    
    console.log('File metadata saved to Redis:', fileId);
    return { success: true, fileId };
  } catch (error) {
    console.error('Error saving file to Redis:', error);
    return { success: false, error: error.message };
  }
}

// Get all files from Redis
export async function getFiles() {
  try {
    const client = await getRedisClient();
    const fileIds = await client.lRange(FILES_KEY, 0, -1);
    
    if (!fileIds || fileIds.length === 0) {
      return [];
    }

    const files = [];
    for (const fileId of fileIds) {
      const file = await client.hGetAll(`${FILES_KEY}:${fileId}`);
      if (file && Object.keys(file).length > 0) {
        files.push(file);
      }
    }

    // Sort by upload date descending
    files.sort((a, b) => new Date(b.uploadDate || 0) - new Date(a.uploadDate || 0));
    
    console.log('Retrieved files from Redis:', files.length);
    return files;
  } catch (error) {
    console.error('Error fetching files from Redis:', error);
    return [];
  }
}

// Get file by ID
export async function getFileById(fileId) {
  try {
    const client = await getRedisClient();
    const file = await client.hGetAll(`${FILES_KEY}:${fileId}`);
    return file && Object.keys(file).length > 0 ? file : null;
  } catch (error) {
    console.error('Error fetching file from Redis:', error);
    return null;
  }
}

// Get files by order ID
export async function getFilesByOrderId(orderId) {
  try {
    const allFiles = await getFiles();
    return allFiles.filter(file => file.orderId == orderId);
  } catch (error) {
    console.error('Error fetching files by order ID from Redis:', error);
    return [];
  }
}

// Test Redis connection
export async function testRedisConnection() {
  try {
    const client = await getRedisClient();
    await client.ping();
    console.log('Redis connection test successful');
    return { success: true, message: 'Redis connected' };
  } catch (error) {
    console.error('Redis connection test failed:', error);
    return { success: false, error: error.message };
  }
}

// Close Redis connection (for cleanup)
export async function closeRedisConnection() {
  if (redisClient) {
    try {
      await redisClient.quit();
      redisClient = null;
      console.log('Redis connection closed');
    } catch (error) {
      console.error('Error closing Redis connection:', error);
    }
  }
}