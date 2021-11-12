// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { OpNode } from './data';
import {
  TreeView,
  TreeViewModel,
  TreeViewColumn
} from './treeview';
import { createSpanElement, formatDuration } from './util';

class OpNodeTreeViewModel implements TreeViewModel<OpNode> {
  readonly #unsortedRoot: OpNode;
  #root: OpNode;

  constructor(rootNode: OpNode) {
    this.#unsortedRoot = rootNode;
    this.#root = rootNode;
  }

  getChildRowCount(row?: OpNode): number {
    return (row ?? this.#root).children.length;
  }

  getChildRow(rowIndex: number, parentRow?: OpNode): OpNode {
    return (parentRow ?? this.#root).children[rowIndex];
  }

  getCellViewElem(row: OpNode, column: TreeViewColumn): string | HTMLElement {
    switch (column.id) {
      case 'name':
        return row.op.name;
      case 'count':
        return row.invocationCount.toLocaleString();
      case 'duration':
        const elem = createSpanElement(null, 'duration');
        const [duration, unit] = formatDuration(row.cumlTotalDurationNs);
        if (duration && unit) {
          const durationElem = createSpanElement(
            duration.toLocaleString(
              undefined,
              { maximumFractionDigits: 1 }),
            'value');
          const unitElem = createSpanElement(unit, 'unit');
          elem.appendChild(durationElem);
          elem.appendChild(unitElem);
        }
        return elem;
      case 'schema':
        return createSpanElement(row.op.schema, 'schema');
    }

    throw new Error(`unbound column id ${column.id}`);
  }

  sort(column: TreeViewColumn, order?: 'asc' | 'desc') {
    if (!order) {
      this.#root = this.#unsortedRoot;
      return;
    }

    this.#root = this.#unsortedRoot.sort((a: OpNode, b: OpNode) => {
      let cmp = 0;
      switch (column.id) {
        case 'count':
          cmp = a.invocationCount - b.invocationCount;
          break;
        case 'duration':
          cmp = a.cumlTotalDurationNs - b.cumlTotalDurationNs;
          break;
      }
      return order === 'desc' ? cmp * -1 : cmp;
    });
  }
}

export class OpNodeTreeView extends TreeView<OpNode> {
  constructor(rootNode: OpNode) {
    super(
      new OpNodeTreeViewModel(rootNode),
      { id: 'name', title: 'Name', holdsExpander: true },
      { id: 'count', title: 'Count', isSortable: true },
      { id: 'duration', title: 'Duration', isSortable: true },
      { id: 'schema', title: 'Operator Schema' });
  }
}