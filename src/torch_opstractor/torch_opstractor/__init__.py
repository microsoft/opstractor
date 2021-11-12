# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

import io
import atexit

from typing import Callable, Optional, List, Dict

import torch
from . import _C

#region Typings as exported from C++

class Op:
  handle: int
  name: str
  schema: Optional[str]

class OpCall:
  op: Op
  time_ns: int

class OpRet:
  call: OpCall
  duration_ns: int

#endregion

class OpNode:
  _op: Op
  _parent: Optional['OpNode']
  _children: List['OpNode']
  _cuml_total_duration_ns: int
  _invocation_count: int

  @property
  def op(self): return self._op

  @property
  def parent(self): return self._parent

  @property
  def children(self): return self._children

  @property
  def cuml_total_duration_ns(self): return self._cuml_total_duration_ns

  @property
  def invocation_count(self): return self._invocation_count

  def __init__(self,
    op: Op,
    parent: Optional['OpNode'] = None):
    self._op = op
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

  def is_same_by_name(self, other: 'OpNode'):
    return OpNode.traverse2(
      self,
      other,
      lambda a, b:
        a.op.name == b.op.name and
          a.op.schema == b.op.schema)

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
    tagged_handle = node.op.handle
    if tagged_handle > 0x7fff:
      raise OverflowError('op handle must be <= 0x7fff')
    tagged_handle = tagged_handle << 1

    if node.op.handle in self._ops:
      self._write_uint16(tagged_handle | 1)
    else:
      self._ops[node.op.handle] = node.op
      self._write_uint16(tagged_handle)
      self._write_string(node.op.name)
      self._write_string(node.op.schema)
    self._write_uint32(node.invocation_count)
    self._write_uint32(node.cuml_total_duration_ns)
    self._write_uint16(len(node.children))
    for child in node.children:
      self.write_op_node(child)

  def close(self):
    self._writer.flush()
    self._writer.close()

class OpstractorSession:
  _stack: List[OpNode]
  _distinct_graphs: OpNode
  _total_graphs: int
  _analyses_written: bool
  _writer: BinaryWriter

  def __init__(self):
    _C.install_session_hooks(
      self.op_call,
      self.op_ret)

    self._writer = BinaryWriter(open('distinct_graphs.bin', 'wb'))

    root_op = Op()
    root_op.handle = 0
    root_op.name = 'model'
    root_op.schema = None
    root_graph = OpNode(root_op, None)

    self._stack = []
    self._distinct_graphs = root_graph
    self._total_graphs = 0
    self._analyses_written = False

  def __del__(self):
    self._writer.write_op_node(self._distinct_graphs)
    self._writer.close()

  def op_call(self, call: OpCall):
    parent_node: Optional[OpNode] = None
    if len(self._stack) > 0:
      parent_node = self._stack[-1]

    node = OpNode(
      call.op,
      parent_node)

    if parent_node:
      parent_node.append_child(node)

    self._stack.append(node)

  def op_ret(self, ret: OpRet):
    node = self._stack.pop()
    node.ret(ret)
    if len(self._stack) == 0:
      self.log_op_node(node)

  def log_op_node(self, node: 'OpNode'):
    self._total_graphs += 1

    merged = False
    for distinct_graph in self._distinct_graphs.children:
      if distinct_graph.is_same_by_name(node):
        distinct_graph.merge(node)
        merged = True
    if not merged:
      self._distinct_graphs.append_child(node)

    self.on_update()

  def on_update(self):
    r = len(self._distinct_graphs.children) / float(self._total_graphs)
    if r < 0.005:
      self._writer.write_op_node(self._distinct_graphs)
      self._writer.close()
      _C.terminate_session()

default_session = OpstractorSession()

def _atexit():
  global default_session
  del default_session

atexit.register(_atexit)