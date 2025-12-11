FROM node:18-alpine

# 作業ディレクトリを設定
WORKDIR /app

# package.jsonファイルをコピー
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/

# 依存関係をインストール
RUN npm install
RUN cd client && npm install
RUN cd server && npm install

# アプリケーションのソースコードをコピー
COPY . .

# クライアントをビルド
RUN cd client && npm run build

# ポート4000を公開
EXPOSE 4000

# サーバーを起動
CMD ["node", "server/server.js"]