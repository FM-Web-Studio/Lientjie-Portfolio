// The privacy policy and terms. Plain data so the wording lives in one place.
// A block is a paragraph (string) or a bullet list (array). [text](url) becomes a link.
// Change LEGAL_UPDATED whenever the meaning of either document changes.

export const LEGAL_UPDATED = '4 November 2026'

// reCAPTCHA only loads once App Check has a site key, so the policy only mentions it then.
const SPAM_CHECK = Boolean(import.meta.env.FIREBASE_APPCHECK_SITE_KEY)

export const privacyPolicy = ({ name, email, location }) => ({
  title: 'Privacy policy',
  intro: 'What this site collects about you, why, and what you can do about it. The short version: no tracking, no advertising, no cookies of my own. If you write to me, I keep your message so I can reply.',
  sections: [
    {
      heading: 'Who is responsible',
      blocks: [
        `This is the personal portfolio of ${name}, an architecture student based in ${location}. I am the responsible party for your personal information under the Protection of Personal Information Act, 2013 (POPIA), and the controller for the purposes of the EU and UK GDPR. You can reach me at [${email}](mailto:${email}).`,
        'The site was built and is looked after by Francois Meiring, who acts as my operator under POPIA. He handles personal information only on my behalf and only to keep the site running, and is bound to keep it confidential and secure.',
      ],
    },
    {
      heading: 'What I collect',
      blocks: [
        'When you send a message through the Contact page: your name, your email address, the subject if you give one, your message, and the time it was sent. Nothing else is attached to it.',
        'To stop the form being used for spam, the site also keeps short one-way codes made from your network (IP) address and your email address, so it can count how many messages arrive from one place. The codes cannot be turned back into the originals, and they are deleted after 24 hours.',
        'When you visit any page: the site is served by Google Firebase Hosting, which, like every web host, receives your IP address, browser details and the page requested in order to deliver it. I do not run analytics, advertising or tracking scripts, and I do not build a profile of you.',
        'Please do not send special personal information (health, religion, political views and the like) or anything about children through the form. I do not need it.',
      ],
    },
    {
      heading: 'Why I use it',
      blocks: [
        [
          'To read and reply to your message. This is the only use of what you send. The basis is your request to be contacted (POPIA section 11(1)(a) and (d); GDPR article 6(1)(b) and (f)).',
          'To keep the site running and secure, for example to stop the form being abused. The basis is my legitimate interest in a working, safe site (POPIA section 11(1)(f); GDPR article 6(1)(f)).',
        ],
        'I never sell, rent or trade personal information, and I do not use it for marketing lists. I will not add you to a mailing list.',
      ],
    },
    {
      heading: 'Where it goes',
      blocks: [
        [
          'Google (Firebase and Google Cloud) stores contact messages in a database in Belgium (europe-west1) and hosts the site. See [Google\'s privacy policy](https://policies.google.com/privacy).',
          'A small program in the same Google Cloud region checks each message for spam, saves it, and emails a copy to my Gmail inbox so I can reply.',
          'Google Fonts supplies the site\'s typefaces, so your browser contacts Google\'s servers when a page loads.',
          ...(SPAM_CHECK ? ['Google reCAPTCHA checks that the form is being used by a person and not a bot. It looks at how the page is used and may set its own cookies. The [Google privacy policy](https://policies.google.com/privacy) and [terms](https://policies.google.com/terms) apply to it.'] : []),
        ],
        'Some of these providers store or process information outside South Africa. I rely on them because they are bound by data-protection terms that give protection comparable to POPIA (POPIA section 72), including the EU Standard Contractual Clauses where they apply.',
        'Links to Instagram, LinkedIn and other sites only contact those services when you follow them, and their own policies then apply.',
        'I would only share your information with anyone else if the law required me to.',
      ],
    },
    {
      heading: 'How long I keep it',
      blocks: [
        'Contact messages are deleted automatically 12 months after they arrive, and I delete the copy in my inbox on the same schedule. The spam-check codes described above are deleted after 24 hours. If we end up working together, I keep what is needed for that work only for as long as it, and any legal record-keeping duty, requires.',
      ],
    },
    {
      heading: 'Cookies and local storage',
      blocks: [
        'This site sets no cookies of its own. It saves one preference in your browser\'s local storage: light or dark theme. It never leaves your device, and clearing your browser data removes it.',
        ...(SPAM_CHECK ? ['Google reCAPTCHA, described above, may set cookies of its own.'] : []),
      ],
    },
    {
      heading: 'Your rights',
      blocks: [
        'You may ask me to confirm whether I hold information about you, to see it, to correct it, or to delete it. You may object to my use of it and, where the GDPR applies, ask me to restrict it or hand it over in a portable form. Write to the address above. I will answer within 30 days and will not charge you.',
        'If you are unhappy with how I handled your information, you may complain to the [Information Regulator of South Africa](https://inforegulator.org.za). If you are in the EU or UK, you may also complain to your local data-protection authority. I would appreciate the chance to put it right first.',
      ],
    },
    {
      heading: 'Security',
      blocks: [
        'The site is served only over HTTPS. Stored messages can be read only by the site\'s administrators, enforced by the database\'s access rules and a signed-in, verified account. No system is perfectly secure, but if a breach ever affected your information I would tell you and the Information Regulator as POPIA requires.',
      ],
    },
    {
      heading: 'Children',
      blocks: [
        'This site is meant for adults, such as practices, studios and collaborators. I do not knowingly collect information from anyone under 18. If you believe a child has sent me their details, tell me and I will delete them.',
      ],
    },
    {
      heading: 'Changes',
      blocks: [
        'If this policy changes, the new version will be posted here with a new date at the top. I will not use information you already sent in a way the policy did not allow when you sent it.',
      ],
    },
  ],
})

export const termsOfUse = ({ name, email, location }) => ({
  title: 'Terms of use',
  intro: 'The ground rules for using this site. By using it you agree to them. If you do not, please do not use it.',
  sections: [
    {
      heading: 'About this site',
      blocks: [
        `This is the personal portfolio of ${name}, an architecture student based in ${location}. You can reach me at [${email}](mailto:${email}). How I handle personal information is set out in the [privacy policy](/privacy).`,
        'The site shows my studies, projects and interests. It is not an offer to sell goods or services. Any work we agree on will be covered by a separate agreement.',
      ],
    },
    {
      heading: 'Ownership of the work',
      blocks: [
        'The drawings, models, renders, photographs, writing and other work shown here, and the design of the site, belong to me unless stated otherwise, and all rights are reserved. That includes work I made as a student.',
        'Some projects were made as part of my studies at the University of Johannesburg. The university\'s own rules on student work may also apply to them, and nothing on this site grants any right that belongs to the university.',
        'Where a project credits other people or uses material from others, their part remains theirs.',
        'You may view the site, share links to it, and refer to my work with credit. You may not copy, download for reuse, publish or adapt the work, use it in your own portfolio or projects, or present it as yours, without my written permission.',
      ],
    },
    {
      heading: 'Not professional advice',
      blocks: [
        'The work shown is student and personal work. It is not professional architectural advice or a professional service, and it must not be relied on for building, planning or any other decision.',
      ],
    },
    {
      heading: 'Other people\'s names and marks',
      blocks: [
        'Universities, practices, employers and others are named to describe my own history. This site is personal and does not speak for any of them, and naming them does not mean they endorse me or this site.',
      ],
    },
    {
      heading: 'Acceptable use',
      blocks: [
        [
          'Do not use the contact form to send spam, advertising, abuse, malware or anything unlawful.',
          'Do not try to break, overload, scrape at scale, or gain unauthorised access to the site, its database or its admin area.',
          'Do not use the site in a way that infringes anyone\'s rights.',
        ],
        'I may block or delete messages and traffic that break these rules.',
      ],
    },
    {
      heading: 'Links to other sites',
      blocks: [
        'Links take you to sites I do not control, including Instagram and LinkedIn. I am not responsible for their content, availability or privacy practices.',
      ],
    },
    {
      heading: 'Availability and liability',
      blocks: [
        'The site is provided free of charge, as it is and as available. I may change, suspend or remove any part of it at any time.',
        'To the extent the law allows, I am not liable for any loss or damage arising from your use of the site, from relying on its content, or from sites it links to. Nothing in these terms limits any right you have, or any liability I have, that cannot lawfully be limited, including under the Consumer Protection Act, 2008, where it applies.',
      ],
    },
    {
      heading: 'Law and changes',
      blocks: [
        'These terms are governed by the law of the Republic of South Africa, and its courts have jurisdiction over any dispute, without taking away any protection you have under the law of the place you live. If any part of these terms is found unenforceable, the rest still applies.',
        'I may update these terms. The version and date posted here apply from the time they are posted.',
      ],
    },
  ],
})
