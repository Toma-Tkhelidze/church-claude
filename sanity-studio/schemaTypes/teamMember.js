export const teamMember = {
  name: 'teamMember',
  title: 'მსახური',
  type: 'document',
  fields: [
    {
      name: 'name',
      title: 'სახელი და გვარი',
      type: 'string',
      validation: Rule => Rule.required(),
    },
    {
      name: 'memberRole',
      title: 'როლი',
      description:
        '„უფროსი პასტორები“ ჩანს ცალკე ბლოკად ფოტოთი; „საბჭოს წევრი“ ემატება სულიერი საბჭოს სიაში.',
      type: 'string',
      options: {
        list: [
          {title: 'უფროსი პასტორები', value: 'lead-pastor'},
          {title: 'საბჭოს წევრი', value: 'elder'},
        ],
        layout: 'radio',
      },
      validation: Rule => Rule.required(),
    },
    {
      name: 'order',
      title: 'რიგითობა',
      description: 'მცირე რიცხვი ზემოთ ჩნდება.',
      type: 'number',
      validation: Rule => Rule.required().integer().min(1),
    },
    {
      name: 'roleLabel',
      title: 'წარწერა როლის ქვეშ',
      description: 'მაგ. „საბჭოს წევრი“ ან „უფროსი პასტორები“.',
      type: 'string',
    },
    {
      name: 'tagline',
      title: 'მოკლე წარწერა',
      description: 'მხოლოდ პასტორებისთვის. მაგ. „საეკლესიო მსახურებაში 20 წელზე მეტია“',
      type: 'string',
      hidden: ({parent}) => parent?.memberRole !== 'lead-pastor',
    },
    {
      name: 'bio1',
      title: 'ბიოგრაფია — აბზაცი 1',
      type: 'text',
      rows: 4,
      hidden: ({parent}) => parent?.memberRole !== 'lead-pastor',
    },
    {
      name: 'bio2',
      title: 'ბიოგრაფია — აბზაცი 2',
      type: 'text',
      rows: 4,
      hidden: ({parent}) => parent?.memberRole !== 'lead-pastor',
    },
    {
      name: 'email',
      title: 'ელ-ფოსტა',
      type: 'string',
      hidden: ({parent}) => parent?.memberRole !== 'lead-pastor',
      validation: Rule =>
        Rule.custom(value =>
          !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? true : 'არასწორი ელ-ფოსტის ფორმატი'
        ),
    },
    {
      name: 'photo',
      title: 'ფოტო',
      type: 'image',
      options: {hotspot: true},
      hidden: ({parent}) => parent?.memberRole !== 'lead-pastor',
      fields: [
        {
          name: 'alt',
          title: 'ალტერნატიული ტექსტი',
          type: 'string',
        },
      ],
    },
    {
      name: 'photoUrl',
      title: 'ფოტოს ბმული (სარეზერვო)',
      description: 'გამოიყენება მხოლოდ მაშინ, თუ ფოტო ატვირთული არ არის.',
      type: 'url',
      hidden: ({parent}) => parent?.memberRole !== 'lead-pastor',
      validation: Rule => Rule.uri({scheme: ['http', 'https']}),
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
    select: {name: 'name', memberRole: 'memberRole', order: 'order', media: 'photo'},
    prepare({name, memberRole, order, media}) {
      const labels = {'lead-pastor': 'უფროსი პასტორები', elder: 'საბჭოს წევრი'}
      return {
        title: `${order ? order + '. ' : ''}${name}`,
        subtitle: labels[memberRole] || memberRole,
        media,
      }
    },
  },
}
