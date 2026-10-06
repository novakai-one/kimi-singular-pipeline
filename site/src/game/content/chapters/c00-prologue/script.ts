// Prologue: every voiced line. Plain data.
import type { Line } from '../../lines';

export const PULSE0: number[][] = [[1, 0.5], [-0.5, 1]];

export const S: Record<string, Line[]> = {
  call: [
    { who: 'ilselog', text: 'This is Dr Ilse Varga, science officer of the colony ark *Meridian*.' },
    { who: 'ilselog', text: 'The structure we call the Anchor moves everything around it. Every few hours. All at once.' },
    { who: 'ilselog', text: 'I have measured what it does. Nine numbers. Write them down.', say: 'I have measured what it does. Nine numbers. Write them down.' },
    { who: 'ilselog', text: 'One. One half. Zero. Minus one half. One. Zero. Zero. Zero. One.' },
    { who: 'ilselog', text: 'Twelve thousand people are asleep on this ship. If anyone can hear this, please come.' },
  ],
  arrive: [
    { who: 'lantern', text: 'Distress call ends. Received three years and four days ago. Source: the colony ark *Meridian*.' },
    { who: 'wren', text: 'Three years late, and we are still the only ship that came.' },
    { who: 'bram', text: 'Then we had better be the ship that works. Nav, you with us?' },
    { who: 'wren', text: 'Our new navigator. First day, worst place in the galaxy. Welcome aboard.' },
    { who: 'lantern', text: 'Ahead: the Anchor. Forty kilometres. No ark visible.' },
    { who: 'wren', text: 'Seed the lattice, LANTERN. I want to see what this space is doing before I fly into it.' },
  ],
  seed: [
    { who: 'lantern', text: 'Seeding light buoys. One every hundred metres, in a square grid.' },
    { who: 'bram', text: 'There. Now space has marks on it. If anything moves the space, it moves the buoys, and we see it.' },
    { who: 'lantern', text: 'Marking reference buoys. Three in a straight line, in cyan. Four, evenly spaced, in violet.' },
  ],
  pulse: [
    { who: 'lantern', text: 'Pulse detected. Brace.' },
  ],
  after: [
    { who: 'wren', text: 'Everyone in one piece? Nav?' },
    { who: 'lantern', text: 'Thrusters two and four are offline. Every buoy has moved.' },
    { who: 'bram', text: 'Every buoy. All at once. Nav, check the reference buoys before we touch anything. I want to know what that pulse did.' },
  ],
  lineWin: [
    { who: 'lantern', text: 'Confirmed. The three cyan buoys are still on one straight line.' },
  ],
  evenWin: [
    { who: 'lantern', text: 'Confirmed. The four violet buoys are still evenly spaced. The step between them changed. It is the same step every time.' },
  ],
  stillWin: [
    { who: 'lantern', text: 'Confirmed. One point did not move: the point under the Anchor.' },
  ],
  close: [
    { who: 'lantern', text: 'Pulse summary. Every buoy moved. Straight lines of buoys are still straight. Even spacing is still even. The point under the Anchor did not move.' },
    { who: 'bram', text: 'Straight stays straight. Even stays even. One point stays put. That is not a random shove.' },
    { who: 'wren', text: 'So it follows a rule.' },
    { who: 'bram', text: 'A rule we can learn. Learn it, and we can fly through it. Maybe even undo it.' },
    { who: 'lantern', text: 'Question added to the case board: why did everything move except the point under the Anchor?' },
    { who: 'wren', text: 'Two thrusters gone, an ark we cannot see, and a rule we do not know. Nav, let us start with something simple. Get us to the nearest beacon.' },
  ],
};
