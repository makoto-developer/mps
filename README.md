# JetBrains MPS 実践リポジトリ

> **MPS (Meta Programming System)** を使った DSL 開発と AI 連携の実験プロジェクト

---

## 目次

1. [MPSとは何か](#mpsとは何か)
2. [なぜMPSを使うのか（メリット）](#なぜmpsを使うのかメリット)
3. [MPSの課題（デメリット）](#mpsの課題デメリット)
4. [従来の開発との違い](#従来の開発との違い)
5. [MPSの設計思想](#mpsの設計思想)
6. [実装例](#実装例)
7. [クイックスタート](#クイックスタート)
8. [参考資料](#参考資料)

---

## MPSとは何か

### 一言でいうと

**「自分だけのプログラミング言語を作れるツール」**

MPSは JetBrains が開発した **言語ワークベンチ** です。普通のプログラミングでは既存の言語（Java, Python, TypeScript等）を使いますが、MPSでは **問題領域に特化した独自言語（DSL）** を作り、それを使ってプログラミングします。

### 具体例で理解する

#### 従来の開発

```typescript
// ビジネスルールがコードに埋もれている
app.post('/webhooks/orders/create', async (req, res) => {
  const order = req.body;
  let points = 0;
  
  // ルール1: 10,000円以上で100ポイント
  if (order.total >= 10000) {
    points = 100;
  }
  
  // ルール2: VIP顧客は2倍
  if (order.customer.isVIP) {
    points *= 2;
  }
  
  await grantPoints(order.customer.id, points);
});
```

**問題点**:
- ビジネスルールがコードに埋もれて見つけにくい
- 非エンジニアが理解・変更できない
- ルール変更のたびにエンジニアが必要

#### MPSでの開発

```
ポイント付与ルール:

| イベント    | 条件              | アクション      |
|------------|-------------------|----------------|
| 注文確定   | 合計 ≥ 10,000円   | 100ポイント付与 |
| 注文確定   | VIP顧客 = true    | ポイント × 2    |
```

↓ **自動生成**

- TypeScript実装コード
- テストコード
- APIドキュメント

**解決**:
- ビジネスルールが一目瞭然
- 非エンジニアでも読める・編集できる
- コード・テスト・ドキュメントが常に同期

### 核心概念: プロジェクション型エディタ

MPSの最大の特徴は **テキストを編集しない** ことです。

```
┌─────────────────────────────────────────────────────────────────┐
│  従来のエディタ                                                   │
│                                                                  │
│  テキスト → パーサー → AST → コンパイラ → 実行                    │
│  "if (x > 0) { ... }"                                           │
│                                                                  │
│  問題: 文法エラーが発生しやすい                                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  MPS（プロジェクション型）                                         │
│                                                                  │
│  AST を直接編集 → 表示（プロジェクション）                          │
│                                                                  │
│  ┌─────────┐      ┌─────────────────────┐                       │
│  │   AST   │ ───► │ テキスト風に見える   │                       │
│  │ (本体)  │      │ テーブルに見える     │                       │
│  │         │      │ 数式に見える        │                       │
│  └─────────┘      └─────────────────────┘                       │
│                                                                  │
│  利点: 文法エラーが構造的に発生しない                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## なぜMPSを使うのか（メリット）

### 1. 文法エラーがゼロ

ASTを直接編集するため、構文エラーが **原理的に発生しない**。
括弧の閉じ忘れ、セミコロン忘れなどが起きない。

### 2. 複数の表現形式

同じデータを様々な形式で表示できる:

| 形式 | 用途 |
|-----|------|
| テキスト風 | コードに慣れた開発者向け |
| テーブル | ビジネスルール一覧 |
| 数式 | 数学的な表現 |
| 図形 | 状態遷移図、フローチャート |

### 3. 型安全な編集

入力時点で型チェックが走り、不正な値を入力できない。
実行時エラーを編集時に防止。

### 4. 複数ターゲットへの同時生成

1つのDSL定義から複数の成果物を生成:

```
DSL定義
   │
   ├──► TypeScript 実装コード
   ├──► Python 実装コード
   ├──► テストコード
   ├──► OpenAPI仕様書
   ├──► データベーススキーマ
   └──► マークダウン文書
```

### 5. ドメイン専門家との協業

非エンジニアでも理解できる表現でビジネスロジックを記述。
「仕様書」と「実装」の乖離がなくなる。

### 6. 言語の組み合わせ

複数のDSLを組み合わせて使用可能:

```
基本言語 + ビジネスルールDSL + テストDSL + ドキュメントDSL
```

---

## MPSの課題（デメリット）

### 1. 学習コストが高い

| 項目 | 習得目安 |
|-----|---------|
| 基本操作 | 1-2週間 |
| DSL作成 | 1-2ヶ月 |
| 高度な機能 | 3-6ヶ月 |

**対策**: 小さなDSLから始める。既存のサンプルを改造する。

### 2. エコシステムが小さい

- Stack Overflowの回答が少ない
- サードパーティライブラリが限定的
- 日本語情報がほぼない

**対策**: 公式フォーラム、Slackコミュニティを活用。

### 3. バージョン管理が難しい

MPSのファイルはXML形式で、差分が見づらい:

```xml
<!-- 人間が読むのは困難 -->
<node concept="..." role="...">
  <property role="name" value="MyClass" />
  <node concept="..." role="...">
    ...
  </node>
</node>
```

**対策**: MPS専用の差分ツールを使用。意味のある単位でコミット。

### 4. IDE依存

MPSエディタでしか編集できない。VSCode、Vimなどは使えない。

**対策**: 生成されたコードはどのエディタでも閲覧可能。

### 5. 初期投資が大きい

DSLを作る工数 > 直接コードを書く工数（最初は）

**対策**: 以下の場合に採用を検討:
- 同じパターンが繰り返し出現する
- 非エンジニアが仕様を変更する必要がある
- 長期的にメンテナンスが続く

---

## 従来の開発との違い

### 開発フローの比較

```
┌─────────────────────────────────────────────────────────────────┐
│  従来の開発フロー                                                 │
│                                                                  │
│  要件定義 → 設計書 → 実装 → テスト → ドキュメント                   │
│     ↓         ↓        ↓       ↓          ↓                     │
│   Word     UML図   TypeScript  Jest    Markdown                  │
│                                                                  │
│  問題: 各成果物がバラバラ、同期が困難                               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  MPSでの開発フロー                                                │
│                                                                  │
│  DSLで仕様記述 ──────► 全て自動生成                               │
│       │                    │                                     │
│       │                    ├──► 実装コード                        │
│       │                    ├──► テストコード                       │
│       │                    ├──► ドキュメント                       │
│       │                    └──► スキーマ                          │
│       │                                                          │
│       └── 単一の情報源 (Single Source of Truth)                   │
│                                                                  │
│  利点: 全て同期、矛盾なし                                          │
└─────────────────────────────────────────────────────────────────┘
```

### 役割分担の変化

| 役割 | 従来 | MPS導入後 |
|-----|------|----------|
| ビジネス担当 | 要件を文書化 | DSLで直接ルール記述 |
| 設計者 | 設計書作成 | DSL言語設計 |
| 開発者 | 実装・テスト | Generator実装 |
| 運用者 | ドキュメント参照 | DSLを直接参照 |

### Gherkinとの違い

よく比較される Gherkin（Cucumber）との違い:

| 項目 | Gherkin | MPS |
|-----|---------|-----|
| 本質 | 既製のDSL | DSLを作るツール |
| 文法 | 固定（Given/When/Then） | 自由に設計 |
| 用途 | テスト仕様のみ | 任意のドメイン |
| 出力 | テストコード | 何でも生成可能 |
| 型安全性 | なし | あり |
| エラー検出 | 実行時 | 編集時 |

---

## MPSの設計思想

### 1. 言語指向プログラミング (LOP)

> 「問題に言語を合わせる」のではなく「言語を問題に合わせる」

従来: 汎用言語で問題を表現（言語に合わせる）
MPS: 問題に最適な言語を作る（問題に合わせる）

### 2. 抽象度の階層化

```
高  │  ビジネスルールDSL    ← ドメイン専門家が使う
    │       ↓ 生成
    │  アプリケーションDSL   ← アーキテクトが使う  
    │       ↓ 生成
    │  実装コード            ← 自動生成
低  │
```

### 3. 関心の分離

MPSでは言語を6つの側面に分けて定義:

| 側面 | 役割 | 担当 |
|-----|------|------|
| Structure | 「何があるか」の定義 | 言語設計者 |
| Editor | 「どう見えるか」の定義 | UXデザイナー |
| Type System | 「型チェック」の定義 | 言語設計者 |
| Constraints | 「制約」の定義 | 言語設計者 |
| Behavior | 「振る舞い」の定義 | 言語設計者 |
| Generator | 「何を生成するか」の定義 | 開発者 |

### 4. 段階的な採用

いきなり全てをDSL化する必要はない:

```
Step 1: 設定ファイルをDSL化
Step 2: ボイラープレートをDSL化  
Step 3: ビジネスルールをDSL化
Step 4: ドメイン全体をDSL化
```

---

## 実装例

このリポジトリには2つの実装例があります。

### 実装例1: Drawing App DSL

リアルタイム描画アプリのバックエンドを自動生成するDSL。

**自動生成対象**:
- ✅ データモデル（User, Room, Drawing）
- ✅ REST API（CRUD操作）
- ✅ 認証・認可（JWT）
- ✅ ビジネスルール
- ✅ データベーススキーマ（Prisma）
- ✅ API仕様書（OpenAPI）

**DSL例**:
```
Application DrawingApp {
  Model User {
    - id: UUID @primary
    - email: String @unique
    - role: Enum(User, Admin)
  }
  
  Resource Rooms @auth {
    GET / -> rooms[]
    POST / (title, theme) -> room
  }
  
  Rule AutoStart {
    When: participants >= 2
    Then: status = Active
  }
}
```

📖 詳細: [docs/drawing-app-dsl-design.md](docs/drawing-app-dsl-design.md)

### 実装例2: MBF（MPS Binary Format）

高性能バイナリプロトコルをDSLから自動生成。

**成果**:
- JSON比 **85%サイズ削減**
- Rust NIF による高速処理
- TypeScript/Elixir 双方向互換

**DSL例**:
```
protocol MPSBinaryFormat {
  types {
    Point { x: u16, y: u16 }
    Color { r: u8, g: u8, b: u8 }
  }
  
  messages {
    StrokeSync (0x10) {
      color: Color
      points: Point[]
    }
  }
}
```

**自動生成**:
- Rust NIF（Elixir向け）
- TypeScript Codec（Frontend向け）
- Elixir Wrapper

📖 詳細: [docs/mbf-architecture.md](docs/mbf-architecture.md)

---

## クイックスタート

### 必要環境

- Node.js 18+
- Docker & Docker Compose
- （オプション）JetBrains MPS 2023.2+

### 起動手順

```bash
# 1. クローン
git clone https://github.com/makoto-developer/mps.git
cd mps

# 2. 環境変数設定
cp .env.example .env

# 3. Docker起動
docker-compose up -d

# 4. 確認
curl http://localhost:22303/api/health
# {"status":"ok","service":"signaling"}
```

### ポート構成

| ポート | サービス |
|-------|---------|
| 22301 | Backend (Express) |
| 22302 | PostgreSQL |
| 22303 | Phoenix Signaling |
| 22304 | TURN Server |
| 22305 | PGAdmin |

### Makefileコマンド

```bash
make help           # コマンド一覧
make setup          # 初期セットアップ
make docker-deploy  # Docker完全デプロイ
make test           # テスト実行
```

---

## プロジェクト構成

```
mps/
├── frontend/           # Next.js フロントエンド
├── phoenix/            # Phoenix シグナリングサーバー
│   ├── lib/mbf/        # MBF Elixir モジュール
│   └── native/mbf_nif/ # Rust NIF
├── backend/            # Express バックエンド（生成先）
├── mps-protocol/       # MPS プロトコル定義
├── docs/               # ドキュメント
└── docker-compose.yml
```

---

## 参考資料

### 公式

- [JetBrains MPS](https://www.jetbrains.com/mps/)
- [MPS User Guide](https://www.jetbrains.com/help/mps/)
- [Fast Track to MPS](https://www.jetbrains.com/help/mps/fast-track-to-mps.html)

### コミュニティ

- [MPS Forum](https://mps-support.jetbrains.com/)
- [MPS Slack](https://jetbrains-mps.slack.com/)
- [GitHub](https://github.com/JetBrains/MPS)

### 書籍

- "The MPS Language Workbench" - Markus Voelter
- "DSL Engineering" - Markus Voelter

### このリポジトリのドキュメント

- [MBFアーキテクチャ](docs/mbf-architecture.md)
- [DSL設計書](docs/drawing-app-dsl-design.md)
- [実装ガイド](docs/drawing-app-dsl-implementation-guide.md)
- [デプロイメント](DEPLOYMENT.md)
