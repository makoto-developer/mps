import Config

config :signaling, SignalingWeb.Endpoint,
  url: [host: "localhost"],
  render_errors: [formats: [json: SignalingWeb.ErrorJSON], layout: false],
  pubsub_server: Signaling.PubSub

config :logger, :console,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id, :room_id, :user_id]

config :phoenix, :json_library, Jason

import_config "#{config_env()}.exs"
