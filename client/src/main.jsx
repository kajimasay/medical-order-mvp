import React from "react";                    // React core
import { createRoot } from "react-dom/client"; // React 18 API
import App from "./App.jsx";                   // メインコンポーネント
import "./index.css";                        // 現在のindex.cssをここでインポートすることも可能


// ✅ 標準的なレンダリング
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
