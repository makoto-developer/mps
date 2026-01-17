# Jetbrains MPS

## Description

このリポジトリはJetbrains MPSの検証リポジトリである。

MPSを使ってAIで色々作らせたり、制御する方法を見出したい。

## MPSとは

**MPS (Meta Programming System)** は、JetBrainsが開発したプロジェクション型エディタベースの言語ワークベンチです。

### 主な特徴

#### 1. プロジェクション型エディタ

- テキストベースではなく、AST（抽象構文木）を直接編集
- 文法エラーが構造的に発生しにくい
- 数式、図形、テーブルなど多様な表現が可能

#### 2. 言語指向プログラミング (LOP)

- DSL（ドメイン特化言語）の作成が容易
- 既存言語の拡張・組み合わせが可能
- ビジネスロジックをドメインの言葉で記述

#### 3. 言語構成要素

- **Structure**: 言語の文法定義（AST構造）
- **Editor**: 見た目の定義（プロジェクション）
- **Behavior**: 言語要素の振る舞い（メソッド）
- **Generator**: コード生成ルール（Java等への変換）
- **Type System**: 型チェックルール
- **Constraints**: 制約条件

### なぜMPSなのか

**従来のテキストベースエディタとの違い**:

| 項目 | テキストベースエディタ | MPS |
|------|----------------------|-----|
| 編集対象 | テキスト（文字列） | AST（抽象構文木） |
| 文法エラー | 入力時に発生 | 構造的に防止 |
| 表現力 | テキストのみ | 数式、図形、テーブル等 |
| DSL作成 | パーサー実装が必要 | GUIで定義可能 |
| コード補完 | 文字列ベース | 型情報ベース |

### GherkinとMPSの違い

**Gherkin = 既製品のDSL、MPS = DSLを作る工場**

#### Gherkin（BDD用の既製DSL）

```gherkin
Feature: ポイント付与
  Scenario: 10000円以上の注文
    Given 顧客が商品を10000円分カートに入れた
    When 注文を確定する
    Then 100ポイントが付与される
```

- 文法が固定（Given/When/Then）
- 用途：テスト仕様の記述
- 出力：テストコードのみ
- 型安全性：なし（文字列ベース）

#### MPS（任意のDSLを作成）

```
// 好きな形式で定義可能
Rule: ポイント付与
  Condition: Order.total ≥ 10,000
  Action: Grant 100 Points

// または、テーブル形式
| Event         | Condition      | Action        |
|---------------|----------------|---------------|
| Order Created | Total ≥ 10,000 | Grant 100 Pts |
```

- 文法を自由に設計
- 用途：任意のドメイン（ビジネスルール、設定、データ定義等）
- 出力：コード、テスト、ドキュメント、SQL等、複数同時生成可能
- 型安全性：あり（編集時にエラー検出）

#### 比較表

| 項目 | Gherkin | MPS |
|------|---------|-----|
| 本質 | DSL（既製品） | DSLを作るツール |
| 用途 | テスト仕様 | 任意のドメイン |
| 文法 | 固定 | 自由に定義 |
| 型安全性 | なし | あり |
| エラー検出 | 実行時 | 編集時 |
| 出力 | テストコード | 任意（複数同時可） |
| 学習コスト | 低い | 高い |

#### ユースケース例：Shopify App

**問題**：ビジネスルールがコードに埋もれて、非エンジニアが理解・変更できない

**MPS DSLでの解決**：

```
// Shopify App用のDSLを定義
Webhook: Order Created
  Rule: 基本ポイント
    When: Order.total ≥ ¥10,000
    Then: Grant 100 Points

  Rule: VIP特典
    When: Customer.isVIP = true
    Then: Points × 2
```

↓ 自動生成

**実装コード（TypeScript）**：
```typescript
app.post('/webhooks/orders/create', async (req, res) => {
  const order = req.body;
  let points = 0;

  if (order.total >= 10000) points = 100;
  if (order.customer.isVIP) points *= 2;

  await grantPoints(order.customer.id, points);
});
```

**テストコード**：
```typescript
it('should grant 100 points for 10000 yen order', () => {
  expect(calculatePoints({ total: 10000 })).toBe(100);
});
```

**ドキュメント**：
```markdown
## ポイント付与ルール
- 10,000円以上：100ポイント
- VIP顧客：2倍
```

**メリット**：
- ビジネスルールが明確
- 非エンジニアが編集可能
- コード、テスト、ドキュメントが常に同期
- 型安全で保守性が高い

## Getting Started

### Prerequisites

- **Node.js**: 18以上（推奨: 20 LTS）
- **npm**: 9以上
- **PostgreSQL**: 14以上（ローカル開発の場合）
- **Docker** (オプション): Docker Composeによるデプロイ用

### Quick Start with Makefile

#### 1. クローンとセットアップ

```bash
git clone https://github.com/makoto-developer/mps.git
cd mps
make setup
```

#### 2. コード生成とデプロイ

```bash
# オプション1: クイックスタート（推奨）
make quickstart

# オプション2: 段階的デプロイ
make generate          # DSLからコード生成
make deploy-setup      # 生成されたコードのセットアップ
make migrate          # データベースマイグレーション
make start            # サーバー起動
```

#### 3. Dockerを使用したデプロイ

```bash
# .envファイルを作成
cp .env.example .env
# .envを編集してデータベース設定を行う

# Dockerでデプロイ
make docker-deploy
```

### Makefileコマンド一覧

```bash
make help              # すべてのコマンドを表示

# 基本コマンド
make install           # 依存関係をインストール
make build             # TypeScriptをビルド
make setup             # install + build

# コード生成
make generate          # DSLからコード生成
make deploy            # 生成 + セットアップ
make full-deploy       # 完全デプロイ（生成 + セットアップ + マイグレーション + 起動）

# データベース
make migrate           # データベースマイグレーション実行

# サーバー
make start             # 開発サーバー起動
make start-prod        # 本番サーバー起動

# Docker
make docker-build      # Dockerイメージビルド
make docker-up         # Docker Composeでサービス起動
make docker-down       # Docker Composeでサービス停止
make docker-deploy     # Docker完全デプロイ

# クリーンアップ
make clean             # すべてをクリーン
make clean-generated   # 生成されたファイルのみクリーン

# 開発
make test              # テスト実行
make lint              # Linter実行
make format            # コードフォーマット
```

### カスタムDSLファイルを使用

```bash
make generate DSL_FILE=examples/my-app.dsl OUTPUT_DIR=my-output
make deploy-setup OUTPUT_DIR=my-output
```

### 基本的な使い方

#### 新しい言語の作成

1. **New Language**
   - File → New → Language
   - Language名を入力（例: `com.example.mydsl`）

2. **Structure定義**
   - Structureノードを開く
   - Conceptを定義（言語の構文要素）

3. **Editor作成**
   - Editorノードを開く
   - Conceptの見た目を定義

4. **Generator設定**
   - Generatorノードを開く
   - 生成規則を定義（Java等へ変換）

5. **Build & Run**
   - Build → Make
   - 生成されたコードを実行

## プロジェクト構成

```
mps/
├── languages/          # 作成したDSL定義
│   └── [言語名]/
│       ├── structure/  # 文法定義
│       ├── editor/     # エディタ定義
│       ├── behavior/   # 振る舞い定義
│       ├── generator/  # コード生成規則
│       └── typesystem/ # 型システム
│
├── solutions/          # DSLを使用したソリューション
│   └── [ソリューション名]/
│       └── models/     # モデルファイル
│
└── build/             # 生成されたコード
```

## 実例：Drawing App DSL

このリポジトリでは、リアルタイムお絵描きアプリケーションのバックエンドを自動生成するDSLを実装しています。

### 概要

**目的**: バックエンドのボイラープレートコードを80%以上自動化

**対象範囲**:
- ✅ データモデル（User, Room, Drawing等）
- ✅ REST API（CRUD操作）
- ✅ 認証・認可システム
- ✅ ビジネスルール（セッション開始、権限管理等）
- ✅ データベーススキーマ
- ❌ フロントエンド（React/Vue - 別途実装）
- ❌ リアルタイム通信（WebSocket - 別途実装）

### 機能

#### 1. 認証認可
- ユーザー登録・ログイン・ログアウト
- JWT認証
- ロールベースアクセス制御（User/Admin）

#### 2. ルーム管理
- ルーム一覧・作成・削除
- ルーム参加・退出
- 2人以上でセッション自動開始
- お題（テーマ）設定

#### 3. お絵描き機能（バックエンド）
- レイヤー管理
- 描画履歴保存（不正行為検出用）
- ボードサイズ変更
- ストロークデータ保存

#### 4. 管理機能
- ユーザー一覧表示
- ユーザーブロック/解除
- ルーム監視

### DSLサンプル

```dsl
// examples/drawing-app-example.dsl

Application DrawingApp {
  Database: PostgreSQL
  Port: 3000

  Models {
    Model User {
      Fields:
        - id: UUID @primary @auto
        - email: String @required @unique
        - password: Hash @required
        - nickname: String @required
        - role: Enum(User, Admin) @default(User)
        - isBlocked: Boolean @default(false)
    }

    Model Room {
      Fields:
        - id: UUID @primary @auto
        - title: String @required
        - theme: String @required
        - status: Enum(Waiting, Active, Ended) @default(Waiting)

      Relationships:
        - createdBy: User
        - participants: RoomParticipant[]
    }
  }

  Resources {
    Resource Auth {
      POST /register (email, password, nickname) -> (user, token)
      POST /login (email, password) -> (user, token)
    }

    Resource Rooms @auth {
      GET / -> rooms[]
      POST / (title, theme) -> room
      DELETE /:id @admin -> success
    }
  }

  Rules {
    Rule AutoStartSession {
      When: RoomParticipant.created
      If: Room.participants.count >= 2
      Then: Set Room.status = Active
    }
  }
}
```

### 自動生成されるコード

DSLから以下のコードが自動生成されます：

**1. Prisma Schema**
```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  nickname  String
  role      Role     @default(USER)
  isBlocked Boolean  @default(false)
}
```

**2. Express Routes**
```typescript
router.post('/api/auth/register', authController.register);
router.post('/api/auth/login', authController.login);
router.get('/api/rooms', authMiddleware, roomController.listRooms);
```

**3. Controllers**
```typescript
export class AuthController {
  async register(req: Request, res: Response) {
    // バリデーション、パスワードハッシュ化、JWT生成
  }
}
```

**4. API仕様書（OpenAPI）**
```yaml
paths:
  /api/auth/register:
    post:
      summary: ユーザー登録
      requestBody: ...
```

### ドキュメント

- **[DSL設計書](docs/drawing-app-dsl-design.md)** - 完全な仕様
- **[実装ガイド](docs/drawing-app-dsl-implementation-guide.md)** - MPSでの実装手順
- **[サンプルコード](examples/drawing-app-example.dsl)** - DSL使用例

### クイックスタート

#### 1. MPSでDSLを実装

```bash
# MPSを起動
# File → Open → このリポジトリを選択
# docs/drawing-app-dsl-implementation-guide.md に従って実装
```

#### 2. コード生成

```bash
# MPS内で Build → Make
# build/ ディレクトリにコードが生成される
```

#### 3. バックエンド起動

```bash
cd build

# 依存関係インストール
npm install

# データベースセットアップ
npx prisma migrate dev

# サーバー起動
npm start
```

#### 4. APIテスト

```bash
# ユーザー登録
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","nickname":"TestUser"}'

# ルーム作成
curl -X POST http://localhost:3000/api/rooms \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"title":"テストルーム","theme":"猫を描こう"}'
```

### メリット

- **開発時間80%削減**: ボイラープレートを自動生成
- **型安全**: 編集時にエラー検出
- **一貫性**: すべてのAPIが同じパターン
- **保守性**: DSLを変更すればコードも更新
- **ドキュメント同期**: API仕様書が自動生成

---

## AI活用の実験

このリポジトリでは、MPSとAIを組み合わせた以下の実験を行います。

### 実験1: 言語定義の自動生成

**目的**: AIにドメイン知識を与えて、Structure/Editorを自動生成

**アプローチ**:
1. ドメイン専門家の説明をAIに入力
2. AIがConcept定義を提案
3. MPSでStructureを生成
4. Editorを自動生成

### 実験2: Generator規則の学習

**目的**: 入出力例からGenerator規則を自動生成

**アプローチ**:
1. DSL → 生成コード の対応例を収集
2. AIが変換パターンを学習
3. Generator規則を自動生成

### 実験3: インテリジェントなコード補完

**目的**: MPS AST + AI によるコンテキスト理解の高度な補完

**アプローチ**:
1. AST情報をAIに提供
2. コンテキストを理解した補完候補を生成
3. MPSの補完システムと統合

### 実験4: DSL設計支援

**目的**: ドメイン専門家との対話からDSL仕様を自動提案

**アプローチ**:
1. ドメイン専門家とAIが対話
2. 要件を整理
3. DSL設計案を自動生成
4. MPSで実装

## 参考資料

### 公式ドキュメント

- [JetBrains MPS公式サイト](https://www.jetbrains.com/mps/)
- [MPS User Guide](https://www.jetbrains.com/help/mps/)
- [MPS Platform Docs](https://www.jetbrains.com/help/mps/mps-platform.html)

### チュートリアル

- [Fast Track to MPS](https://www.jetbrains.com/help/mps/fast-track-to-mps.html)
- [MPS Tutorial](https://www.jetbrains.com/help/mps/mps-tutorial.html)
- [Creating a Simple Language](https://www.jetbrains.com/help/mps/creating-a-simple-language.html)

### コミュニティ

- [MPS Forum](https://mps-support.jetbrains.com/)
- [MPS Slack](https://jetbrains-mps.slack.com/)
- [GitHub - JetBrains MPS](https://github.com/JetBrains/MPS)

### 書籍

- "The MPS Language Workbench" - Markus Voelter
- "DSL Engineering" - Markus Voelter

### ビデオ

- [MPS YouTube Channel](https://www.youtube.com/c/JetBrainsMPS)
- [Language Engineering with MPS](https://www.youtube.com/playlist?list=PLQ176FUIyIUYAjYxUi22tIHGYfK0eRV6a)


