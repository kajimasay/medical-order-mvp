# Medical Order System MVP

24時間稼働する医療注文システム

## 🚀 デプロイ方法

### オプション1: Vercel (推奨 - 最も簡単)

1. **GitHubにプッシュ**
   ```bash
   git remote add origin https://github.com/yourusername/medical-order-mvp.git
   git push -u origin main
   ```

2. **Vercelでデプロイ**
   - https://vercel.com でアカウント作成
   - GitHubリポジトリを接続
   - 自動デプロイが開始されます

3. **環境変数を設定**
   - Vercelダッシュボード → Settings → Environment Variables
   - `.env.production`の内容を追加

### オプション2: Railway

1. **Railwayでデプロイ**
   - https://railway.app でアカウント作成
   - GitHubリポジトリを接続
   - 自動でDockerビルドが実行されます

### オプション3: Heroku

1. **Heroku CLIをインストール**
   ```bash
   brew install heroku/brew/heroku
   ```

2. **デプロイ**
   ```bash
   heroku create your-app-name
   git push heroku main
   ```

## 🔧 本番環境の設定

### 必要な環境変数

- `SMTP_HOST`: メールサーバー
- `SMTP_USER`: メールアドレス  
- `SMTP_PASS`: アプリパスワード
- `EMAIL_FROM`: 送信者メールアドレス
- `EMAIL_TO`: 管理者メールアドレス

### データベース

本番環境では以下のオプションがあります：
- **SQLite**: シンプル（小規模向け）
- **PostgreSQL**: 推奨（中〜大規模向け）
- **PlanetScale**: サーバーレス MySQL

## 💰 コスト目安

| サービス | 月額料金 | 特徴 |
|---------|---------|------|
| Vercel | 無料〜$20 | 最も簡単、自動スケール |
| Railway | $5〜$20 | Docker対応、DB付き |
| Heroku | $7〜$25 | 老舗、豊富な機能 |

## 📊 アクセス方法

デプロイ後のURL例：
- **フロントエンド**: `https://your-app.vercel.app`
- **管理画面**: `https://your-app.vercel.app/admin.html`

## 🔒 セキュリティ

本番環境では以下を設定してください：
- HTTPS証明書（自動設定されます）
- 適切な環境変数
- ファイルアップロードの制限
- レート制限の実装