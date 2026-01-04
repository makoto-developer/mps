# Drawing App DSL 設計書

## 概要

リアルタイムお絵描きアプリケーションのバックエンドを自動生成するためのDSL（ドメイン特化言語）

## DSLの役割

### ✅ DSLで定義・自動生成する部分

- データモデル（User, Room, Drawing, DrawingStroke等）
- 認証・認可システム
- REST API（CRUD操作）
- ビジネスルール（セッション開始条件、権限管理等）
- データベーススキーマ
- API仕様書

### ❌ 別途実装が必要な部分

- フロントエンドUI（React/Vue）
- Canvas描画エンジン
- WebSocket通信（リアルタイム同期）
- お絵描きツール（ペン、消しゴム、塗りつぶし等）

---

## 言語構成要素

### 1. Structure（文法定義）

#### 1-1. Model（データモデル）

```
Concept: Model
  - name: String
  - fields: Field[]
  - relationships: Relationship[]

Concept: Field
  - name: String
  - type: FieldType (String, Integer, Boolean, DateTime, UUID, JSON, Enum)
  - constraints: Constraint[] (required, unique, min, max, etc.)

Concept: Relationship
  - type: RelationType (OneToOne, OneToMany, ManyToOne, ManyToMany)
  - target: Model
  - foreignKey: String
```

#### 1-2. Resource（REST API定義）

```
Concept: Resource
  - name: String
  - basePath: String
  - endpoints: Endpoint[]

Concept: Endpoint
  - method: HttpMethod (GET, POST, PUT, DELETE, PATCH)
  - path: String
  - auth: AuthRequirement (None, User, Admin)
  - handler: HandlerLogic
  - validation: ValidationRule[]
```

#### 1-3. Auth（認証定義）

```
Concept: AuthSystem
  - strategy: AuthStrategy (JWT, Session, OAuth)
  - userModel: Model
  - passwordField: String
  - roles: Role[]

Concept: Role
  - name: String
  - permissions: Permission[]
```

#### 1-4. BusinessRule（ビジネスルール）

```
Concept: BusinessRule
  - name: String
  - trigger: Trigger (OnCreate, OnUpdate, OnDelete, OnCondition)
  - condition: Condition
  - actions: Action[]

Concept: Condition
  - type: ConditionType (Comparison, Count, Exists, etc.)
  - expression: Expression

Concept: Action
  - type: ActionType (Update, Create, Delete, Notify, etc.)
  - target: Model
  - parameters: Parameter[]
```

---

## Drawing App ドメインモデル

### モデル定義

```
Model: User
  Fields:
    - id: UUID (primary key, auto-generated)
    - email: String (required, unique)
    - password: Hash (required)
    - nickname: String (required)
    - role: Enum(User, Admin) (default: User)
    - isBlocked: Boolean (default: false)
    - createdAt: DateTime (auto-generated)
    - updatedAt: DateTime (auto-generated)

  Relationships:
    - rooms: Room[] (OneToMany, createdBy)
    - participations: RoomParticipant[] (OneToMany)
    - drawings: DrawingStroke[] (OneToMany)

Model: Room
  Fields:
    - id: UUID (primary key, auto-generated)
    - title: String (required)
    - theme: String (required, description: "お題")
    - status: Enum(Waiting, Active, Ended) (default: Waiting)
    - minParticipants: Integer (default: 2)
    - maxParticipants: Integer (default: 10)
    - createdAt: DateTime (auto-generated)
    - updatedAt: DateTime (auto-generated)

  Relationships:
    - createdBy: User (ManyToOne)
    - participants: RoomParticipant[] (OneToMany)
    - board: DrawingBoard (OneToOne)

Model: RoomParticipant
  Fields:
    - id: UUID (primary key, auto-generated)
    - joinedAt: DateTime (auto-generated)
    - leftAt: DateTime (nullable)
    - isActive: Boolean (default: true)

  Relationships:
    - room: Room (ManyToOne)
    - user: User (ManyToOne)

Model: DrawingBoard
  Fields:
    - id: UUID (primary key, auto-generated)
    - width: Integer (default: 1920)
    - height: Integer (default: 1080)
    - backgroundColor: String (default: "#FFFFFF")
    - createdAt: DateTime (auto-generated)
    - updatedAt: DateTime (auto-generated)

  Relationships:
    - room: Room (OneToOne)
    - layers: DrawingLayer[] (OneToMany)

Model: DrawingLayer
  Fields:
    - id: UUID (primary key, auto-generated)
    - name: String (required)
    - order: Integer (required)
    - isVisible: Boolean (default: true)
    - opacity: Float (default: 1.0, min: 0.0, max: 1.0)
    - createdAt: DateTime (auto-generated)

  Relationships:
    - board: DrawingBoard (ManyToOne)
    - strokes: DrawingStroke[] (OneToMany)

Model: DrawingStroke
  Fields:
    - id: UUID (primary key, auto-generated)
    - tool: Enum(Pen, Eraser, Fill, Line, Rectangle, Circle) (required)
    - color: String (required, format: hex color)
    - width: Integer (required, min: 1, max: 100)
    - points: JSON (required, description: "描画座標の配列")
    - timestamp: DateTime (auto-generated)

  Relationships:
    - layer: DrawingLayer (ManyToOne)
    - user: User (ManyToOne)

Model: DrawingHistory
  Fields:
    - id: UUID (primary key, auto-generated)
    - action: Enum(Draw, Erase, Undo, Redo, Clear, Fill)
    - strokeData: JSON
    - timestamp: DateTime (auto-generated)

  Relationships:
    - board: DrawingBoard (ManyToOne)
    - user: User (ManyToOne)
```

---

## REST API定義

### 認証API

```
Resource: Auth
  BasePath: /api/auth

  Endpoint: Register
    Method: POST
    Path: /register
    Auth: None
    Request:
      - email: String (required, email format)
      - password: String (required, min: 8)
      - nickname: String (required, min: 2, max: 20)
    Response:
      - user: User (exclude: password)
      - token: JWT

  Endpoint: Login
    Method: POST
    Path: /login
    Auth: None
    Request:
      - email: String (required)
      - password: String (required)
    Response:
      - user: User (exclude: password)
      - token: JWT

  Endpoint: Logout
    Method: POST
    Path: /logout
    Auth: User
    Response:
      - success: Boolean

  Endpoint: GetCurrentUser
    Method: GET
    Path: /me
    Auth: User
    Response:
      - user: User (exclude: password)
```

### ルームAPI

```
Resource: Rooms
  BasePath: /api/rooms

  Endpoint: ListRooms
    Method: GET
    Path: /
    Auth: User
    Query:
      - status: Enum(Waiting, Active, Ended) (optional)
      - page: Integer (default: 1)
      - limit: Integer (default: 20)
    Response:
      - rooms: Room[] (include: createdBy, participants count)
      - total: Integer
      - page: Integer
      - limit: Integer

  Endpoint: CreateRoom
    Method: POST
    Path: /
    Auth: User
    Request:
      - title: String (required)
      - theme: String (required)
      - maxParticipants: Integer (optional, default: 10)
    Response:
      - room: Room (include: createdBy)

  Endpoint: GetRoom
    Method: GET
    Path: /:id
    Auth: User
    Response:
      - room: Room (include: createdBy, participants, board)

  Endpoint: DeleteRoom
    Method: DELETE
    Path: /:id
    Auth: Admin OR RoomCreator
    Response:
      - success: Boolean

  Endpoint: JoinRoom
    Method: POST
    Path: /:id/join
    Auth: User
    Response:
      - participant: RoomParticipant

  Endpoint: LeaveRoom
    Method: POST
    Path: /:id/leave
    Auth: User
    Response:
      - success: Boolean

  Endpoint: GetParticipants
    Method: GET
    Path: /:id/participants
    Auth: User (must be participant)
    Response:
      - participants: RoomParticipant[] (include: user)
```

### ユーザー管理API（管理者用）

```
Resource: Users
  BasePath: /api/users

  Endpoint: ListUsers
    Method: GET
    Path: /
    Auth: Admin
    Query:
      - page: Integer (default: 1)
      - limit: Integer (default: 20)
      - isBlocked: Boolean (optional)
    Response:
      - users: User[] (exclude: password, email for non-admin)
      - total: Integer

  Endpoint: BlockUser
    Method: PUT
    Path: /:id/block
    Auth: Admin
    Request:
      - isBlocked: Boolean (required)
    Response:
      - user: User (exclude: password)

  Endpoint: GetUserCurrentRoom
    Method: GET
    Path: /:id/current-room
    Auth: Admin
    Response:
      - room: Room (nullable)
      - participant: RoomParticipant (nullable)
```

### お絵描きAPI

```
Resource: Drawing
  BasePath: /api/rooms/:roomId/drawing

  Endpoint: GetBoard
    Method: GET
    Path: /board
    Auth: User (must be participant)
    Response:
      - board: DrawingBoard (include: layers, strokes)

  Endpoint: GetHistory
    Method: GET
    Path: /history
    Auth: Admin OR RoomCreator
    Query:
      - userId: UUID (optional)
      - from: DateTime (optional)
      - to: DateTime (optional)
    Response:
      - history: DrawingHistory[] (include: user)

  Endpoint: ResizeBoard
    Method: PUT
    Path: /board/resize
    Auth: User (must be participant)
    Request:
      - width: Integer (required, min: 800, max: 4000)
      - height: Integer (required, min: 600, max: 4000)
    Response:
      - board: DrawingBoard

  Endpoint: CreateLayer
    Method: POST
    Path: /layers
    Auth: User (must be participant)
    Request:
      - name: String (required)
    Response:
      - layer: DrawingLayer

  Endpoint: UpdateLayer
    Method: PUT
    Path: /layers/:layerId
    Auth: User (must be participant)
    Request:
      - name: String (optional)
      - isVisible: Boolean (optional)
      - opacity: Float (optional)
    Response:
      - layer: DrawingLayer

  Endpoint: DeleteLayer
    Method: DELETE
    Path: /layers/:layerId
    Auth: User (must be participant)
    Response:
      - success: Boolean
```

---

## ビジネスルール

### ルール1: セッション自動開始

```
Rule: AutoStartSession
  Trigger: OnCreate(RoomParticipant)
  Condition:
    - Room.participants.count ≥ Room.minParticipants
    - Room.status = Waiting
  Actions:
    - Update Room.status = Active
    - Create DrawingBoard for Room
    - Create default DrawingLayer
```

### ルール2: ブロックされたユーザーのアクセス制限

```
Rule: BlockedUserRestriction
  Trigger: OnRequest
  Condition:
    - User.isBlocked = true
  Actions:
    - Return 403 Forbidden
    - Disconnect from all rooms
```

### ルール3: 描画履歴の自動保存

```
Rule: SaveDrawingHistory
  Trigger: OnCreate(DrawingStroke)
  Actions:
    - Create DrawingHistory
      - action = Draw
      - strokeData = DrawingStroke (as JSON)
      - user = current user
      - board = current board
```

### ルール4: ルーム作成者権限

```
Rule: RoomCreatorPermissions
  Trigger: OnRequest(DELETE /api/rooms/:id)
  Condition:
    - User.role = Admin OR Room.createdBy = User
  Actions:
    - Allow request
  Else:
    - Return 403 Forbidden
```

### ルール5: ルーム参加者のみアクセス

```
Rule: ParticipantOnlyAccess
  Trigger: OnRequest(/api/rooms/:roomId/drawing/*)
  Condition:
    - User is participant of Room
  Actions:
    - Allow request
  Else:
    - Return 403 Forbidden
```

---

## Generator仕様

### 出力1: Prisma Schema

```prisma
// Generated from Drawing App DSL

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String              @id @default(uuid())
  email         String              @unique
  password      String
  nickname      String
  role          Role                @default(USER)
  isBlocked     Boolean             @default(false)
  createdAt     DateTime            @default(now())
  updatedAt     DateTime            @updatedAt

  rooms         Room[]              @relation("RoomCreator")
  participations RoomParticipant[]
  drawings      DrawingStroke[]
  history       DrawingHistory[]
}

enum Role {
  USER
  ADMIN
}

model Room {
  id              String              @id @default(uuid())
  title           String
  theme           String
  status          RoomStatus          @default(WAITING)
  minParticipants Int                 @default(2)
  maxParticipants Int                 @default(10)
  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt

  createdById     String
  createdBy       User                @relation("RoomCreator", fields: [createdById], references: [id])
  participants    RoomParticipant[]
  board           DrawingBoard?
}

enum RoomStatus {
  WAITING
  ACTIVE
  ENDED
}

// ... 残りのモデル定義
```

### 出力2: Express Routes

```typescript
// Generated from Drawing App DSL

import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminMiddleware } from '../middleware/admin.middleware';

const router = Router();
const authController = new AuthController();

// Auth Routes
router.post('/api/auth/register', authController.register);
router.post('/api/auth/login', authController.login);
router.post('/api/auth/logout', authMiddleware, authController.logout);
router.get('/api/auth/me', authMiddleware, authController.getCurrentUser);

// Room Routes
router.get('/api/rooms', authMiddleware, roomController.listRooms);
router.post('/api/rooms', authMiddleware, roomController.createRoom);
router.get('/api/rooms/:id', authMiddleware, roomController.getRoom);
router.delete('/api/rooms/:id', authMiddleware, roomController.deleteRoom);
router.post('/api/rooms/:id/join', authMiddleware, roomController.joinRoom);
router.post('/api/rooms/:id/leave', authMiddleware, roomController.leaveRoom);

// User Management Routes (Admin)
router.get('/api/users', authMiddleware, adminMiddleware, userController.listUsers);
router.put('/api/users/:id/block', authMiddleware, adminMiddleware, userController.blockUser);

// ... 残りのルート定義

export default router;
```

### 出力3: Controllers

```typescript
// Generated from Drawing App DSL

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export class AuthController {
  async register(req: Request, res: Response) {
    try {
      const { email, password, nickname } = req.body;

      // Validation
      if (!email || !password || !nickname) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          nickname
        }
      });

      // Generate JWT
      const token = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      );

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;

      res.status(201).json({
        user: userWithoutPassword,
        token
      });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // ... 残りのメソッド
}
```

### 出力4: Middleware

```typescript
// Generated from Drawing App DSL

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user || user.isBlocked) {
      return res.status(403).json({ error: 'Access denied' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

export async function adminMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}
```

### 出力5: API仕様書（OpenAPI）

```yaml
# Generated from Drawing App DSL

openapi: 3.0.0
info:
  title: Drawing App API
  version: 1.0.0
  description: リアルタイムお絵描きアプリケーションAPI

paths:
  /api/auth/register:
    post:
      summary: ユーザー登録
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - email
                - password
                - nickname
              properties:
                email:
                  type: string
                  format: email
                password:
                  type: string
                  minLength: 8
                nickname:
                  type: string
                  minLength: 2
                  maxLength: 20
      responses:
        '201':
          description: 登録成功
          content:
            application/json:
              schema:
                type: object
                properties:
                  user:
                    $ref: '#/components/schemas/User'
                  token:
                    type: string
        '400':
          description: バリデーションエラー

  # ... 残りのエンドポイント定義

components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: string
          format: uuid
        email:
          type: string
        nickname:
          type: string
        role:
          type: string
          enum: [USER, ADMIN]
        isBlocked:
          type: boolean
        createdAt:
          type: string
          format: date-time
```

---

## DSL使用例

```
// Drawing App DSL サンプル

Application: DrawingApp {
  Database: PostgreSQL
  Port: 3000

  // データモデル定義
  Models {
    User {
      id: UUID @primary @auto
      email: String @unique @required
      password: Hash @required
      nickname: String @required
      role: Enum(User, Admin) @default(User)
      isBlocked: Boolean @default(false)
    }

    Room {
      id: UUID @primary @auto
      title: String @required
      theme: String @required
      status: Enum(Waiting, Active, Ended) @default(Waiting)
      minParticipants: Integer @default(2)
      maxParticipants: Integer @default(10)
      createdBy: User @relation
    }

    // ... 残りのモデル
  }

  // API定義
  Resources {
    Auth {
      POST /register (email, password, nickname) -> (user, token)
      POST /login (email, password) -> (user, token)
      POST /logout @auth -> success
      GET /me @auth -> user
    }

    Rooms @auth {
      GET / -> rooms[]
      POST / (title, theme) -> room
      GET /:id -> room
      DELETE /:id @owner-or-admin -> success
      POST /:id/join -> participant
      POST /:id/leave -> success
    }

    Users @admin {
      GET / -> users[]
      PUT /:id/block (isBlocked) -> user
      GET /:id/current-room -> room
    }
  }

  // ビジネスルール定義
  Rules {
    AutoStartSession {
      When: RoomParticipant.created
      If: Room.participants.count >= Room.minParticipants
         AND Room.status == Waiting
      Then:
        - Set Room.status = Active
        - Create DrawingBoard for Room
        - Create default DrawingLayer
    }

    BlockedUserRestriction {
      When: Request
      If: User.isBlocked == true
      Then: Return 403 Forbidden
    }

    SaveDrawingHistory {
      When: DrawingStroke.created
      Then: Create DrawingHistory with stroke data
    }
  }
}
```

---

## 次のステップ

### 1. MPS実装

1. MPSで新しいLanguageプロジェクト作成
2. Structure定義（上記のConcept定義を実装）
3. Editor定義（DSL構文の見た目）
4. Generator定義（TypeScript/Node.js、Prisma生成）
5. テスト

### 2. 生成コードの検証

1. 生成されたバックエンドコードをビルド
2. データベースマイグレーション実行
3. API動作確認
4. テスト実行

### 3. フロントエンド実装（別途）

1. React + TypeScript
2. Socket.io Client
3. Canvas描画エンジン
4. お絵描きツールUI

---

## まとめ

このDSLにより：

- **バックエンドコードの80%以上を自動生成**
- **ビジネスルールが明確で変更容易**
- **API仕様が常に最新**
- **型安全で保守性が高い**

フロントエンドやリアルタイム機能は別途実装が必要だが、バックエンドの基盤は完全に自動化される。
