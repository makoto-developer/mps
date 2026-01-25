<?xml version="1.0" encoding="UTF-8"?>
<!--
  TypeScript Generator Template for MBF Protocol

  Generates browser-compatible codec using DataView API.
  Template macros for:
  - Interface definitions
  - Encode functions
  - Decode functions
  - Utility functions
-->
<model ref="r:ts-gen(com.mps.protocol.mbf.generator.typescript)">
  <persistence version="9" />
  <languages>
    <use id="b401a680-8325-4110-8fd3-84331ff25bef" name="jetbrains.mps.lang.generator" version="4" />
  </languages>

  <!-- Root Template -->
  <node concept="bUwia" id="root_template">
    <property role="TrG5h" value="main" />
  </node>

  <!--
    Template Macro: Generate TypeScript interface from MessageType

    Example output:
    ```typescript
    export interface StrokeSyncMessage {
      type: MBFMessageType.STROKE_SYNC;
      strokeId: StrokeId;
      color: Color;
      width: number;
      points: Point[];
    }
    ```
  -->
  <node concept="1Koe21" id="interface_template">
    <property role="TrG5h" value="interface_from_message" />
    <!-- Template logic:
         1. Convert message name to PascalCase + "Message"
         2. Add type discriminator field
         3. Map field types to TypeScript types:
            - u8, u16, u32 -> number
            - u64 -> bigint
            - bool -> boolean
            - Custom types -> reference
            - Array -> Type[]
    -->
  </node>

  <!--
    Template Macro: Generate encode function

    Example output:
    ```typescript
    export function encodeStrokeSync(message: Omit<StrokeSyncMessage, 'type'>): ArrayBuffer {
      const buffer = new ArrayBuffer(size);
      const view = new DataView(buffer);
      // ... field encoding with big-endian
      return buffer;
    }
    ```
  -->
  <node concept="1Koe21" id="encode_template">
    <property role="TrG5h" value="encode_function" />
    <!-- Template logic:
         1. Calculate buffer size from fields
         2. Write magic bytes
         3. Write version and flags
         4. Write message type
         5. For each field:
            - u8: view.setUint8(offset++, value)
            - u16: view.setUint16(offset, value, false); offset += 2
            - u32: view.setUint32(offset, value, false); offset += 4
            - u64: view.setBigUint64(offset, value, false); offset += 8
            - Array: write length prefix, then each element
    -->
  </node>

  <!--
    Template Macro: Generate decode function

    Example output:
    ```typescript
    function decodeStrokeSync(buffer: ArrayBuffer): StrokeSyncMessage | null {
      const view = new DataView(buffer);
      // ... validation and parsing
      return { type: MBFMessageType.STROKE_SYNC, ... };
    }
    ```
  -->
  <node concept="1Koe21" id="decode_template">
    <property role="TrG5h" value="decode_function" />
    <!-- Template logic: reverse of encode -->
  </node>
</model>
