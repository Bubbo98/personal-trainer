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

export const GOOGLE_REVIEWS: GoogleReview[] = [];
