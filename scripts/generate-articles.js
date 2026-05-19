const fs = require("fs/promises");
const path = require("path");

const siteNav = `
    <header class="site-header">
      <div class="top-strip">
        <nav class="utility-nav" aria-label="Section navigation">
          <a href="/">Home</a>
          <a href="../about.html">About</a>
          <a href="../contact.html">Contact</a>
          <a href="../advertise.html">Advertise</a>
          <a href="../privacy-policy.html">Privacy Policy</a>
        </nav>
      </div>
      <div class="brand-row">
        <button class="icon-button menu-toggle" type="button" aria-expanded="false" aria-controls="mobile-nav">
          <span></span>
          <span></span>
          <span></span>
        </button>
        <a class="brand" href="/" aria-label="PhotoMorning home"><span>Photo</span><strong>Morning</strong><small>photomorning.com</small></a>
        <div class="header-actions">
          <button class="search-toggle" type="button" aria-expanded="false">Search</button>
          <button class="mode-toggle" type="button" aria-pressed="false">Light</button>
        </div>
      </div>
      <nav class="mobile-nav" id="mobile-nav" aria-label="Mobile section navigation">
        <a href="/">Home</a>
        <a href="../about.html">About</a>
        <a href="../contact.html">Contact</a>
        <a href="../advertise.html">Advertise</a>
        <a href="../privacy-policy.html">Privacy Policy</a>
      </nav>
      <div class="search-panel" id="search-panel" aria-hidden="true">
        <form class="search-form">
          <label for="site-search">Search PhotoMorning</label>
          <div>
            <input id="site-search" type="search" placeholder="Type here what you are looking for" />
            <button type="submit">Search</button>
          </div>
        </form>
      </div>
    </header>`;

const footer = `
    <footer class="site-footer">
      <a class="brand footer-brand" href="/"><span>Photo</span><strong>Morning</strong><small>photomorning.com</small></a>
      <nav aria-label="Footer navigation">
        <a href="/">Home</a>
        <a href="../about.html">About</a>
        <a href="../contact.html">Contact</a>
        <a href="../advertise.html">Advertise</a>
        <a href="../privacy-policy.html">Privacy Policy</a>
      </nav>
      <p>PhotoMorning is an independent photography publication. Contact: <a href="mailto:hello@photomorning.com">hello@photomorning.com</a></p>
    </footer>`;

const imageSets = [
  [
    ["https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1400&q=80", "Cinema camera lens on a production rig"],
    ["https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1200&q=80", "Camera operator filming with a cinema camera"],
    ["https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1200&q=80", "Compact camera on a table"],
    ["https://images.unsplash.com/photo-1512790182412-b19e6d62bc39?auto=format&fit=crop&w=1200&q=80", "Photographer reviewing a camera"],
  ],
  [
    ["https://images.unsplash.com/photo-1611162618071-b39a2ec055fb?auto=format&fit=crop&w=1400&q=80", "Video creator studio desk"],
    ["https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80", "Editing workstation with color tools"],
    ["https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=1200&q=80", "Creative team reviewing screens"],
    ["https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=1200&q=80", "Newspapers stacked on a desk"],
  ],
  [
    ["https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=80", "Gallery wall with framed photographs"],
    ["https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80", "Wild landscape at sunrise"],
    ["https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80", "Mountain village below snowy peaks"],
    ["https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=80", "Misty rainforest trees"],
  ],
  [
    ["https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=1400&q=80", "Macro lens with reflective glass"],
    ["https://images.unsplash.com/photo-1510127034890-ba27508e9f1c?auto=format&fit=crop&w=1200&q=80", "Instant camera and prints"],
    ["https://images.unsplash.com/photo-1452587925148-ce544e77e70d?auto=format&fit=crop&w=1200&q=80", "Vintage camera parts on a workbench"],
    ["https://images.unsplash.com/photo-1495707902641-75cac588d2e9?auto=format&fit=crop&w=1200&q=80", "Travel compact camera on a map"],
  ],
  [
    ["https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=1400&q=80", "Wildlife at sunset in tall grass"],
    ["https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d?auto=format&fit=crop&w=1200&q=80", "Photographer standing with camera in city"],
    ["https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80", "Desert landscape at dusk"],
    ["https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80", "Camera electronics on a dark table"],
  ],
];

const articles = [
  ["imax-camera-public-display", "The IMAX Camera That Shot Nolan's Next Epic Goes on Public Display", "News", "Lin Chen", "May 18, 2026", "A rare public exhibit turns a production tool into a lesson about scale, craft, and why giant-format filmmaking still feels different."],
  ["panasonic-lumix-l10-review", "Panasonic Lumix L10 Review: Compact, Stylish, and Capable", "Review", "Maya Hart", "May 18, 2026", "A small camera with a confident design asks whether everyday photographers still need a dedicated body in the age of excellent phones."],
  ["canon-eos-r6-v-first-impressions", "Canon EOS R6 V First Impressions: Why Is Canon Crowding the Field?", "First Look", "Jon Park", "May 18, 2026", "Canon's latest hybrid body looks familiar at first glance, but its positioning says a lot about where enthusiast cameras are heading."],
  ["monet-painting-shared-as-ai", "Someone Shared a Real Monet Painting as AI and Asked for Critiques", "Editorial", "Lena Ortiz", "May 14, 2026", "A small online experiment became a revealing mirror for how quickly people judge images through the language of generative media."],
  ["india-tiger-reserves-smartphone-ban", "India's Tiger Reserves Are Banning Smartphone Photography", "Culture", "Nikhil Rao", "May 18, 2026", "Conservation officials are trying to reduce crowd pressure, but the policy raises bigger questions about access, safety, and attention."],
  ["dji-osmo-pocket-4p-dual-camera", "DJI Has Finally Unveiled the Dual-Camera Osmo Pocket 4P", "Gear", "Erin Vale", "May 18, 2026", "DJI's pocket camera line gets a dual-camera twist aimed at vloggers, travel shooters, and creators who want a lighter kit."],
  ["sony-a7r-vi-a1-ii-obsolete", "No, the Sony a7R VI Doesn't Make the a1 II Obsolete", "Opinion", "Chris Nolan", "May 17, 2026", "Resolution is seductive, but camera value is still about speed, workflow, handling, and the kind of pressure a body can survive."],
  ["chinese-lens-boom-new-releases", "The Chinese Lens Boom Continues With a Flood of New Releases", "Gear", "Hannah Lee", "May 17, 2026", "A wave of aggressive lens makers is changing expectations for price, character, autofocus, and how quickly unusual ideas reach market."],
  ["youtube-ai-clone-detection", "YouTube Will Help You Find Videos Featuring Your AI Clone", "News", "Pesala Bandara", "May 18, 2026", "Likeness detection is moving from celebrity concern to everyday creator tool as AI-generated video becomes easier to publish."],
  ["newspaper-deletes-crash-photo", "Newspaper Deletes Photo of Unconscious Motorbike Rider After Backlash", "Ethics", "Matt Growcoot", "May 18, 2026", "A sports image prompted a familiar but urgent question: when does news value stop justifying public exposure of a vulnerable person?"],
  ["gordon-parks-landmark-photos", "Exhibition Marks 70 Years Since Gordon Parks' Landmark Photos", "Art", "Avery Brooks", "May 16, 2026", "A new exhibition revisits color photographs that made social history feel immediate, intimate, and impossible to ignore."],
  ["laowa-widest-probe-zoom-lenses", "Laowa Launches the World's Widest Probe Zoom Lenses", "Gear", "Kate Garibaldi", "May 15, 2026", "The specialized macro probe lens gets wider and more flexible, giving tabletop, food, and product filmmakers another strange tool."],
  ["panasonic-gf3-fed5-digital-rangefinder", "DIY Project Turns a Panasonic GF3 and Soviet FED 5 Into a Digital Rangefinder", "DIY", "Jeremy Gray", "May 15, 2026", "A patient camera builder combines old rangefinder charm with cheap digital parts and reminds us why tinkering still matters."],
  ["adobe-has-run-out-of-allies", "Adobe Has Run Out of Allies", "Editorial", "Sam Keller", "May 13, 2026", "Photographers are not merely complaining about subscriptions; they are asking whether their tools still feel like partners."],
  ["davinci-resolve-photo-tools", "The DaVinci Resolve 21 Photo Editing Tools Show Promise", "Software", "Nora Fields", "May 13, 2026", "Blackmagic's editor is still built for motion, but its expanding still-image tools hint at a more unified creative workflow."],
  ["gerald-undone-done-reviewing-cameras", "Gerald Undone Is Done Reviewing Cameras", "Creator", "Micah Reed", "May 12, 2026", "A beloved reviewer stepping away from camera coverage says as much about the review economy as it does about gear fatigue."],
  ["photography-isnt-dying-vsco", "Photography Isn't Dying, Says VSCO", "Culture", "Iris Young", "May 14, 2026", "The craft keeps changing shape, but the hunger to make personal images has not disappeared; it has moved into new rituals."],
  ["camera-trap-wildlife-highway", "Photographer Leaves Camera Trap in Remote Maasai Mara and Discovers Hidden Wildlife Highway", "Spotlight", "Dana Morris", "May 11, 2026", "A patient field project reveals animal movement that would be nearly impossible to witness from a vehicle or walking trail."],
  ["canadian-rainforest-spirit-bear", "Photographer's Journey Deep into Canadian Rainforest to Find Rare Spirit Bear", "Spotlight", "Theo Ames", "May 10, 2026", "Searching for a rare bear becomes a story about weather, restraint, local knowledge, and the ethics of not forcing the frame."],
  ["mountain-villagers-livelihood", "Four Years With Mountain Villagers Forced to Defend Their Livelihood", "Documentary", "Rina Shah", "May 9, 2026", "A long-term documentary project follows families trying to preserve land, work, and identity while outside pressure keeps rising."],
].map((item, index) => ({
  slug: item[0],
  title: item[1],
  category: item[2],
  author: item[3],
  date: item[4],
  deck: item[5],
  images: imageSets[index % imageSets.length],
}));

function articleParagraphs(article, index) {
  const subject = article.title.replace(/[:?].*$/, "");
  const angle = article.category.toLowerCase();
  return [
    `In the current photography world, ${subject} is not an isolated headline. It touches camera makers, working photographers, software teams, editors, viewers, and commercial clients at the same time. A story like this cannot be judged by a spec sheet alone, because the real pressure points are positioning, workflow, reliability, trust, and whether the change helps people make stronger images under real constraints.`,
    `This report looks at the story through the practical habits of photographers rather than the language of a launch event. For news readers, the useful question is why the moment matters. For gear buyers, it is whether the development changes the next purchase. For creators, it is whether the story affects how images are made, edited, distributed, interpreted, or monetized. ${article.deck}`,
    `The background matters. Over the past few years, mirrorless cameras have moved deeper into video, mobile photography has absorbed everyday documentation, artificial intelligence has entered editing and discovery, and independent lens makers have pressured legacy brands with lower prices and faster experimentation. In that environment, every ${angle} story becomes a small opening into a much larger industry shift.`,
    `From a photographer's point of view, the most important question is not whether ${subject} sounds new. The question is whether it removes friction from the act of making pictures. A good tool should let the photographer observe faster. A good policy should make the scene safer. A strong exhibition should help viewers understand history with more precision. A worthwhile controversy should at least force the industry to explain its boundaries more clearly.`,
    `Placed on a longer timeline, this story also shows how the line between professional and casual photography keeps moving. Professional advantage once came mainly from expensive equipment and technical barriers. Today it comes from judgment, editing discipline, field experience, consistency, and the ability to deliver a coherent body of work. Hardware still matters, but hardware no longer defines the photographer by itself.`,
    `The headline also reminds us that image culture is increasingly shaped by platform logic. Video platforms care about identity and copyright. Museums care about historical framing. Brands care about product-line separation. Photographers care about whether they can keep independent judgment inside complicated systems. Each group is fighting over the same thing: once an image is seen, who gets to explain what it means?`,
    `On the practical side, the impact often lands on three basic questions. Does it save time? Does it improve reliability? Does it make someone more willing to carry the tool or trust the process? Plenty of products look excellent in controlled tests but lose appeal in the field because of menus, battery life, heat, autofocus behavior, file handling, or support. Other designs appear modest at first and become long-term favorites because they stay out of the way.`,
    `That is why evaluating a ${angle} story requires more than reading a list of features or choosing a side in an argument. Image quality, speed, durability, price, ecosystem, and learning cost all matter together. A commercial photographer may value dependable delivery above a dramatic headline feature. A travel photographer may care more about size and charging. A news photographer may have to weigh ethics and speed at exactly the same moment.`,
    `The images themselves deserve careful attention too. Whether we are discussing a cinema camera, a museum exhibition, a breaking news photograph, or a DIY conversion, pictures do not appear from nowhere. They come from choices: where to stand, when to press the shutter, how to crop, whether to publish, who gets to look, and whether the maker is willing to accept the consequences of showing the frame.`,
    `For everyday readers, the most useful advice is to resist a single tidy narrative. A new camera does not automatically make an older one useless. A controversy rarely has only one clean answer. A platform promise does not mean a problem has been solved. The steadier approach is to place each story back inside your own photographic needs: what you shoot, who sees it, how quickly you must deliver, and what failure would cost.`,
    `The industry is likely to keep splitting into different lanes. One lane will favor smaller, more automated tools that lean heavily on software. Another will support expensive, specialized systems built for extreme reliability. The middle will not disappear, but it will be harder to explain, because buyers want a single device to do everything while manufacturers still need clear reasons for people to upgrade.`,
    `That is why ${subject} is more than a topic for one news cycle. It acts like a stress test for how the photography industry responds to technology, business pressure, ethics, and creative freedom. It will not decide the future alone, but it can influence the next choices people make: which camera to carry, which platform to trust, how to process a file, and how to explain the world they choose to photograph.`,
    `It is worth keeping some patience. Changes in photography often arrive as noise before their real shape becomes visible. A heated debate today may become a standard feature next year. A strange tool on the edge of the market may become the normal language of a specialized field. Photography has never been only about equipment. It is also a training of attention, and attention needs time.`,
    `Our read is simple: this story deserves attention, but not blind enthusiasm. Its real value will be tested in actual assignments, actual audiences, and actual limits. For photographers, the best response is not to rush into a fixed position. It is to keep shooting, compare carefully, document results, and ask whether each choice makes the final image more accurate, more honest, and more powerful.`,
  ];
}

function renderArticle(article, index) {
  const paragraphs = articleParagraphs(article, index);
  const figures = article.images
    .map(([src, alt], imageIndex) => `
          <figure>
            <img src="${src}" alt="${alt}" />
            <figcaption>${article.category} image ${imageIndex + 1}: ${alt.toLowerCase()}.</figcaption>
          </figure>`)
    .join("");
  const body = paragraphs
    .map((paragraph, paragraphIndex) => `${paragraphIndex === 5 ? `<div class="article-gallery">${figures}</div>` : ""}<p>${paragraph}</p>`)
    .join("\n          ");
  const relatedPool = articles.filter((item) => item.slug !== article.slug);
  const related = Array.from({ length: 12 }, (_, offset) => relatedPool[(index + offset) % relatedPool.length])
    .map((item) => `<a href="${item.slug}.html">${item.title}</a>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${article.title} - PhotoMorning</title>
    <link rel="stylesheet" href="../styles.css?v=202605190515" />
  </head>
  <body>
${siteNav}
    <main class="article-shell">
      <article class="article-page">
        <header class="article-header">
          <a class="article-category" href="../index.html">${article.category}</a>
          <h1>${article.title}</h1>
          <p>${article.deck}</p>
          <div class="article-byline">
            <span>By ${article.author}</span>
            <span>${article.date}</span>
          </div>
        </header>

        <figure class="article-hero-image">
          <img src="${article.images[0][0]}" alt="${article.images[0][1]}" />
          <figcaption>${article.images[0][1]}.</figcaption>
        </figure>

        <div class="article-content">
          ${body}
        </div>
      </article>

      <aside class="article-sidebar">
        <section class="member-box">
          <h2>Become a Member</h2>
          <p>Access the site without ads and support independent photography journalism.</p>
          <a href="../advertise.html">Subscribe Now</a>
        </section>
        <section class="guide-list">
          <div class="section-heading compact">
            <h2>Related</h2>
          </div>
          ${related}
        </section>
      </aside>
    </main>
${footer}
    <script src="../script.js?v=202605190515"></script>
  </body>
</html>
`;
}

async function main() {
  const root = path.resolve(__dirname, "..");
  const articleDir = path.join(root, "articles");
  await fs.mkdir(articleDir, { recursive: true });

  await Promise.all(
    articles.map((article, index) =>
      fs.writeFile(path.join(articleDir, `${article.slug}.html`), renderArticle(article, index), "utf8")
    )
  );

  await fs.writeFile(
    path.join(root, "articles.json"),
    JSON.stringify(
      articles.map(({ slug, title, category, author, date, deck }) => ({ slug, title, category, author, date, deck })),
      null,
      2
    ),
    "utf8"
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
