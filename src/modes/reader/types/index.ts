export interface ReadingStatistics {
  dayStreak: number;
  lastActiveDate: string; // YYYY-MM-DD
  pagesThisWeek: number;
  weekStartDate: string; // YYYY-MM-DD
  timeThisWeekMinutes: number;
  totalBooksFinished: number;
}

export type ReaderShelfFilter = 'all' | 'in-progress' | 'comics' | 'books';

export interface ComicArchivePage {
  pageNumber: number;
  name: string;
  blobUrl?: string;
  dataUrl?: string;
}
