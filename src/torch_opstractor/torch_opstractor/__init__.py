# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

import io
import os
import atexit

from typing import Callable, Optional, List, Dict

import torch
from . import _C

#region Typings as exported from C++
hash_prime = 31

class Op:
  handle: int
  name: str
  schema: Optional[str]

class OpCall:
  op: Op
  inputs: str

  def __init__(self,
    op: Op,
    inputs: str):  
    self.op = op
    self.inputs = inputs

class OpRet:
  call: OpCall
  duration_ns: int

#endregion

class OpNode:
  _op_call: OpCall
  _parent: Optional['OpNode']
  _children: List['OpNode']
  _cuml_total_duration_ns: int
  _invocation_count: int

  @property
  def op_call(self): return self._op_call

  @property
  def parent(self): return self._parent

  @property
  def children(self): return self._children

  @property
  def cuml_total_duration_ns(self): return self._cuml_total_duration_ns

  @cuml_total_duration_ns.setter
  def cuml_total_duration_ns(self, value: int):
    if self._cuml_total_duration_ns != 0:
      raise ValueError("cuml_total_duration_ns is already set")
    self._cuml_total_duration_ns = value      

  @property
  def invocation_count(self): return self._invocation_count

  @invocation_count.setter
  def invocation_count(self, value: int):
    if self.invocation_count != 0:
      raise ValueError("invocation_count is already set")
    self._invocation_count = value      

  def __init__(self,
    op_call: OpCall,
    parent: Optional['OpNode'] = None):
    self._op_call = op_call
    self._parent = parent
    self._children = []
    self._cuml_total_duration_ns = 0
    self._invocation_count = 0

  def append_child(self, child: 'OpNode'):
    self._children.append(child)

  def ret(self, ret: OpRet):
    self._cuml_total_duration_ns += ret.duration_ns
    self._invocation_count += 1

  def merge(self, other: 'OpNode'):
    self._cuml_total_duration_ns += other._cuml_total_duration_ns
    self._invocation_count += other._invocation_count

  def traverse(self, visitor: Callable[['OpNode'], bool]) -> bool:
    # visitor may return None (e.g. void) and traversal will continue;
    # an explicit False must be returned to terminate traversal
    if visitor(self) == False:
      return False
    for child in self.children:
      if not child.traverse(visitor):
        return False
    return True

  @staticmethod
  def traverse2(
    a: 'OpNode',
    b: 'OpNode',
    visitor: Callable[['OpNode', 'OpNode'], bool]) -> bool:
    if a and b and visitor(a, b) and len(a.children) == len(b.children):
      for a_child, b_child in zip(a.children, b.children):
        if not OpNode.traverse2(a_child, b_child, visitor):
          return False
    else:
      return False
    return True

  def __hash__(self) -> int:
    hash_prime = 31
    result = hash(self._op_call.op.name)
    result = (result * hash_prime) + hash(self._op_call.op.schema)
    result = (result * hash_prime) + hash(self._op_call.inputs)

    for child in self._children:
      result = (result * hash_prime) + hash(child)

    return result

  def __eq__(self, other: 'OpNode') -> bool:
      return self.is_same_by_op_call(other)       

  def is_same_by_op_call(self, other: 'OpNode'):
    return OpNode.traverse2(
      self,
      other,
      lambda a, b:
        a.op_call.op.name == b.op_call.op.name and
          a.op_call.op.schema == b.op_call.op.schema and
          a.op_call.inputs == b.op_call.inputs)

class BinaryWriter:
  _ops: Dict[int, Op]
  _writer: io.BytesIO

  def __init__(self, writer: io.BytesIO):
    self._ops = {}
    self._writer = writer

  def _write_uint16(self, value: int):
    self._writer.write(value.to_bytes(2, byteorder='little', signed=False))

  def _write_uint32(self, value: int):
    self._writer.write(value.to_bytes(4, byteorder='little', signed=False))

  def _write_string(self, value: str):
    if not value or len(value) == 0:
      self._write_uint16(0)
    else:
      bytes = value.encode('utf8')
      self._write_uint16(len(bytes))
      self._writer.write(bytes)

  def write_op_node(self, node: OpNode):
    tagged_handle = node.op_call.op.handle
    if tagged_handle > 0x7fff:
      raise OverflowError('op handle must be <= 0x7fff')
    tagged_handle = tagged_handle << 1

    if node.op_call.op.handle in self._ops:
      self._write_uint16(tagged_handle | 1)
    else:
      self._ops[node.op_call.op.handle] = node.op_call.op
      self._write_uint16(tagged_handle)
      self._write_string(node.op_call.op.name)
      self._write_string(node.op_call.op.schema)
    self._write_string(node.op_call.inputs)
    self._write_uint32(node.invocation_count)
    self._write_uint32(int(node.cuml_total_duration_ns / 1000))
    self._write_uint16(len(node.children))
    for child in node.children:
      self.write_op_node(child)

  def close(self):
    self._writer.flush()
    self._writer.close()

class BinaryReader:
  _ops: Dict[int, Op]
  _reader: io.BytesIO

  def __init__(self, reader: io.BytesIO):
    self._ops = {}
    self._reader = reader
    self._sequence_id = 0

  def _try_read_uint16(self) -> int:
    bytes = self._reader.read(2)

    if len(bytes) > 0:
      return int.from_bytes(bytes, byteorder='little')
    else:
      return None

  def _read_uint16(self) -> int:
    return int.from_bytes(self._reader.read(2), byteorder='little')

  def _read_uint32(self) -> int:
    return int.from_bytes(self._reader.read(4), byteorder='little')

  def _read_string(self):
    len = self._read_uint16()

    if len > 0:
      bytes = self._reader.read(len)
      return bytes.decode('utf8')
    else:
      return None

  def read_op_node(self, parent: OpNode = None) -> OpNode:
    handle = self._try_read_uint16()

    if handle is None:
      raise Exception("Could not find handle for next opnode")

    op = Op()

    if handle % 2 == 0:
      op.handle = handle
      op.name = self._read_string()
      op.schema = self._read_string()
      self._ops[op.handle] = op
    else:
      op = self._ops.get((handle & ~1))

      if op is None:
        raise Exception(f'Could not find op for key {handle &~1}')

    inputs = self._read_string()
    op_call = OpCall(op, inputs)
    opnode = OpNode(op_call, parent)
    opnode.invocation_count = self._read_uint32()
    opnode.cuml_total_duration_ns = self._read_uint32() * 1000

    children_count = self._read_uint16()
    for i in range(children_count):
      opnode.append_child(self.read_op_node(parent=opnode))
    
    return opnode

  def close(self):
    self._reader.close()

class OpstractorSession:
  _stack: List[OpNode]
  _root_node: OpNode
  _distinct_children: Dict[OpNode, OpNode]
  _total_graphs: int
  _analyses_written: bool
  _writer: BinaryWriter
  _initialized: bool
  _enable_early_exit: bool

  def __init__(self):
    self._writer = None
    self._initialized = False
    _C.install_session_hooks(
      self._op_call,
      self._op_ret)

  def init(self, profile_name, profile_output_file, enable_early_exit=True):
    if self._initialized:
      raise Exception("init already called")
    outdir = os.path.dirname(profile_output_file)
    if outdir and len(outdir) > 0:
      os.makedirs(outdir, exist_ok=True)
    self._writer = BinaryWriter(open(profile_output_file, 'wb'))

    root_op = Op()
    root_op.handle = 0
    root_op.name = profile_name
    root_op.schema = None

    self._stack = []
    self._root_node = OpNode(OpCall(root_op, inputs=""), None)
    self._total_graphs = 0
    self._analyses_written = False
    self._enable_early_exit = enable_early_exit
    self._distinct_children = {}
    self._initialized = True

  def flush(self):
    if self._writer:
      self._writer.write_op_node(self._root_node)
      self._writer.close()
      self._writer = None

  def __del__(self):
    self.flush()

  def _op_call(self, call: OpCall):
    if not self._initialized:
      self.init(
        'default_initialized_profile',
        'default_initialized_profile.bin')

    parent_node: Optional[OpNode] = None
    if len(self._stack) > 0:
      parent_node = self._stack[-1]

    node = OpNode(
      call,
      parent_node)

    if parent_node:
      parent_node.append_child(node)

    self._stack.append(node)

  def _op_ret(self, ret: OpRet):
    node = self._stack.pop()
    node.ret(ret)
    if len(self._stack) == 0:
      self._log_op_node(node)

  def _log_op_node(self, node: 'OpNode'):
    self._total_graphs += 1

    existing_node = self._distinct_children.get(node)

    if existing_node is not None:
      existing_node.merge(node)
    else:
      self._distinct_children[node] = node
      self._root_node.append_child(node)

    self._on_update()

  def _on_update(self):
    if self._enable_early_exit:
      r = len(self._distinct_children) / float(self._total_graphs)
      if r < 0.01:
        self.flush()
        _C.terminate_session()

default_session = OpstractorSession()

def _atexit():
  global default_session
  del default_session

def reset_session():
  global default_session
  del default_session
  default_session = OpstractorSession()

atexit.register(_atexit)