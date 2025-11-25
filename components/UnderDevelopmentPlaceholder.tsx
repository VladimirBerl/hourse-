import React from 'react';

const UnderDevelopmentPlaceholder: React.FC = () => {
    return (
        <div className="bg-white p-6 rounded-lg shadow-md flex flex-col items-center justify-center text-center h-full min-h-[calc(100vh-10rem)]">
            <h2 className="text-2xl font-bold text-gray-700 mb-2">Раздел в разработке</h2>
            <p className="text-gray-500 mt-2 max-w-md">Мы усердно работаем, чтобы скоро запустить эту функцию. Спасибо за ваше терпение!</p>
        </div>
    );
};

export default UnderDevelopmentPlaceholder;