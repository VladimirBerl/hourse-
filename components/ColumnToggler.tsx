import React, { useState, useEffect, useRef } from 'react';

// Custom hook to manage column visibility with persistence in localStorage
export const usePersistentColumns = (storageKey: string, columnsConfig: Record<string, string>): [string[], React.Dispatch<React.SetStateAction<string[]>>] => {
    const getInitialState = () => {
        try {
            const item = window.localStorage.getItem(storageKey);
            return item ? JSON.parse(item) : Object.keys(columnsConfig);
        } catch (error) {
            console.error(error);
            return Object.keys(columnsConfig);
        }
    };

    const [visibleColumns, setVisibleColumns] = useState<string[]>(getInitialState);

    useEffect(() => {
        try {
            window.localStorage.setItem(storageKey, JSON.stringify(visibleColumns));
        } catch (error) {
            console.error(error);
        }
    }, [storageKey, visibleColumns]);

    return [visibleColumns, setVisibleColumns];
};

interface ColumnTogglerProps {
    columns: Record<string, string>;
    visibleColumns: string[];
    setVisibleColumns: React.Dispatch<React.SetStateAction<string[]>>;
}

const ColumnToggler: React.FC<ColumnTogglerProps> = ({ columns, visibleColumns, setVisibleColumns }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleToggle = (columnKey: string) => {
        setVisibleColumns(prev =>
            prev.includes(columnKey) ? prev.filter(key => key !== columnKey) : [...prev, columnKey]
        );
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="inline-flex items-center justify-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
                Колонки
                <svg className="-mr-1 ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            </button>

            {isOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                    <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                        {Object.entries(columns).map(([key, label]) => (
                            <label key={key} className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4 text-brand-primary border-gray-300 rounded focus:ring-brand-secondary"
                                    checked={visibleColumns.includes(key)}
                                    onChange={() => handleToggle(key)}
                                />
                                <span className="ml-3">{label}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ColumnToggler;