import { ReadingStatistics } from '../types';

const STATS_KEY = 'inkvault_reading_stats';
const RATINGS_KEY = 'inkvault_book_ratings';

function getTodayString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function getStartOfWeekString(): string {
  const now = new Date();
  const day = now.getDay();
  // Monday as start of week (0 is Sunday, so if Sunday, diff is -6)
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
}

const DEFAULT_STATS: ReadingStatistics = {
  dayStreak: 0,
  lastActiveDate: '',
  pagesThisWeek: 0,
  weekStartDate: getStartOfWeekString(),
  timeThisWeekMinutes: 0,
  totalBooksFinished: 0,
};

export function getReadingStats(): ReadingStatistics {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return { ...DEFAULT_STATS, weekStartDate: getStartOfWeekString() };
    const stats: ReadingStatistics = JSON.parse(raw);

    const currentWeekStart = getStartOfWeekString();
    const today = getTodayString();

    // Check if a new week has started; if so, roll over weekly counters
    if (stats.weekStartDate !== currentWeekStart) {
      stats.pagesThisWeek = 0;
      stats.timeThisWeekMinutes = 0;
      stats.weekStartDate = currentWeekStart;
    }

    // Check if streak was broken (missed more than 1 day)
    if (stats.lastActiveDate && stats.lastActiveDate !== today) {
      const lastDate = new Date(stats.lastActiveDate);
      const currentDate = new Date(today);
      const diffDays = Math.round((currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 1) {
        stats.dayStreak = 0;
      }
    }

    return stats;
  } catch {
    return { ...DEFAULT_STATS, weekStartDate: getStartOfWeekString() };
  }
}

export function saveReadingStats(stats: ReadingStatistics): void {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch (err) {
    console.warn('Failed to save reading stats to localStorage:', err);
  }
}

export function recordReadingActivity(pagesDelta: number, minutesDelta: number): ReadingStatistics {
  const stats = getReadingStats();
  const today = getTodayString();

  // Handle streak update
  if (stats.lastActiveDate !== today) {
    if (!stats.lastActiveDate) {
      stats.dayStreak = 1;
    } else {
      const lastDate = new Date(stats.lastActiveDate);
      const currentDate = new Date(today);
      const diffDays = Math.round((currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        stats.dayStreak += 1;
      } else if (diffDays > 1) {
        stats.dayStreak = 1;
      }
    }
    stats.lastActiveDate = today;
  }

  if (pagesDelta > 0) {
    stats.pagesThisWeek = Math.max(0, stats.pagesThisWeek + pagesDelta);
  }
  if (minutesDelta > 0) {
    stats.timeThisWeekMinutes = Math.max(0, stats.timeThisWeekMinutes + minutesDelta);
  }

  saveReadingStats(stats);
  return stats;
}

export function getBookRating(docId: string): number {
  try {
    const raw = localStorage.getItem(RATINGS_KEY);
    if (!raw) return 0;
    const ratings = JSON.parse(raw);
    return ratings[docId] || 0;
  } catch {
    return 0;
  }
}

export function saveBookRating(docId: string, rating: number): void {
  try {
    const raw = localStorage.getItem(RATINGS_KEY);
    const ratings = raw ? JSON.parse(raw) : {};
    ratings[docId] = rating;
    localStorage.setItem(RATINGS_KEY, JSON.stringify(ratings));
  } catch (err) {
    console.warn('Failed to save book rating:', err);
  }
}

export function formatRelativeTime(dateInput?: string | Date | null): string {
  if (!dateInput) return 'Never opened';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return 'Recently';

  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 5) return `${diffWeeks} week${diffWeeks > 1 ? 's' : ''} ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
  const diffYears = Math.floor(diffDays / 365);
  return `${diffYears} year${diffYears > 1 ? 's' : ''} ago`;
}

export function formatMinutes(minutes: number): string {
  if (!minutes || minutes <= 0) return '0m';
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}
