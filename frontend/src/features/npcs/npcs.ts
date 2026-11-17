/** The neighbours. Scripted dialogue only; they never start a conversation or follow you. */
export interface Npc {
  id: string;
  name: string;
  role: string;
  tile: [number, number]; // home position in the main world (tile units)
  greeting: string[];
  about: string;
  curiosity: { line: string; read: string };
  tips: string[];
}

export const NPCS: Npc[] = [
  {
    id: 'mabel',
    name: 'Mabel',
    role: 'the gardener',
    tile: [17.5, 27.6],
    greeting: [
      'Oh, hello dear. Mind the tulips, they’re having a think.',
      'Lovely to see you. The soil’s in a good mood today.',
      'Back again? The garden noticed. It always does.',
    ],
    about: 'I look after the Curiosity Garden beds. Each one grows a different sort of question. I just keep the weeds out and let the questions do what they like.',
    curiosity: { line: 'Did you know trees may share more underground than we used to think, though not quite as much as the stories say? Theo has a lovely piece on it.', read: 'wood-wide-web' },
    tips: [
      'Water helps things grow faster, but nothing in this garden will wilt if you forget. Plants here are patient.',
      'Pumpkins take their time. Plant one before a long walk and it’ll be waiting when you’re back.',
      'Carrots and tulips are quick, if you fancy seeing something come up today.',
      'Harvest whenever you like. Ripe things just wait; they don’t spoil here.',
    ],
  },
  {
    id: 'theo',
    name: 'Theo',
    role: 'the librarian',
    tile: [19.2, 13.6],
    greeting: [
      'Ah, a reader. Come in out of the weather whenever you like.',
      'The fire’s lit. It always is, somehow.',
      'Good to see you. No overdue books here; there’s no such thing.',
    ],
    about: 'I keep the Little Library. Three shelves, a desk with today’s read, and an armchair that remembers the ideas you saved. Short reads for busy days, deep dives for slow ones.',
    curiosity: { line: 'Here’s one I keep thinking about: the word “serendipity” was invented in a letter, after a fairy tale. Lucky finds, noticed by a prepared mind.', read: 'serendipity' },
    tips: [
      'If an idea stays with you, save it. It’ll bloom by the pond, in the Mind Garden.',
      'Try coming back to a read a few days later. Remembering is easier the second time, for interesting reasons.',
    ],
  },
  {
    id: 'juniper',
    name: 'Juniper',
    role: 'the explorer',
    tile: [26.6, 24.6],
    greeting: [
      'Hey! I just watched a snail cross the whole path. Took ages. Best thing I’ve seen all week.',
      'Oh hi! Want to know something strange?',
      'Hello! I’m mapping every mushroom in the garden. I keep losing count.',
    ],
    about: 'I wander. I follow paths to see where they go, and questions to see where they go. Usually they go somewhere better than I expected.',
    curiosity: { line: 'Octopuses taste things with their arms! Like, they touch a rock and taste it. I can’t stop thinking about it.', read: 'octopus-arms' },
    tips: [
      'If you click somewhere, you’ll walk there on your own. Good for daydreaming.',
      'The Brain Playground has puzzles with no clock. You can sit with one as long as you like.',
    ],
  },
  {
    id: 'rosa',
    name: 'Rosa',
    role: 'the botanist',
    tile: [42.4, 13.6],
    greeting: [
      'Welcome! It’s warm in the Glasshouse, and so are the questions.',
      'Hello, hello. I was just talking to the ferns. They’re good listeners.',
    ],
    about: 'The Glasshouse is where I grow thought experiments. Little impossible situations that help you see what you really think. Nothing to win, just things to turn over.',
    curiosity: { line: 'If you replaced every plank of a ship, would it still be the same ship? It sounds silly until you think about yourself.', read: 'ship-of-theseus' },
    tips: [
      'Sunflowers and lavender love the light. So do people, now and then.',
      'Plants grow in their own time. So do ideas. There’s no rush in here.',
    ],
  },
  {
    id: 'finn',
    name: 'Finn',
    role: 'the pond keeper',
    tile: [33.4, 30.8],
    greeting: [
      'Evening… or morning. Hard to tell by the water. Hello.',
      'The koi are well. Thanks for asking. You were going to ask.',
      'Sit a while, if you like. The dock’s got room.',
    ],
    about: 'I keep the pond tidy and the dock dry. People come to sit, write a few lines, or watch the water do nothing in particular. That’s allowed.',
    curiosity: { line: 'There’s an old idea from Epictetus: some things are up to us, and most things aren’t. I think about it when the fish won’t come up.', read: 'dichotomy-of-control' },
    tips: [
      'Try the noticing prompts on the dock. You don’t have to write anything. Just look.',
      'Your journal stays private. Nobody reads it but you. Not even me, and I’m very nosy about fish.',
    ],
  },
];

export const npcById = (id: string) => NPCS.find((n) => n.id === id);
