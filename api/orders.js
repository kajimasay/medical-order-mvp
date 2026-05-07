import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

// グローバルDB接続（キャッシュ）
let db = null;

// DB接続を初期化
async function initDB() {
  if (db) return db;
  
  // Vercelの場合は/tmpにコピー、ローカルではserver/db.sqliteを使用
  const isVercel = process.env.VERCEL;
  
  let dbPath;
  
  if (isVercel) {
    // Vercel環境では /tmp に保存
    dbPath = path.join('/tmp', 'orders.db');
    console.log('Using Vercel temp database:', dbPath);
  } else {
    // ローカル環境：server/db.sqliteを探す
    const possiblePaths = [
      path.join(process.cwd(), 'server', 'db.sqlite'),
      path.join(process.cwd(), 'db.sqlite'),
      path.join(process.cwd(), '..', '..', 'server', 'db.sqlite')
    ];
    
    dbPath = possiblePaths[0]; // デフォルトは server/db.sqlite
    console.log('Using local database:', dbPath);
  }
  
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    
    console.log('Database connected successfully:', dbPath);
  } catch (error) {
    console.error('Failed to connect to database:', error);
    console.error('Attempted path:', dbPath);
    throw error;
  }
  
  // テーブルを作成（存在しない場合）
  try {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        full_name TEXT NOT NULL,
        company_name TEXT,
        company_phone TEXT,
        company_address TEXT,
        home_address TEXT,
        home_phone TEXT,
        contact_name TEXT NOT NULL,
        contact_phone TEXT NOT NULL,
        contact_email TEXT NOT NULL,
        license_path TEXT,
        status TEXT DEFAULT 'pending',
        created_at TEXT NOT NULL,
        updated_at TEXT
      )
    `);
    console.log('Orders table verified/created');
  } catch (error) {
    console.error('Error creating table:', error);
  }
  
  return db;
}

export default async function handler(req, res) {
  console.log('=== ORDERS API (SQLite) ===');
  console.log('Method:', req.method);
  
  try {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    // DB初期化
    const database = await initDB();

    // ======== GET: 全注文を取得 ========
    if (req.method === 'GET') {
      console.log('=== GET ORDERS ===');
      
      try {
        const orders = await database.all(
          'SELECT * FROM orders ORDER BY created_at DESC'
        );
        
        console.log('Orders retrieved:', orders.length);
        
        return res.status(200).json({
          success: true,
          orders: orders,
          count: orders.length,
          source: 'sqlite'
        });
      } catch (error) {
        console.error('GET error:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch orders',
          details: error.message
        });
      }
    }

    // ======== POST: 新規注文を作成 ========
    if (req.method === 'POST') {
      console.log('=== POST ORDER ===');
      console.log('Body:', JSON.stringify(req.body, null, 2));
      
      try {
        const {
          product,
          quantity,
          full_name,
          company_name,
          company_phone,
          company_address,
          home_address,
          home_phone,
          contact_name,
          contact_phone,
          contact_email,
          license_file,
          license_path
        } = req.body;

        // バリデーション
        if (!product || !quantity || !full_name || !contact_name || !contact_phone || !contact_email) {
          console.error('Missing required fields:', { product, quantity, full_name, contact_name, contact_phone, contact_email });
          return res.status(400).json({
            success: false,
            error: 'Missing required fields'
          });
        }

        const now = new Date().toISOString();
        const licensePath = license_path || license_file || null;
        
        const result = await database.run(
          `INSERT INTO orders 
           (product, quantity, full_name, company_name, company_phone, company_address, 
            home_address, home_phone, contact_name, contact_phone, contact_email, 
            license_path, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            product,
            parseInt(quantity),
            full_name,
            company_name || null,
            company_phone || null,
            company_address || null,
            home_address || null,
            home_phone || null,
            contact_name,
            contact_phone,
            contact_email,
            licensePath,
            now,
            now
          ]
        );

        const newOrder = {
          id: result.lastID,
          product,
          quantity,
          full_name,
          company_name,
          company_phone,
          company_address,
          home_address,
          home_phone,
          contact_name,
          contact_phone,
          contact_email,
          license_path: licensePath,
          status: 'pending',
          created_at: now,
          updated_at: now
        };

        console.log('Order created with ID:', result.lastID);

        return res.status(200).json({
          ok: true,
          orderId: result.lastID,
          order: newOrder,
          message: '注文を受け付けました',
          source: 'sqlite'
        });
      } catch (error) {
        console.error('POST error:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to create order',
          details: error.message
        });
      }
    }

    // ======== PATCH: 注文ステータスを更新 ========
    if (req.method === 'PATCH') {
      console.log('=== PATCH ORDER ===');
      
      try {
        const { orderId, status } = req.body;

        if (!orderId || !status) {
          return res.status(400).json({
            success: false,
            error: 'orderId and status are required'
          });
        }

        const now = new Date().toISOString();

        const result = await database.run(
          'UPDATE orders SET status = ?, updated_at = ? WHERE id = ?',
          [status, now, orderId]
        );

        if (result.changes === 0) {
          return res.status(404).json({
            success: false,
            error: `Order ${orderId} not found`
          });
        }

        const updatedOrder = await database.get(
          'SELECT * FROM orders WHERE id = ?',
          [orderId]
        );

        console.log('Order updated:', orderId);

        return res.status(200).json({
          success: true,
          orderId: orderId,
          newStatus: status,
          updatedOrder: updatedOrder,
          message: `Order ${orderId} status updated to ${status}`,
          source: 'sqlite'
        });
      } catch (error) {
        console.error('PATCH error:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to update order',
          details: error.message
        });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
    
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({
      ok: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}