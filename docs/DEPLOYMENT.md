# デプロイメントガイド

このドキュメントでは、Drawing App DSLを使ったアプリケーションのデプロイ方法を説明します。

## 📋 目次

1. [ローカル開発環境](#ローカル開発環境)
2. [Dockerを使用したデプロイ](#dockerを使用したデプロイ)
3. [本番環境へのデプロイ](#本番環境へのデプロイ)
4. [トラブルシューティング](#トラブルシューティング)

---

## ローカル開発環境

### 1. 最速セットアップ

```bash
# 1. リポジトリをクローン
git clone https://github.com/makoto-developer/mps.git
cd mps

# 2. クイックスタート（すべて自動）
make quickstart

# 3. .envを編集
vim generated/.env
# DATABASE_URL と JWT_SECRET を設定

# 4. マイグレーションとサーバー起動
make migrate
make start
```

### 2. 段階的セットアップ

```bash
# Step 1: 依存関係のインストールとビルド
make setup

# Step 2: DSLからコード生成
make generate

# Step 3: 生成されたコードのセットアップ
make deploy-setup

# Step 4: .envファイルを編集
cp generated/.env.example generated/.env
vim generated/.env

# Step 5: データベースマイグレーション
make migrate

# Step 6: サーバー起動
make start
```

### 3. カスタムDSLファイルを使用

```bash
# カスタムDSLファイルから生成
make generate DSL_FILE=examples/my-app.dsl OUTPUT_DIR=my-app

# セットアップ
make deploy-setup OUTPUT_DIR=my-app

# .envを編集
vim my-app/.env

# マイグレーションと起動
cd my-app
npx prisma migrate dev
npm run dev
```

---

## Dockerを使用したデプロイ

### 1. Docker Composeで完全デプロイ

```bash
# 1. 環境変数を設定
cp .env.example .env
vim .env

# 2. Docker Composeでデプロイ
make docker-deploy
```

### 2. 手動でDocker Composeを使用

```bash
# 1. DSLからコード生成
make generate

# 2. 環境変数を設定
cp .env.example .env
vim .env

# 3. Docker Composeでサービス起動
docker-compose up -d

# 4. ログを確認
make docker-logs
```

### 3. PGAdminを使用（オプション）

```bash
# PGAdminを含めてサービス起動
docker-compose --profile tools up -d

# ブラウザで http://localhost:5050 にアクセス
# ログイン: admin@example.com / admin
```

### Docker Composeサービス構成

- **postgres**: PostgreSQLデータベース (ポート: 5432)
- **app**: 生成されたアプリケーション (ポート: 3000)
- **pgadmin**: データベース管理ツール (ポート: 5050) ※オプション

---

## 本番環境へのデプロイ

### 1. 環境変数の設定

本番環境では以下の環境変数を必ず設定してください：

```bash
# データベース接続
DATABASE_URL=postgresql://username:password@host:5432/database

# JWT秘密鍵（強力なランダム文字列を使用）
JWT_SECRET=your-very-strong-secret-key-minimum-32-characters

# ポート
PORT=3000

# 環境
NODE_ENV=production
```

### 2. VPS/クラウドへのデプロイ

#### Option 1: Dockerを使用（推奨）

```bash
# 1. サーバーにSSH接続
ssh user@your-server.com

# 2. リポジトリをクローン
git clone https://github.com/makoto-developer/mps.git
cd mps

# 3. 環境変数を設定
cp .env.example .env
vim .env

# 4. Dockerでデプロイ
make docker-deploy

# 5. Nginxリバースプロキシ設定（オプション）
# /etc/nginx/sites-available/drawingapp
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### Option 2: 直接デプロイ

```bash
# 1. Node.jsとPostgreSQLをインストール
sudo apt update
sudo apt install nodejs npm postgresql

# 2. リポジトリをクローン
git clone https://github.com/makoto-developer/mps.git
cd mps

# 3. セットアップとビルド
make setup
make generate

# 4. 生成されたアプリのセットアップ
cd generated
npm install --production
cp .env.example .env
vim .env

# 5. データベースマイグレーション
npx prisma migrate deploy

# 6. PM2で起動（プロセス管理）
npm install -g pm2
pm2 start npm --name "drawing-app" -- start
pm2 save
pm2 startup
```

### 3. Vercel/Renderへのデプロイ

#### Render (推奨)

1. Renderアカウントを作成
2. 新しいWeb Serviceを作成
3. GitHubリポジトリを連携
4. 設定：
   - Build Command: `make setup && make generate && cd generated && npm install`
   - Start Command: `cd generated && npm start`
   - 環境変数を追加（DATABASE_URL, JWT_SECRET等）
5. PostgreSQLデータベースを作成して接続

---

## トラブルシューティング

### エラー: "DATABASE_URL not set"

```bash
# .envファイルが存在するか確認
ls -la generated/.env

# 存在しない場合は作成
cp generated/.env.example generated/.env
vim generated/.env
```

### エラー: "Prisma Client not generated"

```bash
cd generated
npx prisma generate
```

### エラー: "Port 3000 already in use"

```bash
# ポートを変更
vim generated/.env
# PORT=3001 に変更

# または既存プロセスを停止
lsof -ti:3000 | xargs kill
```

### Docker: コンテナが起動しない

```bash
# ログを確認
make docker-logs

# コンテナを再起動
make docker-down
make docker-up
```

### データベース接続エラー

```bash
# PostgreSQLが起動しているか確認
sudo systemctl status postgresql

# Docker Composeの場合
docker-compose ps

# 接続テスト
psql $DATABASE_URL
```

---

## 便利なコマンド

### 開発中

```bash
make dev-watch        # ファイル変更を監視して自動再起動
make lint             # コードをLint
make format           # コードをフォーマット
make test             # テストを実行
```

### デバッグ

```bash
make status           # プロジェクトの状態を確認
make docker-logs      # Dockerログを表示
```

### クリーンアップ

```bash
make clean-generated  # 生成されたファイルのみ削除
make clean            # すべてのビルド成果物を削除
```

---

## セキュリティのベストプラクティス

1. **環境変数の管理**
   - `.env`ファイルは絶対にGitにコミットしない
   - 本番環境では強力なJWT_SECRETを使用

2. **データベース**
   - 本番環境では強力なパスワードを使用
   - SSL接続を有効化

3. **CORS設定**
   - 本番環境では信頼できるオリジンのみを許可

4. **レート制限**
   - APIエンドポイントにレート制限を実装

---

## パフォーマンスチューニング

### Node.js

```bash
# プロダクション最適化
NODE_ENV=production npm start

# メモリ制限を設定
node --max-old-space-size=4096 dist/index.js
```

### PostgreSQL

```sql
-- インデックスを追加
CREATE INDEX idx_user_email ON "User"(email);
CREATE INDEX idx_room_status ON "Room"(status);

-- 接続プールの設定
-- DATABASE_URL に ?connection_limit=10 を追加
```

### Docker

```bash
# イメージサイズを最小化
docker image prune -a

# リソース制限
docker-compose up -d --scale app=2
```

---

## モニタリングとログ

### PM2でのログ管理

```bash
pm2 logs drawing-app      # ログを表示
pm2 monit                # リアルタイム監視
```

### Dockerでのログ管理

```bash
docker-compose logs -f app           # アプリログ
docker-compose logs -f postgres      # DBログ
```

---

## バックアップとリストア

### データベースバックアップ

```bash
# バックアップ
pg_dump $DATABASE_URL > backup.sql

# リストア
psql $DATABASE_URL < backup.sql
```

### Dockerボリュームバックアップ

```bash
# バックアップ
docker run --rm -v mps_postgres_data:/data -v $(pwd):/backup \
  alpine tar czf /backup/postgres-backup.tar.gz /data

# リストア
docker run --rm -v mps_postgres_data:/data -v $(pwd):/backup \
  alpine tar xzf /backup/postgres-backup.tar.gz -C /
```
