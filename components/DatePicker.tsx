
import React, { useState, useEffect, useRef } from 'react';

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  name: string;
  id?: string;
  required?: boolean;
}

const DatePicker: React.FC<DatePickerProps> = ({ value, onChange, name, id, required }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(value && !isNaN(new Date(value).getTime()) ? new Date(value + 'T00:00:00') : new Date());
  const datePickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (value && !isNaN(new Date(value).getTime())) {
      setCurrentDate(new Date(value + 'T00:00:00'));
    }
  }, [value]);

  const handleDateSelect = (day: number) => {
    const selected = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    onChange(selected.toISOString().split('T')[0]);
    setIsOpen(false);
  };

  const changeMonth = (offset: number) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + offset);
      return newDate;
    });
  };

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const selectedDate = value && !isNaN(new Date(value).getTime()) ? new Date(value + 'T00:00:00') : null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const blanks = Array(firstDayOfMonth).fill(null);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    return (
      <div className="absolute top-full mt-2 w-72 bg-white dark:bg-valuenova-surface border border-gray-200 dark:border-valuenova-border rounded-lg shadow-lg p-3 z-[100] transition-colors">
        <div className="flex justify-between items-center mb-2">
          <button type="button" onClick={() => changeMonth(-1)} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-valuenova-bg text-gray-600 dark:text-valuenova-muted">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </button>
          <span className="font-semibold text-gray-800 dark:text-white">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
          <button type="button" onClick={() => changeMonth(1)} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-valuenova-bg text-gray-600 dark:text-valuenova-muted">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        <div className="grid grid-cols-7 text-center text-xs text-gray-500 dark:text-valuenova-muted mb-2">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <div key={d} className="font-medium">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 text-center">
          {blanks.map((_, i) => <div key={`blank-${i}`} />)}
          {days.map(day => {
            const dayDate = new Date(year, month, day);
            const isSelected = selectedDate && dayDate.getTime() === selectedDate.getTime();
            const isToday = dayDate.getTime() === today.getTime();
            
            return (
              <button
                type="button"
                key={day}
                onClick={() => handleDateSelect(day)}
                className={`text-sm p-1 rounded-full w-8 h-8 flex items-center justify-center transition-colors
                  ${isSelected ? 'bg-indigo-600 dark:bg-valuenova-accent text-white font-bold' : 'text-gray-700 dark:text-valuenova-text'}
                  ${!isSelected && isToday ? 'ring-1 ring-indigo-500 dark:ring-valuenova-accent text-indigo-600 dark:text-valuenova-accent' : ''}
                  ${!isSelected ? 'hover:bg-gray-100 dark:hover:bg-valuenova-bg' : ''}
                `}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
    );
  };
  
  return (
    <div className="relative" ref={datePickerRef}>
      <div className="relative" onClick={() => setIsOpen(!isOpen)}>
        <input
          type="text"
          name={name}
          id={id || name}
          value={value}
          readOnly
          required={required}
          className="block w-full rounded-md bg-white dark:bg-valuenova-surface border border-gray-300 dark:border-valuenova-border text-gray-900 dark:text-white shadow-sm focus:border-indigo-500 dark:focus:border-valuenova-accent focus:ring-indigo-500 dark:focus:ring-valuenova-accent sm:text-sm cursor-pointer pl-3 pr-10 py-2 transition-colors"
          placeholder="Select date"
        />
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400 dark:text-valuenova-muted" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm10 5H4v8h12V7z" clipRule="evenodd" />
          </svg>
        </div>
      </div>
      {isOpen && renderCalendar()}
    </div>
  );
};

export default DatePicker;
