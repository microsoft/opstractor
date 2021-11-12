// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { View } from './views';
import { createElement, createSpanElement, BidiMap } from './util';

export interface TreeViewColumn {
  readonly id: string;
  readonly title: string;
  readonly holdsExpander?: boolean;
  readonly isSortable?: boolean;
  readonly headerElemFactory?: (
    column: TreeViewColumn) => HTMLTableCellElement;
}

interface TreeViewColumnView {
  readonly definition: TreeViewColumn;
  readonly thElem: HTMLTableCellElement;
  sortOrder?: 'asc' | 'desc';
};

export interface TreeViewModel<TRow> {
  readonly getChildRowCount: (
    row?: TRow) => number;

  readonly getChildRow: (
    rowIndex: number,
    parentRow?: TRow) => TRow | null;

  readonly getCellViewElem: (
    row: TRow,
    column: TreeViewColumn) => string | HTMLElement;

  readonly sort?: (
    column: TreeViewColumn,
    order?: 'asc' | 'desc') => void;

  readonly allowMultiColumnSort?: boolean;
}

export class TreeView<TRow> extends View<'table'> {
  readonly #model: TreeViewModel<TRow>;
  readonly #columnViews: TreeViewColumnView[];
  readonly #rowElemsMap: BidiMap<TRow, HTMLTableRowElement>;
  readonly #theadElem: HTMLTableSectionElement;

  constructor(
    model: TreeViewModel<TRow>,
    ...columns: TreeViewColumn[]) {
    super('table');
    this.elem.classList.add('tree-view');

    this.#model = model;
    this.#columnViews = [];
    this.#rowElemsMap = new BidiMap();

    this.#theadElem = createElement('thead');
    this.elem.appendChild(this.#theadElem);

    this.#initializeColumns(columns);
    this.reloadData();
  }

  #initializeColumns(columns: TreeViewColumn[]) {
    for (const column of columns) {
      const thElem = createElement('th', `col-id-${column.id}`);
      thElem.appendChild((column.headerElemFactory ?? (_ => {
        return createSpanElement(column.title);
      }))(column));

      const columnView = {
        definition: column,
        thElem: thElem
      };

      this.#theadElem.appendChild(thElem);
      this.#columnViews.push(columnView);

      if (this.#model.sort && column.isSortable) {
        thElem.classList.add('sortable');
        thElem.addEventListener('click', _ => this.#sortByColumn(columnView));
      }
    }
  }

  #invalidateRows() {
    for (const [row, rowElem] of this.#rowElemsMap) {
      rowElem.parentElement?.removeChild(rowElem);
    }
    this.#rowElemsMap.clear();
  }

  reloadData() {
    this.#invalidateRows();

    for (let i = 0, n = this.#model.getChildRowCount(); i < n; i++) {
      const row = this.#model.getChildRow(i);
      if (row) {
        const rowElem = this.#createRowElem(row, 0);
        this.#rowElemsMap.set(row, rowElem);
        this.elem.appendChild(rowElem);
      }
    }
  }

  #createRowElem(row: TRow, rowDepth: number): HTMLTableRowElement {
    const rowElem = createElement('tr');
    for (let i = 0; i < this.#columnViews.length; i++) {
      const column = this.#columnViews[i];
      const tdElem = createElement('td', `col-id-${column.definition.id}`);

      for (let d = 0; d < rowDepth; d++) {
        tdElem.appendChild(createElement('span', 'indent'));
      }

      if (column.definition.holdsExpander) {
        tdElem.classList.add('expander-column');
        const expanderElem = createElement('span', 'expander');
        if (this.#model.getChildRowCount(row) > 0) {
          tdElem.classList.add('expandable');
          tdElem.addEventListener(
            'click',
            _ => this.#ensureAndToggleRowChildren(row, rowElem, rowDepth));
        }
        tdElem.appendChild(expanderElem);
      }

      const cellViewElem = this.#model.getCellViewElem(row, column.definition);
      if (typeof cellViewElem === 'string') {
        tdElem.appendChild(createSpanElement(cellViewElem));
      } else if (cellViewElem) {
        tdElem.appendChild(cellViewElem);
      }

      rowElem.appendChild(tdElem);
    }
    return rowElem;
  }

  #ensureAndToggleRowChildren(
    row: TRow,
    rowElem: HTMLTableRowElement,
    rowDepth: number,
    action?: 'expand' | 'collapse'): HTMLTableRowElement {
    if (!action) {
      action = rowElem.classList.toggle('expanded')
        ? 'expand'
        : 'collapse';
    }

    let insertionReferenceElem = rowElem;

    for (let i = 0, n = this.#model.getChildRowCount(row); i < n; i++) {
      const childRow = this.#model.getChildRow(i, row);
      if (!childRow) {
        continue;
      }

      let childRowElem = this.#rowElemsMap.getB(childRow);

      if (!childRowElem) {
        childRowElem = this.#createRowElem(childRow, rowDepth + 1);
        this.#rowElemsMap.set(childRow, childRowElem);
        insertionReferenceElem.parentNode?.insertBefore(
          childRowElem,
          insertionReferenceElem.nextSibling);
      }

      insertionReferenceElem = childRowElem;

      if (action === 'expand') {
        childRowElem.classList.remove('row-hidden');
      } else {
        childRowElem.classList.add('row-hidden');
        childRowElem.classList.remove('expanded');
        insertionReferenceElem = this.#ensureAndToggleRowChildren(
          childRow,
          childRowElem,
          rowDepth + 1,
          action);
      }
    }

    return insertionReferenceElem;
  }

  #sortByColumn(columnView: TreeViewColumnView) {
    if (!this.#model.sort) {
      return;
    }

    for (const cv of this.#columnViews) {
      if (cv !== columnView) {
        cv.sortOrder = undefined;
      }
      cv.thElem.classList.remove('sort-asc');
      cv.thElem.classList.remove('sort-desc');
    }

    switch (columnView.sortOrder) {
      case undefined:
      case null:
        columnView.sortOrder = 'desc';
        columnView.thElem.classList.add('sort-desc');
        break;
      case 'desc':
        columnView.sortOrder = 'asc';
        columnView.thElem.classList.add('sort-asc');
        break;
      case 'asc':
        columnView.sortOrder = undefined;
        break;
      default:
        throw new TypeError(
          `invalid sort order: ${columnView.sortOrder} ` +
          `for column ${columnView.definition.id}`);
    }

    this.#model.sort(columnView.definition, columnView.sortOrder);

    this.reloadData();
  }
}