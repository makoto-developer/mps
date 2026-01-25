// Drawing App with Canvas Feature

Application DrawingApp {
  Database: PostgreSQL
  Port: 3000

  Models {
    Model User {
      Fields:
        - id: UUID @primary @auto
        - email: String @required @unique
        - nickname: String @required

      Relationships:
        - rooms: Room[]
        - messages: Message[]
        - strokes: DrawingStroke[]
    }

    Model Room {
      Fields:
        - id: UUID @primary @auto
        - title: String @required
        - theme: String @required

      Relationships:
        - createdBy: User ManyToOne
        - messages: Message[]
        - strokes: DrawingStroke[]
    }

    Model Message {
      Fields:
        - id: UUID @primary @auto
        - content: String @required
        - createdAt: DateTime @auto

      Relationships:
        - room: Room ManyToOne
        - user: User ManyToOne
    }

    Model DrawingStroke {
      Fields:
        - id: UUID @primary @auto
        - tool: String @required
        - color: String @required
        - width: Integer @required
        - points: String @required
        - createdAt: DateTime @auto

      Relationships:
        - room: Room ManyToOne
        - user: User ManyToOne
    }
  }

  Resources {
    Resource Authentication {
      BasePath: "/api/auth"

      Endpoints:
        POST "/register" {
          Auth: None
          Request:
            - email: String @required
            - nickname: String @required
          Response:
            - user: User
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
    }

    Resource Messages {
      BasePath: "/api/rooms"

      Endpoints:
        GET "/:roomId/messages" {
          Auth: Required
          Response:
            - messages: Message[]
        }

        POST "/:roomId/messages" {
          Auth: Required
          Request:
            - content: String @required
          Response:
            - message: Message
        }
    }

    Resource Drawing {
      BasePath: "/api/rooms"

      Endpoints:
        GET "/:roomId/strokes" {
          Auth: Required
          Response:
            - strokes: DrawingStroke[]
        }

        POST "/:roomId/strokes" {
          Auth: Required
          Request:
            - tool: String @required
            - color: String @required
            - width: Integer @required
            - points: String @required
          Response:
            - stroke: DrawingStroke
        }

        DELETE "/:roomId/strokes" {
          Auth: Required
          Response:
            - success: Boolean
        }
      }
    }
  }

  Rules {
  }
}
