import { Vector3 } from 'three';
import type { PuzzleDef, V3 } from '../../../game/types';
import { Arrow } from '../../../gfx/arrow';
import { VectorHandle } from '../../../kit/handle';
import { AngleArc, Shadow } from '../../../kit/geom';
import { ChoiceCards } from '../../../ui/widgets';
import { md } from '../../../ui/ui';
import { C } from '../../../core/theme';
import { COPY } from './copy';
import { dot, holdReading, newBands, p2Won, sensorTip, snapDegrees } from './logic.ts';
import { stagePuzzle } from './staging';
import { readingChannel, savedDot } from './instrument';
import { bindNumericAnswer } from './lifecycle';

export function frame(p: Parameters<PuzzleDef['setup']>[0]): void {
  p.grid();
  void p.g.stage.view2D({ center: [innerWidth < 600 ? 0.5 : 1, 1], height: innerWidth < 600 ? 22 : 10.5, ms: 0 });
}
const pause = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

export const p1: PuzzleDef = {
  id: 'd01-p1', title: COPY.p1.title, goal: COPY.p1.goal, hints: [],
  setup(p) {
    frame(p);
    const staging = stagePuzzle(p, 'p1');
    const beam: V3 = [4, 0, 0];
    let sensor: V3 = [3 / Math.sqrt(2), 3 / Math.sqrt(2), 0];
    const bands = newBands();
    const beamArrow = new Arrow([0, 0, 0], beam, { color: C.v, label: COPY.p1.labels.beam });
    beamArrow.label?.at([4, innerWidth < 600 ? -0.7 : -0.4, 0]);
    p.add(beamArrow);
    const shadow = new Shadow(p, { onto: beam, of: sensor, lineColor: C.v, color: C.result, label: COPY.p1.labels.shadow });
    const angle = new AngleArc(p, [0, 0, 0], beam, sensor);
    const readout = p.readout();
    readout.el.dataset.attention = 'readout';
    readout.row('reading', COPY.p1.labels.reading, '');
    const instrument = readingChannel();
    p.onDispose(() => instrument.dispose());
    let alive = true;
    p.onDispose(() => { alive = false; });
    const update = () => {
      if (!alive) return;
      shadow.set(sensor, beam); angle.set(beam, sensor);
      // Keep the rotating label off the shaft and away from beam/shadow at
      // both aligned headings. The entire ±3 sweep remains within the frame.
      const offset = innerWidth < 600 ? 1.1 : 0.6;
      handle.arrow.label?.at([sensor[0] - sensor[1] / 3 * offset, sensor[1] + sensor[0] / 3 * offset, 0]);
      const reading = dot(beam, sensor);
      readout.row('shadow', COPY.p1.labels.shadow, Math.abs(shadow.value).toFixed(2));
      readout.hideRow('shadow', p.difficulty === 'commander');
      const result = holdReading(bands, reading, performance.now());
      const confirmed = (bands.biggest && Math.abs(reading - 12) <= 0.05 + 1e-12)
        || (bands.perpendicular && Math.abs(reading) <= 0.05 + 1e-12);
      void instrument.request(savedDot(), beam.slice(0, 2), sensor.slice(0, 2), (value) => {
        readout.el.hidden = false;
        readout.row('reading', COPY.p1.labels.reading, (Math.abs(value) < 1e-10 ? 0 : value).toFixed(2), confirmed ? C.good : undefined);
        readout.el.dataset.source = savedDot() ? 'player' : 'reference';
      }, () => { readout.el.hidden = true; });
      if (result.bark) p.bark('lantern', COPY.p1.feedback);
      if (result.won) p.win();
    };
    let dragging = false;
    const handle = new VectorHandle(p, {
      to: sensor, color: C.violet, label: COPY.p1.labels.sensor, snap: null, countMoves: false,
      constrain: (q) => { const [x, y] = sensorTip(q.x, q.y, snapDegrees(p.difficulty)); return new Vector3(x, y, 0); },
      onChange: (tip) => {
        if (p.g.drag.dragging && !dragging) { dragging = true; staging.drag(); }
        sensor = tip; update();
      },
      onCommit: () => { dragging = false; },
    });
    // Use DOM APIs here: the provenance scanner mistakes h() tag names and
    // input attributes nested inside content containers for learner prose.
    const prediction = document.createElement('input');
    prediction.type = 'number'; prediction.inputMode = 'decimal';
    prediction.setAttribute('aria-label', COPY.p1.prompt);
    const promptEl = document.createElement('form');
    promptEl.className = 'd01-prediction glass'; promptEl.innerHTML = md(COPY.p1.prompt);
    promptEl.dataset.attention = 'transient';
    promptEl.append(prediction);
    let dismissPrediction = () => {};
    promptEl.addEventListener('submit', (event) => { event.preventDefault(); staging.state.submitPrediction(); dismissPrediction(); });
    prediction.addEventListener('keydown', (event) => { if (event.key === 'Enter') event.stopPropagation(); });
    if (staging.state.predictionVisible) {
      dismissPrediction = p.g.ui.showTransient(promptEl, undefined, p.g.ui.scene, () => staging.state.submitPrediction());
    }
    p.onDispose(dismissPrediction);
    p.tick(update);
    update();
    const setSensor = (degrees: number) => {
      const a = degrees * Math.PI / 180;
      handle.set([3 * Math.cos(a), 3 * Math.sin(a), 0]);
    };
    const solve = async () => {
      staging.drag();
      setSensor(0); await pause(1100); update();
      setSensor(90); await pause(1100); update();
    };
    return {
      solve,
      async showMe() {
        staging.drag();
        await handle.moveTo([3, 0, 0], 700); await pause(1100); update();
        await handle.moveTo([0, 3, 0], 700); await pause(1100); update();
      },
      async wrong() { setSensor(180); await pause(1100); update(); },
      setSensor,
      telemetry: () => ({ ...bands, reading: dot(beam, sensor), sensor, prediction: prediction.value, predictionVisible: promptEl.isConnected, goalExpanded: staging.state.goalExpanded }),
    };
  },
};

export const p2: PuzzleDef = {
  id: 'd01-p2', title: COPY.p2.title, goal: COPY.p2.goal, hints: [],
  setup(p) {
    frame(p);
    const staging = stagePuzzle(p, 'p2');
    if (innerWidth < 600) void p.g.stage.view2D({ center: [2.4, 1], height: 20, ms: 0 });
    p.add(
      new Arrow([0, 0, 0], [3, 4, 0], { color: C.v, label: COPY.p1.labels.beam }),
      new Arrow([0, 0, 0], [5, 0, 0], { color: C.violet, label: COPY.p1.labels.sensor }),
    );
    const statusEl = document.createElement('div');
    statusEl.className = 'd01-feedback glass'; statusEl.setAttribute('role', 'status'); statusEl.setAttribute('aria-live', 'polite');
    statusEl.dataset.attention = 'transient';
    const readout = p.readout();
    readout.el.hidden = true;
    const preview = (value: number | null) => {
      if (p.won) return;
      if (value !== null) staging.attempt();
      p.g.ui.clearTransient();
      const text = value === null ? undefined : (COPY.p2.feedback as Record<string, string>)[String(value)];
      statusEl.textContent = text ?? '';
      if (text) p.g.ui.showTransient(statusEl);
    };
    const submit = (value: number) => {
      if (p.won) return;
      preview(value);
      if (p2Won(value)) { statusEl.textContent = ''; readout.el.hidden = false; readout.eq(COPY.p2.solution); p.win(); }
    };
    let cards: ChoiceCards | null = null;
    if (p.difficulty === 'commander') {
      const input = document.createElement('input');
      input.type = 'number'; input.step = 'any'; input.inputMode = 'decimal'; input.className = 'd01-answer'; input.setAttribute('aria-label', COPY.p2.goal);
      bindNumericAnswer(input, preview, submit);
      p.dock().append(input);
    } else {
      cards = new ChoiceCards([7, 15, 25, 35].map((value) => ({ id: String(value), text: String(value) })), (id) => {
        cards!.mark(id, p2Won(Number(id)) ? 'right' : 'wrong'); submit(Number(id));
      });
      p.dock().append(cards.el);
    }
    p.g.ui.hud.querySelector('.d01-actions')!.prepend(p.dock());
    readout.el.dataset.attention = 'readout';
    return {
      async showMe() { submit(15); },
      solve: () => submit(15),
      wrong: () => submit(25),
      submit,
    };
  },
};
