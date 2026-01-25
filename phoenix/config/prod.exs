import Config

config :signaling, SignalingWeb.Endpoint,
  adapter: Bandit.PhoenixAdapter,
  cache_static_manifest: "priv/static/cache_manifest.json",
  server: true

config :logger, level: :info
