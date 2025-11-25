import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { DataContext } from '../App';

const LegalPage: React.FC = () => {
    const data = useContext(DataContext);
    const settings = data?.settings;

    return (
        <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8 text-center">
                    <Link to="/login" state={{ showRegister: true }} className="text-brand-primary hover:underline font-semibold">
                        &larr; Назад к регистрации
                    </Link>
                </div>
                
                <div className="bg-white p-6 sm:p-8 rounded-lg shadow-md mb-8">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 border-b pb-4">
                        Пользовательское соглашение
                    </h1>
                    <div
                        className="prose max-w-none"
                        dangerouslySetInnerHTML={{ __html: settings?.termsOfService || '<p>Загрузка...</p>' }}
                    />
                </div>

                <div className="bg-white p-6 sm:p-8 rounded-lg shadow-md">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 border-b pb-4">
                        Политика конфиденциальности
                    </h1>
                    <div
                        className="prose max-w-none"
                        dangerouslySetInnerHTML={{ __html: settings?.privacyPolicy || '<p>Загрузка...</p>' }}
                    />
                </div>
            </div>
        </div>
    );
};

export default LegalPage;