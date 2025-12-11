// api/index.js - Vercel Serverless Functions用のAPIエンドポイント
import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import { z } from "zod";
import nodemailer from "nodemailer";

dotenv.config();

const app = express();

// メール設定
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// 注文通知メール送信関数
async function sendOrderNotification(orderData) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL || 'admin@cellvision.com',
      subject: `新規注文受付 - 注文ID: ${orderData.orderId}`,
      html: `
        <h2>新しい注文が入りました</h2>
        <p><strong>注文ID:</strong> ${orderData.orderId}</p>
        <p><strong>商品:</strong> ${orderData.product}</p>
        <p><strong>数量:</strong> ${orderData.quantity}</p>
        <p><strong>注文者:</strong> ${orderData.full_name}</p>
        <p><strong>医院名:</strong> ${orderData.company_name || 'なし'}</p>
        <p><strong>医院住所:</strong> ${orderData.company_address || 'なし'}</p>
        <p><strong>自宅住所:</strong> ${orderData.home_address || 'なし'}</p>
        <p><strong>医院電話:</strong> ${orderData.company_phone || 'なし'}</p>
        <p><strong>自宅電話:</strong> ${orderData.home_phone || 'なし'}</p>
        <p><strong>連絡者:</strong> ${orderData.contact_name}</p>
        <p><strong>連絡先電話:</strong> ${orderData.contact_phone}</p>
        <p><strong>連絡先Email:</strong> ${orderData.contact_email}</p>
        <p><strong>注文日時:</strong> ${new Date().toLocaleString('ja-JP')}</p>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Order notification email sent successfully');
  } catch (error) {
    console.error('Failed to send order notification email:', error);
  }
}

// CORS設定
app.use(cors({ origin: true }));
app.use(express.json());

// レート制限
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));

// DB準備（メモリDB - Vercel用）
let db;

// DB初期化
async function initDB() {
  if (!db) {
    db = await open({ filename: ':memory:', driver: sqlite3.Database });
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
        license_path TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);
  }
  return db;
}

// Multer設定（メモリストレージ）
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('無効なファイル形式です'));
    }
  }
});

// バリデーションスキーマ
const orderSchema = z.object({
  product: z.string().min(1),
  quantity: z.number().int().positive(),
  full_name: z.string().min(1),
  company_name: z.string().optional(),
  company_phone: z.string().optional(),
  company_address: z.string().optional(),
  home_address: z.string().optional(),
  home_phone: z.string().optional(),
  contact_name: z.string().min(1),
  contact_phone: z.string().min(1),
  contact_email: z.string().email()
});

// 注文作成API
app.post("/orders", upload.single("license"), async (req, res) => {
  try {
    await initDB();
    
    if (!req.file) {
      return res.status(400).json({ error: "医師免許証ファイルが必要です" });
    }

    const p = orderSchema.parse({
      product: req.body.product,
      quantity: parseInt(req.body.quantity),
      full_name: req.body.full_name,
      company_name: req.body.company_name,
      company_phone: req.body.company_phone,
      company_address: req.body.company_address,
      home_address: req.body.home_address,
      home_phone: req.body.home_phone,
      contact_name: req.body.contact_name,
      contact_phone: req.body.contact_phone,
      contact_email: req.body.contact_email
    });

    const filename = `license_${Date.now()}_${req.file.originalname}`;
    
    const stmt = await db.run(`
      INSERT INTO orders (
        product, quantity, full_name, company_name, company_phone,
        company_address, home_address, home_phone, contact_name,
        contact_phone, contact_email, license_path, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      p.product, p.quantity, p.full_name, p.company_name, p.company_phone,
      p.company_address, p.home_address, p.home_phone, p.contact_name,
      p.contact_phone, p.contact_email, filename, new Date().toISOString()
    ]);

    // メール通知を送信
    sendOrderNotification({
      orderId: stmt.lastID,
      ...p
    }).catch(console.error);

    return res.json({ ok: true, orderId: stmt.lastID });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "サーバ内部エラー" });
  }
});

// 全注文一覧取得
app.get("/orders", async (req, res) => {
  try {
    await initDB();
    const rows = await db.all("SELECT * FROM orders ORDER BY created_at DESC");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "サーバ内部エラー" });
  }
});

// 特定注文取得
app.get("/orders/:id", async (req, res) => {
  try {
    await initDB();
    const row = await db.get("SELECT * FROM orders WHERE id = ?", [req.params.id]);
    if (!row) return res.status(404).json({ error: "not found" });
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "サーバ内部エラー" });
  }
});

// Vercel用のエクスポート
export default app;