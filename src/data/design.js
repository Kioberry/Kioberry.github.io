// HCI and design work, moved over from the old Wix portfolio (18973381285.wixsite.com/wanrongxie).
// Images live in public/design/<id>/; `src` below is the path inside that folder. A section can carry
// paragraphs (`text`), labelled points (`items`, [label, detail]) and figures; any of them may be left out.
// A figure may carry a `title`, shown above its caption. `date` is when the project ran.
// `video` is a YouTube id; when set, the case study opens on the embedded video instead of the cover.

export const designProjects = [
  {
    id: 'luminara',
    title: 'Luminara',
    kind: 'Interactive installation',
    date: 'Oct – Nov 2023',
    blurb: 'Say a wish out loud and it prints as a strip of colour. Hang it on the tree and the tree answers with light and projected shooting stars.',
    tags: ['Unity', 'Arduino', 'LED', 'Projection'],
    cover: 'cover.jpg',
    video: 'dF2xPM1GSbA',
    links: [],
    sections: [
      {
        heading: 'Do you remember your last wish?',
        text: [
          'Luminara is an interactive installation that turns making a wish into a small ceremony. Your voice becomes a printed paper tape, and hanging it on the wishing tree sets off LED light and projected shooting stars.',
        ],
      },
      {
        heading: 'The experience',
        cols: 3,
        figures: [
          { src: 'wish.jpg', caption: '1. Say your wish out loud.' },
          { src: 'tape.gif', caption: '2. Take the wish tape printed from your voice.' },
          { src: 'hang.gif', caption: '3. Hang it on the tree.' },
          { src: 'closeups.gif', caption: 'The tree, overall and close up.' },
          { src: 'led.gif', caption: 'LED motions.' },
          { src: 'visitors.gif', caption: 'LED and projection together, filmed with visitors on site.' },
        ],
      },
      {
        heading: 'Why wishes',
        text: ['The yearning for enchantment, in three observations.'],
        cols: 3,
        figures: [
          { src: 'ritual.jpg', title: 'Rituals matter', caption: 'Pressure from work and life has people looking for a sense of occasion, small rituals that mark a moment.' },
          { src: 'shooting-star.jpg', title: 'Magic is rare', caption: 'We like to wish on shooting stars because those moments feel romantic and full of wonder.' },
          { src: 'rare.jpg', title: 'Wishes go unseen', caption: 'Such moments almost never happen on cue, so a wish usually gets no visible answer, which flattens the whole experience.' },
        ],
      },
      {
        heading: 'Where it lives',
        cols: 3,
        figures: [
          { src: 'exhibition.jpg', title: 'Exhibition hall' },
          { src: 'mall.jpg', title: 'Shopping mall' },
          { src: 'park.jpg', title: 'Amusement park' },
        ],
      },
      {
        heading: 'Who it is for',
        cols: 3,
        figures: [
          { src: 'seniors.jpg', title: 'High school seniors', caption: 'Facing college and career choices, and looking for something inspiring to help them through an uncertain future.' },
          { src: 'romantics.jpg', title: 'Romantics', caption: 'They chase romance, passion and beauty, and want poetic, fantastical experiences that feed their imagination.' },
          { src: 'kids.jpg', title: 'Curious kids', caption: 'They want novel, creative, hands-on experiences that reward exploring.' },
        ],
      },
      {
        heading: 'Design',
        text: [
          'The pitch and timbre of a wish decide its colours and the light show it triggers. High, clear voices (above 2000 Hz) print bright colours and set off a rainbow flow and colourful twinkling stars. Low, deep voices print dark colours and set off meteor rain.',
        ],
        figures: [{ src: 'concept.jpg', caption: 'From a wish in mind to voice, paper tape and visuals.', wide: true }],
      },
      {
        heading: 'Build',
        text: [
          'Hardware: a PC, a receipt printer, touch sensors on the tree, LED strips and a projector. Unity turns the voice into the printed tape; an Arduino drives the LED effects (twinkling and shooting stars).',
        ],
        figures: [
          { src: 'flow.jpg', caption: 'How the pieces connect.' },
          { src: 'hardware.jpg', caption: 'LED strip wired to the Arduino.' },
          { src: 'wiring.jpg', caption: 'Hardware connection diagram.', wide: true },
        ],
      },
      {
        heading: 'Voice to colour, in Unity',
        items: [
          ['Record', 'A recorder class starts capturing as soon as someone speaks, through Unity’s Microphone.Start().'],
          ['Spectrum', 'AudioSource.GetSpectrumData() gives the frequency spectrum of the clip.'],
          ['Map', 'Frequencies under 2000 Hz map to dark colours (deep green, brown, dark blue, dark purple); above 2000 Hz to light ones (sky blue, pink, lemon yellow, aqua).'],
          ['Print', 'The colours fill the tape segments, Texture2D.EncodeToPNG() saves the image, and a print script sends it to the printer.'],
        ],
        figures: [{ src: 'voice-to-color.jpg', caption: 'Voice → audio clip → spectrum → colour array.' }],
      },
      {
        heading: 'What I would change',
        items: [
          ['Lose the touch step', 'Visitors still touch a sensor to light the strips, which breaks the spell. A microwave presence sensor could detect the tape as it comes close.'],
          ['More ways in', 'There are few trigger points. Ground lighting that brightens step by step could guide people from the wishing spot to the tree.'],
        ],
      },
    ],
  },
  {
    id: 'wardrobe-genie',
    title: 'Wardrobe Genie',
    kind: 'UX design · mobile app',
    date: 'Jul 2023',
    blurb: 'An e-closet app for sorting clothes and swapping organizing tips, taken from desk research and interviews to a Figma prototype.',
    tags: ['Figma', 'User research', 'Prototyping'],
    cover: 'cover.jpg',
    links: [],
    sections: [
      {
        heading: 'Overview',
        text: [
          'People want help sorting their clothes and like sharing what works for them. Wardrobe Genie (WGenie) is an electronic wardrobe built around two things: organizing and sharing. I designed the interfaces in Figma.',
        ],
        figures: [{ src: 'slide-1.jpg', caption: 'Wardrobe Genie.', wide: true }],
      },
      {
        heading: 'Research',
        figures: [
          { src: 'slide-2.jpg', caption: 'Desk research: trends in wardrobe organization and a competitive analysis.', wide: true },
          { src: 'slide-3.jpg', caption: 'Interviews: four people on their organizing habits, problems and workarounds.', wide: true },
        ],
      },
      {
        heading: 'Ideation',
        figures: [
          { src: 'slide-4.jpg', caption: 'Moodboard, feature mapping and the five planes of user experience.', wide: true },
          { src: 'slide-5.jpg', caption: 'Concept mind map, wireframes with user feedback, and user testing.', wide: true },
        ],
      },
      {
        heading: 'Prototype',
        figures: [{ src: 'slide-6.jpg', caption: 'Use case, design components and the final screens.', wide: true }],
      },
    ],
  },
  {
    id: 'immune-vanguard',
    title: 'Immune Vanguard',
    kind: 'AR game · education',
    date: 'Nov 2023',
    blurb: 'An AR tower-defense game where young players guard a heart from viruses by moving printed immune-cell markers, and learn how the immune system works along the way.',
    tags: ['Unity', 'AR', 'Xcode'],
    cover: 'cover.jpg',
    video: '2-zVjI-uY_4',
    links: [],
    sections: [
      {
        heading: 'Overview',
        text: [
          'Immune Vanguard is an AR tower-defense game grounded in biology. Players protect the body from invading viruses by arranging real-world markers, and pick up how the immune system works while they play.',
        ],
      },
      {
        heading: 'Who it is for',
        cols: 3,
        figures: [
          { src: 'children.jpg', title: 'Children (7–13)', caption: 'Early learners with some grounding already. The game feeds their curiosity about biology.' },
          { src: 'students.jpg', title: 'High school students', caption: 'Studying biology in depth. Playing builds strategic thinking and scientific literacy.' },
          { src: 'teachers.jpg', title: 'Teachers', caption: 'The interactivity helps them explain abstract concepts and teach more effectively.' },
        ],
      },
      {
        heading: 'Inspiration: biology',
        text: [
          'The mechanics come from how the body defends itself: non-specific immunity, the immune cells involved, and specific immunity.',
        ],
        cols: 3,
        figures: [
          { src: 'nonspecific.jpg', title: 'Non-specific immunity' },
          { src: 'immune-cells.jpg', title: 'Immune cells' },
          { src: 'specific.jpg', title: 'Specific immunity' },
        ],
      },
      {
        heading: 'Inspiration: tower defense',
        text: ['The format borrows from tower-defense games, where you hold a fixed point by placing defenders along the enemy’s path.'],
        figures: [
          { src: 'kingdom-guard.jpg', title: 'Battle of the Kingdom Guard' },
          { src: 'carrot-fantasy.jpg', title: 'Carrot Fantasy' },
        ],
      },
      {
        heading: 'How it plays',
        items: [
          ['Play', 'Players print marker patterns and rearrange the defense towers by moving the paper around.'],
          ['Rules', 'The heart cannot move. If its health hits zero before the game ends, you lose; otherwise you win.'],
        ],
      },
      {
        heading: 'Levels',
        figures: [
          { src: 'level-1.gif', caption: 'Level 1: three viruses attack from the front.' },
          { src: 'level-2.gif', caption: 'Level 2: five viruses from the front, left and right.' },
          { src: 'level-3.gif', caption: 'Level 3: seven viruses from three sides, then seven more from the front.' },
        ],
      },
      {
        heading: 'Characters',
        figures: [
          { src: 'heart.jpg', caption: 'Heart: the body you defend. Starts with 8 HP.' },
          { src: 'b-cell.jpg', caption: 'B cell (L1): fires one Y-shaped antibody per attack.' },
          { src: 't-cell.jpg', caption: 'T cell (L2): fires in all directions when viruses get close.' },
          { src: 'macrophage.jpg', caption: 'Macrophage (L3): engulfs every virus it touches.' },
        ],
      },
      {
        heading: 'Build',
        text: ['Built in Unity with AR image tracking and deployed to iOS through Xcode.'],
        figures: [
          { src: 'architecture.jpg', caption: 'Logic: the image tracker sets up a virus manager and the towers, which detect and attack each other.' },
          { src: 'code.jpg', caption: 'The main game coroutine that runs the three levels.' },
        ],
      },
    ],
  },
  {
    id: 'campus-glide',
    title: 'Campus Glide',
    kind: 'Adaptive system · prototype',
    date: 'Dec 2023',
    blurb: 'A commute "buddy" for new students that recommends routes and transport from their timetable and preferences, designed to stay transparent about why.',
    tags: ['Recommender systems', 'User survey', 'Prototyping'],
    cover: 'cover.jpg',
    video: 'RJummfitHTY',
    links: [],
    sections: [
      {
        heading: 'The problem',
        text: [
          'A coursework project for User Adaptive Intelligent Systems: design a digital assistant that acts as a "buddy" for newly arrived students. Big campuses are hard to learn, and a campus tour is too short to build a mental map. Campus Glide is for new students who live on campus and need to get around quickly.',
        ],
      },
      {
        heading: 'What students asked for',
        text: ['An online survey had 171 responses, 157 of them valid.'],
        items: [
          ['Personal recommendations', '82.5% wanted commute suggestions based on their preferences and class schedule.'],
          ['Reminders', '90% had time-management needs: less time commuting (45%), planning ahead (25%), flexibility (20%).'],
          ['Navigation', '68% had been on a campus tour, yet 87% still felt lost and over half struggled to find places.'],
          ['A plan B', 'If the chosen option will be late, or traffic is bad, suggest another way.'],
        ],
      },
      {
        heading: 'How it recommends',
        text: [
          'A hybrid recommender. It starts knowledge-based, using each student’s profile (arrival time, budget, comfort) and class schedule alongside travel times, shared e-bike and bike availability, school-bus crowding and congestion data. Once there is enough history, collaborative filtering on similar students refines the suggestions. Every trip ends with a feedback prompt.',
        ],
        figures: [
          { src: 'ar-nav.png', caption: 'AR indoor navigation for finding the classroom.' },
          { src: 'feedback.png', caption: 'Rating each recommendation feeds the next one.' },
        ],
      },
      {
        heading: 'Transparency and control',
        items: [
          ['Input', 'Students agree or decline at sign-up, and are told exactly what is collected (schedule, commute and interest preferences) and that it is used only for personalization.'],
          ['Processing', 'Recommendations point back to past ratings and preferences to explain themselves.'],
          ['Control', 'Students set their goals for time, cost and comfort, opt in or out of data collection, and choose how often suggestions arrive.'],
        ],
      },
      {
        heading: 'Usability risks',
        items: [
          ['Narrower experience', 'A toggle lets students switch personalization off, labels like "Based on your cost preference" explain each pick, and the occasional unusual route keeps things varied.'],
          ['Less predictable', 'A flat, friendly interface makes the assistant feel like a buddy, and a profile page shows the recommendation history and lets students edit their preferences.'],
        ],
      },
    ],
  },
];
