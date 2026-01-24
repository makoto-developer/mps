defmodule SignalingWeb.UserSocket do
  use Phoenix.Socket
  require Logger

  channel "room:*", SignalingWeb.RoomChannel

  @impl true
  def connect(params, socket, _connect_info) do
    user_id = Map.get(params, "user_id") || UUID.uuid4()

    Logger.debug("Socket connected: user_id=#{user_id}")

    {:ok, assign(socket, :user_id, user_id)}
  end

  @impl true
  def id(socket), do: "user_socket:#{socket.assigns.user_id}"
end
