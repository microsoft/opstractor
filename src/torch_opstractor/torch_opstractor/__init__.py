# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

import io
import sys

from typing import Callable, Optional, List

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

  def traverse(
    a: 'OpNode',
    b: 'OpNode',
    visitor: Callable[['OpNode', 'OpNode'], bool]) -> bool:
    if a and b and visitor(a, b) and len(a.children) == len(b.children):
      for a_child, b_child in zip(a.children, b.children):
        if not OpNode.traverse(a_child, b_child, visitor):
          return False
    else:
      return False
    return True

  def is_same_by_name(self, other: 'OpNode'):
    return OpNode.traverse(
      self,
      other,
      lambda a, b:
        a.op.name == b.op.name and
          a.op.schema == b.op.schema)

def write_flame_graph(
  node: OpNode,
  writer: io.StringIO,
  value_producer: Callable[[Op], str]):
  writer.write('{"name":"')
  writer.write(node.op.schema if node.op.schema else node.op.name)
  writer.write('","value":')
  if node.invocation_count < 1:
    writer.write('null')
  else:
    writer.write(value_producer(node))
  if len(node.children) > 0:
    writer.write(',"children":[')
    for i, child in enumerate(node.children):
      if i > 0:
        writer.write(',')
      write_flame_graph(child, writer, value_producer)
    writer.write(']')
  writer.write('}')
  writer.flush()

class OpstractorSession:
  _stack: List[OpNode]
  _distinct_graphs: OpNode
  _total_graphs: int

  def __init__(self):
    _C.install_session_hooks(
      self.op_call,
      self.op_ret)

    root_op = Op()
    root_op.name = 'model'
    root_op.schema = None
    root_graph = OpNode(root_op, None)

    self._stack = []
    self._distinct_graphs = root_graph
    self._total_graphs = 0

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
      write_flame_graph(
        self._distinct_graphs,
        sys.stderr,
        lambda node: str(node.invocation_count))
      _C.terminate_session()

default_session = OpstractorSession()