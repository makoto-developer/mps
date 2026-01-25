<?xml version="1.0" encoding="UTF-8"?>
<!--
  Rust Generator Template for MBF Protocol

  Generates Rustler NIF code for Elixir integration.
  Template macros for:
  - Struct definitions
  - Encode functions
  - Decode functions
  - NIF registration
-->
<model ref="r:rust-gen(com.mps.protocol.mbf.generator.rust)">
  <persistence version="9" />
  <languages>
    <use id="b401a680-8325-4110-8fd3-84331ff25bef" name="jetbrains.mps.lang.generator" version="4" />
  </languages>

  <!-- Root Template -->
  <node concept="bUwia" id="root_template">
    <property role="TrG5h" value="main" />
    <node concept="2rT7sh" id="mapping_label" role="2rTMjI">
      <property role="TrG5h" value="Protocol_to_RustModule" />
      <ref role="2rTdP9" to="mbf.structure:protocolRoot" />
    </node>
  </node>

  <!--
    Template Macro: Generate Rust struct from MessageType

    Example output:
    ```rust
    #[derive(Debug, Clone, NifStruct)]
    #[module = "MBF.StrokeSync"]
    pub struct StrokeSync {
        pub stroke_id: StrokeId,
        pub color: Color,
        pub width: u8,
        pub points: Vec<Point>,
    }
    ```
  -->
  <node concept="1Koe21" id="struct_template">
    <property role="TrG5h" value="struct_from_message" />
    <!-- Template logic would go here -->
  </node>

  <!--
    Template Macro: Generate encode function

    Example output:
    ```rust
    #[rustler::nif]
    fn encode_stroke_sync(msg: StrokeSync) -> Result<Binary<'static>, String> {
        let mut buf = Vec::new();
        buf.extend_from_slice(&MAGIC);
        buf.push(VERSION);
        // ... field encoding
        vec_to_binary(buf)
    }
    ```
  -->
  <node concept="1Koe21" id="encode_template">
    <property role="TrG5h" value="encode_function" />
    <!-- Template logic would go here -->
  </node>

  <!--
    Template Macro: Generate decode function

    Example output:
    ```rust
    #[rustler::nif]
    fn decode_stroke_sync(binary: Binary) -> Result<StrokeSync, String> {
        let data = binary.as_slice();
        // ... validation and parsing
        Ok(StrokeSync { ... })
    }
    ```
  -->
  <node concept="1Koe21" id="decode_template">
    <property role="TrG5h" value="decode_function" />
    <!-- Template logic would go here -->
  </node>
</model>
