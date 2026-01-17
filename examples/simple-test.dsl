// Simple Test DSL
// Simplified version for testing

Application DrawingApp {
  Database: PostgreSQL
  Port: 3000

  Models {
    Model User {
      Fields:
        - id: UUID @primary @auto
        - email: String @required @unique
        - nickname: String @required
        - role: Enum(User, Admin) @default(User)

      Relationships:
        - rooms: Room[] OneToMany
    }

    Model Room {
      Fields:
        - id: UUID @primary @auto
        - title: String @required
        - theme: String @required

      Relationships:
        - createdBy: User ManyToOne
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
            - password: String @required
            - nickname: String @required
          Response:
            - user: User
            - token: String
        }

        POST "/login" {
          Auth: None
          Request:
            - email: String @required
            - password: String @required
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
    }
  }

  Rules {
    Rule AutoStartSession {
      Trigger: OnCreate(RoomParticipant)
      Condition:
        Room.participants.count >= 2
      Actions:
        - Set Room.status = Active
        - Create DrawingBoard for Room
    }
  }
}
