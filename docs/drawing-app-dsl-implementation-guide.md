# Drawing App DSL 実装ガイド

## 前提条件

- JetBrains MPS 2023.2以降がインストールされている
- JDK 17がインストールされている
- このリポジトリをクローン済み

---

## Step 1: MPSプロジェクト作成

### 1-1. MPSを起動

```bash
# JetBrains Toolboxからm、またはアプリケーションから起動
```

### 1-2. 新しいプロジェクト作成

1. File → New → Project
2. "Language" を選択
3. Project name: `DrawingAppDSL`
4. Project location: このリポジトリのディレクトリ
5. Create

### 1-3. プロジェクト構造

作成されるディレクトリ構造：

```
mps/
├── languages/
│   └── com.drawingapp.dsl/
│       ├── models/
│       │   ├── structure.mps      # 文法定義
│       │   ├── editor.mps         # エディタ定義
│       │   ├── behavior.mps       # 振る舞い定義
│       │   ├── constraints.mps    # 制約定義
│       │   ├── typesystem.mps     # 型システム
│       │   └── generator/
│       │       └── templates.mps  # 生成テンプレート
│       ├── DrawingAppDSL.mpl      # 言語記述子
│       └── build.xml              # ビルド設定
├── solutions/
│   └── com.drawingapp.dsl.sandbox/
│       └── models/
│           └── example.mps        # サンプルDSLコード
└── build/                         # 生成されたコード
```

---

## Step 2: Structure定義（文法）

### 2-1. Structureモデルを開く

1. Project Tool Window → languages → com.drawingapp.dsl → models
2. `structure.mps` をダブルクリック

### 2-2. Concept: Application を作成

```
右クリック → New → Concept

Name: Application
Interface: no
Abstract: no
Root Concept: yes (これが重要！)
```

**Properties:**
- name: string
- database: string (default: "PostgreSQL")
- port: integer (default: 3000)

**Children:**
- models: Model (0..n)
- resources: Resource (0..n)
- rules: BusinessRule (0..n)

### 2-3. Concept: Model を作成

```
Name: Model
Interface: no
Abstract: no
```

**Properties:**
- name: string

**Children:**
- fields: Field (0..n)
- relationships: Relationship (0..n)

### 2-4. Concept: Field を作成

```
Name: Field
Interface: no
Abstract: no
```

**Properties:**
- name: string
- type: FieldType (enum)
- isRequired: boolean (default: false)
- isUnique: boolean (default: false)
- defaultValue: string (optional)

**Enumerations (FieldType):**
- String
- Integer
- Boolean
- DateTime
- UUID
- JSON
- Float
- Hash

### 2-5. Concept: Relationship を作成

```
Name: Relationship
Interface: no
Abstract: no
```

**Properties:**
- name: string
- type: RelationType (enum)

**References:**
- target: Model

**Enumerations (RelationType):**
- OneToOne
- OneToMany
- ManyToOne
- ManyToMany

### 2-6. Concept: Resource を作成

```
Name: Resource
Interface: no
Abstract: no
```

**Properties:**
- name: string
- basePath: string

**Children:**
- endpoints: Endpoint (0..n)

### 2-7. Concept: Endpoint を作成

```
Name: Endpoint
Interface: no
Abstract: no
```

**Properties:**
- method: HttpMethod (enum)
- path: string
- authRequired: boolean (default: true)
- adminOnly: boolean (default: false)

**Children:**
- requestFields: RequestField (0..n)
- responseFields: ResponseField (0..n)

**Enumerations (HttpMethod):**
- GET
- POST
- PUT
- DELETE
- PATCH

### 2-8. Concept: BusinessRule を作成

```
Name: BusinessRule
Interface: no
Abstract: no
```

**Properties:**
- name: string
- trigger: TriggerType (enum)

**Children:**
- condition: Condition (0..1)
- actions: Action (0..n)

**Enumerations (TriggerType):**
- OnCreate
- OnUpdate
- OnDelete
- OnRequest

---

## Step 3: Editor定義（見た目）

### 3-1. Editorモデルを開く

1. `editor.mps` をダブルクリック

### 3-2. Application Editorを作成

```
右クリック → New → Editor

Node: Application

Editor定義:
[- Application %name% -]
  Database: %database%
  Port: %port%

  Models:
    %models%

  Resources:
    %resources%

  Rules:
    %rules%
[-----------------------]
```

**セル定義:**

- `%name%` → Property Cell (property: name)
- `%database%` → Property Cell (property: database)
- `%port%` → Property Cell (property: port)
- `%models%` → Collection Cell (children: models)
- `%resources%` → Collection Cell (children: resources)
- `%rules%` → Collection Cell (children: rules)

### 3-3. Model Editorを作成

```
Editor定義:
Model %name% {
  Fields:
    %fields%

  Relationships:
    %relationships%
}
```

### 3-4. Field Editorを作成

```
Editor定義:
- %name%: %type% [@required] [@unique] [@default(%defaultValue%)]

セル定義:
- [@required] → Conditional Cell (show if: isRequired == true)
- [@unique] → Conditional Cell (show if: isUnique == true)
- [@default(...)] → Conditional Cell (show if: defaultValue != null)
```

### 3-5. Resource Editorを作成

```
Editor定義:
Resource %name% {
  BasePath: %basePath%

  Endpoints:
    %endpoints%
}
```

### 3-6. Endpoint Editorを作成

```
Editor定義:
%method% %path% [@auth] [@admin]
  Request:
    %requestFields%
  Response:
    %responseFields%

セル定義:
- [@auth] → Conditional Cell (show if: authRequired == true)
- [@admin] → Conditional Cell (show if: adminOnly == true)
```

---

## Step 4: Generator定義（コード生成）

### 4-1. Generatorモデルを開く

1. generator → `templates.mps` をダブルクリック

### 4-2. Template: Prisma Schema を作成

```
右クリック → New → Template

Name: PrismaSchemaTemplate
Input: Application
Output: prisma/schema.prisma
```

**テンプレートコード:**

```
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

$LOOP$ models $ENDLOOP$
model $MODEL_NAME$ {
  $LOOP$ fields $ENDLOOP$
  $FIELD_NAME$ $FIELD_TYPE$ $FIELD_CONSTRAINTS$
  $ENDLOOP$

  $LOOP$ relationships $ENDLOOP$
  $RELATIONSHIP_NAME$ $RELATIONSHIP_TYPE$ $RELATIONSHIP_TARGET$
  $ENDLOOP$
}
$ENDLOOP$
```

**マクロ定義:**

- `$MODEL_NAME$` → model.name
- `$FIELD_NAME$` → field.name
- `$FIELD_TYPE$` → mapFieldType(field.type)
- `$FIELD_CONSTRAINTS$` → generateConstraints(field)
- `$RELATIONSHIP_NAME$` → relationship.name
- `$RELATIONSHIP_TYPE$` → mapRelationshipType(relationship.type)
- `$RELATIONSHIP_TARGET$` → relationship.target.name

### 4-3. Template: Express Routes を作成

```
Name: ExpressRoutesTemplate
Input: Resource
Output: routes/${resource.name.toLowerCase()}.routes.ts
```

**テンプレートコード:**

```typescript
import { Router } from 'express';
import { ${MODEL_NAME}Controller } from '../controllers/${model.name.toLowerCase()}.controller';
$IF$ authRequired $ENDIF$
import { authMiddleware } from '../middleware/auth.middleware';
$ENDIF$

const router = Router();
const controller = new ${MODEL_NAME}Controller();

$LOOP$ endpoints $ENDLOOP$
router.$HTTP_METHOD$('$PATH$'$IF$ authRequired $ENDIF$, authMiddleware$ENDIF$, controller.$HANDLER_NAME$);
$ENDLOOP$

export default router;
```

### 4-4. Template: Controllers を作成

```
Name: ControllerTemplate
Input: Resource
Output: controllers/${resource.name.toLowerCase()}.controller.ts
```

**テンプレートコード:**

```typescript
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class ${RESOURCE_NAME}Controller {
  $LOOP$ endpoints $ENDLOOP$
  async $HANDLER_NAME$(req: Request, res: Response) {
    try {
      $GENERATE_HANDLER_LOGIC$
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  $ENDLOOP$
}
```

### 4-5. Mapping Functions（補助関数）

Generator内にJavaコードを追加：

```java
// models/generator/mapping.mps

public class TypeMapping {
  public static String mapFieldType(String mpsType) {
    switch(mpsType) {
      case "String": return "String";
      case "Integer": return "Int";
      case "Boolean": return "Boolean";
      case "DateTime": return "DateTime";
      case "UUID": return "String @id @default(uuid())";
      case "JSON": return "Json";
      case "Float": return "Float";
      case "Hash": return "String";
      default: return "String";
    }
  }

  public static String mapRelationshipType(String relType) {
    switch(relType) {
      case "OneToOne": return "";
      case "OneToMany": return "[]";
      case "ManyToOne": return "";
      case "ManyToMany": return "[]";
      default: return "";
    }
  }

  public static String generateConstraints(Field field) {
    StringBuilder constraints = new StringBuilder();

    if (field.isRequired) {
      constraints.append("@required ");
    }
    if (field.isUnique) {
      constraints.append("@unique ");
    }
    if (field.defaultValue != null) {
      constraints.append("@default(").append(field.defaultValue).append(") ");
    }

    return constraints.toString().trim();
  }
}
```

---

## Step 5: Sandboxでサンプル作成

### 5-1. Solutionを作成

1. solutions → New → Solution
2. Name: `com.drawingapp.dsl.sandbox`

### 5-2. サンプルDSLコードを記述

`example.mps` を作成：

```
Application DrawingApp {
  Database: PostgreSQL
  Port: 3000

  Models:
    Model User {
      Fields:
        - id: UUID @required
        - email: String @required @unique
        - password: Hash @required
        - nickname: String @required
        - role: Enum(User, Admin) @default(User)
        - isBlocked: Boolean @default(false)

      Relationships:
        - rooms: Room OneToMany
        - drawings: DrawingStroke OneToMany
    }

    Model Room {
      Fields:
        - id: UUID @required
        - title: String @required
        - theme: String @required
        - status: Enum(Waiting, Active, Ended) @default(Waiting)
        - minParticipants: Integer @default(2)
        - maxParticipants: Integer @default(10)

      Relationships:
        - createdBy: User ManyToOne
        - participants: RoomParticipant OneToMany
        - board: DrawingBoard OneToOne
    }

    Model DrawingBoard {
      Fields:
        - id: UUID @required
        - width: Integer @default(1920)
        - height: Integer @default(1080)
        - backgroundColor: String @default("#FFFFFF")

      Relationships:
        - room: Room OneToOne
        - layers: DrawingLayer OneToMany
    }

    Model DrawingLayer {
      Fields:
        - id: UUID @required
        - name: String @required
        - order: Integer @required
        - isVisible: Boolean @default(true)
        - opacity: Float @default(1.0)

      Relationships:
        - board: DrawingBoard ManyToOne
        - strokes: DrawingStroke OneToMany
    }

    Model DrawingStroke {
      Fields:
        - id: UUID @required
        - tool: Enum(Pen, Eraser, Fill) @required
        - color: String @required
        - width: Integer @required
        - points: JSON @required
        - timestamp: DateTime @required

      Relationships:
        - layer: DrawingLayer ManyToOne
        - user: User ManyToOne
    }

  Resources:
    Resource Auth {
      BasePath: /api/auth

      Endpoints:
        POST /register
          Request:
            - email: String
            - password: String
            - nickname: String
          Response:
            - user: User
            - token: String

        POST /login
          Request:
            - email: String
            - password: String
          Response:
            - user: User
            - token: String

        POST /logout @auth
          Response:
            - success: Boolean

        GET /me @auth
          Response:
            - user: User
    }

    Resource Rooms {
      BasePath: /api/rooms

      Endpoints:
        GET / @auth
          Response:
            - rooms: Room[]

        POST / @auth
          Request:
            - title: String
            - theme: String
          Response:
            - room: Room

        DELETE /:id @auth
          Response:
            - success: Boolean

        POST /:id/join @auth
          Response:
            - participant: RoomParticipant
    }

    Resource Users {
      BasePath: /api/users

      Endpoints:
        GET / @auth @admin
          Response:
            - users: User[]

        PUT /:id/block @auth @admin
          Request:
            - isBlocked: Boolean
          Response:
            - user: User
    }

  Rules:
    Rule AutoStartSession {
      Trigger: OnCreate(RoomParticipant)
      Condition:
        Room.participants.count >= Room.minParticipants
        AND Room.status == Waiting
      Actions:
        - Set Room.status = Active
        - Create DrawingBoard for Room
        - Create default DrawingLayer
    }

    Rule BlockedUserRestriction {
      Trigger: OnRequest
      Condition:
        User.isBlocked == true
      Actions:
        - Return 403 Forbidden
    }

    Rule SaveDrawingHistory {
      Trigger: OnCreate(DrawingStroke)
      Actions:
        - Create DrawingHistory with stroke data
    }
}
```

---

## Step 6: Build & Generate

### 6-1. プロジェクトをビルド

1. Build → Build Project (Ctrl+F9)
2. エラーがないか確認

### 6-2. コード生成

1. Build → Make (Ctrl+Shift+F9)
2. `build/` ディレクトリに生成されたコードを確認

### 6-3. 生成されるファイル

```
build/
├── prisma/
│   └── schema.prisma          # Prismaスキーマ
├── routes/
│   ├── auth.routes.ts         # 認証ルート
│   ├── rooms.routes.ts        # ルームルート
│   └── users.routes.ts        # ユーザールート
├── controllers/
│   ├── auth.controller.ts     # 認証コントローラ
│   ├── rooms.controller.ts    # ルームコントローラ
│   └── users.controller.ts    # ユーザーコントローラ
├── middleware/
│   ├── auth.middleware.ts     # 認証ミドルウェア
│   └── admin.middleware.ts    # 管理者ミドルウェア
├── models/
│   └── index.ts               # モデル定義
└── docs/
    └── api.yaml               # OpenAPI仕様書
```

---

## Step 7: 生成コードのテスト

### 7-1. Node.jsプロジェクトのセットアップ

```bash
cd build

# package.jsonを作成
npm init -y

# 依存関係をインストール
npm install express @prisma/client bcrypt jsonwebtoken
npm install -D typescript @types/express @types/node prisma ts-node

# TypeScript設定
npx tsc --init
```

### 7-2. Prismaセットアップ

```bash
# .envファイルを作成
echo "DATABASE_URL=postgresql://user:password@localhost:5432/drawingapp" > .env
echo "JWT_SECRET=your-secret-key" >> .env

# マイグレーション実行
npx prisma migrate dev --name init

# Prisma Clientを生成
npx prisma generate
```

### 7-3. サーバー起動

```bash
# app.tsを作成（エントリーポイント）
cat > app.ts << 'EOF'
import express from 'express';
import authRoutes from './routes/auth.routes';
import roomRoutes from './routes/rooms.routes';
import userRoutes from './routes/users.routes';

const app = express();
app.use(express.json());

app.use(authRoutes);
app.use(roomRoutes);
app.use(userRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
EOF

# サーバー起動
npx ts-node app.ts
```

### 7-4. APIテスト

```bash
# ユーザー登録
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","nickname":"TestUser"}'

# ログイン
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# ルーム作成（トークンが必要）
curl -X POST http://localhost:3000/api/rooms \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"title":"テストルーム","theme":"猫を描こう"}'
```

---

## トラブルシューティング

### エラー: "Concept not found"

**原因**: Structure定義が正しくない

**解決策**:
1. Structureモデルを確認
2. Concept名のスペルチェック
3. プロジェクトを再ビルド

### エラー: "Generator failed"

**原因**: Generatorテンプレートにエラーがある

**解決策**:
1. Generatorモデルのログを確認
2. マクロ定義を確認
3. Mapping関数のロジックを確認

### エラー: "Build failed"

**原因**: 依存関係やJDK設定の問題

**解決策**:
1. Project Settings → SDKs でJDK 17を確認
2. Build → Clean Project
3. 再ビルド

---

## 次のステップ

### 1. DSLの拡張

- Validation rulesの追加
- Error handlingの定義
- WebSocket定義の追加

### 2. Generatorの改善

- より詳細なコード生成
- テストコードの自動生成
- Dockerfileの生成

### 3. Editorの改善

- シンタックスハイライト
- コード補完
- リアルタイムバリデーション

### 4. ドキュメント生成

- API仕様書の自動生成
- ER図の自動生成
- シーケンス図の自動生成

---

## まとめ

このガイドに従うことで、Drawing App DSLをMPSで実装し、バックエンドコードを自動生成できます。

**利点**:
- ボイラープレートコードの削減
- ビジネスロジックの可視化
- 型安全性の向上
- メンテナンス性の向上

**制限**:
- フロントエンドは別途実装が必要
- 複雑なビジネスロジックは手動実装
- リアルタイム機能（WebSocket）は別途実装
