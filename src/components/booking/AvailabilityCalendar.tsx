'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Calendar from 'react-calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Info, Calendar as CalendarIcon } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { 
  CalendarAvailability, 
  DateRangeSelection,
  calculateDuration,
  isDateAvailable,
  validateDateRange,
  formatDateRange
} from '@/lib/calendar-utils';
import { addDays, isBefore, isAfter, format, startOfDay } from 'date-fns';
import 'react-calendar/dist/Calendar.css';

interface AvailabilityCalendarProps {
  listingId: string;
  onDatesSelected: (selection: DateRangeSelection) => void;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
  defaultStartDate?: Date;
  defaultEndDate?: Date;
}

type CalendarValue = Date | null | [Date | null, Date | null];

export function AvailabilityCalendar({
  listingId,
  onDatesSelected,
  minDate = startOfDay(new Date()),
  maxDate = addDays(new Date(), 365),
  className,
  defaultStartDate,
  defaultEndDate
}: AvailabilityCalendarProps) {
  const [selectedRange, setSelectedRange] = useState<DateRangeSelection>({
    startDate: defaultStartDate || null,
    endDate: defaultEndDate || null,
    duration: defaultStartDate && defaultEndDate ? calculateDuration(defaultStartDate, defaultEndDate) : 0
  });
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Fetch availability data
  const { data: availability, isLoading, error, refetch } = useQuery({
    queryKey: ['availability', listingId, format(minDate, 'yyyy-MM-dd'), format(maxDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      try {
        const response = await fetch(
          `/api/listings/${listingId}/availability?` +
          `startDate=${format(minDate, 'yyyy-MM-dd')}&` +
          `endDate=${format(maxDate, 'yyyy-MM-dd')}`
        );
        if (!response.ok) throw new Error('Failed to fetch availability');
        const data = await response.json();
        // console.log('📅 Availability data fetched:', data.dates?.length, 'dates');
        // console.log('📅 Booked dates found:', data.dates?.filter(d => d.status === 'booked').length);
        return data.dates as CalendarAvailability[];
      } catch (error) {
        console.warn('Availability API not available, using demo data');
        // Return empty availability for demo - all dates available
        return [] as CalendarAvailability[];
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: false, // Disable automatic refetching
    refetchOnWindowFocus: true,
    retry: false, // Disable retries for now
    retryDelay: 1000
  });

  // Memoized disabled dates for better performance
  const disabledDates = useMemo(() => {
    if (!availability) return [];
    
    return availability
      .filter(a => a.status !== 'available')
      .map(a => startOfDay(new Date(a.date)));
  }, [availability]);

  // Handle date selection with improved logic
  const handleDateSelect = useCallback((date: Date) => {
    if (!availability) return;

    const dateStr = format(date, 'yyyy-MM-dd');
    
    // Check if date is available
    if (!isDateAvailable(dateStr, availability)) {
      return;
    }

    let newRange: DateRangeSelection;

    if (!selectedRange.startDate) {
      // First selection
      newRange = {
        startDate: date,
        endDate: null,
        duration: 0
      };
    } else if (!selectedRange.endDate) {
      // Second selection
      if (isBefore(date, selectedRange.startDate)) {
        // If selected date is before start date, restart selection
        newRange = {
          startDate: date,
          endDate: null,
          duration: 0
        };
      } else {
        // Valid end date
        const duration = calculateDuration(selectedRange.startDate, date);
        newRange = {
          startDate: selectedRange.startDate,
          endDate: date,
          duration
        };
      }
    } else {
      // Reset selection
      newRange = {
        startDate: date,
        endDate: null,
        duration: 0
      };
    }

    // Validate the new range
    if (newRange.startDate && newRange.endDate) {
      const validation = validateDateRange(newRange.startDate, newRange.endDate, minDate, maxDate);
      setValidationErrors(validation.errors);
      
      if (validation.valid) {
        setSelectedRange(newRange);
        onDatesSelected(newRange);
      }
    } else {
      setValidationErrors([]);
      setSelectedRange(newRange);
      onDatesSelected(newRange);
    }
  }, [availability, selectedRange, onDatesSelected, minDate, maxDate]);

  // Check if date is disabled
  const isDateDisabled = useCallback((date: Date): boolean => {
    // Check if date is before min date or after max date
    if (isBefore(date, minDate) || isAfter(date, maxDate)) {
      return true;
    }

    // Check if date is unavailable
    if (!availability) return false;
    
    const dateStr = format(date, 'yyyy-MM-dd');
    return !isDateAvailable(dateStr, availability);
  }, [minDate, maxDate, availability]);

  // Get tile content for calendar dates
  const getTileContent = useCallback((date: Date) => {
    if (!availability) return null;

    const dateStr = format(date, 'yyyy-MM-dd');
    const dateAvailability = availability.find(a => a.date === dateStr);
    
    // Debug logging for weekend dates (commented out for production)
    // const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    // if (isWeekend && dateAvailability?.status === 'booked') {
    //   console.log('🎯 Weekend booked date:', dateStr, 'status:', dateAvailability.status, 'returning dot');
    // }
    
    if (!dateAvailability || dateAvailability.status === 'available') {
      return null;
    }

    const getStatusColor = (status: string) => {
      switch (status) {
        case 'booked': return 'bg-red-500';
        case 'blocked': return 'bg-gray-500';
        case 'tentative': return 'bg-yellow-500';
        default: return 'bg-gray-400';
      }
    };

    return (
      <div 
        className={`w-4 h-4 rounded-full mx-auto mt-0.5 ${getStatusColor(dateAvailability.status)} absolute bottom-1 left-1/2 transform -translate-x-1/2 z-20`}
        style={{ 
          backgroundColor: dateAvailability.status === 'booked' ? '#dc2626' : undefined,
          border: '2px solid white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }}
      />
    );
  }, [availability]);

  // Get tile class name for styling
  const getTileClassName = useCallback((date: Date) => {
    if (!selectedRange.startDate) return '';

    const isStart = selectedRange.startDate && date.getTime() === selectedRange.startDate.getTime();
    const isEnd = selectedRange.endDate && date.getTime() === selectedRange.endDate.getTime();
    const isInRange = selectedRange.startDate && selectedRange.endDate && 
      date > selectedRange.startDate && date < selectedRange.endDate;
    const isHovered = hoveredDate && selectedRange.startDate && !selectedRange.endDate &&
      date >= selectedRange.startDate && date <= hoveredDate;

    if (isStart && isEnd) {
      // Single day selection
      return 'text-white font-bold rounded-lg shadow-lg border-2 transform scale-105';
    }
    if (isStart) {
      return 'text-white font-bold rounded-l-lg shadow-lg border-2 transform scale-105';
    }
    if (isEnd) {
      return 'text-white font-bold rounded-r-lg shadow-lg border-2 transform scale-105';
    }
    if (isInRange) {
      return 'text-white font-bold shadow-md border-y-2 relative';
    }
    if (isHovered) {
      return 'bg-green-200 text-green-900 font-medium shadow-sm border border-green-400';
    }
    return '';
  }, [selectedRange, hoveredDate]);

  // Clear selection handler
  const handleClearSelection = () => {
    const emptyRange = { startDate: null, endDate: null, duration: 0 };
    setSelectedRange(emptyRange);
    setValidationErrors([]);
    onDatesSelected(emptyRange);
  };

  // Handle tile hover for range preview
  const handleTileHover = (date: Date) => {
    if (selectedRange.startDate && !selectedRange.endDate && isAfter(date, selectedRange.startDate)) {
      setHoveredDate(date);
    }
  };

  // Calculate estimated price (this could be moved to parent component)
  const getPreviewDuration = () => {
    if (selectedRange.startDate && selectedRange.endDate) {
      return selectedRange.duration;
    }
    if (selectedRange.startDate && hoveredDate && isAfter(hoveredDate, selectedRange.startDate)) {
      return calculateDuration(selectedRange.startDate, hoveredDate);
    }
    return 0;
  };

  // Show loading indicator but don't replace entire calendar
  const showLoadingIndicator = isLoading && !availability;
  const showErrorAlert = error && !availability;

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarIcon className="h-4 w-4" />
          Select Dates
        </CardTitle>
        {selectedRange.startDate && selectedRange.endDate && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {formatDateRange(selectedRange.startDate, selectedRange.endDate)}
            </span>
            <Badge variant="outline">
              {selectedRange.duration} day{selectedRange.duration !== 1 ? 's' : ''}
            </Badge>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-2 pt-2">
        {/* Loading/Error Indicators */}
        {showLoadingIndicator && (
          <div className="flex items-center justify-center py-2 text-sm text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <span>Loading availability...</span>
          </div>
        )}
        
        {showErrorAlert && (
          <Alert variant="destructive" className="mb-2">
            <AlertDescription className="text-xs">
              Availability data unavailable. Calendar shows all dates as available.
              <Button
                variant="link"
                onClick={() => refetch()}
                className="p-0 h-auto ml-1 text-xs"
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Calendar Component */}
        <div className="calendar-container -mx-2">
          <style dangerouslySetInnerHTML={{
            __html: `
              .calendar-container .react-calendar__tile {
                position: relative;
                height: 2rem;
                font-size: 0.75rem;
              }
              .calendar-container .react-calendar__tile--active,
              .calendar-container .react-calendar__tile--range {
                background: #44D62C !important;
                color: white !important;
                font-weight: bold !important;
                border: 2px solid #3AB827 !important;
              }
              .calendar-container .react-calendar__month-view__days__day--weekend {
                color: #374151 !important;
                background: white !important;
              }
              .calendar-container .react-calendar__tile {
                background: white !important;
                border: 1px solid #e5e7eb !important;
              }
              .calendar-container .react-calendar__tile:hover {
                background: #f9fafb !important;
              }
              .calendar-container .react-calendar__tile--rangeStart {
                background: #44D62C !important;
                color: white !important;
                font-weight: bold !important;
                border: 2px solid #3AB827 !important;
                border-radius: 6px 0 0 6px !important;
              }
              .calendar-container .react-calendar__tile--rangeEnd {
                background: #44D62C !important;
                color: white !important;
                font-weight: bold !important;
                border: 2px solid #3AB827 !important;
                border-radius: 0 6px 6px 0 !important;
              }
              .calendar-container .react-calendar__tile--selectRange {
                background: #4ade80 !important;
                color: white !important;
                font-weight: 600 !important;
                border-top: 2px solid #3AB827 !important;
                border-bottom: 2px solid #3AB827 !important;
              }
              .calendar-container .react-calendar__navigation {
                height: 2.5rem;
                margin-bottom: 0.5rem;
              }
              .calendar-container .react-calendar__navigation button {
                min-width: 2rem;
              }
              .calendar-container .react-calendar__month-view__weekdays {
                font-size: 0.7rem;
                font-weight: 500;
              }
            `
          }} />
          <div className="[&_.react-calendar]:text-sm [&_.react-calendar__tile]:h-8 [&_.react-calendar__tile]:text-xs [&_.react-calendar__navigation]:h-10 [&_.react-calendar__navigation]:mb-2 [&_.react-calendar__navigation_button]:min-w-8 [&_.react-calendar__month-view__weekdays]:text-xs">
            <Calendar
            onChange={(value: CalendarValue) => {
              if (value instanceof Date) {
                handleDateSelect(value);
              }
            }}
            selectRange={true}
            value={selectedRange.startDate && selectedRange.endDate ? [selectedRange.startDate, selectedRange.endDate] : selectedRange.startDate}
            minDate={minDate}
            maxDate={maxDate}
            tileDisabled={({ date }) => isDateDisabled(date)}
            tileContent={({ date }) => getTileContent(date)}
            tileClassName={({ date }) => getTileClassName(date)}
            onClickDay={(date) => handleDateSelect(date)}
            showNeighboringMonth={false}
            prev2Label={null}
            next2Label={null}
            formatShortWeekday={(locale, date) => 
              ['S', 'M', 'T', 'W', 'T', 'F', 'S'][date.getDay()]
            }
            className="w-full border-none compact-calendar"
            onActiveStartDateChange={({ activeStartDate }) => {
              // Refetch data when month changes
              if (activeStartDate) {
                refetch();
              }
            }}
          />
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-600 rounded-full"></div>
            <span>Selected</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-100 border border-green-300 rounded-full"></div>
            <span>Range</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span>Booked</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
            <span>Pending</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
            <span>Blocked</span>
          </div>
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <Alert variant="destructive">
            <AlertDescription>
              <ul className="list-disc list-inside">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Selection Info */}
        {selectedRange.startDate && (
          <div className="space-y-2">
            {!selectedRange.endDate && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Select an end date to complete your booking range.
                </AlertDescription>
              </Alert>
            )}
            
            {getPreviewDuration() > 0 && (
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-sm font-medium text-gray-900">
                  Duration: {getPreviewDuration()} day{getPreviewDuration() !== 1 ? 's' : ''}
                </div>
                {selectedRange.startDate && (
                  <div className="text-xs text-gray-600 mt-1">
                    From {format(selectedRange.startDate, 'MMM d, yyyy')}
                    {selectedRange.endDate && (
                      <> to {format(selectedRange.endDate, 'MMM d, yyyy')}</>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          {(selectedRange.startDate || selectedRange.endDate) && (
            <Button
              onClick={handleClearSelection}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              Clear Selection
            </Button>
          )}
          {selectedRange.startDate && selectedRange.endDate && (
            <Button
              onClick={() => refetch()}
              variant="outline"
              size="sm"
            >
              Refresh
            </Button>
          )}
        </div>
      </CardContent>

      <style jsx global>{`
        .calendar-container .react-calendar {
          border: none;
          width: 100%;
          background: transparent;
        }
        
        .react-calendar__tile {
          height: 40px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          position: relative;
        }
        
        .react-calendar__tile:enabled:hover,
        .react-calendar__tile:enabled:focus {
          background-color: #f3f4f6;
        }
        
        .react-calendar__tile--disabled {
          background-color: #f9fafb;
          color: #d1d5db;
          cursor: not-allowed;
        }
        
        .react-calendar__month-view__days__day--weekend {
          color: #374151 !important;
          background-color: inherit !important;
        }
        
        .react-calendar__month-view__days__day--weekend:not(.react-calendar__tile--disabled):not(.react-calendar__tile--active):not(.react-calendar__tile--range):not(.react-calendar__tile--rangeStart):not(.react-calendar__tile--rangeEnd) {
          background-color: #f9fafb;
        }
        
        .react-calendar__navigation button {
          min-width: 44px;
          background: none;
          font-size: 16px;
          margin: 0 2px;
        }
        
        .react-calendar__navigation button:enabled:hover,
        .react-calendar__navigation button:enabled:focus {
          background-color: #f3f4f6;
        }
      `}</style>
    </Card>
  );
}