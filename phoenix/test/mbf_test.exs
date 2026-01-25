defmodule MBFTest do
  use ExUnit.Case, async: true

  alias MBF
  alias MBF.{Point, Color, StrokeId, StrokeSync, StrokeComplete, StrokeAck}

  describe "encode/decode StrokeSync" do
    test "encodes and decodes StrokeSync message" do
      data = %{
        stroke_id: "user123-1234567890",
        color: "#FF0000",
        width: 5,
        points: [%{x: 100, y: 200}, %{x: 105, y: 210}]
      }

      {:ok, binary} = MBF.encode(:stroke_sync, data)

      assert is_binary(binary)
      assert byte_size(binary) > 0

      # Verify magic bytes
      <<"MP", _rest::binary>> = binary

      {:ok, {:stroke_sync, decoded}} = MBF.decode(binary)

      assert decoded.color == "#FF0000"
      assert decoded.width == 5
      assert length(decoded.points) == 2
      assert hd(decoded.points) == %{x: 100, y: 200}
    end

    test "handles empty points" do
      data = %{
        stroke_id: "user123-1234567890",
        color: "#00FF00",
        width: 3,
        points: []
      }

      {:ok, binary} = MBF.encode(:stroke_sync, data)
      {:ok, {:stroke_sync, decoded}} = MBF.decode(binary)

      assert decoded.points == []
    end
  end

  describe "encode/decode StrokeComplete" do
    test "encodes and decodes StrokeComplete message" do
      data = %{
        message_id: 12345,
        tool: "pen",
        color: "#0000FF",
        width: 8,
        timestamp: System.system_time(:millisecond),
        points: [%{x: 50, y: 50}, %{x: 100, y: 100}, %{x: 150, y: 150}]
      }

      {:ok, binary} = MBF.encode(:stroke_complete, data)

      assert is_binary(binary)

      {:ok, {:stroke_complete, decoded}} = MBF.decode(binary)

      assert decoded.message_id == 12345
      assert decoded.tool == "pen"
      assert decoded.color == "#0000FF"
      assert decoded.width == 8
      assert length(decoded.points) == 3
    end
  end

  describe "encode StrokeAck" do
    test "encodes StrokeAck message" do
      data = %{
        message_id: 67890,
        stroke_id: "user456-9876543210",
        success: true
      }

      {:ok, binary} = MBF.encode(:stroke_ack, data)

      # Verify it's a valid MBF binary
      assert is_binary(binary)
      assert byte_size(binary) > 0

      # Verify magic bytes and message type
      <<"MP", 0x01, 0x00, 0x13, _rest::binary>> = binary
    end
  end

  describe "color conversion" do
    test "hex_to_color converts hex string to Color struct" do
      {:ok, color} = MBF.Native.hex_to_color("#FF8000")

      assert color.r == 255
      assert color.g == 128
      assert color.b == 0
    end

    test "color_to_hex converts Color struct to hex string" do
      color = %Color{r: 128, g: 64, b: 255}
      hex = MBF.Native.color_to_hex(color)

      assert hex == "#8040FF"
    end
  end

  describe "hash_user_id" do
    test "produces consistent hash for same user ID" do
      hash1 = MBF.Native.hash_user_id("user123")
      hash2 = MBF.Native.hash_user_id("user123")

      assert hash1 == hash2
      assert is_integer(hash1)
      assert hash1 >= 0
    end

    test "produces different hash for different user IDs" do
      hash1 = MBF.Native.hash_user_id("user123")
      hash2 = MBF.Native.hash_user_id("user456")

      assert hash1 != hash2
    end
  end

  describe "debug helper" do
    test "debug prints binary info" do
      data = %{
        stroke_id: "user123-1234567890",
        color: "#FF0000",
        width: 5,
        points: [%{x: 100, y: 200}]
      }

      {:ok, binary} = MBF.encode(:stroke_sync, data)

      # Just ensure it doesn't crash
      MBF.debug(binary)
    end
  end
end
