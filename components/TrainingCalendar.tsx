import React, { useState, useMemo } from 'react';
import { TrainingSession } from '../types';

interface TrainingCalendarProps {
    trainings: TrainingSession[];
    onDateClick?: (date: Date) => void;
    selectedDate?: Date | null;
}

const TrainingCalendar: React.FC<TrainingCalendarProps> = ({ trainings, onDateClick, selectedDate }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const trainingDates = useMemo(() => {
        const now = new Date(); // Current date and time

        return new Set(
            trainings
                .filter(t => {
                    if (t.status === 'cancelled') {
                        return false;
                    }
                    // Combine date and time to get the exact start time of the training
                    const trainingDateTime = new Date(`${t.date.split('T')[0]}T${t.startTime}`);
                    
                    // A day should be highlighted if it has at least one training that hasn't finished yet.
                    return trainingDateTime >= now;
                })
                .map(t => new Date(t.date).toDateString())
        );
    }, [trainings]);

    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

    const calendarDays = [];
    const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
    
    for (let i = 0; i < startOffset; i++) {
        calendarDays.push(<div key={`empty-${i}`} className="p-1"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        const dateString = date.toDateString();
        const isTrainingDay = trainingDates.has(dateString);
        const isToday = dateString === new Date().toDateString();
        const isSelected = selectedDate?.toDateString() === dateString;

        let dayClass = "flex items-center justify-center w-full aspect-square rounded-full transition-colors duration-200 text-sm";

        if (isSelected) {
            dayClass += " bg-brand-primary text-white font-bold";
        } else if (isToday && isTrainingDay) {
            // Most specific case: today and has a training. Blue ring for today, solid green for training.
            dayClass += " ring-2 ring-brand-secondary bg-brand-accent text-white font-bold cursor-pointer";
        } else if (isToday) {
            dayClass += " ring-2 ring-brand-secondary text-brand-primary font-semibold";
        } else if (isTrainingDay) {
            dayClass += " bg-brand-accent bg-opacity-20 text-brand-accent font-semibold cursor-pointer hover:bg-opacity-40";
        } else {
             dayClass += " hover:bg-gray-100 cursor-pointer";
        }

        calendarDays.push(
            <div key={day} className="p-1" onClick={() => onDateClick?.(date)}>
                <div className={dayClass}>
                    {day}
                </div>
            </div>
        );
    }

    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

    return (
        <div className="max-w-xl mx-auto">
            <div className="flex justify-between items-center mb-4">
                <button type="button" onClick={prevMonth} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h2 className="text-xl font-semibold text-gray-700">
                    {currentDate.toLocaleString('ru-RU', { month: 'long', year: 'numeric' })}
                </h2>
                <button type="button" onClick={nextMonth} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
            </div>
            <div className="grid grid-cols-7 gap-y-1 text-sm">
                {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => <div key={day} className="font-bold text-center text-gray-500 py-2">{day}</div>)}
                {calendarDays}
            </div>
        </div>
    );
};

export default TrainingCalendar;