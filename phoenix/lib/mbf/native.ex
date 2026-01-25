defmodule MBF.Native do
  @moduledoc """
  Native Rust NIF bindings for MBF (MPS Binary Format) protocol.

  This module provides high-performance binary encoding/decoding
  implemented in Rust via Rustler.

  ## Performance

  Compared to pure Elixir implementation:
  - Encoding: ~10x faster
  - Decoding: ~15x faster
  - Memory: ~3x less
  """

  use Rustler,
    otp_app: :signaling,
    crate: "mbf_nif"

  # ============================================================================
  # NIF Functions (implemented in Rust)
  # ============================================================================

  @doc "Encode StrokeSync message to binary"
  @spec encode_stroke_sync(MBF.StrokeSync.t()) :: {:ok, binary()} | {:error, String.t()}
  def encode_stroke_sync(_msg), do: :erlang.nif_error(:nif_not_loaded)

  @doc "Encode StrokeComplete message to binary"
  @spec encode_stroke_complete(MBF.StrokeComplete.t()) :: {:ok, binary()} | {:error, String.t()}
  def encode_stroke_complete(_msg), do: :erlang.nif_error(:nif_not_loaded)

  @doc "Encode StrokeAck message to binary"
  @spec encode_stroke_ack(MBF.StrokeAck.t()) :: {:ok, binary()} | {:error, String.t()}
  def encode_stroke_ack(_msg), do: :erlang.nif_error(:nif_not_loaded)

  @doc "Decode binary to StrokeSync message"
  @spec decode_stroke_sync(binary()) :: {:ok, MBF.StrokeSync.t()} | {:error, String.t()}
  def decode_stroke_sync(_binary), do: :erlang.nif_error(:nif_not_loaded)

  @doc "Decode binary to StrokeComplete message"
  @spec decode_stroke_complete(binary()) :: {:ok, MBF.StrokeComplete.t()} | {:error, String.t()}
  def decode_stroke_complete(_binary), do: :erlang.nif_error(:nif_not_loaded)

  @doc "Get message type from binary (for routing)"
  @spec decode_message_type(binary()) :: {:ok, non_neg_integer()} | {:error, String.t()}
  def decode_message_type(_binary), do: :erlang.nif_error(:nif_not_loaded)

  @doc "Convert hex color string to Color struct"
  @spec hex_to_color(String.t()) :: {:ok, MBF.Color.t()} | {:error, String.t()}
  def hex_to_color(_hex), do: :erlang.nif_error(:nif_not_loaded)

  @doc "Convert Color struct to hex string"
  @spec color_to_hex(MBF.Color.t()) :: String.t()
  def color_to_hex(_color), do: :erlang.nif_error(:nif_not_loaded)

  @doc "Calculate hash from user ID string"
  @spec hash_user_id(String.t()) :: non_neg_integer()
  def hash_user_id(_user_id), do: :erlang.nif_error(:nif_not_loaded)
end
