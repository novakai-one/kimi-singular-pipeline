// The contract every chapter is written against.
//
// A chapter is a list of beats played in order:
//   scene     — voiced dialogue on the comm channel (with optional visuals running alongside)
//   cinematic — a scripted visual sequence (camera moves, the grid moving, ships)
//   puzzle    — a challenge with a goal, a win condition, hints, Show me and Skip
//   name      — the naming moment: what you saw → what it means → its name → the formula
//   explain   — explain-back: the player explains the idea in their own words / picks the reasoning
//   build     — the builder thread: the player writes a function the game then runs
// Nothing is ever locked: every beat can be skipped, every puzzle has Show me.
import type { Stage, V3 } from '../core/stage';
import type { UI } from '../ui/ui';
import type { DragManager } from '../core/drag';
import type { Backdrop } from '../gfx/background';
import type { Dialogue, DialogueOpts } from '../ui/dialogue';
import type { Line } from '../content/lines';
import type { Difficulty, Settings } from '../core/save';
import type { Readout } from '../ui/widgets';
import type { Object3D } from 'three';
import type { Grid2D, GridOpts } from '../gfx/grid';

export type { Line, Difficulty, V3 };

export interface Game {
  stage: Stage;
  ui: UI;
  drag: DragManager;
  bg: Backdrop;
  dialogue: Dialogue;
  settings: Settings;
  /** Play dialogue lines; resolves with the chosen option id if the last line had choices. */
  say(lines: Line[], o?: DialogueOpts): Promise<string | undefined>;
  toast(text: string, kicker?: string): void;
  /** Background music mood: 'title' | 'explore' | 'puzzle' | 'tension' | 'triumph' | 'void'. */
  mood(name: string): void;
  /** True when running under the test harness (animations fast, no audio). */
  headless: boolean;
}

// ---------------------------------------------------------------- puzzles

export interface Prediction {
  prompt: string;                          // markdown
  choices: { id: string; text: string }[];
  answer?: string;                         // id of the right choice (omit for open predictions)
  reveal: string;                          // markdown shown after the guess (or after Show me)
}

/** Handed to a puzzle's setup(). Everything added through it is cleaned up automatically. */
export interface PuzzleCtx {
  g: Game;
  difficulty: Difficulty;
  /** Grid snapping step for dragged points: 1 on cadet, 0.5 on navigator, null (free) on commander, unless the puzzle overrides. */
  snap(): number | null;
  /** Call when the win condition is met. Safe to call more than once. */
  win(): void;
  /** Count one move (for the par score). */
  move(n?: number): void;
  moves(): number;
  /** Tick off subgoal i (0-based) in the objective card. */
  subgoal(i: number, done?: boolean): void;
  /** Replace the objective text (markdown). */
  setGoal(md: string): void;
  /** Add objects to the 3-D world (removed on dispose). */
  add(...objs: (Object3D | { object: Object3D })[]): void;
  /** The standard 2-D grid for this puzzle (created on first call, cleaned up automatically). */
  grid(o?: GridOpts): Grid2D;
  /** A readout card on the right of the screen. */
  readout(title?: string): Readout;
  /** A container for widgets (bottom-left glass card). */
  dock(): HTMLElement;
  /** Run fn when the puzzle is torn down. */
  onDispose(fn: () => void): void;
  /** Per-frame callback, removed on dispose. */
  tick(fn: (dt: number, t: number) => void): void;
  /** Short line from a crew member during play (non-blocking, no voice if not generated). */
  bark(who: string, text: string): void;
  /** True once the puzzle has been won (by the player or Show me). */
  readonly won: boolean;
}

export interface PuzzleRuntime {
  /** Animate the solution on screen (sets the controls to the answer). Must end with the win condition met. */
  showMe(): Promise<void>;
  /** Optional instant solve for tests; defaults to showMe() at high speed. */
  solve?(): void | Promise<void>;
  /** Optional extra cleanup. */
  dispose?(): void;
}

export interface PuzzleDef {
  id: string;
  /** Plain question heading, e.g. "Which points can these two thrusters reach?" */
  title: string;
  /** Objective (markdown), shown in the HUD. */
  goal: string;
  subgoals?: string[];
  predict?: Prediction;
  /** Escalating hints (markdown). The last one should all but give it away. */
  hints: string[];
  /** Moves for the second star (omit if moves do not matter). */
  par?: number;
  /** 2-D (straight-down view) or 3-D (orbit). Default '2d'. */
  view?: '2d' | '3d';
  /** Line(s) said when the puzzle is won, before Continue. */
  onWin?: Line[];
  /**
   * How the puzzle is framed. 'challenge' (default). 'doubt': a crew member makes a claim that is
   * wrong, and the goal is to build a counterexample (explain-back by construction). 'sortie':
   * unlabelled practice (the method is not named). 'mastery': optional harder variant.
   */
  style?: 'challenge' | 'doubt' | 'sortie' | 'mastery';
  /** For 'doubt': who makes the claim (cast id) and the claim itself (shown in the objective card). */
  claim?: { who: string; text: string };
  setup(p: PuzzleCtx): PuzzleRuntime | Promise<PuzzleRuntime>;
}

// ---------------------------------------------------------------- naming moment

export interface CodexEntry {
  id: string;
  /** The term being named, e.g. "span". */
  term: string;
  /** Plain-question heading. */
  question: string;
  /** What you saw (markdown, literal: arrows, points, grid). */
  saw: string;
  /** What it means (markdown). */
  means: string;
  /** The name, defined in one plain sentence tied to the picture (markdown). */
  name: string;
  /** The formula, colour-coded (TeX, display). Optional. */
  formula?: string;
  /** Where the formula comes from (markdown, 1–3 lines). */
  why?: string;
  /** "When you see ___ in a problem, think ___." */
  cue?: string;
  /** One real use in CS / AI. */
  use?: string;
  /** Curriculum node ids this covers (N01…N28). */
  nodes?: string[];
  /** Optional little scene to run behind the card. */
  visual?: (g: Game) => Promise<void> | void;
}

// ---------------------------------------------------------------- explain-back

export interface ExplainStep {
  /** The question (markdown). */
  ask: string;
  /** Options: each is a line of reasoning. Wrong ones carry the counter-argument shown when picked. */
  options: { id: string; text: string; right: boolean; why: string }[];
  /** Optional picture to show while answering (draws into the world; cleaned up after). */
  visual?: (g: Game) => Promise<void> | void;
}

export interface ExplainDef {
  id: string;
  /** Who is asking (cast id) and the framing line. */
  who: string;
  intro: string;
  /** A chain of steps that build the full explanation. */
  steps: ExplainStep[];
  /** The model answer assembled from the right options (markdown), shown at the end. */
  summary: string;
  /** Prompt for the free-text "in your own words" box (saved to the logbook). */
  ownWords?: string;
}

// ---------------------------------------------------------------- builder thread

export interface BuildTest { name: string; args: unknown[]; expect: unknown; tol?: number }

export interface BuildDef {
  id: string;
  /** Language of starter/solution (default 'python': real Python 3 in the browser, lists not NumPy). */
  lang?: 'python' | 'js';
  /** Function name the player writes, e.g. "dot". Stored in the player's library. */
  fn: string;
  title: string;
  /** What the function must do (markdown). */
  brief: string;
  /** Starting code. */
  starter: string;
  /** A working solution (shown on Show me). */
  solution: string;
  tests: BuildTest[];
  /** Earlier library functions this one may call (they are injected by name). */
  uses?: string[];
  /** What the game does with it afterwards (markdown, one line). */
  payoff?: string;
}

// ---------------------------------------------------------------- chapters

export type Beat =
  | { kind: 'scene'; id: string; lines: Line[]; setup?: (g: Game) => void | Promise<void>; onLine?: DialogueOpts['onLine']; view?: '2d' | '3d' }
  | { kind: 'cinematic'; id: string; run: (g: Game) => Promise<void> }
  | { kind: 'puzzle'; id: string; puzzle: PuzzleDef }
  | { kind: 'name'; id: string; entry: CodexEntry }
  | { kind: 'explain'; id: string; explain: ExplainDef }
  | { kind: 'build'; id: string; build: BuildDef };

export interface ChapterDef {
  id: string;            // "c01"
  act: number;           // 1-based
  num: number;           // chapter number shown to the player
  title: string;         // plain question
  subtitle?: string;     // the topic, plain words
  nodes: string[];       // curriculum nodes covered
  palette?: string;      // backdrop palette name (theme.ts)
  /** Developer test chapter: hidden from the map and the story order (open with ?chapter=<id>). */
  dev?: boolean;
  music?: string;        // default mood
  beats: Beat[];
  /**
   * Any other voiced lines this chapter plays from code (cinematics, puzzle reactions).
   * Declare them here so the voice generator records them: g.say(ch.script.reaction).
   */
  script?: Record<string, Line[]>;
}

export interface ActDef { num: number; title: string; subtitle: string; palette: string }
