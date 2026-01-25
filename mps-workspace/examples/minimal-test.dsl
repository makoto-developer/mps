// Minimal Test DSL

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
    }

    Model Room {
      Fields:
        - id: UUID @primary @auto
        - title: String @required

      Relationships:
        - createdBy: User ManyToOne
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
    }
  }

  Rules {
  }
}
