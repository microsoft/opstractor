// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { OpNode } from './data';
import { View } from './views';
import { formatDuration } from './util';

interface FlameGraphNode {
  opNode: OpNode;
  name: string,
  value: number;
  children?: FlameGraphNode[];
}

interface FlameGraphD3Data {
  data: FlameGraphNode;
}

const skipChildNodes = [
  'enumerate(DataLoader)#_SingleProcessDataLoaderIter.__next__'
];

function toFlameGraph(node: OpNode): FlameGraphNode {
  return {
    opNode: node,
    name: node.op.name,
    value: node.cumlTotalDurationNs,
    children: skipChildNodes.indexOf(node.op.name) >= 0
      ? undefined
      : node.children.map(child => toFlameGraph(child))
  };
}

export class OpNodeFlameGraphView extends View<'div'> {
  readonly #root: OpNode;
  readonly #resizeChartCallback: () => void;

  constructor(rootNode: OpNode) {
    super('div');
    this.#root = rootNode;

    const flamegraph = (<any>window).flamegraph();

    const tip = (<any>window).d3.tip()
      .attr('class', 'd3-flame-graph-tip')
      .html((d: FlameGraphD3Data) => {
        const [duration, unit] = formatDuration(d.data.value);
        if (duration === undefined) {
          return d.data.name;
        }

        const label = d.data.opNode.op.schema ?? d.data.name;
        const durationString = duration.toLocaleString(
          undefined,
          { maximumFractionDigits: 1 });

        return `${label}: ${durationString}${unit}`;
      });

    flamegraph.tooltip(tip);

    (<any>window).d3
      .select(this.elem)
      .datum(toFlameGraph(this.#root))
      .call(flamegraph);

    this.#resizeChartCallback = () => {
      const width = this.elem.clientWidth;
      this.elem
        .querySelector('svg.d3-flame-graph')
        ?.setAttribute('width', `${width}`);
      flamegraph.width(width);
      flamegraph.resetZoom();
    };

    window.requestAnimationFrame(this.#resizeChartCallback);
    window.addEventListener('resize', this.#resizeChartCallback);
    window.addEventListener('DOMContentLoaded', this.#resizeChartCallback);
  }

  dispose() {
    window.removeEventListener('resize', this.#resizeChartCallback);
    window.removeEventListener('DOMContentLoaded', this.#resizeChartCallback);
    super.dispose();
  }
}