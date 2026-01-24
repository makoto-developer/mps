defmodule Signaling.RoomServer do
  @moduledoc """
  GenServer managing participants in a drawing room.
  Tracks connected peers and facilitates WebRTC signaling.
  """
  use GenServer
  require Logger

  @type peer :: %{
    user_id: String.t(),
    socket_id: String.t(),
    joined_at: DateTime.t()
  }

  @type state :: %{
    room_id: String.t(),
    peers: %{String.t() => peer()},
    created_at: DateTime.t()
  }

  # Client API

  @spec start_link(String.t()) :: GenServer.on_start()
  def start_link(room_id) do
    GenServer.start_link(__MODULE__, room_id, name: via_tuple(room_id))
  end

  @spec get_or_create(String.t()) :: {:ok, pid()} | {:error, term()}
  def get_or_create(room_id) do
    case Registry.lookup(Signaling.RoomRegistry, room_id) do
      [{pid, _}] ->
        {:ok, pid}

      [] ->
        DynamicSupervisor.start_child(
          Signaling.RoomSupervisor,
          {__MODULE__, room_id}
        )
    end
  end

  @spec join(String.t(), String.t(), String.t()) :: {:ok, list(peer())} | {:error, term()}
  def join(room_id, user_id, socket_id) do
    case get_or_create(room_id) do
      {:ok, pid} -> GenServer.call(pid, {:join, user_id, socket_id})
      error -> error
    end
  end

  @spec leave(String.t(), String.t()) :: :ok
  def leave(room_id, socket_id) do
    case Registry.lookup(Signaling.RoomRegistry, room_id) do
      [{pid, _}] -> GenServer.cast(pid, {:leave, socket_id})
      [] -> :ok
    end
  end

  @spec get_peers(String.t()) :: list(peer())
  def get_peers(room_id) do
    case Registry.lookup(Signaling.RoomRegistry, room_id) do
      [{pid, _}] -> GenServer.call(pid, :get_peers)
      [] -> []
    end
  end

  # Server Callbacks

  @impl true
  def init(room_id) do
    Logger.info("Room #{room_id} created")

    state = %{
      room_id: room_id,
      peers: %{},
      created_at: DateTime.utc_now()
    }

    {:ok, state}
  end

  @impl true
  def handle_call({:join, user_id, socket_id}, _from, state) do
    existing_peers = Map.values(state.peers)

    peer = %{
      user_id: user_id,
      socket_id: socket_id,
      joined_at: DateTime.utc_now()
    }

    new_peers = Map.put(state.peers, socket_id, peer)
    new_state = %{state | peers: new_peers}

    Logger.info("User #{user_id} joined room #{state.room_id}, total peers: #{map_size(new_peers)}")

    {:reply, {:ok, existing_peers}, new_state}
  end

  @impl true
  def handle_call(:get_peers, _from, state) do
    {:reply, Map.values(state.peers), state}
  end

  @impl true
  def handle_cast({:leave, socket_id}, state) do
    case Map.pop(state.peers, socket_id) do
      {nil, _} ->
        {:noreply, state}

      {peer, new_peers} ->
        Logger.info("User #{peer.user_id} left room #{state.room_id}, remaining peers: #{map_size(new_peers)}")

        new_state = %{state | peers: new_peers}

        if map_size(new_peers) == 0 do
          Logger.info("Room #{state.room_id} is empty, stopping")
          {:stop, :normal, new_state}
        else
          {:noreply, new_state}
        end
    end
  end

  # Private

  defp via_tuple(room_id) do
    {:via, Registry, {Signaling.RoomRegistry, room_id}}
  end
end
