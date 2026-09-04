export const registrationEvent = {
  name: 'registrationEvent',
  title: 'ღონისძიება',
  type: 'document',
  fields: [
    {
      name: 'eventId',
      title: 'ღონისძიების იდენტიფიკატორი',
      description:
        'უკავშირდება საიტზე არსებულ ბარათს. ერთი მნიშვნელობა მხოლოდ ერთხელ უნდა გამოიყენოთ.',
      type: 'string',
      options: {
        list: [
          {title: 'ახალგაზრდული ბანაკი', value: 'youth-camp'},
          {title: 'ბავშვთა ბანაკი', value: 'kids-camp'},
          {title: 'კონფერენცია', value: 'conference'},
        ],
        layout: 'radio',
      },
      validation: Rule => Rule.required(),
    },
    {
      name: 'title',
      title: 'სათაური',
      type: 'string',
      validation: Rule => Rule.required().max(60),
    },
    {
      name: 'status',
      title: 'რეგისტრაციის სტატუსი',
      description: '„ღიაა“ ჩართავს რეგისტრაციის ღილაკს საიტზე.',
      type: 'string',
      options: {
        list: [
          {title: 'ღიაა', value: 'active'},
          {title: 'დასრულდა', value: 'closed'},
        ],
        layout: 'radio',
      },
      initialValue: 'closed',
      validation: Rule => Rule.required(),
    },
    {
      name: 'dateText',
      title: 'თარიღი (ტექსტად)',
      description: 'მაგ. „ივლისი, 2026“',
      type: 'string',
      validation: Rule => Rule.required(),
    },
    {
      name: 'detailsText',
      title: 'დამატებითი ინფორმაცია',
      description: 'ასაკი ან ადგილმდებარეობა. მაგ. „ასაკი: 14-20 წელი“',
      type: 'string',
      validation: Rule => Rule.required(),
    },
    {
      name: 'description',
      title: 'აღწერა',
      type: 'text',
      rows: 4,
      validation: Rule => Rule.required(),
    },
    {
      name: 'imageUrl',
      title: 'ბარათის სურათი',
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
  ],

  preview: {
    select: {title: 'title', status: 'status', dateText: 'dateText', media: 'imageUrl'},
    prepare({title, status, dateText, media}) {
      const label = status === 'active' ? '🟢 ღიაა' : '🔴 დასრულდა'
      return {title, subtitle: `${label} · ${dateText || ''}`, media}
    },
  },
}
