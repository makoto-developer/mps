// Drawing App DSL サンプルコード
// このファイルは、MPSで実装するDSLの理想的な構文例です
// 実際にMPSで実装後、この構文でアプリケーションを定義できます

Application DrawingApp {
  // アプリケーション設定
  Database: PostgreSQL
  Port: 3000

  // データモデル定義
  Models {
    // ユーザーモデル
    Model User {
      Fields:
        - id: UUID @primary @auto
        - email: String @required @unique
        - password: Hash @required
        - nickname: String @required
        - role: Enum(User, Admin) @default(User)
        - isBlocked: Boolean @default(false)
        - createdAt: DateTime @auto
        - updatedAt: DateTime @auto

      Relationships:
        - rooms: Room[] @relation("createdBy")
        - participations: RoomParticipant[]
        - drawings: DrawingStroke[]
    }

    // ルームモデル
    Model Room {
      Fields:
        - id: UUID @primary @auto
        - title: String @required
        - theme: String @required @description("お題")
        - status: Enum(Waiting, Active, Ended) @default(Waiting)
        - minParticipants: Integer @default(2)
        - maxParticipants: Integer @default(10)
        - createdAt: DateTime @auto
        - updatedAt: DateTime @auto

      Relationships:
        - createdBy: User @relation("createdBy")
        - participants: RoomParticipant[]
        - board: DrawingBoard?
    }

    // ルーム参加者モデル
    Model RoomParticipant {
      Fields:
        - id: UUID @primary @auto
        - joinedAt: DateTime @auto
        - leftAt: DateTime?
        - isActive: Boolean @default(true)

      Relationships:
        - room: Room
        - user: User
    }

    // お絵描きボードモデル
    Model DrawingBoard {
      Fields:
        - id: UUID @primary @auto
        - width: Integer @default(1920)
        - height: Integer @default(1080)
        - backgroundColor: String @default("#FFFFFF")
        - createdAt: DateTime @auto
        - updatedAt: DateTime @auto

      Relationships:
        - room: Room
        - layers: DrawingLayer[]
    }

    // レイヤーモデル
    Model DrawingLayer {
      Fields:
        - id: UUID @primary @auto
        - name: String @required
        - order: Integer @required
        - isVisible: Boolean @default(true)
        - opacity: Float @default(1.0) @min(0.0) @max(1.0)
        - createdAt: DateTime @auto

      Relationships:
        - board: DrawingBoard
        - strokes: DrawingStroke[]
    }

    // 描画ストロークモデル
    Model DrawingStroke {
      Fields:
        - id: UUID @primary @auto
        - tool: Enum(Pen, Eraser, Fill, Line, Rectangle, Circle) @required
        - color: String @required @format("hex")
        - width: Integer @required @min(1) @max(100)
        - points: JSON @required @description("描画座標の配列")
        - timestamp: DateTime @auto

      Relationships:
        - layer: DrawingLayer
        - user: User
    }

    // 描画履歴モデル（不正行為検出用）
    Model DrawingHistory {
      Fields:
        - id: UUID @primary @auto
        - action: Enum(Draw, Erase, Undo, Redo, Clear, Fill) @required
        - strokeData: JSON @required
        - timestamp: DateTime @auto

      Relationships:
        - board: DrawingBoard
        - user: User
    }
  }

  // REST API定義
  Resources {
    // 認証API
    Resource Auth {
      BasePath: /api/auth

      Endpoints:
        // ユーザー登録
        POST /register {
          Auth: None
          Request:
            - email: String @required @email
            - password: String @required @minLength(8)
            - nickname: String @required @minLength(2) @maxLength(20)
          Response:
            - user: User @exclude(password)
            - token: JWT
        }

        // ログイン
        POST /login {
          Auth: None
          Request:
            - email: String @required
            - password: String @required
          Response:
            - user: User @exclude(password)
            - token: JWT
        }

        // ログアウト
        POST /logout {
          Auth: Required
          Response:
            - success: Boolean
        }

        // 現在のユーザー情報取得
        GET /me {
          Auth: Required
          Response:
            - user: User @exclude(password)
        }
    }

    // ルームAPI
    Resource Rooms {
      BasePath: /api/rooms

      Endpoints:
        // ルーム一覧取得
        GET / {
          Auth: Required
          Query:
            - status: Enum(Waiting, Active, Ended)?
            - page: Integer @default(1)
            - limit: Integer @default(20)
          Response:
            - rooms: Room[] @include(createdBy, participantCount)
            - total: Integer
            - page: Integer
            - limit: Integer
        }

        // ルーム作成
        POST / {
          Auth: Required
          Request:
            - title: String @required
            - theme: String @required
            - maxParticipants: Integer? @default(10)
          Response:
            - room: Room @include(createdBy)
        }

        // ルーム詳細取得
        GET /:id {
          Auth: Required
          Response:
            - room: Room @include(createdBy, participants, board)
        }

        // ルーム削除
        DELETE /:id {
          Auth: Required
          Authorization: Admin OR RoomCreator
          Response:
            - success: Boolean
        }

        // ルーム参加
        POST /:id/join {
          Auth: Required
          Response:
            - participant: RoomParticipant
        }

        // ルーム退出
        POST /:id/leave {
          Auth: Required
          Response:
            - success: Boolean
        }

        // 参加者一覧
        GET /:id/participants {
          Auth: Required
          Authorization: Participant
          Response:
            - participants: RoomParticipant[] @include(user)
        }
    }

    // ユーザー管理API（管理者専用）
    Resource Users {
      BasePath: /api/users

      Endpoints:
        // ユーザー一覧
        GET / {
          Auth: Required
          Authorization: Admin
          Query:
            - page: Integer @default(1)
            - limit: Integer @default(20)
            - isBlocked: Boolean?
          Response:
            - users: User[] @exclude(password, email)
            - total: Integer
        }

        // ユーザーブロック/解除
        PUT /:id/block {
          Auth: Required
          Authorization: Admin
          Request:
            - isBlocked: Boolean @required
          Response:
            - user: User @exclude(password)
        }

        // ユーザーの現在のルーム取得
        GET /:id/current-room {
          Auth: Required
          Authorization: Admin
          Response:
            - room: Room?
            - participant: RoomParticipant?
        }
    }

    // お絵描きAPI
    Resource Drawing {
      BasePath: /api/rooms/:roomId/drawing

      Endpoints:
        // ボード情報取得
        GET /board {
          Auth: Required
          Authorization: Participant
          Response:
            - board: DrawingBoard @include(layers, strokes)
        }

        // 描画履歴取得（管理者/ルーム作成者のみ）
        GET /history {
          Auth: Required
          Authorization: Admin OR RoomCreator
          Query:
            - userId: UUID?
            - from: DateTime?
            - to: DateTime?
          Response:
            - history: DrawingHistory[] @include(user)
        }

        // ボードサイズ変更
        PUT /board/resize {
          Auth: Required
          Authorization: Participant
          Request:
            - width: Integer @required @min(800) @max(4000)
            - height: Integer @required @min(600) @max(4000)
          Response:
            - board: DrawingBoard
        }

        // レイヤー作成
        POST /layers {
          Auth: Required
          Authorization: Participant
          Request:
            - name: String @required
          Response:
            - layer: DrawingLayer
        }

        // レイヤー更新
        PUT /layers/:layerId {
          Auth: Required
          Authorization: Participant
          Request:
            - name: String?
            - isVisible: Boolean?
            - opacity: Float?
          Response:
            - layer: DrawingLayer
        }

        // レイヤー削除
        DELETE /layers/:layerId {
          Auth: Required
          Authorization: Participant
          Response:
            - success: Boolean
        }
    }
  }

  // ビジネスルール定義
  Rules {
    // ルール1: セッション自動開始
    Rule AutoStartSession {
      Trigger: OnCreate(RoomParticipant)
      Condition:
        Room.participants.count >= Room.minParticipants
        AND Room.status == Waiting
      Actions:
        - Update Room SET status = Active
        - Create DrawingBoard FOR Room
        - Create DrawingLayer FOR DrawingBoard SET name = "Layer 1", order = 1
      }
    }

    // ルール2: ブロックされたユーザーのアクセス制限
    Rule BlockedUserRestriction {
      Trigger: OnRequest
      Condition:
        User.isBlocked == true
      Actions:
        - Return 403 "Access denied: User is blocked"
        - Disconnect User FROM all rooms
      }
    }

    // ルール3: 描画履歴の自動保存
    Rule SaveDrawingHistory {
      Trigger: OnCreate(DrawingStroke)
      Actions:
        - Create DrawingHistory SET
            action = Draw,
            strokeData = DrawingStroke.toJSON(),
            user = CurrentUser,
            board = CurrentBoard
      }
    }

    // ルール4: ルーム作成者の権限確認
    Rule RoomCreatorPermissions {
      Trigger: OnRequest(DELETE /api/rooms/:id)
      Condition:
        User.role == Admin OR Room.createdBy == User
      Actions:
        - Allow Request
      Else:
        - Return 403 "Only admin or room creator can delete"
      }
    }

    // ルール5: ルーム参加者のみアクセス許可
    Rule ParticipantOnlyAccess {
      Trigger: OnRequest(/api/rooms/:roomId/drawing/*)
      Condition:
        EXISTS(RoomParticipant WHERE room.id == :roomId AND user == CurrentUser AND isActive == true)
      Actions:
        - Allow Request
      Else:
        - Return 403 "Must be an active participant"
      }
    }

    // ルール6: ルーム終了時のクリーンアップ
    Rule RoomEndCleanup {
      Trigger: OnUpdate(Room)
      Condition:
        Room.status.changed FROM Active TO Ended
      Actions:
        - Update RoomParticipant SET isActive = false WHERE room == Room
        - Archive DrawingBoard
      }
    }

    // ルール7: 最大参加者数チェック
    Rule MaxParticipantsCheck {
      Trigger: OnCreate(RoomParticipant)
      Condition:
        Room.participants.count >= Room.maxParticipants
      Actions:
        - Return 400 "Room is full"
        - Abort Creation
      }
    }
  }

  // 設定
  Config {
    // JWT設定
    JWT:
      Secret: env("JWT_SECRET")
      ExpiresIn: "7d"

    // CORS設定
    CORS:
      Origins: ["http://localhost:3000", "https://app.example.com"]
      Methods: ["GET", "POST", "PUT", "DELETE"]

    // レート制限
    RateLimit:
      WindowMs: 15 * 60 * 1000  // 15分
      MaxRequests: 100

    // ファイルアップロード制限
    Upload:
      MaxSize: 10 * 1024 * 1024  // 10MB
      AllowedTypes: ["image/png", "image/jpeg"]
  }
}
