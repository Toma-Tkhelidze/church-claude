export const familyGroup = {
  name: 'familyGroup',
  title: 'საოჯახო ჯგუფი',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'ჯგუფის დასახელება',
      description: 'ჩვეულებრივ უბანი ან ქუჩა. მაგ. „ვაკისუბანი (პასილოკი)“',
      type: 'string',
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
      name: 'leader',
      title: 'ლიდერი',
      description: 'ეს სახელი ჩანს საიტზე.',
      type: 'string',
      validation: Rule => Rule.required(),
    },
    {
      name: 'formLeader',
      title: 'ლიდერის სახელი ფორმისთვის',
      description:
        'ეს მნიშვნელობა იგზავნება რეგისტრაციის Google ფორმაში. თუ ცარიელია, გამოიყენება „ლიდერი“.',
      type: 'string',
    },
    {
      name: 'time',
      title: 'შეხვედრის დრო (სრული)',
      description: 'ჩანს ჯგუფის ფანჯარაში. მაგ. „ყოველ ოთხშაბათს, 17:00 სთ“',
      type: 'string',
      validation: Rule => Rule.required(),
    },
    {
      name: 'cardTime',
      title: 'შეხვედრის დრო (მოკლე)',
      description: 'ჩანს ბარათზე. მაგ. „ოთხშაბათი, 17:00 საათი“',
      type: 'string',
      validation: Rule => Rule.required(),
    },
    {
      name: 'badge',
      title: 'ბარათის ნიშანი',
      description: 'პატარა წარწერა ფოტოზე. მაგ. „ოთხშაბათი“',
      type: 'string',
      validation: Rule => Rule.required(),
    },
    {
      name: 'excerpt',
      title: 'მოკლე აღწერა (ბარათზე)',
      description: 'ორი-სამი წინადადება, ჩანს ბარათზე.',
      type: 'text',
      rows: 3,
      validation: Rule => Rule.required(),
    },
    {
      name: 'location',
      title: 'მისამართი',
      type: 'string',
      validation: Rule => Rule.required(),
    },
    {
      name: 'groupType',
      title: 'ჯგუფის ტიპი',
      description: 'მაგ. „ახალგაზრდა ოჯახები და წყვილები“',
      type: 'string',
      validation: Rule => Rule.required(),
    },
    {
      name: 'description',
      title: 'აღწერა',
      description: 'ჩანს ჯგუფის ფანჯარაში, როცა ბარათს დააკლიკებენ.',
      type: 'text',
      rows: 5,
      validation: Rule => Rule.required(),
    },
    {
      name: 'mapUrl',
      title: 'რუკის ბმული',
      description: 'Google Maps-ის ბმული ამ ჯგუფის მისამართზე.',
      type: 'url',
      validation: Rule => Rule.required().uri({scheme: ['http', 'https']}),
    },
    {
      name: 'image',
      title: 'ჯგუფის ფოტო',
      type: 'image',
      options: {hotspot: true},
      fields: [
        {
          name: 'alt',
          title: 'ალტერნატიული ტექსტი',
          type: 'string',
        },
      ],
    },
    {
      name: 'imageUrl',
      title: 'ფოტოს ბმული (სარეზერვო)',
      description:
        'გამოიყენება მხოლოდ მაშინ, თუ ზემოთ ფოტო ატვირთული არ არის. დატოვეთ ცარიელი, თუ ფოტოს ატვირთავთ.',
      type: 'url',
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
    select: {
      title: 'title',
      leader: 'leader',
      time: 'time',
      order: 'order',
      media: 'image',
    },
    prepare({title, leader, time, order, media}) {
      return {
        title: `${order ? order + '. ' : ''}${title}`,
        subtitle: [leader, time].filter(Boolean).join(' · '),
        media,
      }
    },
  },
}
