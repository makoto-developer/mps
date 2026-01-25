defmodule SignalingWeb.MBFHandler do
  @moduledoc """
  MBF (MPS Binary Format) handler for WebSocket binary messages.

  Provides high-performance binary encoding/decoding using Rust NIF.
  Falls back to JSON for non-binary messages.

  ## Usage

  In the channel, binary messages are detected and routed here:

      def handle_in({:binary, binary}, socket) do
        MBFHandler.handle_binary(binary, socket)
      end
  """

  alias MBF
  alias Signaling.StrokeStore
  require Logger

  # Message type constants
  @stroke_sync 0x10
  @stroke_end 0x11
  @stroke_complete 0x12
  @stroke_ack 0x13
  @canvas_clear 0x20

  @doc """
  Handle incoming binary MBF message.
  Returns {:noreply, socket} or {:reply, response, socket}.
  """
  def handle_binary(binary, socket) when is_binary(binary) do
    case MBF.decode(binary) do
      {:ok, {message_type, data}} ->
        handle_message(message_type, data, socket)

      {:error, reason} ->
        Logger.warning("Failed to decode MBF message: #{reason}")
        {:noreply, socket}
    end
  end

  @doc """
  Encode Elixir map to MBF binary.
  """
  def encode_message(type, data) do
    MBF.encode(type, data)
  end

  # ============================================================================
  # Message Handlers
  # ============================================================================

  defp handle_message(:stroke_sync, data, socket) do
    room_id = socket.assigns.room_id
    user_id = socket.assigns.user_id
    stroke_id = data[:stroke_id]

    # Store live stroke
    StrokeStore.update_live_stroke(room_id, stroke_id, %{
      user_id: user_id,
      color: data[:color],
      width: data[:width],
      points: data[:points]
    })

    # Encode and broadcast to other users
    {:ok, response_binary} = MBF.encode(:stroke_sync, Map.put(data, :stroke_id, stroke_id))

    Phoenix.Channel.broadcast_from!(socket, "stroke_sync_binary", %{
      binary: response_binary,
      user_id: user_id
    })

    {:noreply, socket}
  end

  defp handle_message(:stroke_complete, data, socket) do
    room_id = socket.assigns.room_id
    user_id = socket.assigns.user_id
    message_id = data[:message_id] || System.system_time(:millisecond)

    # Store in ETS
    {:ok, stroke} = StrokeStore.add_stroke(room_id, %{
      user_id: user_id,
      tool: format_tool(data[:tool]),
      color: data[:color],
      width: data[:width],
      points: data[:points]
    })

    # Encode and broadcast
    {:ok, response_binary} = MBF.encode(:stroke_complete, %{
      message_id: message_id,
      tool: data[:tool],
      color: data[:color],
      width: data[:width],
      timestamp: data[:timestamp],
      points: data[:points]
    })

    Phoenix.Channel.broadcast!(socket, "stroke_complete_binary", %{
      binary: response_binary,
      stroke_id: stroke.id
    })

    # Send ACK
    {:ok, ack_binary} = MBF.encode(:stroke_ack, %{
      message_id: message_id,
      stroke_id: stroke.id,
      success: true
    })

    Phoenix.Channel.push(socket, "stroke_ack_binary", %{binary: ack_binary})

    {:noreply, socket}
  end

  defp handle_message(:canvas_clear, _data, socket) do
    room_id = socket.assigns.room_id

    # Clear ETS
    StrokeStore.clear_room(room_id)

    # Broadcast
    Phoenix.Channel.broadcast!(socket, "canvas_cleared", %{})

    {:noreply, socket}
  end

  defp handle_message(type, _data, socket) do
    Logger.warning("Unknown MBF message type: #{inspect(type)}")
    {:noreply, socket}
  end

  # ============================================================================
  # Helpers
  # ============================================================================

  defp format_tool(0), do: "pen"
  defp format_tool(1), do: "eraser"
  defp format_tool(2), do: "fill"
  defp format_tool(n) when is_integer(n), do: "unknown_#{n}"
  defp format_tool(tool) when is_binary(tool), do: tool
end
