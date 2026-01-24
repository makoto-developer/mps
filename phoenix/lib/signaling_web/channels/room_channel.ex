defmodule SignalingWeb.RoomChannel do
  @moduledoc """
  Phoenix Channel for WebRTC signaling in drawing rooms.

  ## Message Types

  - `join` - Client joins room, receives peer list
  - `offer` - SDP offer relay to target peer
  - `answer` - SDP answer relay to target peer
  - `ice-candidate` - ICE candidate relay to target peer
  - `peer-joined` - Broadcast when new peer joins
  - `peer-left` - Broadcast when peer leaves
  """
  use Phoenix.Channel
  require Logger

  alias Signaling.RoomServer

  @impl true
  def join("room:" <> room_id, _params, socket) do
    user_id = socket.assigns.user_id
    socket_id = socket.id

    Logger.metadata(room_id: room_id, user_id: user_id)
    Logger.info("User joining room")

    case RoomServer.join(room_id, user_id, socket_id) do
      {:ok, existing_peers} ->
        send(self(), {:after_join, existing_peers})

        socket =
          socket
          |> assign(:room_id, room_id)
          |> assign(:socket_id, socket_id)

        {:ok, socket}

      {:error, reason} ->
        Logger.error("Failed to join room: #{inspect(reason)}")
        {:error, %{reason: "failed_to_join"}}
    end
  end

  @impl true
  def handle_info({:after_join, existing_peers}, socket) do
    peer_list =
      Enum.map(existing_peers, fn peer ->
        %{
          user_id: peer.user_id,
          socket_id: peer.socket_id
        }
      end)

    push(socket, "peer-list", %{peers: peer_list})

    broadcast_from!(socket, "peer-joined", %{
      user_id: socket.assigns.user_id,
      socket_id: socket.assigns.socket_id
    })

    {:noreply, socket}
  end

  @impl true
  def handle_in("offer", %{"target_socket_id" => target, "sdp" => sdp}, socket) do
    Logger.debug("Relaying offer to #{target}")

    broadcast_from!(socket, "offer", %{
      from_socket_id: socket.assigns.socket_id,
      from_user_id: socket.assigns.user_id,
      target_socket_id: target,
      sdp: sdp
    })

    {:noreply, socket}
  end

  @impl true
  def handle_in("answer", %{"target_socket_id" => target, "sdp" => sdp}, socket) do
    Logger.debug("Relaying answer to #{target}")

    broadcast_from!(socket, "answer", %{
      from_socket_id: socket.assigns.socket_id,
      from_user_id: socket.assigns.user_id,
      target_socket_id: target,
      sdp: sdp
    })

    {:noreply, socket}
  end

  @impl true
  def handle_in("ice-candidate", %{"target_socket_id" => target, "candidate" => candidate}, socket) do
    Logger.debug("Relaying ICE candidate to #{target}")

    broadcast_from!(socket, "ice-candidate", %{
      from_socket_id: socket.assigns.socket_id,
      target_socket_id: target,
      candidate: candidate
    })

    {:noreply, socket}
  end

  @impl true
  def terminate(_reason, socket) do
    if socket.assigns[:room_id] do
      Logger.info("User leaving room #{socket.assigns.room_id}")

      RoomServer.leave(socket.assigns.room_id, socket.assigns.socket_id)

      broadcast_from!(socket, "peer-left", %{
        user_id: socket.assigns.user_id,
        socket_id: socket.assigns.socket_id
      })
    end

    :ok
  end
end
