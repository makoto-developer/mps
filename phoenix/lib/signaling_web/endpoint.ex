defmodule SignalingWeb.Endpoint do
  use Phoenix.Endpoint, otp_app: :signaling

  @session_options [
    store: :cookie,
    key: "_signaling_key",
    signing_salt: "webrtc_signaling",
    same_site: "Lax"
  ]

  socket "/socket", SignalingWeb.UserSocket,
    websocket: [
      timeout: 45_000,
      check_origin: ["//localhost:22300", "//localhost:3000", "//localhost:3001"]
    ],
    longpoll: false

  plug Plug.RequestId
  plug Plug.Telemetry, event_prefix: [:signaling, :endpoint]

  plug Plug.Parsers,
    parsers: [:urlencoded, :json],
    pass: ["*/*"],
    json_decoder: Jason

  plug Plug.MethodOverride
  plug Plug.Head
  plug Plug.Session, @session_options

  plug CORSPlug,
    origin: ["http://localhost:22300", "http://localhost:3000", "http://localhost:3001"],
    methods: ["GET", "POST", "OPTIONS"],
    headers: ["Authorization", "Content-Type"]

  plug SignalingWeb.Router
end
