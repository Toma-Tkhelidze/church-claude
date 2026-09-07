export const siteContent = {
  name: 'siteContent',
  title: 'საიტის კონტენტი',
  type: 'document',

  // ველები დაჯგუფებულია იმ გვერდების მიხედვით, რომლებზეც ისინი ჩანს.
  groups: [
    {name: 'home', title: 'მთავარი გვერდი', default: true},
    {name: 'building', title: 'სამშენებლო სექცია'},
    {name: 'youth', title: 'ახალგაზრდული ბანაკი'},
    {name: 'kids', title: 'ბავშვთა ბანაკი'},
    {name: 'weekly', title: 'კვირის მუხლი'},
  ],

  fields: [
    // ── მთავარი გვერდი ────────────────────────────────────────────
    {
      name: 'title',
      title: 'მთავარი სათაური',
      description: 'ჩანს მთავარი გვერდის ბანერზე.',
      type: 'string',
      group: 'home',
      validation: Rule => Rule.required().max(80),
    },
    {
      name: 'imageUrl',
      title: 'ბანერის ფონური სურათი',
      description: 'მთავარი გვერდის ზედა ნაწილის ფონი.',
      type: 'image',
      group: 'home',
      options: {hotspot: true},
      fields: [
        {
          name: 'alt',
          title: 'ალტერნატიული ტექსტი',
          description: 'აღწერეთ სურათი უსინათლო მომხმარებლებისა და საძიებო სისტემებისთვის.',
          type: 'string',
        },
      ],
    },
    {
      name: 'latestSermonUrl',
      title: 'ბოლო ქადაგების ბმული (სარეზერვო)',
      description:
        'ჩვეულებრივ ბოლო ქადაგება ავტომატურად მოდის YouTube-ის დასაკრავი სიიდან. ეს ველი გამოიყენება მხოლოდ მაშინ, თუ სია მიუწვდომელია.',
      type: 'url',
      group: 'home',
      validation: Rule =>
        Rule.uri({scheme: ['http', 'https']}).custom(value =>
          !value || /youtube\.com|youtu\.be/.test(value)
            ? true
            : 'უნდა იყოს YouTube-ის ბმული'
        ),
    },

    // ── სამშენებლო სექცია ─────────────────────────────────────────
    {
      name: 'youtubeUrl',
      title: 'სამშენებლო სექციის ვიდეო',
      description: 'YouTube, Vimeo ან პირდაპირი .mp4 ბმული (მაგ. Cloudinary).',
      type: 'url',
      group: 'building',
      validation: Rule => Rule.uri({scheme: ['http', 'https']}),
    },
    {
      name: 'buildingSubtitle',
      title: 'ოქროსფერი ქვესათაური',
      type: 'string',
      group: 'building',
    },
    {
      name: 'buildingTitle',
      title: 'სექციის სათაური',
      type: 'string',
      group: 'building',
    },
    {
      name: 'buildingText1',
      title: 'აბზაცი 1',
      type: 'text',
      rows: 4,
      group: 'building',
    },
    {
      name: 'buildingText2',
      title: 'აბზაცი 2',
      type: 'text',
      rows: 4,
      group: 'building',
    },

    // ── ახალგაზრდული ბანაკი ───────────────────────────────────────
    {
      name: 'youthCampVideoUrl',
      title: 'ბანაკის ვიდეო',
      description: 'YouTube ან Vimeo ბმული.',
      type: 'url',
      group: 'youth',
      validation: Rule => Rule.uri({scheme: ['http', 'https']}),
    },
    {
      name: 'youthCampTitle',
      title: 'სექციის სათაური',
      type: 'string',
      group: 'youth',
    },
    {
      name: 'youthCampDesc1',
      title: 'აღწერა 1',
      type: 'text',
      rows: 4,
      group: 'youth',
    },
    {
      name: 'youthCampDesc2',
      title: 'აღწერა 2',
      type: 'text',
      rows: 4,
      group: 'youth',
    },

    // ── ბავშვთა ბანაკი ────────────────────────────────────────────
    {
      name: 'kidsCampVideoUrl',
      title: 'ბანაკის ვიდეო',
      description: 'YouTube ან Vimeo ბმული.',
      type: 'url',
      group: 'kids',
      validation: Rule => Rule.uri({scheme: ['http', 'https']}),
    },
    {
      name: 'kidsCampTitle',
      title: 'სექციის სათაური',
      type: 'string',
      group: 'kids',
    },
    {
      name: 'kidsCampDesc1',
      title: 'აღწერა 1',
      type: 'text',
      rows: 4,
      group: 'kids',
    },
    {
      name: 'kidsCampDesc2',
      title: 'აღწერა 2',
      type: 'text',
      rows: 4,
      group: 'kids',
    },

    // ── კვირის მუხლი ──────────────────────────────
    // მთავარ გვერდზე, მისასალმებელი ვიდეოს ქვემოთ.
    // სია კვირაში ერთხელ ივსება, საიტი კი დღის მიხედვით თავად ირჩევს —
    // ყოველდღიური შესვლა Studio-ში საჭირო არაა.
    {
      name: 'weeklyVerses',
      title: 'დღის მუხლები (კვირის შვიდი დღე)',
      description:
        'შვიდი მუხლი ამ კვირის ქადაგებიდან — პირველი კვირადღისაა, მეორე ორშაბათის და ასე შემდეგ. ' +
        'შვიდზე ნაკლებიც მუშაობს: სია კვირის ბოლომდე თავიდან გადაიხვევა. ' +
        'თუ სიას საერთოდ არ შეავსებთ, საიტზე გასული კვირის მუხლები დარჩება.',
      type: 'array',
      group: 'weekly',
      of: [
        {
          type: 'object',
          name: 'verse',
          title: 'მუხლი',
          fields: [
            {
              name: 'text',
              title: 'მუხლის ტექსტი',
              description: 'ბრჭყალები არ დაწეროთ — დიზაინი თავად ამატებს.',
              type: 'text',
              rows: 3,
              validation: Rule => Rule.required().max(400),
            },
            {
              name: 'ref',
              title: 'მითითება',
              description: 'მაგ. იოანე 15:5',
              type: 'string',
              validation: Rule => Rule.required().max(80),
            },
          ],
          preview: {
            select: {title: 'ref', subtitle: 'text'},
          },
        },
      ],
      validation: Rule => Rule.max(7),
    },

    // ── ძველი, ერთმუხლიანი ველები ─────────────────
    // ზემოთ სიის შევსების შემდეგ ეს ორი აღარ გამოიყენება. ისინი
    // მხოლოდ სარეზერვოდ დარჩა, რომ სიის დაცლისას გვერდი ცარიელი
    // არ დარჩეს.
    {
      name: 'weeklyVerseText',
      title: 'ერთი მუხლი (ძველი ველი)',
      description: 'გამოიყენება მხოლოდ მაშინ, თუ ზემოთ სია ცარიელია.',
      type: 'text',
      rows: 4,
      group: 'weekly',
      validation: Rule => Rule.max(400),
    },
    {
      name: 'weeklyVerseRef',
      title: 'მითითება (ძველი ველი)',
      description: 'მაგ. იოანე 15:5',
      type: 'string',
      group: 'weekly',
      validation: Rule => Rule.max(80),
    },
    {
      name: 'weeklyVersePdf',
      title: 'ქადაგების კონსპექტი (PDF)',
      description:
        'ამ ქადაგებაში გამოყენებული მუხლების თავმოყრილი სია. თუ ატვირთავთ, მთავარ გვერდზე, ' +
        'მუხლის მითითების ქვევით გამოჩნდება გასახსნელი ბმული. თუ არ ატვირთავთ — ბმულიც არ გამოჩნდება.',
      type: 'file',
      group: 'weekly',
      options: {accept: 'application/pdf'},
    },
  ],

  preview: {
    select: {title: 'title', media: 'imageUrl'},
    prepare({title, media}) {
      return {title: 'საიტის კონტენტი', subtitle: title, media}
    },
  },
}
