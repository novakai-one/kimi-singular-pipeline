import type { CompareDef, DoubtDef, LawDef, SayItDef, V3 } from '../../../game/types';
import { VectorHandle } from '../../../kit/handle';
import { Arrow } from '../../../gfx/arrow';
import { C } from '../../../core/theme';
import { rint } from '../../../game/lawcheck';
import { COPY } from './copy';
import { describeCase, doubtHolds, lawCore, type Pair, type DotCase } from './logic.ts';
import { frame } from './puzzles';
import { readingChannel, savedDot } from './instrument';

export const sayit: SayItDef = COPY.sayit;
export const compare: CompareDef = COPY.compare;
const v3 = (v: Pair): V3 => [v[0], v[1], 0];
export const doubt: DoubtDef = {
  id: 'd01-dot-doubt', who: 'bram', isTrue: false, ...COPY.doubt,
  setup(p) {
    frame(p);
    if (innerWidth < 600) void p.g.stage.view2D({ center: [-0.5, 2], height: 22, ms: 0 });
    else void p.g.stage.view2D({ center: [0, 2], height: 16, ms: 0 });
    let v: Pair = [3, 4], w: Pair = [-3, 3];
    const readout = p.readout();
    readout.el.dataset.attention = 'readout';
    const instrument = readingChannel();
    p.onDispose(() => instrument.dispose());
    const update = () => { void instrument.request(savedDot(), v, w, (value) => {
      readout.row('dot', COPY.p1.labels.reading, value.toFixed(2));
      readout.el.dataset.source = savedDot() ? 'player' : 'reference';
    }).catch(() => { readout.el.hidden = true; }); };
    const hv = new VectorHandle(p, { to: v3(v), color: C.v, limit: 4, countMoves: false, onChange: (t) => { v = [t[0], t[1]]; update(); } });
    const hw = new VectorHandle(p, { to: v3(w), color: C.w, limit: 4, countMoves: false, onChange: (t) => { w = [t[0], t[1]]; update(); } });
    const set = (a: Pair, b: Pair) => { hv.set(v3(a)); hw.set(v3(b)); };
    update();
    return {
      holds: () => doubtHolds(v, w),
      describe: () => describeCase({ v, w }),
      randomize(r, edge) {
        if (edge !== undefined) { set([3, 4], [-4, 3]); return; }
        let a: Pair, b: Pair;
        do { a = [rint(r, -4, 4), rint(r, -4, 4)]; b = [rint(r, -4, 4), rint(r, -4, 4)]; } while (a.every((x) => x === 0) && b.every((x) => x === 0));
        set(a, b);
      },
      edgeCases: 1,
      async showMe() { hv.set([3, 4, 0]); await hw.moveTo([-4, 3, 0], 700); },
    };
  },
};
export const law: LawDef<DotCase> = {
  ...lawCore, ...COPY.law,
  draw(g, c) {
    void g.stage.view2D({ center: innerWidth < 600 ? [0, -5.5] : [-5, 0], height: innerWidth < 600 ? 55 : 14, ms: 0 });
    for (const [v, color] of [[c.v, C.v], [c.w, C.w]] as [Pair, string][]) {
      const arrow = new Arrow([0, 0, 0], v3(v), { color });
      arrow.object.userData.dispose = () => arrow.dispose();
      g.stage.world.add(arrow.object);
    }
  },
};
