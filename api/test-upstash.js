// Upstash Redis接続テスト用API
import { Redis } from '@upstash/redis';

export default async function handler(req, res) {
  console.log('=== UPSTASH REDIS TEST ===');
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    // 環境変数の確認
    const url = process.env.UPSTASH_REDIS_KV_REST_API_URL;
    const token = process.env.UPSTASH_REDIS_KV_REST_API_TOKEN;
    
    console.log('UPSTASH_REDIS_KV_REST_API_URL exists:', !!url);
    console.log('UPSTASH_REDIS_KV_REST_API_TOKEN exists:', !!token);
    
    if (!url || !token) {
      return res.status(500).json({
        success: false,
        error: 'Upstash environment variables not configured',
        details: {
          url_exists: !!url,
          token_exists: !!token
        }
      });
    }
    
    // Redis接続テスト
    const redis = new Redis({
      url: url,
      token: token,
    });
    
    // 簡単なテスト
    const testKey = 'test:connection';
    const testValue = { timestamp: new Date().toISOString(), test: true };
    
    await redis.set(testKey, testValue);
    const result = await redis.get(testKey);
    
    // テストキーを削除
    await redis.del(testKey);
    
    return res.status(200).json({
      success: true,
      message: 'Upstash Redis connection successful',
      test_result: result,
      redis_configured: true
    });
    
  } catch (error) {
    console.error('Upstash Redis test error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Upstash Redis connection failed',
      details: error.message,
      stack: error.stack
    });
  }
}