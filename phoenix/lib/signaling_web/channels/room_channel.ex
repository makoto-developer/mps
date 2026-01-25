defmodule SignalingWeb.RoomChannel do
  @moduledoc """
  Phoenix Channel for WebRTC signaling and real-time drawing in rooms.

  ## Message Types

  ### WebRTC Signaling
  - `join` - Client joins room, receives peer list and current strokes
  - `offer` - SDP offer relay to target peer
  - `answer` - SDP answer relay to target peer
  - `ice-candidate` - ICE candidate relay to target peer
  - `peer-joined` - Broadcast when new peer joins
  - `peer-left` - Broadcast when peer leaves

  ### Drawing Sync
  - `stroke_sync` - Real-time point sync during drawing
  - `stroke_complete` - Completed stroke, stored in ETS
  - `stroke_end` - Drawing finished, remove live stroke
  - `get_strokes` - Request all strokes (reconciliation)
  - `clear_canvas` - Clear all strokes in room
  """
  use Phoenix.Channel
  require Logger

  alias Signaling.RoomServer
  alias Signaling.StrokeStore

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
    room_id = socket.assigns.room_id

    peer_list =
      Enum.map(existing_peers, fn peer ->
        %{
          user_id: peer.user_id,
          socket_id: peer.socket_id
        }
      end)

    # Send peer list
    push(socket, "peer-list", %{peers: peer_list})

    # Send current room state (strokes + live strokes)
    room_state = StrokeStore.get_room_state(room_id)
    push(socket, "room_state", %{
      strokes: room_state.strokes,
      live_strokes: room_state.live_strokes
    })

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

  # ============================================
  # Drawing Sync Handlers
  # ============================================

  @doc """
  Real-time stroke sync during drawing.
  Stores in ETS and broadcasts to other users.
  """
  @impl true
  def handle_in("stroke_sync", payload, socket) do
    room_id = socket.assigns.room_id
    stroke_id = payload["stroke_id"]
    user_id = socket.assigns.user_id

    # Store live stroke in ETS
    StrokeStore.update_live_stroke(room_id, stroke_id, %{
      user_id: user_id,
      color: payload["color"],
      width: payload["width"],
      points: payload["points"]
    })

    # Broadcast to other users in the room
    broadcast_from!(socket, "stroke_synced", %{
      stroke_id: stroke_id,
      user_id: user_id,
      color: payload["color"],
      width: payload["width"],
      points: payload["points"]
    })

    {:noreply, socket}
  end

  @doc """
  Drawing finished - remove live stroke.
  """
  @impl true
  def handle_in("stroke_end", %{"stroke_id" => stroke_id}, socket) do
    room_id = socket.assigns.room_id

    # Remove live stroke from ETS
    StrokeStore.remove_live_stroke(room_id, stroke_id)

    # Notify other users
    broadcast_from!(socket, "stroke_ended", %{stroke_id: stroke_id})

    {:noreply, socket}
  end

  @doc """
  Completed stroke - store permanently in ETS.
  Sends ACK back to sender.
  """
  @impl true
  def handle_in("stroke_complete", payload, socket) do
    room_id = socket.assigns.room_id
    user_id = socket.assigns.user_id
    message_id = payload["message_id"] || generate_message_id()

    stroke_data = payload["stroke"] || payload

    # Store in ETS
    {:ok, stroke} = StrokeStore.add_stroke(room_id, %{
      id: stroke_data["id"],
      user_id: user_id,
      tool: stroke_data["tool"],
      color: stroke_data["color"],
      width: stroke_data["width"],
      points: stroke_data["points"]
    })

    # Remove corresponding live stroke
    if stroke_id = stroke_data["stroke_id"] do
      StrokeStore.remove_live_stroke(room_id, stroke_id)
    end

    # Broadcast completed stroke to ALL users (including sender)
    # This ensures sender gets the stroke with server-generated ID
    broadcast!(socket, "stroke_completed", stroke)

    # Send ACK to sender
    push(socket, "stroke_complete_ack", %{
      message_id: message_id,
      stroke_id: stroke.id,
      success: true
    })

    {:noreply, socket}
  end

  @doc """
  Get all strokes for reconciliation.
  """
  @impl true
  def handle_in("get_strokes", _payload, socket) do
    room_id = socket.assigns.room_id
    strokes = StrokeStore.get_strokes(room_id)

    push(socket, "strokes_list", %{strokes: strokes})

    {:noreply, socket}
  end

  @doc """
  Clear all strokes in the room.
  """
  @impl true
  def handle_in("clear_canvas", _payload, socket) do
    room_id = socket.assigns.room_id

    # Clear ETS
    StrokeStore.clear_room(room_id)

    # Broadcast to all users (including sender)
    broadcast!(socket, "canvas_cleared", %{})

    {:noreply, socket}
  end

  # ============================================
  # Lifecycle
  # ============================================

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

  # Private helpers

  defp generate_message_id do
    "msg_" <> Base.encode16(:crypto.strong_rand_bytes(8), case: :lower)
  end
end
