import React from 'react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    confirmButtonClass?: string;
    hideCancelButton?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title, 
    message,
    confirmText = 'Подтвердить',
    cancelText = 'Отмена',
    confirmButtonClass = 'bg-brand-danger text-white hover:bg-red-700 focus:ring-brand-danger',
    hideCancelButton = false
}) => {
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" 
            onClick={onClose} 
            role="dialog" 
            aria-modal="true"
            aria-labelledby="confirmation-modal-title"
        >
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                <h2 id="confirmation-modal-title" className="text-xl font-bold text-gray-800">{title}</h2>
                <div className="text-gray-600 mt-4">{message}</div>
                <div className="mt-6 flex justify-end space-x-3">
                    {!hideCancelButton && (
                        <button 
                            type="button" 
                            onClick={onClose} 
                            className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
                        >
                            {cancelText}
                        </button>
                    )}
                    <button 
                        type="button" 
                        onClick={onConfirm} 
                        className={`px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${confirmButtonClass}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
