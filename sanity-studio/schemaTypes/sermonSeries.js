const youtubeUrlRule = Rule =>
  Rule.required()
    .uri({scheme: ['http', 'https']})
    .custom(value =>
      !value || /youtube\.com|youtu\.be/.test(value) ? true : 'უნდა იყოს YouTube-ის ბმული'
    )

export const sermonSeries = {
  name: 'sermonSeries',
  title: 'ქადაგებების სერია',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'სერიის სათაური',
      type: 'string',
      validation: Rule => Rule.required().max(70),
    },
    {
      name: 'order',
      title: 'რიგითობა',
      description: 'მცირე რიცხვი ზემოთ ჩნდება ქადაგებების გვერდზე.',
      type: 'number',
      validation: Rule => Rule.required().integer().min(1),
    },
    {
      name: 'subtitle',
      title: 'ქვესათაური',
      description: 'მოკლე აღწერა, ჩანს სათაურის ქვემოთ.',
      type: 'string',
      validation: Rule => Rule.required().max(120),
    },
    {
      name: 'category',
      title: 'კატეგორია',
      description: 'განსაზღვრავს, რომელ ფილტრში მოხვდება სერია ქადაგებების გვერდზე.',
      type: 'string',
      options: {
        list: [
          {title: 'სულიერი ზრდა', value: 'spiritual'},
          {title: 'ოჯახი & ცხოვრება', value: 'family'},
          {title: 'ბიბლიური სწავლებები', value: 'biblical'},
        ],
        layout: 'radio',
      },
      validation: Rule => Rule.required(),
    },
    {
      name: 'thumbnailUrl',
      title: 'სერიის სურათი',
      type: 'image',
      options: {hotspot: true},
      fields: [
        {
          name: 'alt',
          title: 'ალტერნატიული ტექსტი',
          type: 'string',
        },
      ],
      validation: Rule => Rule.required(),
    },
    {
      name: 'description',
      title: 'სრული აღწერა',
      type: 'text',
      rows: 4,
      validation: Rule => Rule.required(),
    },
    {
      name: 'speaker',
      title: 'სერიის მთავარი სპიკერი',
      type: 'string',
      validation: Rule => Rule.required(),
    },
    {
      name: 'episodes',
      title: 'ეპიზოდები',
      description: 'რიგითობა განსაზღვრავს, როგორ ჩამოთვლება ისინი საიტზე.',
      type: 'array',
      validation: Rule => Rule.required().min(1),
      of: [
        {
          type: 'object',
          name: 'episode',
          title: 'ეპიზოდი',
          fields: [
            {
              name: 'title',
              title: 'ეპიზოდის სათაური',
              type: 'string',
              validation: Rule => Rule.required(),
            },
            {
              name: 'speaker',
              title: 'სპიკერი',
              type: 'string',
              validation: Rule => Rule.required(),
            },
            {
              name: 'youtubeUrl',
              title: 'YouTube ბმული',
              type: 'url',
              validation: youtubeUrlRule,
            },
            {
              name: 'duration',
              title: 'ხანგრძლივობა',
              description: 'არასავალდებულო. მაგ. „45 წთ“. თუ ცარიელია, საიტზე საერთოდ არ გამოჩნდება.',
              type: 'string',
            },
          ],
          preview: {
            select: {title: 'title', speaker: 'speaker', duration: 'duration'},
            prepare({title, speaker, duration}) {
              return {title, subtitle: [speaker, duration].filter(Boolean).join(' · ')}
            },
          },
        },
      ],
    },
  ],

  orderings: [
    {
      title: 'რიგითობა',
      name: 'orderAsc',
      by: [{field: 'order', direction: 'asc'}],
    },
  ],

  preview: {
    select: {
      title: 'title',
      subtitle: 'subtitle',
      category: 'category',
      episodes: 'episodes',
      media: 'thumbnailUrl',
    },
    prepare({title, subtitle, category, episodes, media}) {
      const labels = {
        spiritual: 'სულიერი ზრდა',
        family: 'ოჯახი & ცხოვრება',
        biblical: 'ბიბლიური სწავლებები',
      }
      const count = Array.isArray(episodes) ? episodes.length : 0
      return {
        title,
        subtitle: `${labels[category] || category || ''} · ${count} ეპიზოდი — ${subtitle || ''}`,
        media,
      }
    },
  },
}
