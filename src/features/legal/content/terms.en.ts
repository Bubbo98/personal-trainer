import type { LegalDoc } from '../types';
import { ENGLISH_NOTICE } from './notice';
import { OWNER } from './owner';

const terms: LegalDoc = {
  title: 'Terms and Conditions of Service',
  subtitle: 'General terms and conditions for using the personal training services',
  updated: '2026-07-20',
  notice: ENGLISH_NOTICE,
  sections: [
    {
      title: '1. Definitions',
      blocks: [
        { p: 'For the purposes of these Terms and Conditions:' },
        {
          box: [
            { p: `**"Provider" or "Personal Trainer":** ${OWNER.people}, VAT number ${OWNER.vat}, based at ${OWNER.address}` },
            { p: '**"Client" or "User":** the natural person using the services offered' },
            { p: '**"Services":** the personal training services, consultations, personalised videos and digital content offered' },
            { p: '**"Platform":** the website and the application through which the services are provided' },
            { p: '**"Contract":** the agreement between the Provider and the Client for the provision of the services' },
          ],
        },
      ],
    },
    {
      title: '2. Subject and Scope',
      blocks: [
        { p: `These Terms and Conditions govern the contractual relationship between the Personal Trainers ${OWNER.people} and their Clients for services in the fitness and wellness sector.` },
        {
          box: [
            {
              list: [
                'Personalised training sessions',
                'Nutrition and fitness consultations',
                'Creation of personalised training videos',
                'Tailor-made training programmes',
                'Monitoring of physical progress',
                'Support and motivational coaching',
              ],
            },
          ],
          title: 'Services Offered',
          tone: 'blue',
        },
        { p: 'Accepting these terms is required to access and use the services.' },
      ],
    },
    {
      title: '3. Acceptance of the Terms',
      blocks: [
        { p: 'Using the services implies full and unconditional acceptance of these Terms and Conditions.' },
        {
          box: [
            {
              p: 'If you do not accept these terms in whole or in part, you cannot use the services offered. Acceptance may occur by registering, purchasing services or simply using the platform.',
            },
          ],
          title: '⚠️ Important',
          tone: 'amber',
        },
      ],
    },
    {
      title: '4. Medical Conditions and Limitation of Liability',
      blocks: [
        {
          box: [
            { p: 'The Client declares and guarantees:' },
            {
              list: [
                'That they are in good health and physically fit for exercise',
                'That they have no conditions that rule out sport',
                'That they have consulted a doctor before starting any training programme',
                'That they are aware of the risks inherent in physical activity',
                'That they take full responsibility for their health during training',
              ],
            },
          ],
          title: '🏥 IMPORTANT - MEDICAL STATEMENTS',
          tone: 'red',
        },
        { h3: 'Limitations of the Personal Trainer’s Liability' },
        {
          list: [
            'They are not a doctor and do not give medical advice or diagnoses',
            'They are not liable for injuries resulting from undisclosed pre-existing medical conditions',
            'They cannot replace the opinion of a qualified doctor',
            'The Client must stop immediately in case of pain or discomfort',
          ],
        },
        {
          box: [
            {
              p: '**Recommendation:** a sports medical examination is strongly recommended before starting any training programme, especially with cardiovascular, muscular or joint conditions.',
            },
          ],
          tone: 'blue',
        },
      ],
    },
    {
      title: '5. Bookings and Payment',
      blocks: [
        {
          grid: [
            {
              title: 'Bookings',
              blocks: [
                {
                  list: [
                    'Bookings are made through the online platform',
                    'Confirmation within 24 hours of the request',
                    'Rescheduling possible with 24 hours’ notice',
                    'Cancellations more than 24 hours ahead: full refund',
                    'Cancellations within 24 hours: no refund',
                  ],
                },
              ],
            },
            {
              title: 'Payments',
              blocks: [
                {
                  list: [
                    'Advance payment for single sessions',
                    'Packages can also be paid in instalments (if agreed)',
                    'Electronic invoice issued within 5 days',
                    'Accepted methods: bank transfer, card, cash',
                    'Discounts available for multiple packages',
                  ],
                },
              ],
            },
          ],
        },
        { h3: 'Prices and Invoicing' },
        { p: 'Prices are those shown at the time of booking and include VAT where due. All services are invoiced in accordance with the tax rules in force.' },
      ],
    },
    {
      title: '6. Personalised Videos and Intellectual Property',
      blocks: [
        { h3: 'Rights on Personalised Videos' },
        {
          list: [
            'Videos are created exclusively for the Client’s personal use',
            'Sharing, reproducing or distributing them to third parties is forbidden',
            'The Personal Trainer keeps all intellectual property rights',
            'The Client has a personal, non-commercial right of use',
            'Videos may be removed if the terms are breached',
          ],
        },
        { h3: 'Content and Training Methods' },
        {
          list: [
            'All programmes and methods belong to the Personal Trainer',
            'Commercial reproduction of the content is forbidden',
            'The content is protected by copyright',
            'Use must respect intellectual property rights',
          ],
        },
        {
          box: [
            {
              p: '**Breaches:** misuse of the content (unauthorised sharing, commercial use, etc.) leads to immediate termination of the contract and possible legal action for copyright infringement.',
            },
          ],
          tone: 'red',
        },
      ],
    },
    {
      title: '7. Client Obligations',
      blocks: [
        {
          grid: [
            {
              title: 'During Training',
              blocks: [
                {
                  list: [
                    'Follow the Personal Trainer’s instructions',
                    'Report pain or problems promptly',
                    'Wear suitable clothing and shoes',
                    'Respect the agreed times',
                    'Behave respectfully',
                  ],
                },
              ],
            },
            {
              title: 'Information and Communication',
              blocks: [
                {
                  list: [
                    'Provide accurate medical information',
                    'Report changes in health conditions',
                    'Keep the content confidential',
                    'Use the videos personally only',
                    'Make payments within the agreed terms',
                  ],
                },
              ],
            },
          ],
        },
        {
          box: [
            { p: 'The Client undertakes NOT to:' },
            {
              list: [
                'Share confidential content with third parties',
                'Use the services for commercial purposes without authorisation',
                'Behave disrespectfully or inappropriately',
                'Damage equipment or facilities',
              ],
            },
          ],
          title: 'Prohibited Behaviour',
          tone: 'amber',
        },
      ],
    },
    {
      title: '8. Right of Withdrawal (Italian Consumer Code)',
      blocks: [
        {
          box: [
            { p: 'Under Legislative Decree 206/2005 (Italian Consumer Code), a Client who is a consumer may withdraw within 14 days of signing the contract.' },
            { h4: 'How to Withdraw' },
            { list: ['Written notice within 14 days', 'Using the withdrawal form (if provided) or an explicit statement', 'Sent by email or registered letter'] },
            { h4: 'Refunds' },
            {
              list: [
                'Refund within 14 days of the withdrawal notice',
                'Refund through the same payment method used',
                'Possible deduction for services already provided (if expressly requested)',
              ],
            },
          ],
          title: 'Consumer Rights',
          tone: 'blue',
        },
        { h3: 'Exceptions to the Right of Withdrawal' },
        {
          p: 'The right of withdrawal does not apply to personalised digital content (tailor-made videos) once performance has begun with the consumer’s express consent and waiver of the right of withdrawal.',
        },
      ],
    },
    {
      title: '9. Termination and Suspension of the Contract',
      blocks: [
        { h3: 'Grounds for Immediate Termination' },
        {
          list: [
            'Serious breach of these terms',
            'Inappropriate or disrespectful behaviour',
            'Non-payment more than 30 days after the due date',
            'Unauthorised sharing of confidential content',
            'Health conditions that rule out physical activity',
          ],
        },
        { h3: 'Termination by Mutual Agreement' },
        { p: 'The contract may be terminated by mutual agreement at any time, with:' },
        { list: ['At least 15 days’ notice', 'Settlement of the services already provided', 'Possible refund for unused services'] },
      ],
    },
    {
      title: '10. Liability and Insurance',
      blocks: [
        { h3: 'Personal Trainer’s Insurance' },
        { list: ['Active professional liability insurance', 'Cover for damage caused while carrying out the professional activity', 'Limits in line with industry standards'] },
        { h3: 'Limitations of Liability' },
        {
          list: [
            'Liability is limited to damage directly attributable to gross negligence',
            'Excluded: damage from undisclosed medical conditions',
            'Excluded: activities carried out by the Client on their own',
            'Excluded: failure to follow the instructions received',
          ],
        },
        {
          box: [
            {
              p: '**Recommendation:** the Client should check their own insurance for sports and injuries. The Personal Trainer can provide information on specific policies available.',
            },
          ],
          tone: 'blue',
        },
      ],
    },
    {
      title: '11. Changes to the Terms and Conditions',
      blocks: [
        { p: 'The Personal Trainer may change these Terms and Conditions at any time.' },
        { h3: 'How You Are Notified' },
        { list: ['Email to all registered clients', 'Publication on the website highlighting the changes', 'Notice during training sessions'] },
        { h3: 'When Changes Apply' },
        { p: 'Changes take effect 15 days after notice. Continued use of the services means acceptance of the new conditions.' },
      ],
    },
    {
      title: '12. Governing Law and Jurisdiction',
      blocks: [
        { h3: 'Governing Law' },
        { p: 'This contract is governed by Italian law. Any matter concerning its validity, interpretation and performance is governed by Italian law.' },
        { h3: 'Jurisdiction' },
        { p: 'For consumers: the court of the consumer’s place of residence or the court of Milan, at the consumer’s choice.' },
        { p: 'For anyone other than consumers: the court of Milan exclusively.' },
        { h3: 'Alternative Dispute Resolution (ADR/ODR)' },
        { p: 'Before going to court, the parties undertake to try an amicable settlement through mediation or arbitration, if agreed.' },
        {
          box: [
            { p: 'Under EU Regulation No. 524/2013, a European platform for online dispute resolution (ODR) between consumers and traders is available.' },
            { p: '**Platform link:** [https://ec.europa.eu/consumers/odr](https://ec.europa.eu/consumers/odr)' },
            { p: 'Through this platform, consumers can file a complaint and start an out-of-court dispute resolution procedure online.' },
            { p: `**ODR email:** ${OWNER.email}` },
          ],
          title: '🇪🇺 ODR Platform (Online Dispute Resolution)',
          tone: 'blue',
        },
      ],
    },
    {
      title: '13. Final Provisions',
      blocks: [
        { h3: 'Severability' },
        { p: 'If any clause is void or ineffective, the rest of the contract remains valid and effective.' },
        { h3: 'Entire Agreement' },
        { p: 'These Terms and Conditions, together with the Privacy Policy, are the entire agreement between the parties and replace any previous oral or written agreement.' },
        { h3: 'Written Form' },
        { p: 'Any change or addition must be agreed in writing and signed by both parties to be effective.' },
      ],
    },
    {
      title: 'Contacts',
      blocks: [
        { p: 'For any question about these Terms and Conditions:' },
        {
          box: [
            { p: `**${OWNER.name}**` },
            { p: `Tax code: ${OWNER.taxCode}` },
            { p: `VAT number: ${OWNER.vat}` },
            { p: OWNER.address },
            { p: `Email: [${OWNER.email}](mailto:${OWNER.email})` },
            { p: `Phone: ${OWNER.phone}` },
            { p: '**Contact hours:** Monday - Friday: 9:00 - 19:00. Reply guaranteed within 48 working hours' },
          ],
        },
      ],
    },
  ],
};

export default terms;
