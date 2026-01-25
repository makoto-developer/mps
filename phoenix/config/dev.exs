import Config

config :signaling, SignalingWeb.Endpoint,
  adapter: Bandit.PhoenixAdapter,
  http: [ip: {0, 0, 0, 0}, port: String.to_integer(System.get_env("PHX_PORT") || "22303")],
  check_origin: false,
  code_reloader: false,
  debug_errors: true,
  secret_key_base: "dev_secret_key_base_min_64_bytes_long_for_development_purposes_only_change_in_prod",
  watchers: []

config :logger, level: :debug
