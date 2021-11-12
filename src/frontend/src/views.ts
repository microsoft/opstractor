// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { createElement } from './util';

export class View<K extends keyof HTMLElementTagNameMap> {
  readonly elem: HTMLElementTagNameMap[K];

  constructor(tagName: K, ...cssClasses: string[]) {
    this.elem = createElement(tagName, ...cssClasses);
  }

  protected appendView<K extends keyof HTMLElementTagNameMap>(view: View<K>) {
    this.elem.appendChild(view.elem);
  }

  dispose() {
    this.elem?.parentNode?.removeChild(this.elem);
  }
}