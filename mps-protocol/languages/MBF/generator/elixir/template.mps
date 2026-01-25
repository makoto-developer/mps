<?xml version="1.0" encoding="UTF-8"?>
<!--
  Elixir Generator Template for MBF Protocol

  Generates Elixir modules that wrap the Rust NIF.
  Template macros for:
  - Struct definitions (defstruct)
  - Type specs
  - Wrapper functions
  - Conversion helpers
-->
<model ref="r:elixir-gen(com.mps.protocol.mbf.generator.elixir)">
  <persistence version="9" />
  <languages>
    <use id="b401a680-8325-4110-8fd3-84331ff25bef" name="jetbrains.mps.lang.generator" version="4" />
  </languages>

  <!-- Root Template -->
  <node concept="bUwia" id="root_template">
    <property role="TrG5h" value="main" />
  </node>

  <!--
    Template Macro: Generate Elixir defstruct from CustomType/MessageType

    Example output:
    ```elixir
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
    ```
  -->
  <node concept="1Koe21" id="struct_template">
    <property role="TrG5h" value="struct_from_type" />
    <!-- Template logic:
         1. Generate module with MBF namespace
         2. Add @moduledoc from message description
         3. Generate defstruct with field atoms
         4. Generate @type spec with proper type mapping:
            - u8, u16, u32, u64 -> non_neg_integer()
            - bool -> boolean()
            - Custom types -> MBF.TypeName.t()
            - Array -> list(element_type)
    -->
  </node>

  <!--
    Template Macro: Generate encode wrapper function

    Example output:
    ```elixir
    @spec encode(atom(), map()) :: {:ok, binary()} | {:error, String.t()}
    def encode(:stroke_sync, data) do
      msg = to_stroke_sync(data)
      Native.encode_stroke_sync(msg)
    end
    ```
  -->
  <node concept="1Koe21" id="encode_wrapper_template">
    <property role="TrG5h" value="encode_wrapper" />
    <!-- Template logic:
         1. Pattern match on message type atom
         2. Convert input map to struct
         3. Call Native NIF function
    -->
  </node>

  <!--
    Template Macro: Generate decode wrapper function

    Example output:
    ```elixir
    @spec decode(binary()) :: {:ok, {atom(), map()}} | {:error, String.t()}
    def decode(binary) when is_binary(binary) do
      case Native.decode_message_type(binary) do
        {:ok, @stroke_sync} ->
          case Native.decode_stroke_sync(binary) do
            {:ok, msg} -> {:ok, {:stroke_sync, from_stroke_sync(msg)}}
            error -> error
          end
        # ... other cases
      end
    end
    ```
  -->
  <node concept="1Koe21" id="decode_wrapper_template">
    <property role="TrG5h" value="decode_wrapper" />
    <!-- Template logic:
         1. Get message type from header
         2. Pattern match and call appropriate decoder
         3. Convert struct back to map
    -->
  </node>

  <!--
    Template Macro: Generate conversion helpers

    Example output:
    ```elixir
    defp to_stroke_sync(data) do
      %StrokeSync{
        stroke_id: parse_stroke_id(data[:stroke_id]),
        color: parse_color(data[:color]),
        width: data[:width] || 3,
        points: parse_points(data[:points] || [])
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
    ```
  -->
  <node concept="1Koe21" id="conversion_template">
    <property role="TrG5h" value="conversion_helpers" />
  </node>
</model>
