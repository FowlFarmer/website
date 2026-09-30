import avalonPosts from './avalonPosts.js';

// The Shower Thoughts card's entries (cards/showerThoughts.jsx), newest first: each a title, a
// date and its paragraphs. The last is Avalon's first post.
const showerThoughts = [
  {
    slug: 'technoepistemic-hubris',
    title: 'Technoepistemic Hubris',
    date: '2026-09-30',
    paragraphs: [
      "i feel that a certain type of hubris which is not discussed that is being revealed to me within the vast, terrifying improvement of AI models over the last year, especially very recently, is that it is hard for smart researchers to decouple the hard work and ingenuity with the absolute success of the solution to the problem due to the way the state of the world and nature of the universe has set forth. The picture I have in my mind, is that you can crudely define a constant value 'C' for how intelligent AI agents can be given a certain amount of accumulated knowledge, hard work, ingenuity, data, compute, algorithmic optimality and a million other axis of agentic development. This is a sort of nature of the universe itself. For example, in a parallel universe, perhaps humans put the same effort into training these models, with just as exceptionally curated datasets, with similar optimality of algorithms and similar compute, and the model just does not perform as well. We attribute the intelligence of the model to ourselves in that we consider it purely from our greatness and cleverness that a model can achieve what it achieves: solving millenium prize math problems, building complex software systems and generating exceptionally realistic imagery, etc. This is a catastrophic fallacy, the catastrophy here being a blindness to how building such a system creates millions of plot holes in the surrounding infinitely dimensional world that is society. We think we know the system because we believe that it is purely of our ingenuity that we gave birth to it. We couldn't be more wrong.",
      'This is not the first time in history in which such a gravitational case of this fallacy has occured. A nuclear weapon is no more complex than consumer electronics. A different universe could have deemed a nuke with similar complexity to be much less, or even much more destructive. And had we been born on a slightly smaller planet, low orbital rocketry would not be revered as such complex engineering.',
    ],
  },
  avalonPosts[0],
];

export default showerThoughts;
