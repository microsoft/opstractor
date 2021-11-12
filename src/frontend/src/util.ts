// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export function formatDuration(durationNs: number):
  [number | undefined, string | undefined] {
  if (durationNs === undefined || durationNs === 0) {
    return [undefined, undefined];
  }
  const scales = [0, 1e3, 1e6, 1e9];
  const units = ["ns", "µs", "ms", "s"];
  let scale = Math.floor(Math.log10(durationNs) / 3);
  if (scale < 0 || scale > scales.length)
    scale = scales.length - 1;
  const durationScaled = durationNs / scales[scale];
  return [durationScaled, units[scale]];
}

export function createElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  ...cssClasses: string[]): HTMLElementTagNameMap[K] {
  const elem = document.createElement(tagName);
  elem.classList.add(...cssClasses);
  return elem;
}

export function createSpanElement(
  innerText?: string | null,
  ...cssClasses: string[]): HTMLSpanElement {
  const elem = createElement('span', ...cssClasses);
  if (innerText) {
    elem.innerText = innerText;
  }
  return elem;
}

export class BidiMap<A, B> {
  readonly #aToB: Map<A, B>;
  readonly #bToA: Map<B, A>;

  constructor() {
    this.#aToB = new Map<A, B>();
    this.#bToA = new Map<B, A>();
  }

  set(a: A, b: B) {
    if (a === undefined || b === undefined || a === null || b === null) {
      throw new TypeError(
        'a and b parameters must be non-null/undefined');
    }

    this.#aToB.set(a, b);
    this.#bToA.set(b, a);
  }

  get(key: A | B): [A | undefined, B | undefined] {
    let a = this.getA(<B>key);
    let b = this.getB(<A>key);
    if (a === undefined && b === undefined) {
      return [undefined, undefined];
    } else if (a === undefined) {
      if (b) {
        a = this.#bToA.get(b);
      }
    } else if (b === undefined) {
      b = this.#aToB.get(a);
    }
    return [a, b];
  }

  getA(key: B): A | undefined {
    return this.#bToA.get(key);
  }

  getB(key: A): B | undefined {
    return this.#aToB.get(key);
  }

  delete(key: A | B) {
    let [a, b] = this.get(key);
    if (a) {
      this.#aToB.delete(a);
    }
    if (b) {
      this.#bToA.delete(b);
    }
  }

  clear() {
    this.#aToB.clear();
    this.#bToA.clear();
  }

  *[Symbol.iterator](): Generator<[A, B]> {
    for (const entry of this.#aToB) {
      yield entry;
    }
  }
}