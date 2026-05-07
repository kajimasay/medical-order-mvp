import path from 'path';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { list, put } from '@vercel/blob';

let db = null;

function toInt(value, fallback = 0) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeOrderPayload(body = {}) {
  return {
    product: body.product,
    quantity: toInt(body.quantity, 1),
    full_name: body.full_name,
    company_name: body.company_name || null,
    company_phone: body.company_phone || null,
    company_address: body.company_address || null,
    home_address: body.home_address || null,
    home_phone: body.home_phone || null,
    contact_name: body.contact_name,
    contact_phone: body.contact_phone,
    contact_email: body.contact_email,
    license_path: body.license_path || body.license_file || null,
  };
}

function validateRequiredFields(payload) {
  return !!(
    payload.product &&
    payload.quantity &&
    payload.full_name &&
    payload.contact_name &&
    payload.contact_phone &&
    payload.contact_email
  );
}

async function initDB() {
  if (db) return db;

  const isVercel = !!process.env.VERCEL;
  const dbPath = isVercel
    ? path.join('/tmp', 'orders.db')
    : path.join(process.cwd(), 'server', 'db.sqlite');

  db = await open({ filename: dbPath, driver: sqlite3.Database });
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

  return db;
}

async function getBlobOrders() {
  const blobs = await list({ prefix: 'orders/' });
  const orderBlobs = blobs.blobs.filter((b) => /^orders\/\d+\.json$/.test(b.pathname));

  if (orderBlobs.length === 0) return [];

  const loaded = await Promise.all(
    orderBlobs.map(async (blob) => {
      const response = await fetch(blob.url);
      if (!response.ok) return null;
      return response.json();
    })
  );

  return loaded
    .filter(Boolean)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

async function getBlobOrderById(orderId) {
  const matched = await list({ prefix: `orders/${orderId}.json` });
  if (!matched.blobs.length) return null;

  const response = await fetch(matched.blobs[0].url);
  if (!response.ok) return null;
  return response.json();
}

async function saveBlobOrder(order) {
  await put(`orders/${order.id}.json`, JSON.stringify(order), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

async function nextBlobOrderId() {
  const orders = await getBlobOrders();
  const maxId = orders.reduce((max, order) => Math.max(max, toInt(order.id, 0)), 1000);
  return maxId + 1;
}

async function getSqliteOrders(database) {
  return database.all('SELECT * FROM orders ORDER BY created_at DESC');
}

async function createSqliteOrder(database, payload, explicitOrderId) {
  const now = new Date().toISOString();

  if (explicitOrderId) {
    await database.run(
      `INSERT INTO orders
       (id, product, quantity, full_name, company_name, company_phone, company_address,
        home_address, home_phone, contact_name, contact_phone, contact_email,
        license_path, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
      [
        explicitOrderId,
        payload.product,
        payload.quantity,
        payload.full_name,
        payload.company_name,
        payload.company_phone,
        payload.company_address,
        payload.home_address,
        payload.home_phone,
        payload.contact_name,
        payload.contact_phone,
        payload.contact_email,
        payload.license_path,
        now,
        now,
      ]
    );

    return database.get('SELECT * FROM orders WHERE id = ?', [explicitOrderId]);
  }

  const result = await database.run(
    `INSERT INTO orders
     (product, quantity, full_name, company_name, company_phone, company_address,
      home_address, home_phone, contact_name, contact_phone, contact_email,
      license_path, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
    [
      payload.product,
      payload.quantity,
      payload.full_name,
      payload.company_name,
      payload.company_phone,
      payload.company_address,
      payload.home_address,
      payload.home_phone,
      payload.contact_name,
      payload.contact_phone,
      payload.contact_email,
      payload.license_path,
      now,
      now,
    ]
  );

  return database.get('SELECT * FROM orders WHERE id = ?', [result.lastID]);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      try {
        const blobOrders = await getBlobOrders();
        return res.status(200).json({ success: true, orders: blobOrders, count: blobOrders.length, source: 'blob' });
      } catch (blobError) {
        console.error('Blob GET failed, fallback to sqlite:', blobError.message);
        const database = await initDB();
        const sqliteOrders = await getSqliteOrders(database);
        return res.status(200).json({ success: true, orders: sqliteOrders, count: sqliteOrders.length, source: 'sqlite-fallback' });
      }
    }

    if (req.method === 'POST') {
      const payload = normalizeOrderPayload(req.body || {});
      const explicitOrderId = toInt(req.body?.orderId, 0) || null;

      if (!validateRequiredFields(payload)) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
      }

      const now = new Date().toISOString();

      try {
        const orderId = explicitOrderId || (await nextBlobOrderId());
        const existing = await getBlobOrderById(orderId);
        if (existing) {
          return res.status(409).json({ success: false, error: `Order ${orderId} already exists` });
        }

        const newOrder = {
          id: orderId,
          ...payload,
          status: 'pending',
          created_at: now,
          updated_at: now,
        };

        await saveBlobOrder(newOrder);

        return res.status(200).json({
          ok: true,
          orderId,
          order: newOrder,
          message: '注文を受け付けました',
          source: 'blob',
        });
      } catch (blobError) {
        console.error('Blob POST failed, fallback to sqlite:', blobError.message);

        const database = await initDB();
        const created = await createSqliteOrder(database, payload, explicitOrderId);

        return res.status(200).json({
          ok: true,
          orderId: created.id,
          order: created,
          message: '注文を受け付けました',
          source: 'sqlite-fallback',
        });
      }
    }

    if (req.method === 'PATCH') {
      const orderId = toInt(req.body?.orderId, 0);
      const status = req.body?.status;

      if (!orderId || !status) {
        return res.status(400).json({ success: false, error: 'orderId and status are required' });
      }

      try {
        const existing = await getBlobOrderById(orderId);
        if (!existing) {
          return res.status(404).json({ success: false, error: `Order ${orderId} not found` });
        }

        const updatedOrder = {
          ...existing,
          status,
          updated_at: new Date().toISOString(),
        };

        await saveBlobOrder(updatedOrder);

        return res.status(200).json({
          success: true,
          orderId,
          newStatus: status,
          updatedOrder,
          message: `Order ${orderId} status updated to ${status}`,
          source: 'blob',
        });
      } catch (blobError) {
        console.error('Blob PATCH failed, fallback to sqlite:', blobError.message);

        const database = await initDB();
        const result = await database.run('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?', [
          status,
          new Date().toISOString(),
          orderId,
        ]);

        if (result.changes === 0) {
          return res.status(404).json({ success: false, error: `Order ${orderId} not found` });
        }

        const updatedOrder = await database.get('SELECT * FROM orders WHERE id = ?', [orderId]);
        return res.status(200).json({
          success: true,
          orderId,
          newStatus: status,
          updatedOrder,
          message: `Order ${orderId} status updated to ${status}`,
          source: 'sqlite-fallback',
        });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Orders API error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error', details: error.message });
  }
}
