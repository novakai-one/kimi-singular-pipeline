// The cast. Colours avoid the maths colours (green/red/yellow/blue) so a speaker is never
// mistaken for a vector. Voices are Kokoro voice ids. (Filled in from the game design document.)
import type { CastMember } from '../ui/portrait';

export const CAST: Record<string, CastMember> = {
  narrator: { name: '', role: '', color: '#b6c3dc', voice: 'bm_fable', sigil: '' },
  you: { name: 'You', role: 'Navigator', color: '#59e1ff', voice: 'af_heart', sigil: 'Y' },
};

export function castMember(id: string): CastMember {
  return CAST[id] ?? { name: id, role: '', color: '#59e1ff', voice: 'af_heart', sigil: id.slice(0, 1).toUpperCase() };
}
