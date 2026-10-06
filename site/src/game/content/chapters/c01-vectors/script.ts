// Chapter 1: every voiced line. Plain data.
import type { Line } from '../../lines';

export const S: Record<string, Line[]> = {
  open: [
    { who: 'lantern', text: 'Lattice re-seeded. The new buoys sit on a square grid again. One grid step is one hundred metres.' },
    { who: 'wren', text: 'Beacon buoy, ahead and a little to port. LANTERN, where exactly?' },
    { who: 'lantern', text: 'From the ship: three steps across, two steps up.' },
    { who: 'bram', text: 'With two thrusters gone the autopilot will not plan for us. Nav, you plot each burn. Wren flies it.' },
    { who: 'wren', text: 'Drag the arrow to where you want us. I fly the arrow, nothing else.' },
  ],
  straightWin: [{ who: 'wren', text: 'On the beacon. One burn. I like you already.' }],
  debris: [
    { who: 'lantern', text: 'Debris drifting across the route. To avoid it, the autopilot fired one burn on its own: four across, one down.' },
    { who: 'wren', text: 'So we are here now, not home. Same beacon, Nav. Plot the second burn from where we are.' },
  ],
  debrisWin: [
    { who: 'lantern', text: 'Replaying with the burns in the other order. Second burn first, then the autopilot burn.' },
    { who: 'lantern', text: 'Same end point. The two routes trace two sides each of one parallelogram.' },
  ],
  thruster: [
    { who: 'bram', text: 'Bad news. Thruster one just failed too. Only thruster three works, and it pushes one way: two across for every one up.' },
    { who: 'wren', text: 'Forward or backward, as much as we like. That is all we have.' },
    { who: 'lantern', text: 'Two marker buoys to check. Reach each one with a single burn from the start.' },
  ],
  scaleOk: [{ who: 'wren', text: 'Got that one. Back to the start for the next.' }],
  scaleWin: [{ who: 'bram', text: 'Backwards is a minus sign. Same thruster, same line, other way.' }],
  knocks: [
    { who: 'lantern', text: 'Three small pulses while we worked. Each one knocked the ship.' },
    { who: 'lantern', text: 'Two across and five up. Three back and one up. Four across and two down.' },
    { who: 'wren', text: 'And now home is somewhere behind us. Nav: one burn, straight home. Then tell me how far it was.' },
  ],
  homeWin: [{ who: 'wren', text: 'Home in one. And five steps out, so five hundred metres. Good.' }],
  doubt: [
    { who: 'bram', text: 'Before any of this goes into the autopilot, I have a doubt.' },
    { who: 'bram', text: 'East then north has to land somewhere different from north then east. Different route, different place. Show me I am wrong.' },
  ],
  doubtWin: [
    { who: 'bram', text: 'Huh. Shake it as much as I like and the two routes still meet.' },
    { who: 'bram', text: 'Fine. Either way round, you trace two sides of the same shape. I will bolt it on.' },
  ],
  close: [
    { who: 'lantern', text: 'Ship at the beacon. Position known. Every burn so far was an arrow, and every arrow had two numbers.' },
    { who: 'bram', text: 'Thruster two is back. Patched, but it fires.' },
    { who: 'lantern', text: 'Signal detected. It matches the *Meridian*. Bearing from here: eight across, seven up.' },
    { who: 'wren', text: 'Two working thrusters and a signal. Nav, next question: what can two thrusters reach?' },
  ],
};
