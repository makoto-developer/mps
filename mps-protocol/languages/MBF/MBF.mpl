<?xml version="1.0" encoding="UTF-8"?>
<!--
  MBF (MPS Binary Format) Language Definition

  This MPS language defines a DSL for binary protocol specification.
  It generates code for multiple target platforms:
  - Rust (NIF for Elixir)
  - TypeScript (Browser)
  - Elixir (Server)
-->
<language namespace="com.mps.protocol.mbf" uuid="a1b2c3d4-e5f6-7890-abcd-ef1234567890">
  <models>
    <modelRoot contentPath="${module}" type="default">
      <sourceRoot location="models" />
    </modelRoot>
  </models>

  <generators>
    <generator name="rust" generatorUID="com.mps.protocol.mbf#rust" uuid="rust-gen-uuid">
      <models>
        <modelRoot contentPath="${module}" type="default">
          <sourceRoot location="generator/rust" />
        </modelRoot>
      </models>
    </generator>
    <generator name="typescript" generatorUID="com.mps.protocol.mbf#typescript" uuid="ts-gen-uuid">
      <models>
        <modelRoot contentPath="${module}" type="default">
          <sourceRoot location="generator/typescript" />
        </modelRoot>
      </models>
    </generator>
    <generator name="elixir" generatorUID="com.mps.protocol.mbf#elixir" uuid="elixir-gen-uuid">
      <models>
        <modelRoot contentPath="${module}" type="default">
          <sourceRoot location="generator/elixir" />
        </modelRoot>
      </models>
    </generator>
  </generators>

  <dependencies>
    <dependency reexport="false">jetbrains.mps.lang.structure</dependency>
    <dependency reexport="false">jetbrains.mps.lang.editor</dependency>
    <dependency reexport="false">jetbrains.mps.lang.generator</dependency>
  </dependencies>
</language>
