// Redis Data Viewer API for debugging and administration
import { 
  testRedisConnection, 
  getOrders, 
  getFiles, 
  isRedisAvailable 
} from '../lib/redis-direct.js';
import { createClient } from 'redis';

// Initialize Redis client for direct operations
async function getRedisClient() {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error('REDIS_URL not configured');
  }

  const client = createClient({
    url: redisUrl,
    socket: {
      connectTimeout: 3000,
      commandTimeout: 2000,
      reconnectStrategy: false
    }
  });

  await client.connect();
  return client;
}

export default async function handler(req, res) {
  console.log('=== REDIS DATA VIEWER API ===');
  console.log('Method:', req.method);
  console.log('Query:', req.query);
  
  try {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { action, key, pattern } = req.query;

    // Check if Redis is available
    const redisAvailable = isRedisAvailable();
    
    if (!redisAvailable) {
      return res.status(503).json({
        success: false,
        error: 'Redis Database not available',
        message: 'REDIS_URL環境変数が設定されていません'
      });
    }

    switch (action) {
      case 'list-keys':
        // List all keys matching pattern
        const searchPattern = pattern || '*';
        console.log('Searching for keys with pattern:', searchPattern);
        
        try {
          const client = await getRedisClient();
          const keys = await client.keys(searchPattern);
          await client.quit();
          
          console.log('Found keys:', keys.length);
          
          return res.status(200).json({
            success: true,
            action: 'list-keys',
            pattern: searchPattern,
            keys: keys,
            count: keys.length
          });
        } catch (keyError) {
          console.error('Error listing keys:', keyError);
          return res.status(500).json({
            success: false,
            error: 'Failed to list keys',
            details: keyError.message
          });
        }

      case 'get':
        // Get specific key value
        if (!key) {
          return res.status(400).json({
            success: false,
            error: 'Key parameter required for get action'
          });
        }

        console.log('Getting value for key:', key);
        
        try {
          // Try different get methods depending on data type
          let value;
          let dataType = 'unknown';

          const client = await getRedisClient();
          
          // Try hash get first (for orders and files)
          try {
            const hashValue = await client.hGetAll(key);
            if (hashValue && Object.keys(hashValue).length > 0) {
              value = hashValue;
              dataType = 'hash';
            }
          } catch (hashError) {
            console.log('Not a hash, trying string...');
          }

          // Try string get if not hash
          if (!value) {
            try {
              const stringValue = await client.get(key);
              if (stringValue !== null) {
                value = stringValue;
                dataType = 'string';
              }
            } catch (stringError) {
              console.log('Not a string, trying list...');
            }
          }

          // Try list get if not string
          if (!value) {
            try {
              const listValue = await client.lRange(key, 0, -1);
              if (listValue && listValue.length > 0) {
                value = listValue;
                dataType = 'list';
              }
            } catch (listError) {
              console.log('Not a list');
            }
          }

          await client.quit();

          if (value !== undefined) {
            return res.status(200).json({
              success: true,
              action: 'get',
              key: key,
              dataType: dataType,
              value: value
            });
          } else {
            return res.status(404).json({
              success: false,
              error: 'Key not found',
              key: key
            });
          }
        } catch (getError) {
          console.error('Error getting key:', getError);
          return res.status(500).json({
            success: false,
            error: 'Failed to get key',
            key: key,
            details: getError.message
          });
        }

      case 'orders':
        // Get all orders using the library function
        console.log('Getting all orders from Redis...');
        
        try {
          const orders = await getOrders();
          
          return res.status(200).json({
            success: true,
            action: 'orders',
            orders: orders,
            count: orders.length
          });
        } catch (ordersError) {
          console.error('Error getting orders:', ordersError);
          return res.status(500).json({
            success: false,
            error: 'Failed to get orders',
            details: ordersError.message
          });
        }

      case 'files':
        // Get all files using the library function
        console.log('Getting all files from Redis...');
        
        try {
          const files = await getFiles();
          
          return res.status(200).json({
            success: true,
            action: 'files',
            files: files,
            count: files.length
          });
        } catch (filesError) {
          console.error('Error getting files:', filesError);
          return res.status(500).json({
            success: false,
            error: 'Failed to get files',
            details: filesError.message
          });
        }

      case 'stats':
        // Get database statistics
        console.log('Getting Redis statistics...');
        
        try {
          const client = await getRedisClient();
          
          const orderIds = await client.lRange('orders', 0, -1);
          const fileIds = await client.lRange('files', 0, -1);
          const counter = await client.get('order_counter');
          
          await client.quit();

          return res.status(200).json({
            success: true,
            action: 'stats',
            statistics: {
              totalOrders: orderIds ? orderIds.length : 0,
              totalFiles: fileIds ? fileIds.length : 0,
              orderCounter: counter || 0,
              redisAvailable: redisAvailable,
              timestamp: new Date().toISOString()
            }
          });
        } catch (statsError) {
          console.error('Error getting stats:', statsError);
          return res.status(500).json({
            success: false,
            error: 'Failed to get statistics',
            details: statsError.message
          });
        }

      default:
        // Default: show help
        return res.status(200).json({
          success: true,
          message: 'KV Data Viewer API',
          availableActions: {
            'list-keys': 'List all keys (optional: ?pattern=orders:*)',
            'get': 'Get specific key value (required: ?key=keyname)',
            'orders': 'Get all orders with details',
            'files': 'Get all files with details', 
            'stats': 'Get database statistics'
          },
          examples: [
            '?action=list-keys',
            '?action=list-keys&pattern=orders:*',
            '?action=get&key=orders:1001',
            '?action=orders',
            '?action=files',
            '?action=stats'
          ],
          redisAvailable: redisAvailable
        });
    }

  } catch (error) {
    console.error('KV Viewer error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'KV viewer中にエラーが発生しました',
      details: error.message
    });
  }
}