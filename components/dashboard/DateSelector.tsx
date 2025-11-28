'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';

interface DateSelectorProps {
  onMonthChange: (month: number, year: number) => void;
}

export function DateSelector({ onMonthChange }: DateSelectorProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isOpen, setIsOpen] = useState(false);

  const handlePrevMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setCurrentDate(newDate);
    onMonthChange(newDate.getMonth() + 1, newDate.getFullYear());
  };

  const handleNextMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setCurrentDate(newDate);
    onMonthChange(newDate.getMonth() + 1, newDate.getFullYear());
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setCurrentDate(date);
      onMonthChange(date.getMonth() + 1, date.getFullYear());
      setIsOpen(false);
    }
  };

  const memoizedOnMonthChange = useCallback(() => {
    onMonthChange(currentDate.getMonth() + 1, currentDate.getFullYear());
  }, [currentDate, onMonthChange]);

  useEffect(() => {
    memoizedOnMonthChange();
  }, [memoizedOnMonthChange]);

  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  return (
    <div className="flex items-center justify-between gap-4 bg-black/40 border border-gray-800 rounded-lg p-4 backdrop-blur-sm">
      <Button
        onClick={handlePrevMonth}
        variant="ghost"
        size="sm"
        className="text-gray-400 hover:text-white hover:bg-gray-800"
      >
        <ChevronLeft className="w-5 h-5" />
      </Button>

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className="flex items-center gap-2 text-lg font-semibold text-white hover:bg-gray-800"
          >
            <Calendar className="w-5 h-5 text-blue-400" />
            <span>
              {months[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-black border-gray-700" align="center">
          <CalendarComponent
            mode="single"
            selected={currentDate}
            onSelect={handleDateSelect}
            disabled={(date) => {
              // Disable future dates
              return date > new Date();
            }}
            className="rounded-md border border-gray-700 bg-black"
          />
        </PopoverContent>
      </Popover>

      <Button
        onClick={handleNextMonth}
        variant="ghost"
        size="sm"
        className="text-gray-400 hover:text-white hover:bg-gray-800"
      >
        <ChevronRight className="w-5 h-5" />
      </Button>
    </div>
  );
}
