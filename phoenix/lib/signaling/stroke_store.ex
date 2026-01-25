defmodule Signaling.StrokeStore do
  @moduledoc """
  ETS-based stroke storage for real-time drawing synchronization.

  Uses ETS for ultra-fast, concurrent access to stroke data.
  Strokes are stored per room and can be retrieved instantly.

  ## ETS Table Structure

  Table: :stroke_store
  Type: :bag (allows multiple values per key)
  Key: room_id
  Value: stroke map

  ## Benefits of ETS

  - O(1) lookup time
  - Concurrent read/write from multiple processes
  - No serialization overhead
  - Native Erlang term storage
  """
  use GenServer
  require Logger

  @table_name :stroke_store
  @live_strokes_table :live_strokes

  # Stroke type
  @type point :: %{x: number(), y: number()}
  @type stroke :: %{
    id: String.t(),
    room_id: String.t(),
    user_id: String.t(),
    tool: String.t(),
    color: String.t(),
    width: number(),
    points: list(point()),
    created_at: integer()
  }

  # Client API

  def start_link(_opts) do
    GenServer.start_link(__MODULE__, [], name: __MODULE__)
  end

  @doc """
  Add a completed stroke to storage.
  Returns the stroke with generated ID if not provided.
  """
  @spec add_stroke(String.t(), map()) :: {:ok, stroke()}
  def add_stroke(room_id, stroke_data) do
    stroke = %{
      id: stroke_data["id"] || stroke_data[:id] || generate_id(),
      room_id: room_id,
      user_id: stroke_data["user_id"] || stroke_data[:user_id],
      tool: stroke_data["tool"] || stroke_data[:tool] || "pen",
      color: stroke_data["color"] || stroke_data[:color] || "#000000",
      width: stroke_data["width"] || stroke_data[:width] || 3,
      points: stroke_data["points"] || stroke_data[:points] || [],
      created_at: System.system_time(:millisecond)
    }

    :ets.insert(@table_name, {room_id, stroke})
    Logger.debug("Stroke #{stroke.id} added to room #{room_id}")
    {:ok, stroke}
  end

  @doc """
  Get all strokes for a room, ordered by creation time.
  """
  @spec get_strokes(String.t()) :: list(stroke())
  def get_strokes(room_id) do
    @table_name
    |> :ets.lookup(room_id)
    |> Enum.map(fn {_room_id, stroke} -> stroke end)
    |> Enum.sort_by(& &1.created_at)
  end

  @doc """
  Get stroke count for a room.
  """
  @spec stroke_count(String.t()) :: non_neg_integer()
  def stroke_count(room_id) do
    :ets.select_count(@table_name, [{{room_id, :_}, [], [true]}])
  end

  @doc """
  Clear all strokes for a room.
  """
  @spec clear_room(String.t()) :: :ok
  def clear_room(room_id) do
    :ets.delete(@table_name, room_id)
    :ets.delete(@live_strokes_table, room_id)
    Logger.info("Room #{room_id} strokes cleared")
    :ok
  end

  @doc """
  Store a live stroke (in-progress drawing from a user).
  Live strokes are stored separately and updated frequently.
  """
  @spec update_live_stroke(String.t(), String.t(), map()) :: :ok
  def update_live_stroke(room_id, stroke_id, stroke_data) do
    live_stroke = %{
      stroke_id: stroke_id,
      user_id: stroke_data["user_id"] || stroke_data[:user_id],
      color: stroke_data["color"] || stroke_data[:color],
      width: stroke_data["width"] || stroke_data[:width],
      points: stroke_data["points"] || stroke_data[:points],
      updated_at: System.system_time(:millisecond)
    }

    # Use stroke_id as secondary key for quick lookup
    :ets.insert(@live_strokes_table, {{room_id, stroke_id}, live_stroke})
    :ok
  end

  @doc """
  Remove a live stroke when drawing is finished.
  """
  @spec remove_live_stroke(String.t(), String.t()) :: :ok
  def remove_live_stroke(room_id, stroke_id) do
    :ets.delete(@live_strokes_table, {room_id, stroke_id})
    :ok
  end

  @doc """
  Get all live strokes for a room.
  """
  @spec get_live_strokes(String.t()) :: list(map())
  def get_live_strokes(room_id) do
    # Match all keys starting with room_id
    pattern = {{room_id, :_}, :_}

    :ets.match_object(@live_strokes_table, pattern)
    |> Enum.map(fn {_key, stroke} -> stroke end)
  end

  @doc """
  Get room state: completed strokes + live strokes.
  Used for full sync when a client joins or requests reconciliation.
  """
  @spec get_room_state(String.t()) :: %{strokes: list(stroke()), live_strokes: list(map())}
  def get_room_state(room_id) do
    %{
      strokes: get_strokes(room_id),
      live_strokes: get_live_strokes(room_id)
    }
  end

  # Server Callbacks

  @impl true
  def init(_opts) do
    # Create ETS tables
    # :bag allows multiple values per key
    :ets.new(@table_name, [
      :bag,
      :public,
      :named_table,
      read_concurrency: true,
      write_concurrency: true
    ])

    # :set for live strokes (one stroke per {room_id, stroke_id})
    :ets.new(@live_strokes_table, [
      :set,
      :public,
      :named_table,
      read_concurrency: true,
      write_concurrency: true
    ])

    Logger.info("StrokeStore started with ETS tables")
    {:ok, %{}}
  end

  # Private

  defp generate_id do
    "stroke_" <> Base.encode16(:crypto.strong_rand_bytes(8), case: :lower)
  end
end
