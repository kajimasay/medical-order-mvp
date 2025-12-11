// server/server.js
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
const PORT = process.env.PORT || 4000;
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");

// メール設定
const transporter = nodemailer.createTransport({
  service: 'gmail', // Gmail使用の場合
  auth: {
    user: process.env.EMAIL_USER, // 送信者メールアドレス
    pass: process.env.EMAIL_PASS  // アプリパスワード
  }
});

// 注文通知メール送信関数
async function sendOrderNotification(orderData) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL || 'admin@cellvision.com', // 管理者メール
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

// CORS（開発用：必要に応じてオリジンを絞る）
app.use(cors({ origin: true }));

// レート制限（簡易DoS対策）
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));

// 静的配信（確認用）
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
app.use("/uploads", express.static(UPLOAD_DIR));

// 管理画面用の静的ファイル配信
const PUBLIC_DIR = path.join(process.cwd(), "public");
if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });
app.use(express.static(PUBLIC_DIR));

// DB 準備
let db;
(async () => {
  db = await open({ filename: path.join(process.cwd(), "db.sqlite"), driver: sqlite3.Database });
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
})();

// Multer 設定
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const base = path.parse(file.originalname).name.replace(/\s+/g, "_");
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${base}_${ts}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const ok = [".pdf", ".png", ".jpg", ".jpeg"].includes(path.extname(file.originalname).toLowerCase());
    ok ? cb(null, true) : cb(new Error("ファイル形式は PDF/PNG/JPG のみ対応です"));
  },
});

// バリデーション
const OrderSchema = z.object({
  product: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(999),
  full_name: z.string().min(1),
  company_name: z.string().optional().nullable(),
  company_phone: z.string().optional().nullable(),
  company_address: z.string().optional().nullable(),
  home_address: z.string().optional().nullable(),
  home_phone: z.string().optional().nullable(),
  contact_name: z.string().min(1),
  contact_phone: z.string().min(1),
  contact_email: z.string().email(),
});

app.post("/api/orders", upload.single("license"), async (req, res) => {
  try {
    // text fields
    const parsed = OrderSchema.safeParse(req.body);
    if (!parsed.success) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.status(400).json({ error: "入力値が不正です", details: parsed.error.flatten() });
    }
    if (!req.file) return res.status(400).json({ error: "医師免許状ファイルは必須です" });

    const p = parsed.data;
    const stmt = await db.run(
      `INSERT INTO orders (product, quantity, full_name, company_name, company_phone, company_address, home_address, home_phone, contact_name, contact_phone, contact_email, license_path, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        p.product,
        p.quantity,
        p.full_name,
        p.company_name || null,
        p.company_phone || null,
        p.company_address || null,
        p.home_address || null,
        p.home_phone || null,
        p.contact_name,
        p.contact_phone,
        p.contact_email,
        `/uploads/${path.basename(req.file.path)}`,
      ]
    );

    // メール通知を送信（非同期）
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

// 全注文一覧取得（管理用）
app.get("/api/orders", async (req, res) => {
  try {
    const rows = await db.all("SELECT * FROM orders ORDER BY created_at DESC");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "サーバ内部エラー" });
  }
});

// 特定注文取得
app.get("/api/orders/:id", async (req, res) => {
  const row = await db.get("SELECT * FROM orders WHERE id = ?", [req.params.id]);
  if (!row) return res.status(404).json({ error: "not found" });
  res.json(row);
});

const server = app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});

// 適切な終了処理
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    if (db) db.close();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    if (db) db.close();
    process.exit(0);
  });
});

// 未処理の例外をキャッチ
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});