/** Curated content for the Glasshouse and the Brain Playground. No scores, no timers: just things to think with. */

export interface ThoughtExperiment {
  id: string;
  title: string;
  setup: string;
  question: string;
  angles: string[]; // ways people have thought about it, revealed only if you want them
  origin: string;
}

export const THOUGHT_EXPERIMENTS: ThoughtExperiment[] = [
  {
    id: 'experience-machine',
    title: 'The Experience Machine',
    setup: 'Imagine a machine that could give you any experiences you wanted: a wonderful life, felt from the inside as completely real. Once you plug in, you would not know you were in the machine.',
    question: 'Would you plug in for life? If not, what would you be missing?',
    angles: [
      'Many people say no, which suggests we care about actually doing things, not only about feeling we did them.',
      'Some say we also want to be a certain kind of person, and a person floating in a tank is not anyone in particular.',
      'Others answer yes, and ask why reality should matter if the experience is identical.',
    ],
    origin: 'Robert Nozick, Anarchy, State, and Utopia (1974)',
  },
  {
    id: 'marys-room',
    title: 'Mary’s Room',
    setup: 'Mary is a brilliant scientist who knows every physical fact about colour vision, but she has lived her whole life in a black-and-white room. One day she steps outside and sees a red apple.',
    question: 'Does Mary learn something new when she sees red for the first time?',
    angles: [
      'If she does learn something, perhaps not all knowledge is physical facts.',
      'Some argue she gains a new ability (to recognise or imagine red), not a new fact.',
      'Others say she simply meets an old fact in a new way, like learning a city’s name in another language.',
    ],
    origin: 'Frank Jackson, “Epiphenomenal Qualia” (1982)',
  },
  {
    id: 'veil',
    title: 'The Veil of Ignorance',
    setup: 'You are designing the rules of a new society. The catch: you do not know who you will be in it: rich or poor, healthy or ill, in the majority or a minority.',
    question: 'What rules would you choose?',
    angles: [
      'Not knowing your place may push you to protect the people with the least.',
      'Some think people would gamble on being lucky; others think most would play it safe.',
      'It is a way of testing whether a rule is fair, not just good for you.',
    ],
    origin: 'John Rawls, A Theory of Justice (1971)',
  },
  {
    id: 'theseus-you',
    title: 'The Teleporter',
    setup: 'A teleporter scans you, destroys the original, and builds an exact copy on Mars, memories and all. The copy feels exactly like you.',
    question: 'Is the person on Mars you? Would you step in?',
    angles: [
      'If you are your pattern of memories and personality, then yes, you arrived.',
      'If you are this particular continuous body and brain, then you ended and someone new began.',
      'Derek Parfit suggested that what matters may not be identity at all, but psychological connection.',
    ],
    origin: 'Derek Parfit, Reasons and Persons (1984)',
  },
  {
    id: 'trolley-gentle',
    title: 'The Lighthouse Keeper’s Choice',
    setup: 'A lighthouse keeper can guide one large ship safely past the rocks, or two small boats, but not both in time. Everyone aboard is equally dear to someone.',
    question: 'How should the keeper decide, and does the way you decide matter as much as the outcome?',
    angles: [
      'Counting lives treats each person equally, but can feel cold.',
      'Some think it matters whether you cause harm or merely fail to prevent it.',
      'Others focus on what kind of person the keeper becomes through the choice.',
    ],
    origin: 'A gentle variation on the family of “trolley problems” (Philippa Foot, 1967)',
  },
];

export const REFLECTIONS = [
  'What is something you changed your mind about this year? What changed it?',
  'Which of your opinions would you most like to be wrong about?',
  'What do you believe that most people around you don’t?',
  'When did a small kindness from a stranger stay with you?',
  'What question would you love to know the answer to, even if it’s useless?',
  'What did you enjoy as a child that you’ve stopped doing? Why did you stop?',
  'If you could understand one thing completely, what would it be?',
  'What is a mistake you’re quietly glad you made?',
];

// ---------------------------------------------------------------- Brain Playground
export interface PatternPuzzle {
  id: string;
  sequence: string[];
  options: string[];
  answer: string;
  why: string;
}

export const PATTERNS: PatternPuzzle[] = [
  { id: 'p1', sequence: ['2', '4', '8', '16'], options: ['18', '24', '32', '20'], answer: '32', why: 'Each number doubles.' },
  { id: 'p2', sequence: ['1', '1', '2', '3', '5'], options: ['7', '8', '6', '10'], answer: '8', why: 'Each number is the sum of the two before it (the Fibonacci sequence).' },
  { id: 'p3', sequence: ['Mon', 'Wed', 'Fri', 'Sun'], options: ['Mon', 'Tue', 'Sat', 'Thu'], answer: 'Tue', why: 'Every other day of the week: skip one each time, so after Sunday (skip Monday) comes Tuesday.' },
  { id: 'p4', sequence: ['A', 'C', 'F', 'J'], options: ['M', 'N', 'O', 'K'], answer: 'O', why: 'The gaps grow by one each time: +2, +3, +4, then +5.' },
  { id: 'p5', sequence: ['1', '4', '9', '16'], options: ['20', '25', '24', '32'], answer: '25', why: 'These are square numbers: 1², 2², 3², 4², so next is 5².' },
  { id: 'p6', sequence: ['3', '6', '5', '10', '9'], options: ['8', '18', '12', '13'], answer: '18', why: 'The rule alternates: double, then subtract one.' },
  { id: 'p7', sequence: ['O', 'T', 'T', 'F', 'F'], options: ['S', 'G', 'E', 'N'], answer: 'S', why: 'First letters of One, Two, Three, Four, Five… so next is Six.' },
  { id: 'p8', sequence: ['31', '28', '31', '30'], options: ['29', '31', '30', '28'], answer: '31', why: 'Days in each month: January, February, March, April… then May has 31.' },
];

export interface Case {
  id: string;
  title: string;
  story: string;
  clues: string[];
  question: string;
  options: string[];
  answer: string;
  reasoning: string;
}

export const CASES: Case[] = [
  {
    id: 'c1',
    title: 'The Missing Scone',
    story: 'A scone has vanished from the library windowsill. Three regulars were in the room: Mabel, Theo and Juniper.',
    clues: [
      'Whoever took it left crumbs on the ladder.',
      'Theo never climbs the ladder; he’s afraid of heights.',
      'Juniper was outside mapping mushrooms the whole morning.',
    ],
    question: 'Who took the scone?',
    options: ['Mabel', 'Theo', 'Juniper'],
    answer: 'Mabel',
    reasoning: 'The crumbs on the ladder mean the taker climbed it. Theo never climbs, and Juniper wasn’t there, which leaves Mabel. (She says she was “checking the top shelf”.)',
  },
  {
    id: 'c2',
    title: 'The Muddy Pawprints',
    story: 'Muddy pawprints lead across the cottage floor. The frog, the cat and the duck were all in the garden this morning.',
    clues: [
      'The prints have four toes and no webbing.',
      'Frogs and ducks both have webbed feet.',
      'The cat was seen napping on the warm path.',
    ],
    question: 'Whose prints are they?',
    options: ['The frog', 'The cat', 'The duck'],
    answer: 'The cat',
    reasoning: 'No webbing rules out the frog and the duck. The cat was nearby on the path, and cats leave four-toed prints.',
  },
  {
    id: 'c3',
    title: 'The Early Bloom',
    story: 'One tulip in Rosa’s bed opened a week before the others, though they were all planted the same day.',
    clues: [
      'That tulip is closest to the warm glasshouse wall.',
      'All the bulbs came from the same bag.',
      'Each bed was watered the same amount.',
    ],
    question: 'What’s the most likely reason it bloomed early?',
    options: ['A different kind of bulb', 'More water', 'Extra warmth'],
    answer: 'Extra warmth',
    reasoning: 'Same bag rules out a different bulb; same watering rules out water. The one difference left is warmth from the glasshouse wall, and warmth speeds up blooming.',
  },
];

export interface Puzzle3 {
  id: string;
  observation: string;
  ideas: string[];
}

/** What Else Could It Be? Practising the habit of more than one explanation. */
export const WHAT_ELSE: Puzzle3[] = [
  { id: 'w1', observation: 'The grass is wet this morning.', ideas: ['It rained overnight.', 'Dew formed as the air cooled.', 'Someone watered the garden.', 'A sprinkler came on.', 'Fog settled on it.'] },
  { id: 'w2', observation: 'A friend hasn’t replied to your message all day.', ideas: ['They’re busy or travelling.', 'Their phone is off or lost.', 'They read it and are thinking about a reply.', 'It didn’t arrive.', 'They’re having a hard day of their own.'] },
  { id: 'w3', observation: 'The bakery that always has a queue has none today.', ideas: ['It’s a holiday.', 'They’re closed early.', 'Bad weather kept people home.', 'A new bakery opened nearby.', 'You came at an unusual time.'] },
  { id: 'w4', observation: 'Your houseplant’s leaves are turning yellow.', ideas: ['Too much water.', 'Too little water.', 'Not enough light.', 'It’s simply shedding old leaves.', 'It needs nutrients.'] },
  { id: 'w5', observation: 'A shop’s sales went up after it painted its door blue.', ideas: ['The blue door caught people’s eye.', 'It was also the start of the busy season.', 'A new office opened next door.', 'The shop changed its prices at the same time.', 'Pure coincidence.'] },
  { id: 'w6', observation: 'You remember a dream vividly one morning, but usually don’t.', ideas: ['You woke up during or right after a dream.', 'You slept lighter than usual.', 'The dream was emotionally striking.', 'You thought about it straight away, which helped it stick.', 'Your alarm went off at a different time.'] },
];
