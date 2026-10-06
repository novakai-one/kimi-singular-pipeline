// DOM labels pinned to 3-D points (crisp text, KaTeX maths).
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import katex from 'katex';
import type { V3 } from '../core/stage';

/** Render a string that may contain $…$ maths into HTML. */
export function texHTML(s: string): string {
  return s.replace(/\$([^$]+)\$/g, (_, m: string) => {
    try { return katex.renderToString(m, { throwOnError: false, output: 'html' }); } catch { return m; }
  });
}

export function tex(m: string, display = false): string {
  try { return katex.renderToString(m, { throwOnError: false, displayMode: display, output: 'html' }); } catch { return m; }
}

export interface LabelOpts { color?: string; className?: string; size?: number; offset?: [number, number] }

export class Label {
  readonly object: CSS2DObject;
  readonly el: HTMLDivElement;

  constructor(text: string, pos: V3 = [0, 0, 0], o: LabelOpts = {}) {
    this.el = document.createElement('div');
    this.el.className = `g-label ${o.className ?? ''}`;
    if (o.color) this.el.style.color = o.color;
    if (o.size) this.el.style.fontSize = `${o.size}px`;
    if (o.offset) this.el.style.translate = `${o.offset[0]}px ${o.offset[1]}px`;
    this.el.innerHTML = texHTML(text);
    this.object = new CSS2DObject(this.el);
    this.object.position.set(...pos);
    this.object.center.set(0.5, 0.5);
  }

  set(text: string): void { this.el.innerHTML = texHTML(text); }
  at(p: V3): void { this.object.position.set(...p); }
  show(v: boolean): void { this.object.visible = v; this.el.style.display = v ? '' : 'none'; }
  dispose(): void { this.object.removeFromParent(); this.el.remove(); }
}
