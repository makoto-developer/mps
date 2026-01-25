defmodule MBF.Point do
  @moduledoc "Point coordinate (x, y)"
  defstruct [:x, :y]

  @type t :: %__MODULE__{
    x: non_neg_integer(),
    y: non_neg_integer()
  }
end

defmodule MBF.Color do
  @moduledoc "RGB Color"
  defstruct [:r, :g, :b]

  @type t :: %__MODULE__{
    r: non_neg_integer(),
    g: non_neg_integer(),
    b: non_neg_integer()
  }
end

defmodule MBF.StrokeId do
  @moduledoc "Stroke identifier (user_hash + timestamp)"
  defstruct [:user_hash, :timestamp]

  @type t :: %__MODULE__{
    user_hash: non_neg_integer(),
    timestamp: non_neg_integer()
  }
end

defmodule MBF.StrokeSync do
  @moduledoc "Real-time stroke synchronization message"
  defstruct [:stroke_id, :color, :width, :points]

  @type t :: %__MODULE__{
    stroke_id: MBF.StrokeId.t(),
    color: MBF.Color.t(),
    width: non_neg_integer(),
    points: list(MBF.Point.t())
  }
end

defmodule MBF.StrokeComplete do
  @moduledoc "Completed stroke message"
  defstruct [:message_id, :tool, :color, :width, :timestamp, :points]

  @type t :: %__MODULE__{
    message_id: non_neg_integer(),
    tool: non_neg_integer(),
    color: MBF.Color.t(),
    width: non_neg_integer(),
    timestamp: non_neg_integer(),
    points: list(MBF.Point.t())
  }
end

defmodule MBF.StrokeAck do
  @moduledoc "Stroke acknowledgment message"
  defstruct [:message_id, :stroke_id, :success]

  @type t :: %__MODULE__{
    message_id: non_neg_integer(),
    stroke_id: MBF.StrokeId.t(),
    success: boolean()
  }
end
