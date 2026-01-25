import Config

config :signaling, SignalingWeb.Endpoint,
  http: [ip: {127, 0, 0, 1}, port: 4002],
  secret_key_base: "test_secret_key_base_min_64_bytes_long_for_testing_purposes_only",
  server: false

config :logger, level: :warning
