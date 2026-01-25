// Complete Drawing App DSL with Real-time WebSocket Support
// This example includes all features: Auth, Rooms, Messages, Drawing, and Real-time events

Application DrawingApp {
  Database: PostgreSQL
  Port: 3000
  EnableWebSocket: true  // Enable Socket.io support

  Models {
    Model User {
      Fields:
        - id: UUID @primary @auto
        - email: String @required @unique
        - nickname: String @required
        - role: Enum(User, Admin) @default(User)
        - createdAt: DateTime @auto

      Relationships:
        - rooms: Room[] @relation("CreatedRooms")
        - messages: Message[] @relation("UserMessages")
        - strokes: DrawingStroke[] @relation("UserStrokes")
    }

    Model Room {
      Fields:
        - id: UUID @primary @auto
        - title: String @required
        - theme: String @required
        - status: Enum(Waiting, Active, Ended) @default(Waiting)
        - createdAt: DateTime @auto

      Relationships:
        - createdBy: User @relation("CreatedRooms")
        - messages: Message[] @relation("RoomMessages")
        - strokes: DrawingStroke[] @relation("RoomStrokes")
    }

    Model Message {
      Fields:
        - id: UUID @primary @auto
        - content: String @required
        - createdAt: DateTime @auto

      Relationships:
        - room: Room @relation("RoomMessages") ManyToOne
        - user: User @relation("UserMessages") ManyToOne
    }

    Model DrawingStroke {
      Fields:
        - id: UUID @primary @auto
        - tool: String @required
        - color: String @required
        - width: Integer @required
        - points: String @required  // JSON format
        - createdAt: DateTime @auto

      Relationships:
        - room: Room @relation("RoomStrokes") ManyToOne
        - user: User @relation("UserStrokes") ManyToOne
    }
  }

  Resources {
    Resource Auth {
      BasePath: "/api/auth"

      Endpoints:
        POST "/register" {
          Auth: None
          Request:
            - email: String @required
            - nickname: String @required
          Response:
            - user: User
            - token: String
        }

        POST "/login" {
          Auth: None
          Request:
            - email: String @required
          Response:
            - user: User
            - token: String
        }
    }

    Resource Rooms {
      BasePath: "/api/rooms"

      Endpoints:
        GET "/" {
          Auth: Required
          Response:
            - rooms: Room[]
        }

        POST "/" {
          Auth: Required
          Request:
            - title: String @required
            - theme: String @required
          Response:
            - room: Room
        }

        GET "/:id" {
          Auth: Required
          Response:
            - room: Room
        }

        DELETE "/:id" {
          Auth: Admin
          Response:
            - success: Boolean
        }
    }

    Resource Messages {
      BasePath: "/api/rooms/:roomId/messages"

      Endpoints:
        GET "/" {
          Auth: Required
          Response:
            - messages: Message[]
        }

        POST "/" {
          Auth: Required
          Request:
            - content: String @required
          Response:
            - message: Message
          RealTime: true  // Emit via WebSocket
        }
    }

    Resource Drawing {
      BasePath: "/api/rooms/:roomId/strokes"

      Endpoints:
        GET "/" {
          Auth: Required
          Response:
            - strokes: DrawingStroke[]
        }

        POST "/" {
          Auth: Required
          Request:
            - tool: String @required
            - color: String @required
            - width: Integer @required
            - points: String @required
          Response:
            - stroke: DrawingStroke
          RealTime: true  // Emit via WebSocket
        }

        DELETE "/" {
          Auth: Required
          Response:
            - success: Boolean
          Authorization: "OnlyCreator"  // Only room creator can clear
        }
    }
  }

  WebSocket {
    Namespace: "/"

    Events {
      // Room events
      Event JoinRoom {
        Input: roomId: String
        Broadcast: "user-joined"
      }

      Event LeaveRoom {
        Input: roomId: String
        Broadcast: "user-left"
      }

      // Drawing events
      Event DrawStroke {
        Input: {
          roomId: String
          stroke: DrawingStroke
        }
        Broadcast: "stroke-drawn"
        BroadcastTo: "room"
      }

      // Message events
      Event SendMessage {
        Input: {
          roomId: String
          message: Message
        }
        Broadcast: "new-message"
        BroadcastTo: "room"
      }
    }
  }

  Security {
    JWT {
      Secret: ENV("JWT_SECRET")
      ExpiresIn: "24h"
    }

    CORS {
      AllowedOrigins: ENV("ALLOWED_ORIGINS")
      Credentials: true
    }

    RateLimiting {
      MaxRequests: 100
      Window: "15m"
    }
  }
}
