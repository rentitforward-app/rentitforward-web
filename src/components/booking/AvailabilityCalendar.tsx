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
  formatDateRange,
  checkDateRangeAvailability,
  validateDateRangeWithAvailability
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
      // First selection - allow single day booking
      newRange = {
        startDate: date,
        endDate: date, // Set end date to same as start date for single day
        duration: 1
      };
    } else if (!selectedRange.endDate) {
      // Second selection
      if (isBefore(date, selectedRange.startDate)) {
        // If selected date is before start date, restart selection
        newRange = {
          startDate: date,
          endDate: date, // Single day selection
          duration: 1
        };
      } else {
        // Valid end date - check if entire range is available
        const rangeCheck = checkDateRangeAvailability(selectedRange.startDate, date, availability);
        if (!rangeCheck.available) {
          // Show warning for conflicting dates but still allow selection
          setValidationErrors([`Warning: Selected dates include unavailable dates: ${rangeCheck.conflicts.join(', ')}. You may not be able to complete this booking.`]);
        } else {
          setValidationErrors([]);
        }
        
        const duration = calculateDuration(selectedRange.startDate, date);
        newRange = {
          startDate: selectedRange.startDate,
          endDate: date,
          duration
        };
      }
    } else {
      // Reset selection - allow single day booking
      newRange = {
        startDate: date,
        endDate: date, // Single day selection
        duration: 1
      };
    }

    // Validate the new range
    if (newRange.startDate && newRange.endDate) {
      const validation = validateDateRangeWithAvailability(
        newRange.startDate, 
        newRange.endDate, 
        availability, 
        minDate, 
        maxDate
      );
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
        data-status={dateAvailability.status}
      />
    );
  }, [availability]);

  // Get tile class name for styling
  const getTileClassName = useCallback((date: Date) => {
    const classes: string[] = [];

    // Always compute booked/unavailable state
    const dateStr = format(date, 'yyyy-MM-dd');
    const dateAvailability = availability?.find(a => a.date === dateStr);
    const isBooked = dateAvailability?.status === 'booked';
    const isUnavailable = availability && !isDateAvailable(dateStr, availability);

    if (isBooked) {
      classes.push('custom-booked');
    }

    // Selection-related classes only if a selection is in progress
    if (selectedRange.startDate) {
      const isStart = selectedRange.startDate && date.getTime() === selectedRange.startDate.getTime();
      const isEnd = selectedRange.endDate && date.getTime() === selectedRange.endDate.getTime();
      const isInRange = selectedRange.startDate && selectedRange.endDate &&
        date > selectedRange.startDate && date < selectedRange.endDate;
      const isHovered = hoveredDate && selectedRange.startDate && !selectedRange.endDate &&
        date >= selectedRange.startDate && date <= hoveredDate;

      if (isStart && isEnd) {
        classes.push('custom-selected-single');
      } else if (isStart) {
        classes.push('custom-selected-start');
      } else if (isEnd) {
        classes.push('custom-selected-end');
      } else if (isInRange) {
        classes.push(isUnavailable ? 'custom-range-booked' : 'custom-range-available');
      } else if (isHovered) {
        classes.push('custom-hovered');
      }
    }

    return classes.join(' ');
  }, [selectedRange, hoveredDate, availability]);

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
        <div className="calendar-container -mx-2 mt-2">
          <style dangerouslySetInnerHTML={{
            __html: `
              .calendar-container .react-calendar__tile {
                position: relative;
                height: 2rem;
                font-size: 0.75rem;
                background: white !important;
                border: 1px solid #e5e7eb !important;
                color: #374151 !important;
              }
              .calendar-container .react-calendar__tile:hover {
                background: #f9fafb !important;
              }
              .calendar-container .react-calendar__month-view__days__day--weekend {
                color: #374151 !important;
                background: white !important;
              }
              
              
              /* Custom selection styles */
              .calendar-container .custom-selected-single {
                background: #44D62C !important;
                color: white !important;
                font-weight: bold !important;
                border: 2px solid #3AB827 !important;
                border-radius: 6px !important;
                transform: scale(1.05) !important;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2) !important;
              }
              .calendar-container .custom-selected-start {
                background: #44D62C !important;
                color: white !important;
                font-weight: bold !important;
                border: 2px solid #3AB827 !important;
                border-radius: 6px 0 0 6px !important;
                transform: scale(1.05) !important;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2) !important;
              }
              .calendar-container .custom-selected-end {
                background: #44D62C !important;
                color: white !important;
                font-weight: bold !important;
                border: 2px solid #3AB827 !important;
                border-radius: 0 6px 6px 0 !important;
                transform: scale(1.05) !important;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2) !important;
              }
              .calendar-container .custom-range-available {
                background: #4ade80 !important;
                color: white !important;
                font-weight: 600 !important;
                border-top: 2px solid #3AB827 !important;
                border-bottom: 2px solid #3AB827 !important;
                border-left: 1px solid #3AB827 !important;
                border-right: 1px solid #3AB827 !important;
              }
              .calendar-container .custom-range-booked {
                background: #fef3c7 !important;
                color: #92400e !important;
                font-weight: 600 !important;
                border-top: 2px solid #f59e0b !important;
                border-bottom: 2px solid #f59e0b !important;
                border-left: 1px solid #f59e0b !important;
                border-right: 1px solid #f59e0b !important;
                position: relative;
              }
              .calendar-container .custom-range-booked::after {
                content: "⚠";
                position: absolute;
                top: -2px;
                right: -2px;
                background: #f59e0b;
                color: white;
                border-radius: 50%;
                width: 12px;
                height: 12px;
                font-size: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10;
              }
              .calendar-container .custom-hovered {
                background: #dcfce7 !important;
                color: #166534 !important;
                font-weight: 500 !important;
                border: 1px solid #22c55e !important;
                box-shadow: 0 1px 2px rgba(0,0,0,0.1) !important;
              }
              
              /* Disabled dates - match mobile grey background */
              .calendar-container .react-calendar__tile--disabled {
                background-color: #f3f4f6 !important;
                color: #9ca3af !important;
                cursor: not-allowed !important;
                border-color: #e5e7eb !important;
              }
              
              /* ALL disabled dates should be grey first */
              .calendar-container .react-calendar__tile--disabled {
                background-color: #f3f4f6 !important;
                color: #9ca3af !important;
                cursor: not-allowed !important;
                border-color: #e5e7eb !important;
              }
              
              /* Extra rule: when disabled attribute exists, ensure grey unless marked as booked */
              .calendar-container .react-calendar__tile[disabled]:not(.custom-booked) {
                background-color: #f3f4f6 !important;
                color: #9ca3af !important;
              }
              
              /* Override ONLY for booked dates - they should be light red */
              .calendar-container .react-calendar__tile--disabled.custom-booked,
              .calendar-container .react-calendar__tile.custom-booked {
                background-color: #fecaca !important;
                color: #b91c1c !important;
                cursor: not-allowed !important;
                border-color: #fca5a5 !important;
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
              
              /* Booked dates should always be light red - MUST BE LAST for highest priority */
              .calendar-container .custom-booked,
              .calendar-container .react-calendar__tile--disabled.custom-booked,
              .calendar-container .react-calendar__tile.custom-booked,
              .calendar-container .react-calendar__tile--disabled.react-calendar__month-view__days__day--weekend.custom-booked,
              .calendar-container .react-calendar__tile[disabled].custom-booked,
              .calendar-container .react-calendar__tile--disabled:not(.custom-selected-single):not(.custom-selected-start):not(.custom-selected-end).custom-booked {
                background-color: #fecaca !important;
                color: #b91c1c !important;
                cursor: not-allowed !important;
                border-color: #fca5a5 !important;
              }
            `
          }} />
          <div className="[&_.react-calendar]:text-sm [&_.react-calendar__tile]:h-8 [&_.react-calendar__tile]:text-xs [&_.react-calendar__navigation]:h-10 [&_.react-calendar__navigation]:mb-2 [&_.react-calendar__navigation_button]:min-w-8 [&_.react-calendar__month-view__weekdays]:text-xs">
            <Calendar
            onChange={(value: CalendarValue) => {
              if (value instanceof Date) {
                handleDateSelect(value);
              } else if (Array.isArray(value) && value[0] && value[1]) {
                // Handle range selection
                const [start, end] = value;
                if (start && end) {
                  // Check if entire range is available
                  const rangeCheck = checkDateRangeAvailability(start, end, availability || []);
                  const duration = calculateDuration(start, end);
                  const newRange = { startDate: start, endDate: end, duration };
                  setSelectedRange(newRange);
                  onDatesSelected(newRange);
                  
                  if (!rangeCheck.available) {
                    setValidationErrors([`Warning: Selected dates include unavailable dates: ${rangeCheck.conflicts.join(', ')}. You may not be able to complete this booking.`]);
                  } else {
                    setValidationErrors([]);
                  }
                }
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
        <div className="mt-4">
          <p className="text-sm font-medium text-gray-900 mb-2">Legend</p>
          <div className="flex items-center justify-center gap-4 text-xs text-gray-600">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 bg-green-600 rounded-full"></div>
              <span>Selected</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 bg-green-300 rounded-full"></div>
              <span>Range</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 bg-red-500 rounded-full"></div>
              <span>Booked</span>
            </div>
          </div>
        </div>

        {/* Validation Errors/Warnings */}
        {validationErrors.length > 0 && (
          <Alert variant={validationErrors[0]?.includes('Warning:') ? "default" : "destructive"}>
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
            {!selectedRange.endDate && selectedRange.startDate && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Click another date to extend your booking range, or proceed with single-day booking.
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
        
        /* Ensure disabled weekend dates have same styling as disabled weekdays */
        .react-calendar__tile--disabled.react-calendar__month-view__days__day--weekend {
          background-color: #f9fafb !important;
          color: #d1d5db !important;
          cursor: not-allowed !important;
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