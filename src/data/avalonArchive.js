// Versioned, serializable content boundary for a future authenticated sync worker.
// Only explicitly published photos/writing should ever enter this public manifest.
export const archiveVersion = 1;
export const questlines = [{
  id: 'anime-expo', title: 'The road to Anime Expo', category: 'A new adventure',
  status: 'draft', summary: 'A costume to create. People to meet. A little courage to step into another world.',
  description: 'An example questline for the adventures ahead. Shape the plan one small step at a time.',
  tasks: [
    { id: 'character', title: 'Choose a character', note: 'Gather references and decide who to bring to life.', phase: 'Imagine' },
    { id: 'cosplay', title: 'Make the cosplay', note: 'Pattern, build, print, and fit. Leave room for a little experimentation.', phase: 'Create' },
    { id: 'friends', title: 'Find your party', note: 'Join the Discord community and find friends to meet at the convention.', phase: 'Connect' },
    { id: 'attend', title: 'Step into the adventure', note: 'Attend Anime Expo and make a day worth remembering.', phase: 'Experience' },
    { id: 'remember', title: 'Bring the memories home', note: 'Choose the photos and write down the moments you want to keep.', phase: 'Remember' },
  ],
}];
export const memories = [
  { id: 'cosplay-1', src: '/cosplay/cosplay_1.jpg', title: 'Another kind of ordinary', collection: 'Cosplay', alt: 'A photograph from Theodore’s cosplay collection' },
  { id: 'cosplay-2', src: '/cosplay/cosplay_2.jpg', title: 'In character', collection: 'Cosplay', alt: 'A photograph from Theodore’s cosplay collection' },
  { id: 'cosplay-3', src: '/cosplay/cosplay_3.jpg', title: 'A world of our own', collection: 'Cosplay', alt: 'A photograph from Theodore’s cosplay collection' },
  { id: 'cosplay-4', src: '/cosplay/cosplay_4.jpg', title: 'Between the frames', collection: 'Cosplay', alt: 'A photograph from Theodore’s cosplay collection' },
  { id: 'props-1', src: '/cosplay/scissors.jpg', title: 'Made by hand', collection: 'In the making', alt: 'Handmade cosplay scissors prop' },
  { id: 'props-2', src: '/cad/lance2.webp', title: 'From idea to artifact', collection: 'In the making', alt: 'A crafted cosplay lance' },
];
