import { callPython } from '../../../game/pyrunner';
import { S } from '../../../core/save';
import { ReadingChannel } from './lifecycle.ts';
import { adoptedDot } from './storage.ts';

/** Deliberately no reference fallback: adoption is verified using the saved source. */
export async function playerReading(source: string, v: readonly number[], w: readonly number[]): Promise<number> {
  const result = await callPython(source, 'dot', [v, w]);
  if (result.error !== undefined) throw new Error(result.error);
  if (typeof result.value !== 'number' || !Number.isFinite(result.value)) throw new Error('Invalid instrument result');
  return result.value;
}
export const readingChannel = () => new ReadingChannel(playerReading);
export const savedDot = () => adoptedDot(S());
