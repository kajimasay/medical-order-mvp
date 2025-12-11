// api/index.js - 簡略化されたAPI（デバッグ用）
import express from "express";
import cors from "cors";
import multer from "multer";

const app = express();

// CORS設定
app.use(cors({ origin: true }));
app.use(express.json());

console.log("API starting...");

// メモリストレージを使用するmulter設定
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// テスト用エンドポイント
app.get("/test", (req, res) => {
  console.log("Test GET endpoint called");
  res.json({ status: "ok", message: "API is working", timestamp: new Date().toISOString() });
});

// シンプルなPOSTテスト
app.post("/test", (req, res) => {
  console.log("Test POST endpoint called", { body: req.body });
  res.json({ status: "ok", message: "POST is working", received: req.body });
});

// 簡単な注文作成API（DBなし）
app.post("/orders", upload.single("license"), (req, res) => {
  try {
    console.log("Order endpoint called", {
      body: req.body,
      file: req.file ? { name: req.file.originalname, size: req.file.size } : null
    });

    if (!req.file) {
      console.log("No file provided");
      return res.status(400).json({ error: "医師免許証ファイルが必要です" });
    }

    // 簡単な検証
    const requiredFields = ['product', 'quantity', 'full_name', 'contact_name', 'contact_phone', 'contact_email'];
    for (const field of requiredFields) {
      if (!req.body[field]) {
        console.log(`Missing field: ${field}`);
        return res.status(400).json({ error: `必須項目が入力されていません: ${field}` });
      }
    }

    // 成功レスポンス
    const orderId = Math.floor(Math.random() * 10000);
    console.log("Order created successfully", { orderId });
    
    res.json({ 
      ok: true, 
      orderId: orderId,
      message: "注文を受け付けました" 
    });

  } catch (err) {
    console.error("Order creation error:", err);
    res.status(500).json({ error: "サーバー内部エラー: " + err.message });
  }
});

// 注文一覧API（ダミーデータ）
app.get("/orders", (req, res) => {
  console.log("Orders list endpoint called");
  const dummyOrders = [
    {
      id: 1,
      product: "eye-booster",
      quantity: 2,
      full_name: "テスト太郎",
      contact_email: "test@example.com",
      created_at: new Date().toISOString()
    }
  ];
  res.json(dummyOrders);
});

// 特定注文取得API（ダミーデータ）
app.get("/orders/:id", (req, res) => {
  console.log("Order details endpoint called", { id: req.params.id });
  const dummyOrder = {
    id: req.params.id,
    product: "eye-booster",
    quantity: 2,
    full_name: "テスト太郎",
    company_name: "テスト病院",
    contact_name: "テスト太郎",
    contact_phone: "090-1234-5678",
    contact_email: "test@example.com",
    license_path: "license_test.jpg",
    created_at: new Date().toISOString()
  };
  res.json(dummyOrder);
});

// 404ハンドラー
app.use((req, res, next) => {
  console.log('404 - Route not found:', req.method, req.url);
  res.status(404).json({ error: `Route not found: ${req.method} ${req.url}` });
});

// エラーハンドリング
app.use((err, req, res, next) => {
  console.error('Error handler:', err);
  res.status(500).json({ error: err.message || 'サーバー内部エラー' });
});

console.log("API setup complete");

// Vercel Serverless Functions用のエクスポート
export default app;