// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export class Op {
  readonly handle: number;
  readonly name: string;
  readonly schema: string | null;

  constructor(
    handle: number,
    name: string,
    schema: string | null) {
    this.handle = handle;
    this.name = name;
    this.schema = schema;
  }
}

export class OpNode {
  readonly op: Op;
  readonly invocationCount: number;
  readonly cumlTotalDurationNs: number;
  readonly children: OpNode[];

  constructor(
    op: Op,
    invocationCount: number,
    cumlDurationNs: number,
    children: OpNode[]) {
    this.op = op;
    this.invocationCount = invocationCount;
    this.cumlTotalDurationNs = cumlDurationNs;
    this.children = children;
  }

  sort(comparer: (a: OpNode, b: OpNode) => number): OpNode {
    return new OpNode(
      this.op,
      this.invocationCount,
      this.cumlTotalDurationNs,
      this.children.map(child => child.sort(comparer)).sort(comparer));
  }
}

export class BinaryOpNodeReader {
  #buffer: ArrayBuffer;
  #view: DataView;
  #offset: number;
  #utf8: TextDecoder;
  #opTable: Map<number, Op>;

  constructor(buffer: ArrayBuffer) {
    this.#buffer = buffer;
    this.#view = new DataView(this.#buffer);
    this.#offset = 0;
    this.#utf8 = new TextDecoder('utf8');
    this.#opTable = new Map<number, Op>();
  }

  #readUint16(): number {
    const n = this.#view.getUint16(this.#offset, true);
    this.#offset += 2;
    return n;
  }

  #readUint32(): number {
    const n = this.#view.getUint32(this.#offset, true);
    this.#offset += 4;
    return n;
  }

  #readUtf8(): string | null {
    const len = this.#readUint16();
    if (len == 0) {
      return null;
    }
    const view = new DataView(this.#buffer, this.#offset, len);
    const str = this.#utf8.decode(view);
    this.#offset += len;
    return str;
  }

  #readOp(): Op {
    const taggedHandle = this.#readUint16();
    const handle = taggedHandle >> 1;
    if ((taggedHandle & 1) === 0) {
      const opName = this.#readUtf8();
      if (!opName) {
        throw new Error('unexpected end of data');
      }

      this.#opTable.set(handle, new Op(
        handle,
        opName,
        this.#readUtf8()
      ));
    }
    const op = this.#opTable.get(handle);
    if (!op) {
      throw new Error(`Op with handle '${handle}' not in table`);
    }
    return op;
  }

  #readOpNodeChildren(): OpNode[] {
    const childCount = this.#readUint16();
    const children = [];
    for (let i = 0; i < childCount; i++) {
      children.push(this.readOpNode());
    }
    return children;
  }

  readOpNode(): OpNode {
    return new OpNode(
      this.#readOp(),
      this.#readUint32(),
      this.#readUint32() * 1000,
      this.#readOpNodeChildren());
  }
}