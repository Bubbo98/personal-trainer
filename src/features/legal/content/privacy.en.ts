import type { LegalDoc } from '../types';
import { OWNER } from './owner';
import { ENGLISH_NOTICE } from './notice';

const privacy: LegalDoc = {
  title: 'Privacy Policy',
  subtitle: 'Information on the processing of personal data under Art. 13 of EU Regulation 2016/679 (GDPR)',
  updated: '2026-07-20',
  notice: ENGLISH_NOTICE,
  sections: [
    {
      title: '1. Data Controller',
      blocks: [
        {
          box: [
            { p: `**Name:** ${OWNER.name}` },
            { p: `**Tax code:** ${OWNER.taxCode}` },
            { p: `**VAT number:** ${OWNER.vat}` },
            { p: `**Address:** ${OWNER.address}` },
            { p: `**Email:** ${OWNER.email}` },
            { p: `**Phone:** ${OWNER.phone}` },
          ],
        },
        { p: 'The Data Controller is responsible for how and why the personal data described in this policy are processed.', muted: true },
      ],
    },
    {
      title: '2. Categories of Data Processed',
      blocks: [
        { p: 'We process the following categories of personal data:' },
        {
          grid: [
            { title: 'Identity and Contact Data', tone: 'blue', blocks: [{ p: 'First name, last name, date of birth, address, phone, email', muted: true }] },
            { title: 'Health Data', tone: 'green', blocks: [{ p: 'Information on physical condition, fitness goals and any conditions relevant to sport (with explicit consent)', muted: true }] },
            { title: 'Browsing Data', tone: 'purple', blocks: [{ p: 'IP address, browser type, operating system, pages visited, length of visits', muted: true }] },
            { title: 'Billing and Payment Data', tone: 'amber', blocks: [{ p: 'Data needed to issue invoices and manage payments', muted: true }] },
            { title: 'Personalised Video Content', tone: 'red', blocks: [{ p: 'Personalised training videos, recorded progress, physical performance', muted: true }] },
          ],
        },
      ],
    },
    {
      title: '3. Purposes and Legal Basis',
      blocks: [
        {
          table: {
            head: ['Purpose', 'Legal basis'],
            rows: [
              ['Providing personal training services', 'Performance of a contract (Art. 6(1)(b) GDPR)'],
              ['Creating personalised videos', 'Performance of a contract and explicit consent for health data'],
              ['Nutrition and fitness consultations', 'Performance of a contract and explicit consent for health data'],
              ['Invoicing and tax obligations', 'Legal obligation (Art. 6(1)(c) GDPR)'],
              ['Direct marketing and promotional communications', 'Explicit consent (Art. 6(1)(a) GDPR)'],
              ['Improving services and statistical analysis', 'Legitimate interest (Art. 6(1)(f) GDPR)'],
            ],
          },
        },
      ],
    },
    {
      title: '4. How Data Are Processed',
      blocks: [
        {
          p: 'Personal data are processed with automated and non-automated tools, in ways strictly related to the purposes stated and in any case so as to ensure their security and confidentiality.',
        },
        {
          box: [
            {
              list: [
                'Encryption of sensitive data in transit and at rest',
                'Access to data limited to authorised staff',
                'Regular backups stored securely',
                'Constant security updates',
                'Monitoring of access and activity',
              ],
            },
          ],
          title: 'Security Measures',
          tone: 'blue',
        },
      ],
    },
    {
      title: '5. Data Retention',
      blocks: [
        { p: 'Personal data are kept only as long as needed for the purposes they were collected for:' },
        {
          list: [
            '**Contract data:** 10 years after the relationship ends (tax obligations)',
            '**Health data:** until consent is withdrawn or the relationship ends',
            '**Personalised videos:** until the user asks for their deletion',
            '**Marketing data:** until consent is withdrawn',
            '**Browsing logs:** up to 12 months',
          ],
        },
      ],
    },
    {
      title: '6. Your Rights',
      blocks: [
        { p: 'With regard to the processing described, you have the right to:' },
        {
          grid: [
            { title: 'Access and Information', blocks: [{ list: ['Access your personal data', 'Information on the processing', 'A copy of the data in electronic form'] }] },
            { title: 'Control', blocks: [{ list: ['Rectification of inaccurate data', 'Erasure (right to be forgotten)', 'Restriction of processing'] }] },
            { title: 'Objection', blocks: [{ list: ['Object to the processing', 'Withdraw consent', 'Object to direct marketing'] }] },
            { title: 'Portability', blocks: [{ list: ['Receive the data in a structured format', 'Direct transfer of the data', 'Machine-readable format'] }] },
          ],
        },
        {
          box: [
            {
              p: '**How to exercise your rights:** send a written request to the Controller’s email or postal address. Requests are handled within 30 days of receipt.',
            },
          ],
          tone: 'blue',
        },
      ],
    },
    {
      title: '7. Profiling and Automated Decisions',
      blocks: [
        { p: 'Under Art. 22 GDPR, please note that:' },
        {
          box: [
            { p: 'Your personal data are **NOT** subject to automated decision-making or profiling producing legal effects or significantly affecting you.' },
            {
              list: [
                'We do not use algorithms to make automatic decisions on the services offered',
                'Training programmes are created personally by the Personal Trainer',
                'Progress assessments are made by hand',
                'We do not sell or share data for automated marketing',
              ],
            },
          ],
          title: 'No Automated Profiling',
          tone: 'green',
        },
        {
          box: [
            {
              p: 'We use analytics tools (Vercel Analytics) to collect anonymous, aggregated data on website traffic. These data do not identify individuals and are used only to improve the website experience.',
            },
          ],
          title: 'Aggregated Statistics',
          tone: 'blue',
        },
      ],
    },
    {
      title: '8. Transfers to Third Countries',
      blocks: [
        { p: 'Personal data may be transferred to third countries only in the following cases:' },
        {
          list: [
            '**EU/EEA countries:** transfers within the European Economic Area',
            '**Countries with an adequacy decision:** only to countries recognised as adequate by the European Commission',
            '**Standard Contractual Clauses:** with appropriate safeguards through the EU Standard Contractual Clauses',
          ],
        },
      ],
    },
    {
      title: '9. Disclosure of Data',
      blocks: [
        { p: 'Personal data are not made public. They may be disclosed only to:' },
        {
          list: [
            '**Collaborators and employees** duly authorised and trained',
            '**IT service providers** (hosting, cloud, technical support) under data processing agreements',
            '**Accountant and advisers** for tax and legal obligations',
            '**Competent authorities** when required by law',
          ],
        },
      ],
    },
    {
      title: '10. Right to Lodge a Complaint',
      blocks: [
        { p: 'You have the right to lodge a complaint with the Italian Data Protection Authority:' },
        {
          box: [
            { p: '**Garante per la Protezione dei Dati Personali**' },
            { p: 'Piazza di Monte Citorio, n. 121 - 00186 Roma' },
            { p: 'Switchboard: (+39) 06.69677.1' },
            { p: 'Email: [garante@gpdp.it](mailto:garante@gpdp.it)' },
            { p: 'PEC: protocollo@pec.gpdp.it' },
            { p: 'Website: [www.garanteprivacy.it](https://www.garanteprivacy.it)' },
          ],
          tone: 'amber',
        },
      ],
    },
    {
      title: '11. Changes to this Privacy Policy',
      blocks: [
        { p: 'This policy may be updated from time to time. In case of material changes, you will be informed by:' },
        { list: ['Email to registered users', 'A notice banner on the website', 'Updating the date at the top of this document'] },
      ],
    },
    {
      title: 'Privacy Contacts',
      blocks: [
        { p: 'For any question about this policy or to exercise your GDPR rights, contact the Data Controller:' },
        {
          box: [
            { p: `**${OWNER.name}**` },
            { p: OWNER.address },
            { p: `Email: [${OWNER.email}](mailto:${OWNER.email})` },
            { p: `Phone: ${OWNER.phone}` },
          ],
        },
        { p: '**Response time:** requests are handled within 30 days of receipt, as required by Art. 12 GDPR.', muted: true },
      ],
    },
  ],
};

export default privacy;
