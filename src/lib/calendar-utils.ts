import { addDays, differenceInDays, format, parseISO, isAfter, isBefore, startOfDay } from 'date-fns';

/**
 * Calendar availability status for a specific date
 */
export interface CalendarAvailability {
  date: string; // ISO date string (YYYY-MM-DD)
  status: 'available' | 'booked' | 'blocked' | 'tentative';
  bookingId?: string;
  blockedReason?: string;
}

/**
 * Date range selection state
 */
export interface DateRangeSelection {
  startDate: Date | null;
  endDate: Date | null;
  duration: number; // in days
}

/**
 * Availability query parameters
 */
export interface AvailabilityQuery {
  listingId: string;
  startDate: string; // ISO date string
  endDate: string; // ISO date string
}

/**
 * API response for availability data
 */
export interface AvailabilityResponse {
  listingId: string;
  dates: CalendarAvailability[];
  lastUpdated: string;
}

/**
 * Calculate duration between two dates in days
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Duration in days
 */
export function calculateDuration(startDate: Date, endDate: Date): number {
  return differenceInDays(endDate, startDate);
}

/**
 * Generate array of date strings for a given range
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Array of ISO date strings
 */
export function generateDateRange(startDate: Date, endDate: Date): string[] {
  const dates: string[] = [];
  let currentDate = startOfDay(startDate);
  const end = startOfDay(endDate);
  
  while (currentDate <= end) {
    dates.push(format(currentDate, 'yyyy-MM-dd'));
    currentDate = addDays(currentDate, 1);
  }
  
  return dates;
}

/**
 * Check if a specific date is available for booking
 * @param date - ISO date string to check
 * @param availability - Array of availability data
 * @returns true if available, false if not
 */
export function isDateAvailable(
  date: string,
  availability: CalendarAvailability[]
): boolean {
  const dateAvailability = availability.find(a => a.date === date);
  return !dateAvailability || dateAvailability.status === 'available';
}

/**
 * Get array of unavailable dates
 * @param availability - Array of availability data
 * @returns Array of unavailable date strings
 */
export function getUnavailableDates(
  availability: CalendarAvailability[]
): string[] {
  return availability
    .filter(a => a.status !== 'available')
    .map(a => a.date);
}

/**
 * Check if a date range is completely available
 * @param startDate - Start date
 * @param endDate - End date
 * @param availability - Array of availability data
 * @returns Object with availability status and conflicts
 */
export function checkDateRangeAvailability(
  startDate: Date,
  endDate: Date,
  availability: CalendarAvailability[]
): { available: boolean; conflicts: string[] } {
  const dateRange = generateDateRange(startDate, endDate);
  const conflicts: string[] = [];
  
  dateRange.forEach(date => {
    if (!isDateAvailable(date, availability)) {
      conflicts.push(date);
    }
  });
  
  return {
    available: conflicts.length === 0,
    conflicts,
  };
}

/**
 * Validate date range for booking rules
 * @param startDate - Start date
 * @param endDate - End date
 * @param minDate - Minimum allowed date (default: today)
 * @param maxDate - Maximum allowed date (default: 1 year from today)
 * @returns Validation result with errors
 */
export function validateDateRange(
  startDate: Date | null,
  endDate: Date | null,
  minDate: Date = startOfDay(new Date()),
  maxDate: Date = addDays(new Date(), 365)
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!startDate) {
    errors.push('Start date is required');
  }
  
  if (!endDate) {
    errors.push('End date is required');
  }
  
  if (startDate && endDate) {
    if (isBefore(startDate, minDate)) {
      errors.push('Start date cannot be in the past');
    }
    
    if (isAfter(startDate, maxDate)) {
      errors.push('Start date is too far in the future');
    }
    
    if (isBefore(endDate, startDate)) {
      errors.push('End date must be after start date');
    }
    
    if (isAfter(endDate, maxDate)) {
      errors.push('End date is too far in the future');
    }
    
    const duration = calculateDuration(startDate, endDate);
    if (duration < 1) {
      errors.push('Minimum rental period is 1 day');
    }
    
    if (duration > 365) {
      errors.push('Maximum rental period is 365 days');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Format date range for display
 * @param startDate - Start date
 * @param endDate - End date
 * @param options - Formatting options
 * @returns Formatted date range string
 */
export function formatDateRange(
  startDate: Date,
  endDate: Date,
  options: {
    dateFormat?: string;
    separator?: string;
    showYear?: boolean;
  } = {}
): string {
  const {
    dateFormat = 'MMM d',
    separator = ' - ',
    showYear = false,
  } = options;
  
  const formatString = showYear ? `${dateFormat}, yyyy` : dateFormat;
  const startFormatted = format(startDate, formatString);
  const endFormatted = format(endDate, formatString);
  
  return `${startFormatted}${separator}${endFormatted}`;
}