defmodule Signaling.Application do
  @moduledoc """
  The Signaling Application for WebRTC peer-to-peer connection management.
  """
  use Application

  @impl true
  def start(_type, _args) do
    children = [
      {Phoenix.PubSub, name: Signaling.PubSub},
      {Registry, keys: :unique, name: Signaling.RoomRegistry},
      {DynamicSupervisor, name: Signaling.RoomSupervisor, strategy: :one_for_one},
      # ETS-based stroke storage
      Signaling.StrokeStore,
      SignalingWeb.Endpoint
    ]

    opts = [strategy: :one_for_one, name: Signaling.Supervisor]
    Supervisor.start_link(children, opts)
  end

  @impl true
  def config_change(changed, _new, removed) do
    SignalingWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
