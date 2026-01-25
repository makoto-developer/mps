# Quick Reference - Drawing App DSL

最もよく使うコマンドとワークフローのクイックリファレンス

## 🚀 最速スタート（5分で起動）

```bash
# 1. クローン & セットアップ
git clone https://github.com/makoto-developer/mps.git && cd mps
make quickstart

# 2. .envを編集
vim generated/.env
# DATABASE_URL=postgresql://user:pass@localhost:5432/db
# JWT_SECRET=your-secret-key

# 3. マイグレーション & 起動
make migrate
make start
```

---

## 📋 よく使うコマンド

### 開発フロー

```bash
# 1回目のセットアップ
make setup              # 依存関係インストール + ビルド

# コード生成
make generate           # DSL → コード生成

# デプロイ準備
make deploy-setup       # npm install + .env作成

# データベース
make migrate            # マイグレーション実行

# サーバー起動
make start              # 開発モード起動
make start-prod         # 本番モード起動
```

### オールインワンコマンド

```bash
make quickstart         # setup + generate + deploy-setup
make deploy             # generate + deploy-setup
make full-deploy        # deploy + migrate + start (データベース設定済みの場合)
```

### Dockerデプロイ

```bash
# 環境変数設定
cp .env.example .env && vim .env

# デプロイ
make docker-deploy      # generate + docker-compose up
make docker-down        # サービス停止
make docker-logs        # ログ表示
```

---

## 📂 ディレクトリ構造

```
mps/
├── src/                      # DSLジェネレーターのソース
│   ├── ast/                  # AST型定義
│   ├── parser/               # Lexer & Parser
│   ├── generators/           # コードジェネレーター
│   └── cli/                  # CLIツール
├── examples/                 # サンプルDSLファイル
│   ├── minimal-test.dsl      # 最小限の例
│   └── drawing-app-example.dsl # 完全な例
├── generated/                # 生成されたコード（デフォルト）
├── dist/                     # ビルド済みTypeScript
├── Makefile                  # デプロイ自動化
├── Dockerfile                # DSLジェネレーター用
├── Dockerfile.app            # 生成アプリ用
└── docker-compose.yml        # Docker Compose設定
```

---

## 🔧 カスタマイズ

### カスタムDSLファイル

```bash
# カスタムファイルから生成
make generate DSL_FILE=my-app.dsl OUTPUT_DIR=my-app
make deploy-setup OUTPUT_DIR=my-app
```

### 環境変数のオーバーライド

```bash
# ポート変更
APP_PORT=4000 make start

# 別の出力ディレクトリ
OUTPUT_DIR=my-output make generate
```

---

## 🐛 トラブルシューティング

### コマンドが見つからない

```bash
make setup              # 依存関係を再インストール
```

### ポートが使用中

```bash
# ポート変更
vim generated/.env      # PORT=3001 に変更

# または既存プロセスを停止
lsof -ti:3000 | xargs kill
```

### Prismaエラー

```bash
cd generated
npx prisma generate     # Prisma Clientを再生成
npx prisma migrate dev  # マイグレーション実行
```

### Dockerエラー

```bash
make docker-down        # サービス停止
make docker-logs        # ログ確認
docker system prune -a  # クリーンアップ
make docker-up          # 再起動
```

---

## 📝 DSL構文チートシート

### 基本構造

```dsl
Application AppName {
  Database: PostgreSQL
  Port: 3000

  Models { /* モデル定義 */ }
  Resources { /* API定義 */ }
  Rules { /* ビジネスルール */ }
}
```

### モデル定義

```dsl
Model User {
  Fields:
    - id: UUID @primary @auto
    - email: String @required @unique
    - name: String @required
    - age: Integer @min(0) @max(150)
    - role: Enum(User, Admin) @default(User)
    - isActive: Boolean @default(true)

  Relationships:
    - posts: Post[] OneToMany
    - profile: Profile? OneToOne
}
```

### API定義

```dsl
Resource Users {
  BasePath: "/api/users"

  Endpoints:
    GET "/" {
      Auth: Required
      Response:
        - users: User[]
    }

    POST "/" {
      Auth: Admin
      Request:
        - email: String @required
        - name: String @required
      Response:
        - user: User
    }
}
```

### フィールド型

- `String` - 文字列
- `Integer` - 整数
- `Boolean` - 真偽値
- `DateTime` - 日時
- `UUID` - UUID
- `JSON` - JSON
- `Float` - 浮動小数点
- `Hash` - ハッシュ（パスワード用）
- `Enum(A, B, C)` - 列挙型

### 制約

- `@primary` - 主キー
- `@auto` - 自動生成
- `@required` - 必須
- `@unique` - ユニーク
- `@default(value)` - デフォルト値
- `@min(n)` - 最小値
- `@max(n)` - 最大値
- `@email` - メール形式

### リレーション

- `OneToOne` - 1対1
- `OneToMany` - 1対多
- `ManyToOne` - 多対1
- `ManyToMany` - 多対多

---

## 🎯 実用例

### シンプルなブログAPI

```bash
# DSLファイル作成
cat > examples/blog.dsl << 'EOF'
Application BlogApp {
  Database: PostgreSQL
  Port: 3000

  Models {
    Model User {
      Fields:
        - id: UUID @primary @auto
        - email: String @required @unique
        - name: String @required
      Relationships:
        - posts: Post[] OneToMany
    }

    Model Post {
      Fields:
        - id: UUID @primary @auto
        - title: String @required
        - content: String @required
      Relationships:
        - author: User ManyToOne
    }
  }

  Resources {
    Resource Posts {
      BasePath: "/api/posts"
      Endpoints:
        GET "/" {
          Auth: None
          Response:
            - posts: Post[]
        }
        POST "/" {
          Auth: Required
          Request:
            - title: String @required
            - content: String @required
          Response:
            - post: Post
        }
    }
  }
}
EOF

# コード生成 & デプロイ
make generate DSL_FILE=examples/blog.dsl OUTPUT_DIR=blog-app
make deploy-setup OUTPUT_DIR=blog-app
```

---

## 📊 ステータス確認

```bash
make status             # プロジェクトの状態を確認
make version            # バージョン表示
```

---

## 🧹 クリーンアップ

```bash
make clean-generated    # 生成されたファイルのみ削除
make clean              # すべてのビルド成果物を削除
```

---

## 📚 さらに詳しく

- **完全なドキュメント**: `README.md`
- **デプロイガイド**: `DEPLOYMENT.md`
- **DSL設計書**: `docs/drawing-app-dsl-design.md`
- **実装ガイド**: `docs/drawing-app-dsl-implementation-guide.md`

---

## 💡 Tips

1. **開発中は`make dev-watch`を使う**
   - ファイル変更を自動検知

2. **複数環境を管理**
   ```bash
   make generate OUTPUT_DIR=dev-env
   make generate OUTPUT_DIR=staging-env
   make generate OUTPUT_DIR=prod-env
   ```

3. **Docker Composeで複数サービス**
   - PostgreSQL, アプリ, PGAdminを一括管理

4. **エラーが出たら`make help`**
   - すべてのコマンドと使い方を表示
