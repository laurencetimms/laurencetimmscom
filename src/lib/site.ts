// Site-wide Person identity, shared by Layout.astro and Mode7Layout.astro.
export const personJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: 'Laurence Timms',
      url: 'https://laurencetimms.com',
      image: 'https://laurencetimms.com/images/laurence-timms.webp',
      description:
        'Coach working with leaders and teams through organisational change, software delivery improvement, and AI-augmented coaching practice. Building CLAUS, an AI-augmented team dynamics tool for team leaders and team coaches.',
      knowsAbout: [
        'Organisational change',
        'Agile coaching',
        'Executive coaching',
        'DORA metrics',
        'Software delivery lifecycle',
        'Team dynamics',
      ],
      sameAs: [],
    };
