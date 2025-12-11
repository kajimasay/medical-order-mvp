// api/test.js - シンプルなテスト用API
import express from "express";
import cors from "cors";

const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

app.get("/test", (req, res) => {
  console.log("Test endpoint called");
  res.json({ status: "ok", message: "API is working" });
});

app.post("/test", (req, res) => {
  console.log("Test POST endpoint called", { body: req.body });
  res.json({ status: "ok", received: req.body });
});

export default app;