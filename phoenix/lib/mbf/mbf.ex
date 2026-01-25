defmodule MBF do
  @moduledoc """
  MBF (MPS Binary Format) - High-level API for binary protocol encoding/decoding.

  This module provides a convenient interface to the Rust NIF implementation,
  with automatic conversion between Elixir maps and MBF structs.

  ## Message Types

  | Type | ID   | Description           |
  |------|------|-----------------------|
  | StrokeSync     | 0x10 | Real-time point sync  |
  | StrokeEnd      | 0x11 | Drawing ended         |
  | StrokeComplete | 0x12 | Finalized stroke      |
  | StrokeAck      | 0x13 | Acknowledgment        |
  | CanvasClear    | 0x20 | Clear canvas          |
  | RoomState      | 0x30 | Initial room state    |

  ## Example

      # Encode a stroke sync message
      msg = %{
        stroke_id: "user123-1234567890",
        color: "#FF0000",
        width: 5,
        points: [%{x: 100, y: 200}, %{x: 105, y: 210}]
      }
      {:ok, binary} = MBF.encode(:stroke_sync, msg)

      # Decode
      {:ok, decoded} = MBF.decode(binary)
  """

  alias MBF.{Native, Point, Color, StrokeId, StrokeSync, StrokeComplete, StrokeAck}

  # Message type constants
  @stroke_sync 0x10
  @stroke_end 0x11
  @stroke_complete 0x12
  @stroke_ack 0x13
  @canvas_clear 0x20
  @room_state 0x30

  # ============================================================================
  # Encoding
  # ============================================================================

  @doc """
  Encode a message to MBF binary format.

  ## Parameters

  - `type` - Message type atom (:stroke_sync, :stroke_complete, :stroke_ack)
  - `data` - Map with message data

  ## Returns

  - `{:ok, binary}` on success
  - `{:error, reason}` on failure
  """
  @spec encode(atom(), map()) :: {:ok, binary()} | {:error, String.t()}
  def encode(:stroke_sync, data) do
    msg = to_stroke_sync(data)
    Native.encode_stroke_sync(msg)
  end

  def encode(:stroke_complete, data) do
    msg = to_stroke_complete(data)
    Native.encode_stroke_complete(msg)
  end

  def encode(:stroke_ack, data) do
    msg = to_stroke_ack(data)
    Native.encode_stroke_ack(msg)
  end

  # ============================================================================
  # Decoding
  # ============================================================================

  @doc """
  Decode MBF binary to Elixir map.

  Automatically detects message type and decodes accordingly.
  """
  @spec decode(binary()) :: {:ok, {atom(), map()}} | {:error, String.t()}
  def decode(binary) when is_binary(binary) do
    case Native.decode_message_type(binary) do
      {:ok, @stroke_sync} ->
        case Native.decode_stroke_sync(binary) do
          {:ok, msg} -> {:ok, {:stroke_sync, from_stroke_sync(msg)}}
          error -> error
        end

      {:ok, @stroke_complete} ->
        case Native.decode_stroke_complete(binary) do
          {:ok, msg} -> {:ok, {:stroke_complete, from_stroke_complete(msg)}}
          error -> error
        end

      {:ok, type} ->
        {:error, "Unknown message type: 0x#{Integer.to_string(type, 16)}"}

      error ->
        error
    end
  end

  # ============================================================================
  # Conversion Helpers
  # ============================================================================

  defp to_stroke_sync(data) do
    %StrokeSync{
      stroke_id: parse_stroke_id(data[:stroke_id] || data["stroke_id"]),
      color: parse_color(data[:color] || data["color"]),
      width: data[:width] || data["width"] || 3,
      points: parse_points(data[:points] || data["points"] || [])
    }
  end

  defp to_stroke_complete(data) do
    %StrokeComplete{
      message_id: data[:message_id] || data["message_id"] || System.system_time(:millisecond),
      tool: parse_tool(data[:tool] || data["tool"]),
      color: parse_color(data[:color] || data["color"]),
      width: data[:width] || data["width"] || 3,
      timestamp: data[:timestamp] || data["timestamp"] || System.system_time(:millisecond),
      points: parse_points(data[:points] || data["points"] || [])
    }
  end

  defp to_stroke_ack(data) do
    %StrokeAck{
      message_id: data[:message_id] || data["message_id"],
      stroke_id: parse_stroke_id(data[:stroke_id] || data["stroke_id"]),
      success: data[:success] || data["success"] || true
    }
  end

  defp from_stroke_sync(%StrokeSync{} = msg) do
    %{
      stroke_id: format_stroke_id(msg.stroke_id),
      color: format_color(msg.color),
      width: msg.width,
      points: format_points(msg.points)
    }
  end

  defp from_stroke_complete(%StrokeComplete{} = msg) do
    %{
      message_id: msg.message_id,
      tool: format_tool(msg.tool),
      color: format_color(msg.color),
      width: msg.width,
      timestamp: msg.timestamp,
      points: format_points(msg.points)
    }
  end

  # ============================================================================
  # Parsing Helpers
  # ============================================================================

  defp parse_stroke_id(nil), do: %StrokeId{user_hash: 0, timestamp: 0}

  defp parse_stroke_id(id) when is_binary(id) do
    case String.split(id, "-") do
      [user_part, ts_part] ->
        %StrokeId{
          user_hash: Native.hash_user_id(user_part),
          timestamp: String.to_integer(ts_part) |> rem(0xFFFFFFFF)
        }

      _ ->
        %StrokeId{
          user_hash: Native.hash_user_id(id),
          timestamp: System.system_time(:millisecond) |> rem(0xFFFFFFFF)
        }
    end
  end

  defp parse_stroke_id(%StrokeId{} = id), do: id

  defp parse_color(nil), do: %Color{r: 0, g: 0, b: 0}

  defp parse_color("#" <> hex) do
    {:ok, color} = Native.hex_to_color("#" <> hex)
    color
  end

  defp parse_color(%Color{} = color), do: color

  defp parse_points(points) when is_list(points) do
    Enum.map(points, fn
      %Point{} = p -> p
      %{x: x, y: y} -> %Point{x: round(x), y: round(y)}
      %{"x" => x, "y" => y} -> %Point{x: round(x), y: round(y)}
    end)
  end

  defp parse_tool("pen"), do: 0
  defp parse_tool("eraser"), do: 1
  defp parse_tool("fill"), do: 2
  defp parse_tool(tool) when is_integer(tool), do: tool
  defp parse_tool(_), do: 0

  # ============================================================================
  # Formatting Helpers
  # ============================================================================

  defp format_stroke_id(%StrokeId{user_hash: uh, timestamp: ts}) do
    "#{Integer.to_string(uh, 16)}-#{ts}"
  end

  defp format_color(%Color{} = color) do
    Native.color_to_hex(color)
  end

  defp format_points(points) do
    Enum.map(points, fn %Point{x: x, y: y} -> %{x: x, y: y} end)
  end

  defp format_tool(0), do: "pen"
  defp format_tool(1), do: "eraser"
  defp format_tool(2), do: "fill"
  defp format_tool(n), do: "unknown_#{n}"

  # ============================================================================
  # Debug Helpers
  # ============================================================================

  @doc """
  Pretty print binary data for debugging.
  """
  def debug(binary) when is_binary(binary) do
    hex =
      binary
      |> :binary.bin_to_list()
      |> Enum.map(&Integer.to_string(&1, 16))
      |> Enum.map(&String.pad_leading(&1, 2, "0"))
      |> Enum.chunk_every(16)
      |> Enum.map(&Enum.join(&1, " "))
      |> Enum.join("\n")

    IO.puts("""
    MBF Binary (#{byte_size(binary)} bytes):
    #{hex}
    """)

    case decode(binary) do
      {:ok, {type, data}} ->
        IO.puts("Type: #{type}")
        IO.inspect(data, label: "Data")

      {:error, reason} ->
        IO.puts("Decode error: #{reason}")
    end
  end
end
