<?xml version="1.0" encoding="UTF-8"?>
<!--
  MBF Structure Model

  Defines the AST nodes for the binary protocol DSL.
  These concepts represent the protocol definition structure.
-->
<model ref="r:struct-uuid(com.mps.protocol.mbf.structure)">
  <persistence version="9" />
  <languages>
    <use id="c72da2b9-7cce-4447-8389-f407dc1158b7" name="jetbrains.mps.lang.structure" version="9" />
  </languages>

  <!-- Protocol Definition Root -->
  <node concept="1TIwiD" id="protocolRoot">
    <property role="TrG5h" value="Protocol" />
    <property role="19KtqR" value="true" />
    <node concept="1TJgyj" id="protocolMessages" role="1TKVEi">
      <property role="20lmBu" value="aggregation" />
      <property role="20kJfa" value="messages" />
      <property role="20lbJX" value="0..n" />
      <ref role="20lvS9" node="messageType" resolve="MessageType" />
    </node>
    <node concept="1TJgyj" id="protocolTypes" role="1TKVEi">
      <property role="20lmBu" value="aggregation" />
      <property role="20kJfa" value="types" />
      <property role="20lbJX" value="0..n" />
      <ref role="20lvS9" node="customType" resolve="CustomType" />
    </node>
    <node concept="1TJgyi" id="protocolMagic" role="1TKVEl">
      <property role="TrG5h" value="magic" />
      <ref role="AX2Wp" to="tpck:fKAOsGN" resolve="string" />
    </node>
    <node concept="1TJgyi" id="protocolVersion" role="1TKVEl">
      <property role="TrG5h" value="version" />
      <ref role="AX2Wp" to="tpck:fKAQMTA" resolve="integer" />
    </node>
  </node>

  <!-- Message Type Definition -->
  <node concept="1TIwiD" id="messageType">
    <property role="TrG5h" value="MessageType" />
    <node concept="1TJgyi" id="messageTypeId" role="1TKVEl">
      <property role="TrG5h" value="typeId" />
      <ref role="AX2Wp" to="tpck:fKAQMTA" resolve="integer" />
    </node>
    <node concept="1TJgyj" id="messageFields" role="1TKVEi">
      <property role="20lmBu" value="aggregation" />
      <property role="20kJfa" value="fields" />
      <property role="20lbJX" value="0..n" />
      <ref role="20lvS9" node="field" resolve="Field" />
    </node>
  </node>

  <!-- Field Definition -->
  <node concept="1TIwiD" id="field">
    <property role="TrG5h" value="Field" />
    <node concept="1TJgyi" id="fieldName" role="1TKVEl">
      <property role="TrG5h" value="name" />
      <ref role="AX2Wp" to="tpck:fKAOsGN" resolve="string" />
    </node>
    <node concept="1TJgyj" id="fieldType" role="1TKVEi">
      <property role="20lmBu" value="reference" />
      <property role="20kJfa" value="type" />
      <property role="20lbJX" value="1" />
      <ref role="20lvS9" node="dataType" resolve="DataType" />
    </node>
  </node>

  <!-- Custom Type Definition -->
  <node concept="1TIwiD" id="customType">
    <property role="TrG5h" value="CustomType" />
    <node concept="1TJgyj" id="customTypeFields" role="1TKVEi">
      <property role="20lmBu" value="aggregation" />
      <property role="20kJfa" value="fields" />
      <property role="20lbJX" value="0..n" />
      <ref role="20lvS9" node="field" resolve="Field" />
    </node>
  </node>

  <!-- Data Types -->
  <node concept="1TIwiD" id="dataType" abstract="true">
    <property role="TrG5h" value="DataType" />
  </node>

  <node concept="1TIwiD" id="primitiveType" extends="dataType">
    <property role="TrG5h" value="PrimitiveType" />
    <node concept="1TJgyi" id="primitiveKind" role="1TKVEl">
      <property role="TrG5h" value="kind" />
      <ref role="AX2Wp" to="tpck:fKAOsGN" resolve="string" />
      <!-- u8, u16, u32, u64, i8, i16, i32, i64, bool -->
    </node>
  </node>

  <node concept="1TIwiD" id="arrayType" extends="dataType">
    <property role="TrG5h" value="ArrayType" />
    <node concept="1TJgyj" id="arrayElementType" role="1TKVEi">
      <property role="20lmBu" value="reference" />
      <property role="20kJfa" value="elementType" />
      <property role="20lbJX" value="1" />
      <ref role="20lvS9" node="dataType" resolve="DataType" />
    </node>
    <node concept="1TJgyi" id="arrayLengthType" role="1TKVEl">
      <property role="TrG5h" value="lengthType" />
      <ref role="AX2Wp" to="tpck:fKAOsGN" resolve="string" />
      <!-- u8, u16, u32 for length prefix -->
    </node>
  </node>

  <node concept="1TIwiD" id="referenceType" extends="dataType">
    <property role="TrG5h" value="ReferenceType" />
    <node concept="1TJgyj" id="referenceTarget" role="1TKVEi">
      <property role="20lmBu" value="reference" />
      <property role="20kJfa" value="target" />
      <property role="20lbJX" value="1" />
      <ref role="20lvS9" node="customType" resolve="CustomType" />
    </node>
  </node>
</model>
