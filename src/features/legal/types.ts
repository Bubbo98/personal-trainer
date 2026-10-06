/**
 * Legal documents as data: one file per document and language, rendered by
 * LegalPage. Text supports **bold** and [link](https://…).
 */
export type Tone = 'gray' | 'blue' | 'green' | 'amber' | 'red' | 'purple';

export type Block =
  | { p: string; muted?: boolean }
  | { h3: string }
  | { h4: string }
  | { list: string[]; ordered?: boolean }
  | { table: { head: string[]; rows: string[][] } }
  | { box: Block[]; tone?: Tone; title?: string }
  | { grid: { title: string; tone?: Tone; blocks: Block[] }[] };

export interface LegalSection {
  title: string;
  blocks: Block[];
}

export interface LegalDoc {
  title: string;
  subtitle: string;
  /** Date of the last change to the content (YYYY-MM-DD). */
  updated: string;
  sections: LegalSection[];
  /** Shown above the sections (e.g. which language is binding). */
  notice?: string;
}
