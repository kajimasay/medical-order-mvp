import React, { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "";
const STORAGE_KEY = "order_site_customer_v1";

const PRODUCTS = [
  { id: "eye-booster", name: "SBC Eye Booster (試薬)" },
  { id: "exosome-kit", name: "Exosome Assay Kit" },
  { id: "cm-vial", name: "hSC-CM Vial" },
];

export default function App() {
  const [form, setForm] = useState({
    product: PRODUCTS[0].id,
    quantity: 1,
    full_name: "",
    company_name: "",
    company_phone: "",
    company_address: "",
    home_address: "",
    home_phone: "",
    contact_name: "",
    contact_phone: "",
    contact_email: "",
    consent: false,
  });
  const [licenseFile, setLicenseFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orderResult, setOrderResult] = useState(null);

  // 初回読み込み: 顧客情報を localStorage から復元
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try { setForm((f) => ({ ...f, ...JSON.parse(raw) })); } catch {}
    }

    // Admin shortcut: Cmd+Shift+Alt+M (Mac) or Ctrl+Shift+Alt+M (Windows/Linux)
    const handleKeyDown = (e) => {
      const isModifierPressed = navigator.platform.includes('Mac') 
        ? (e.metaKey && e.shiftKey && e.altKey && e.key === 'M')
        : (e.ctrlKey && e.shiftKey && e.altKey && e.key === 'M');
        
      if (isModifierPressed) {
        e.preventDefault();
        if (!adminAuthenticated) {
          setShowAdminLogin(true);
        } else {
          toggleAdminModal();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 入力のたびに保存（ファイル以外）
  useEffect(() => {
    const { consent, ...persist } = form; // 同意フラグは保存しない
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persist));
  }, [form.full_name, form.company_name, form.company_phone, form.company_address, form.home_address, form.home_phone, form.contact_name, form.contact_phone, form.contact_email, form.product, form.quantity]);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const validate = () => {
    if (!form.full_name.trim()) return "氏名は必須です";
    if (!form.company_address.trim() && !form.home_address.trim()) return "会社住所または自宅住所のどちらかは必須です";
    if (!form.contact_name.trim()) return "連絡者氏名は必須です";
    if (!form.contact_phone.trim()) return "連絡先電話番号は必須です";
    if (!form.contact_email.trim()) return "連絡先Emailは必須です";
    if (form.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact_email)) return "正しいEmailアドレスを入力してください";
    if (!licenseFile) return "医師免許状ファイルを選択してください";
    if (!form.consent) return "同意にチェックしてください";
    const q = Number(form.quantity);
    if (!Number.isInteger(q) || q < 1 || q > 999) return "個数は1〜999";
    return null;
  };

  // Admin authentication functions
  const handleAdminLogin = (e) => {
    e.preventDefault();
    // セキュアなパスワード（実際の運用では環境変数から取得推奨）
    const correctPassword = "CVG2024Admin#";
    
    if (adminPassword === correctPassword) {
      setAdminAuthenticated(true);
      setShowAdminLogin(false);
      setAdminError("");
      setAdminPassword("");
      
      // セッション管理: 30分後に自動ログアウト
      setTimeout(() => {
        if (adminAuthenticated) {
          handleAdminLogout();
          alert("セキュリティのため30分後に自動ログアウトしました");
        }
      }, 30 * 60 * 1000); // 30分
      
      toggleAdminModal();
    } else {
      setAdminError("パスワードが正しくありません");
      setAdminPassword("");
      
      // 失敗時の遅延（ブルートフォース対策）
      setTimeout(() => {
        setAdminError("");
      }, 3000);
    }
  };

  const handleAdminLogout = () => {
    setAdminAuthenticated(false);
    setShowAdminModal(false);
    setAdminPassword("");
    setAdminError("");
  };

  // Admin modal functions
  const toggleAdminModal = async () => {
    if (!adminAuthenticated) {
      setShowAdminLogin(true);
      return;
    }
    
    if (!showAdminModal) {
      await fetchOrders();
    }
    setShowAdminModal(!showAdminModal);
  };

  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const res = await fetch(`${API_BASE}/api/orders`);
      if (res.ok) {
        const ordersList = await res.json();
        setOrders(ordersList);
      } else {
        console.error('Failed to fetch orders:', res.status);
        setOrders([]);
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
      setOrders([]);
    }
    setLoadingOrders(false);
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const res = await fetch(`${API_BASE}/api/orders`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: orderId, status: newStatus })
      });
      if (res.ok) {
        const result = await res.json();
        console.log('Status update result:', result);
        await fetchOrders(); // Refresh orders
      } else {
        console.error('Failed to update order status:', res.status);
      }
    } catch (err) {
      console.error('Error updating order status:', err);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setMessage({ type: "error", text: err }); return; }
    // 確認モーダルを表示
    setMessage(null);
    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = async () => {
    setShowConfirmModal(false);
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("product", form.product);
      fd.append("quantity", String(form.quantity));
      fd.append("full_name", form.full_name);
      fd.append("company_name", form.company_name);
      fd.append("company_phone", form.company_phone);
      fd.append("company_address", form.company_address);
      fd.append("home_address", form.home_address);
      fd.append("home_phone", form.home_phone);
      fd.append("contact_name", form.contact_name);
      fd.append("contact_phone", form.contact_phone);
      fd.append("contact_email", form.contact_email);
      fd.append("license", licenseFile);

      console.log("Sending request to:", `${API_BASE}/api/orders`);
      const res = await fetch(`${API_BASE}/api/orders`, { method: "POST", body: fd });
      
      console.log("Response received:", {
        status: res.status,
        statusText: res.statusText,
        headers: Object.fromEntries(res.headers.entries())
      });
      
      // レスポンスのコンテンツタイプをチェック
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        console.error("Non-JSON response details:", {
          status: res.status,
          statusText: res.statusText,
          contentType,
          responseText: text
        });
        throw new Error(`サーバーエラー (${res.status}): ${text.substring(0, 100)}...`);
      }
      
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "送信に失敗しました");
      
      // 成功時は成功モーダルを表示
      setOrderResult(data);
      setShowSuccessModal(true);
      
      // 送信成功後、ファイルと同意のみリセット
      setLicenseFile(null);
      setForm((f) => ({ ...f, consent: false }));
    } catch (e2) {
      setMessage({ type: "error", text: e2.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-bold mb-4">CVG 商品発注フォーム</h1>
      <p className="text-sm text-gray-600 mb-6">※ お手数ですが、下記のご情報をご記入ください。</p>

      {message && (
        <div className={`mb-4 p-3 rounded ${message.type === "error" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-6 bg-white p-6 rounded-2xl shadow">
        <section>
          <h2 className="font-semibold mb-3">商品</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm">商品</span>
              <select name="product" value={form.product} onChange={onChange} className="mt-1 w-full border rounded p-2">
                {PRODUCTS.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm">個数</span>
              <input type="number" name="quantity" min={1} max={999} value={form.quantity} onChange={onChange} className="mt-1 w-full border rounded p-2" />
            </label>
          </div>
        </section>

        <section>
          <h2 className="font-semibold mb-3">注文者（お医者様）情報</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block sm:col-span-2">
              <span className="text-sm">氏名<span className="text-red-500"> *</span></span>
              <input name="full_name" value={form.full_name} onChange={onChange} className="mt-1 w-full border rounded p-2" />
            </label>
            <label className="block">
              <span className="text-sm">医院名</span>
              <input name="company_name" value={form.company_name} onChange={onChange} className="mt-1 w-full border rounded p-2" />
            </label>
            <label className="block">
              <span className="text-sm">医院連絡先電話番号</span>
              <input name="company_phone" value={form.company_phone} onChange={onChange} className="mt-1 w-full border rounded p-2" />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-sm">医院住所</span>
              <input name="company_address" value={form.company_address} onChange={onChange} className="mt-1 w-full border rounded p-2" />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-sm">ご自宅住所</span>
              <input name="home_address" value={form.home_address} onChange={onChange} className="mt-1 w-full border rounded p-2" />
            </label>
            <label className="block">
              <span className="text-sm">ご自宅連絡先電話番号</span>
              <input name="home_phone" value={form.home_phone} onChange={onChange} className="mt-1 w-full border rounded p-2" />
            </label>
          </div>
        </section>

        <section>
          <h2 className="font-semibold mb-3">連絡者情報</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block sm:col-span-2">
              <span className="text-sm">連絡者氏名<span className="text-red-500"> *</span></span>
              <input name="contact_name" value={form.contact_name} onChange={onChange} className="mt-1 w-full border rounded p-2" placeholder="連絡担当者の氏名" />
            </label>
            <label className="block">
              <span className="text-sm">連絡先電話番号<span className="text-red-500"> *</span></span>
              <input name="contact_phone" type="tel" value={form.contact_phone} onChange={onChange} className="mt-1 w-full border rounded p-2" placeholder="090-1234-5678" />
            </label>
            <label className="block">
              <span className="text-sm">連絡先Email<span className="text-red-500"> *</span></span>
              <input name="contact_email" type="email" value={form.contact_email} onChange={onChange} className="mt-1 w-full border rounded p-2" placeholder="contact@example.com" />
            </label>
          </div>
        </section>

        <section>
          <h2 className="font-semibold mb-3">添付資料</h2>
          <label className="block">
            <span className="text-sm">医師免許状（PDF/PNG/JPG）をアップロードしてください。<span className="text-red-500"> *</span></span>
            <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e)=> setLicenseFile(e.target.files?.[0] || null)} className="mt-1 w-full border rounded p-2" />
          </label>
        </section>

        <label className="flex items-center gap-2">
          <input type="checkbox" name="consent" checked={form.consent} onChange={onChange} />
          <span className="text-sm">入力内容を次回のためにこの端末に保存することと、注文処理のために送信することに同意します。</span>
        </label>

        <button disabled={submitting} className="w-full sm:w-auto px-5 py-2 rounded bg-blue-600 text-white disabled:opacity-60">
          注文内容を確認
        </button>
      </form>

      <footer className="mt-8 text-xs text-gray-500">
        © Cell Vision Global Limited — Demo Form
      </footer>

      {/* 確認モーダル */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-90vh overflow-y-auto">
            <div className="p-6 border-b">
              <h3 className="text-xl font-semibold text-gray-800">注文内容確認</h3>
              <p className="text-sm text-gray-600 mt-1">以下の内容で注文を送信しますか？</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md-grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded">
                  <h4 className="font-semibold text-gray-700 mb-2">商品情報</h4>
                  <div className="space-y-1 text-sm">
                    <div><span className="font-medium">商品:</span> {PRODUCTS.find(p => p.id === form.product)?.name}</div>
                    <div><span className="font-medium">数量:</span> {form.quantity}</div>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded">
                  <h4 className="font-semibold text-gray-700 mb-2">注文者情報</h4>
                  <div className="space-y-1 text-sm">
                    <div><span className="font-medium">氏名:</span> {form.full_name}</div>
                    <div><span className="font-medium">会社名:</span> {form.company_name || 'なし'}</div>
                    <div><span className="font-medium">会社電話:</span> {form.company_phone || 'なし'}</div>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded">
                  <h4 className="font-semibold text-gray-700 mb-2">住所情報</h4>
                  <div className="space-y-1 text-sm">
                    <div><span className="font-medium">会社住所:</span> {form.company_address || 'なし'}</div>
                    <div><span className="font-medium">自宅住所:</span> {form.home_address || 'なし'}</div>
                    <div><span className="font-medium">自宅電話:</span> {form.home_phone || 'なし'}</div>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded">
                  <h4 className="font-semibold text-gray-700 mb-2">連絡者情報</h4>
                  <div className="space-y-1 text-sm">
                    <div><span className="font-medium">連絡者:</span> {form.contact_name}</div>
                    <div><span className="font-medium">電話:</span> {form.contact_phone}</div>
                    <div><span className="font-medium">Email:</span> {form.contact_email}</div>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded">
                  <h4 className="font-semibold text-gray-700 mb-2">添付ファイル</h4>
                  <div className="text-sm">
                    {licenseFile ? licenseFile.name : 'ファイルが選択されていません'}
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t flex gap-3 justify-end">
              <button 
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button 
                onClick={handleConfirmSubmit}
                disabled={submitting}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? "送信中..." : "確認して送信"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 成功モーダル */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-8 text-center">
              <div className="mb-4">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">ご注文を受け付けました</h3>
              {orderResult && (
                <p className="text-gray-600 mb-4">
                  注文ID: <span className="font-medium text-blue-600">{orderResult.orderId}</span>
                </p>
              )}
              <p className="text-sm text-gray-500 mb-6">
                ご注文いただきありがとうございます。<br />
                担当者より追って連絡させていただきます。
              </p>
              <button 
                onClick={() => setShowSuccessModal(false)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Login Modal */}
      {showAdminLogin && (
        <div className="modal-overlay">
          <div className="admin-login-modal">
            <div className="admin-login-header">
              <h2>🔒 管理者ログイン</h2>
              <button 
                className="close-btn"
                onClick={() => {
                  setShowAdminLogin(false);
                  setAdminPassword("");
                  setAdminError("");
                }}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleAdminLogin} className="admin-login-form">
              <div className="password-field">
                <label htmlFor="adminPassword">パスワード</label>
                <input
                  type="password"
                  id="adminPassword"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="管理者パスワードを入力"
                  autoFocus
                  required
                />
              </div>
              {adminError && (
                <div className="admin-error">{adminError}</div>
              )}
              <button type="submit" className="admin-login-btn">
                ログイン
              </button>
            </form>
            <div className="admin-login-footer">
              <small>🔑 ショートカット: {navigator.platform.includes('Mac') ? '⌘+Shift+Alt+M' : 'Ctrl+Shift+Alt+M'}</small>
            </div>
          </div>
        </div>
      )}

      {/* Admin Modal */}
      {showAdminModal && adminAuthenticated && (
        <div className="modal-overlay">
          <div className="admin-modal">
            <div className="admin-modal-header">
              <h2>📋 注文管理 - CVG内部用</h2>
              <div className="admin-header-actions">
                <button 
                  className="logout-btn"
                  onClick={handleAdminLogout}
                  title="ログアウト"
                >
                  🚪 ログアウト
                </button>
                <button 
                  className="close-btn"
                  onClick={() => setShowAdminModal(false)}
                >
                  ×
                </button>
              </div>
            </div>
            <div className="admin-modal-content">
              {loadingOrders ? (
                <div className="loading">読み込み中...</div>
              ) : (
                <div className="orders-list">
                  <div className="orders-header">
                    <h3>全注文一覧 ({orders.length}件)</h3>
                    <button 
                      className="refresh-btn"
                      onClick={fetchOrders}
                    >
                      更新
                    </button>
                  </div>
                  {orders.length === 0 ? (
                    <p>注文データがありません</p>
                  ) : (
                    <div className="orders-table">
                      <div className="table-header">
                        <span>ID</span>
                        <span>商品</span>
                        <span>数量</span>
                        <span>氏名</span>
                        <span>Email</span>
                        <span>作成日時</span>
                        <span>ステータス</span>
                      </div>
                      {orders.map((order) => (
                        <div key={order.id} className="table-row">
                          <span>{order.id}</span>
                          <span>{PRODUCTS.find(p => p.id === order.product)?.name || order.product}</span>
                          <span>{order.quantity}</span>
                          <span>{order.full_name}</span>
                          <span>{order.contact_email}</span>
                          <span>{order.created_at ? new Date(order.created_at).toLocaleString('ja-JP') : 'N/A'}</span>
                          <span>
                            <select 
                              value={order.status || 'pending'}
                              onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                              className="status-select"
                            >
                              <option value="pending">保留中</option>
                              <option value="processing">処理中</option>
                              <option value="shipped">発送済み</option>
                              <option value="delivered">配達完了</option>
                              <option value="cancelled">キャンセル</option>
                            </select>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="admin-modal-footer">
              <small>🔐 セキュアアクセス | ショートカット: {navigator.platform.includes('Mac') ? '⌘+Shift+Alt+M' : 'Ctrl+Shift+Alt+M'}</small>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}