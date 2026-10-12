/**
 * The Google Business Profile ("Servizio Personal Training - Calisthenics") and the reviews
 * shown on the home page, copied from it. Update rating/count when new reviews arrive.
 */
export const GOOGLE_PROFILE = {
  url: 'https://maps.google.com/?cid=11057326487453307505',
  rating: 5,
  count: 5,
};

export interface GoogleReview {
  /** First name and initial, as agreed with the client ("Marco R."). */
  author: string;
  stars: number;
  text: string;
}

export const GOOGLE_REVIEWS: GoogleReview[] = [
  {
    author: "Jeh P.",
    stars: 5,
    text: "Joshua è un personal trainer eccezionale. È molto preparato e ben informato sulla creazione di programmi di fitness personalizzati in base alle esigenze individuali. Il focus sul calisthenics è più coinvolgente e divertente dei soliti esercizi in palestra con le macchine. Ho iniziato come principiante e lui è stato molto efficace nel migliorare la mia forza e la mia forma fisica generale. Consiglio vivamente Joshua a chiunque voglia migliorare il proprio fitness e la salute generale.",
  },
  {
    author: "Cristian S.",
    stars: 5,
    text: "Mi alleno da più di un anno con Joshua e mi sono sempre trovato bene sia per la preparazione e la passione che ha per il suo lavoro che sulla gestione degli allenamenti che è sempre riuscito ad incastrare tra i vari impegni. Lo consiglio a chiunque voglia tenersi in forma senza dover sottoscrivere un abbonamento in palestra.",
  },
  {
    author: "Niccolò",
    stars: 5,
    text: "Sono ormai un po’ di mesi che mi alleno con Joshua, ha impostato un buon percorso e si vedono i progressi costanti sapendo quando spingere e quando aspettare. Ascolta il cliente ed è sempre molto disponibile.",
  },
  {
    author: "Giambattista M.",
    stars: 5,
    text: "Competenza professionalità e grande umanità. Piano personalizzato e molta attenzione nel seguire l'esecuzione. Lo raccomando assolutamente!",
  },
];
