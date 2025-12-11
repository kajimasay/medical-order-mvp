# 🆓 完全無料デプロイガイド

## Gmail設定（無料）

### 1. Gmailアプリパスワードの作成
1. [Google アカウント](https://myaccount.google.com/) にアクセス
2. 「セキュリティ」→「2段階認証プロセス」を有効化
3. 「アプリパスワード」を生成
4. アプリ名：「Medical Order System」
5. 生成されたパスワードをメモ

### 2. 環境変数の設定値

```
NODE_ENV=production
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=generated-app-password
ADMIN_EMAIL=your-gmail@gmail.com
```

## Vercel デプロイ手順

### 1. GitHub リポジトリ作成
- https://github.com/new にアクセス
- Repository name: `medical-order-mvp`
- Public を選択（無料）
- Create repository

### 2. コードをプッシュ
```bash
git remote set-url origin https://github.com/YOUR_USERNAME/medical-order-mvp.git
git push -u origin main
```

### 3. Vercel デプロイ
- https://vercel.com/signup にアクセス
- GitHubアカウントでサインアップ（無料）
- Import Git Repository
- medical-order-mvp を選択
- Deploy

### 4. 環境変数設定
- Vercel ダッシュボード → Settings → Environment Variables
- 上記の環境変数を追加

## 📊 コスト詳細

| 項目 | 費用 | 備考 |
|------|------|------|
| Vercel ホスティング | 🆓 無料 | 月100GB帯域 |
| Gmail SMTP | 🆓 無料 | アプリパスワード使用 |
| GitHub リポジトリ | 🆓 無料 | Public リポジトリ |
| SSL証明書 | 🆓 無料 | Vercel自動提供 |
| **合計** | **🆓 完全無料** | |

## 🎯 デプロイ後のURL

- **メインサイト**: https://medical-order-mvp.vercel.app
- **管理画面**: https://medical-order-mvp.vercel.app/admin.html

## 🔄 更新方法

コードを更新する場合：
```bash
git add .
git commit -m "Update description"
git push
```
→ Vercelが自動で再デプロイ