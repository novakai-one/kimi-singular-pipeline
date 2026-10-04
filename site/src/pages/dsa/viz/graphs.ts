// DSA 8 — Graphs. The student types edges (A>B one way, A-B two ways, A-B:4 with a cost) and steps through
// BFS, DFS, Dijkstra, topological sort or union-find. A panel beside the graph shows what each algorithm keeps.
// Challenge: make the course plan impossible by adding a prerequisite that closes a loop.
import { h, s } from '../../../lib/dom';
import { readout, sleep, type Viz } from '../../fieldviz/kit';
import { makePlayer, type Algorithm } from '../player';
import {
  BFS_CODE, DEFAULT_INPUT, DFS_CODE, DIJKSTRA_CODE, PRESETS, SHOW_ME_INPUT, TOPO_CODE, UF_CODE,
  bfsFrames, dfsFrames, dijkstraFrames, parseGraph, randomGraph, topoFrames, unionFindFrames,
  type GraphFrame, type NodeState, type PanelSection,
} from './graphs-core';
import './graphs.css';

const NODE_CLASS: Record<NodeState, string> = { '': 'dv-node', wait: 'dv-node front', cur: 'dv-node hi', done: 'dv-node done' };

function drawGraph(f: GraphFrame): SVGSVGElement {
  const { g, lay } = f;
  const { W, H, R } = lay;
  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'data-wide': 'true',
    'aria-label': `A graph with ${g.nodes.length} nodes and ${g.edges.length} edges` });
  // plain edges first, highlighted ones on top
  const orderOf = (st: string) => (st === 'follow' ? 3 : st === 'route' ? 2 : st === 'tree' ? 1 : 0);
  const idx = g.edges.map((_, i) => i).sort((a, b) => orderOf(f.edges[a]) - orderOf(f.edges[b]));
  for (const i of idx) {
    const p = lay.paths[i];
    const st = f.edges[i];
    svg.append(s('path', { d: p.d, class: `graphs-edge${st ? ' ' + st : ''}` }));
    if (p.arrow) svg.append(s('polygon', { points: p.arrow.map((q) => q.join(',')).join(' '), class: `graphs-arrow${st ? ' ' + st : ''}` }));
  }
  if (g.weighted) {
    g.edges.forEach((e, i) => {
      const [x, y] = lay.paths[i].label;
      const t = String(e.w);
      const w = 10 + 10 * t.length;
      svg.append(
        s('rect', { x: x - w / 2, y: y - 11, width: w, height: 22, rx: 5, class: 'graphs-cost-bg' }),
        s('text', { x, y: y + 5.5, 'text-anchor': 'middle', class: 'graphs-cost' }, t));
    });
  }
  for (const n of g.nodes) {
    const [x, y] = lay.pos[n];
    svg.append(
      s('circle', { cx: x, cy: y, r: R, class: NODE_CLASS[f.nodes[n]] }),
      s('text', { x, y: y + 7, 'text-anchor': 'middle', class: 'graphs-letter' }, n));
    const b = f.badges[n];
    if (b !== undefined) {
      const w = 12 + 8.5 * b.length;
      const bx = x + R * 0.6, by = y - R * 1.05;
      svg.append(
        s('rect', { x: bx - 4, y: by - 10, width: w, height: 20, rx: 10, class: 'graphs-badge' }),
        s('text', { x: bx - 4 + w / 2, y: by + 5, 'text-anchor': 'middle', class: 'graphs-badge-t' }, b));
    }
  }
  return svg;
}

function drawPanel(sections: PanelSection[], hint: string): HTMLElement {
  return h('div', { class: 'graphs-panel' },
    sections.map((sec) => h('div', null,
      h('div', { class: 'graphs-sec-h' }, sec.title),
      sec.rows
        ? h('table', { class: 'graphs-table' },
            h('thead', null, h('tr', null, h('th', null, 'Node'), h('th', null, 'Cost'), h('th', null, 'Via'))),
            h('tbody', null, sec.rows.map((r) => h('tr', { class: r.state || undefined }, h('td', null, r.node), h('td', null, r.cost), h('td', null, r.via)))))
        : h('div', { class: 'graphs-chips' },
            sec.chips && sec.chips.length
              ? sec.chips.map((c) => h('span', { class: `graphs-chip${c.state ? ' ' + c.state : ''}` }, c.text))
              : h('span', { class: 'graphs-empty' }, sec.empty ?? '')))),
    h('div', { class: 'graphs-hint' }, hint));
}

function render(stage: HTMLElement, f: GraphFrame) {
  stage.append(h('div', { class: 'graphs-wrap' }, h('div', { class: 'graphs-view' },
    h('div', { class: 'graphs-svg' }, drawGraph(f)),
    drawPanel(f.panel, f.badgeHint))));
}

const viz: Viz = (el, api) => {
  let showing = false;
  const resultR = readout('Result of this run');
  const legend = h('div', { class: 'legend' });
  const sw = (c: string, dashed = false) => h('span', { class: 'sw', style: `background:${c}${dashed ? ';opacity:.5' : ''}` });
  const LEGENDS: Record<string, [string, string][]> = {
    'Breadth-first (BFS)': [['var(--search)', 'found, waiting in the queue'], ['var(--yellow)', 'taken from the queue now'], ['var(--green)', 'finished'],
      ['var(--red)', 'edge being followed'], ['var(--muted)', 'edge that first reached a node']],
    'Depth-first (DFS)': [['var(--search)', 'on the stack, waiting'], ['var(--yellow)', 'top of the stack: explored now'], ['var(--green)', 'finished'],
      ['var(--red)', 'edge being followed'], ['var(--muted)', 'edge that first reached a node']],
    'Dijkstra': [['var(--search)', 'has a cost, waiting'], ['var(--yellow)', 'taken now (at the end: the cheapest route)'], ['var(--green)', 'finished: cost is final'],
      ['var(--red)', 'edge being tried'], ['var(--muted)', 'edge on the cheapest route so far']],
    'Topological sort': [['var(--search)', 'ready: no prerequisites left'], ['var(--yellow)', 'taken now'], ['var(--green)', 'in the order'],
      ['var(--red)', 'edge being crossed off (at the end: the loop)'], ['var(--faint)', 'crossed off']],
    'Union-find': [['var(--yellow)', 'the two ends of the current edge'], ['var(--search)', 'the rest of their two groups'], ['var(--green)', 'all edges done'],
      ['var(--red)', 'edge being taken'], ['var(--muted)', 'edge that joined two groups'], ['var(--faint)', 'skipped: already connected']],
  };
  const setLegend = (name: string) => legend.replaceChildren(...LEGENDS[name].map(([c, t]) => h('span', null, sw(c, t === 'crossed off' || t.startsWith('skipped')), t)));

  const algorithms: Algorithm<GraphFrame>[] = [
    { name: 'Breadth-first (BFS)', code: BFS_CODE, run: (t) => bfsFrames(parseGraph(t)) },
    { name: 'Depth-first (DFS)', code: DFS_CODE, run: (t) => dfsFrames(parseGraph(t)) },
    { name: 'Dijkstra', code: DIJKSTRA_CODE, run: (t) => dijkstraFrames(parseGraph(t)) },
    { name: 'Topological sort', code: TOPO_CODE, run: (t) => topoFrames(parseGraph(t)) },
    { name: 'Union-find', code: UF_CODE, run: (t) => unionFindFrames(parseGraph(t)) },
  ];

  const player = makePlayer<GraphFrame>({
    algorithms,
    inputs: {
      label: 'Edges: A>B means A before B (one way), A-B is a two-way link, A-B:4 costs 4',
      value: DEFAULT_INPUT,
      help: 'Separate edges with spaces or commas. Use capital letters, at most 10 of them. The first letter you type is the start; Dijkstra\'s route ends at the last new letter. Costs are 1 unless you type one.',
      presets: [
        { label: 'Course plan', value: PRESETS.course },
        { label: 'Road map', value: PRESETS.road },
        { label: 'Friend groups', value: PRESETS.friends },
      ],
      random: () => randomGraph(),
    },
    render: (stage, f) => render(stage, f),
    onRun: (frames, _input, algo) => {
      setLegend(algo.name);
      const res = frames[frames.length - 1].result ?? {};
      if (algo.name === 'Topological sort') {
        if (res.loop) {
          const loopText = [...res.loop, res.loop[0]].join(' → ');
          resultR.set('no valid order');
          if (showing) api.feedback(`E>B closes the loop ${loopText}, so no valid order exists. Now try a different edge of your own that makes a loop.`);
          else api.win(`No valid order: ${loopText} is a loop, so none of ${res.loop.join(', ')} can go first.`);
        } else {
          resultR.set(res.order!.join(', '));
          api.feedback(`Topological sort found a valid order: ${res.order!.join(', ')}. Every edge points forward. Add one prerequisite that makes this impossible.`);
        }
      } else {
        let text: string;
        if (algo.name === 'Union-find') {
          const k = res.groups!.length;
          resultR.set(`${k} group${k === 1 ? '' : 's'}`);
          text = `Union-find found ${k} group${k === 1 ? '' : 's'} of connected nodes`;
        } else if (algo.name === 'Dijkstra') {
          const t = res.route?.[res.route.length - 1];
          resultR.set(t ? `cost ${res.dist![t]} to ${t}` : 'no route to the last node');
          text = t ? `Dijkstra's cheapest route to ${t} costs ${res.dist![t]}` : 'Dijkstra found no route to the last node you typed';
        } else {
          resultR.set(res.order!.join(', '));
          text = `Visit order: ${res.order!.join(', ')}`;
        }
        api.feedback(`${text}. The challenge uses Topological sort.`);
      }
      showing = false;
    },
    stageHeight: 220,
  });
  player.el.querySelector('.dp-input')?.classList.add('graphs-input');

  el.append(
    player.el,
    legend,
    h('div', { class: 'viz-readouts' }, resultR.el),
  );

  return {
    async showMe() {
      showing = true;
      player.setInput(SHOW_ME_INPUT, 3);
      await sleep(400);
      player.play();
    },
  };
};

export default viz;
