import React, { useContext, useState, useEffect, useMemo } from 'react';
import { AuthContext } from '../App';
import { User, NewLocationRequest, LOCATION_DATA, SubscriptionTier, UserRole } from '../types';
import ConfirmationModal from '../components/ConfirmationModal';
import AnimatedStar from '../components/AnimatedStar';
import StaticStar from '../components/StaticStar';

export const AdminSetPasswordModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    user: User | null;
    onSave: (userId: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
    title: string;
}> = ({ isOpen, onClose, user, onSave, title }) => {
    const [newPassword, setNewPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isOpen) {
            setTimeout(() => {
                setNewPassword('');
                setMessage('');
                setError('');
            }, 300);
        }
    }, [isOpen]);

    if (!isOpen || !user) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');

        if (!newPassword) {
            setError('Пароль не может быть пустым.');
            return;
        }

        const result = await onSave(user.id, newPassword);

        if (result.success) {
            setMessage(result.message);
            setTimeout(() => {
                onClose();
            }, 2000);
        } else {
            setError(result.message);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b">
                        <h2 className="text-xl font-bold text-gray-800">{title}</h2>
                        <p className="text-sm text-gray-500 mt-1">{user.name} {user.surname}</p>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700" htmlFor="new-admin-password">Установить новый пароль</label>
                            <input
                                type="password"
                                id="new-admin-password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                            />
                        </div>
                        {message && <p className="text-sm text-green-600">{message}</p>}
                        {error && <p className="text-sm text-red-600">{error}</p>}
                    </div>
                    <div className="p-6 border-t flex justify-end space-x-3">
                        <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300">Отмена</button>
                        <button type="submit" className="bg-brand-primary text-white px-4 py-2 rounded-md hover:bg-brand-secondary">Сохранить</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const PasswordResetManager: React.FC = () => {
    const auth = useContext(AuthContext);
    const [showHistory, setShowHistory] = useState(false);
    const [userToReset, setUserToReset] = useState<User | null>(null);
    const [requestToReset, setRequestToReset] = useState<string | null>(null);
    const [requestToDelete, setRequestToDelete] = useState<string | null>(null);
    const [copiedPassword, setCopiedPassword] = useState<string | null>(null);

    if (!auth || !auth.user) return null;
    const { users, passwordResetRequests, resolvePasswordResetRequest, deletePasswordResetHistory } = auth;

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const pendingRequests = passwordResetRequests
        .filter(req => req.status === 'pending')
        .sort((a, b) => {
            const userA = users.find(u => u.id === a.userId);
            const userB = users.find(u => u.id === b.userId);
            const tierA = userA?.subscription?.tier === SubscriptionTier.Maximum ? 1 : 0;
            const tierB = userB?.subscription?.tier === SubscriptionTier.Maximum ? 1 : 0;
            if (tierA !== tierB) {
                return tierB - tierA;
            }
            return new Date(b.requestTimestamp).getTime() - new Date(a.requestTimestamp).getTime();
        });

    const historyRequests = passwordResetRequests
        .filter(req => req.status === 'completed' && req.resolvedTimestamp && new Date(req.resolvedTimestamp) > sevenDaysAgo)
        .sort((a,b) => new Date(b.resolvedTimestamp!).getTime() - new Date(a.resolvedTimestamp!).getTime());

    const handleResetClick = (userId: string, requestId: string) => {
        const user = users.find(u => u.id === userId);
        if(user) {
            setUserToReset(user);
            setRequestToReset(requestId);
        }
    };
    
    const handleConfirmDelete = async () => {
        if (requestToDelete && deletePasswordResetHistory) {
            await deletePasswordResetHistory(requestToDelete);
            setRequestToDelete(null);
        }
    };

    const handleSavePassword = async (userId: string, newPassword: string): Promise<{ success: boolean; message: string; }> => {
        if (!resolvePasswordResetRequest || !requestToReset) return { success: false, message: 'Ошибка' };
        return await resolvePasswordResetRequest(requestToReset, newPassword);
    };
    
    const handleCopy = (password: string) => {
        navigator.clipboard.writeText(password).then(() => {
            setCopiedPassword(password);
            setTimeout(() => setCopiedPassword(null), 2000);
        });
    };

    return (
        <>
            <AdminSetPasswordModal 
                isOpen={!!userToReset}
                onClose={() => setUserToReset(null)}
                user={userToReset}
                onSave={handleSavePassword}
                title="Сменить пароль пользователя"
            />
            <ConfirmationModal
                isOpen={!!requestToDelete}
                onClose={() => setRequestToDelete(null)}
                onConfirm={handleConfirmDelete}
                title="Отменить запрос"
                message="Вы уверены, что хотите отменить этот запрос на сброс пароля?"
            />
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Запросы на смену пароля</h2>
                {pendingRequests.length > 0 ? (
                    <div className="space-y-3">
                        {pendingRequests.map(req => {
                            const user = users.find(u => u.id === req.userId);
                            if (!user) return null;
                            return (
                                <div key={req.id} className="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                                    <div>
                                        <p className="font-semibold flex items-center gap-2">
                                            <span>{user.name} {user.surname}</span>
                                            {(user.subscription?.tier === SubscriptionTier.Maximum) && <AnimatedStar />}
                                            <span className="font-mono text-xs text-gray-500">(ID: {user.id})</span>
                                        </p>
                                        <p className="text-sm text-gray-600">Запрос от: {new Date(req.requestTimestamp).toLocaleString('ru-RU')}</p>
                                    </div>
                                    <div className="flex items-center space-x-2 self-end sm:self-center">
                                        <button onClick={() => setRequestToDelete(req.id)} className="bg-gray-300 text-gray-800 px-3 py-1.5 rounded-md text-sm font-semibold hover:bg-gray-400 transition">
                                            Отменить
                                        </button>
                                        <button onClick={() => handleResetClick(user.id, req.id)} className="bg-brand-primary text-white px-3 py-1.5 rounded-md text-sm font-semibold hover:bg-brand-secondary transition">
                                            Сменить пароль
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ) : <p className="text-gray-500">Нет активных запросов.</p>}

                {historyRequests.length > 0 && (
                    <div className="mt-6">
                         <button onClick={() => setShowHistory(!showHistory)} className="text-sm text-brand-primary hover:underline">
                            {showHistory ? 'Скрыть историю' : 'История изменений (за 7 дней)'}
                        </button>
                        {showHistory && (
                            <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm space-y-3">
                                {historyRequests.map(req => {
                                    const user = users.find(u => u.id === req.userId);
                                    const admin = users.find(u => u.id === req.resolvedBy);
                                    if (!user) return null;
                                    return (
                                        <div key={req.id} className="p-2 border-b last:border-b-0 flex justify-between items-center">
                                            <div>
                                                <p><span className="font-semibold">{user.name} {user.surname}</span></p>
                                                <p className="text-xs text-gray-500">Сброшен {new Date(req.resolvedTimestamp!).toLocaleString('ru-RU')} админом {admin ? admin.name : 'N/A'}</p>
                                            </div>
                                            <button onClick={() => deletePasswordResetHistory && deletePasswordResetHistory(req.id)} className="text-red-500 hover:text-red-700 text-xs font-semibold">Удалить</button>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    )
};

const EditLocationModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    request: NewLocationRequest | null;
    onSave: (requestId: string, correctedLocation: { city: string, region: string, country: string }) => void;
}> = ({ isOpen, onClose, request, onSave }) => {
    const [city, setCity] = useState('');
    const [region, setRegion] = useState('');
    const [country, setCountry] = useState('');

    useEffect(() => {
        if (request) {
            setCity(request.submittedCity);
            setRegion(request.submittedRegion);
            setCountry(request.submittedCountry);
        }
    }, [request]);

    const countrySuggestions = useMemo(() => Object.keys(LOCATION_DATA), []);
    
    if (!isOpen || !request) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(request.id, { city, region, country });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b">
                        <h2 className="text-xl font-bold text-gray-800">Редактировать и подтвердить локацию</h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Запрос от: {request.submittedCountry}, {request.submittedRegion}, {request.submittedCity}
                        </p>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700" htmlFor="country-correct">Страна</label>
                            <input
                                type="text"
                                id="country-correct"
                                value={country}
                                onChange={(e) => setCountry(e.target.value)}
                                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                                list="country-suggestions"
                            />
                            <datalist id="country-suggestions">
                                {countrySuggestions.map(c => <option key={c} value={c} />)}
                            </datalist>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700" htmlFor="region-correct">Регион</label>
                            <input
                                type="text"
                                id="region-correct"
                                value={region}
                                onChange={(e) => setRegion(e.target.value)}
                                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                            />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700" htmlFor="city-correct">Город</label>
                            <input
                                type="text"
                                id="city-correct"
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                            />
                        </div>
                    </div>
                    <div className="p-6 border-t flex justify-end space-x-3">
                        <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300">Отмена</button>
                        <button type="submit" className="bg-brand-primary text-white px-4 py-2 rounded-md hover:bg-brand-secondary">Сохранить и одобрить</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const LocationRequestManager: React.FC = () => {
    const auth = useContext(AuthContext);
    const [editingRequest, setEditingRequest] = useState<NewLocationRequest | null>(null);
    const [showHistory, setShowHistory] = useState(false);

    if (!auth || !auth.user) return null;
    const { users, newLocationRequests, resolveNewLocationRequest } = auth;
    
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const pendingRequests = newLocationRequests
        .filter(req => req.status === 'pending')
        .sort((a, b) => {
            const userA = users.find(u => u.id === a.userId);
            const userB = users.find(u => u.id === b.userId);
            const tierA = userA?.subscription?.tier === SubscriptionTier.Maximum ? 1 : 0;
            const tierB = userB?.subscription?.tier === SubscriptionTier.Maximum ? 1 : 0;
            if (tierA !== tierB) {
                return tierB - tierA;
            }
            return new Date(b.requestTimestamp).getTime() - new Date(a.requestTimestamp).getTime();
        });
        
    const historyRequests = newLocationRequests
        .filter(req => req.status !== 'pending' && req.resolvedTimestamp && new Date(req.resolvedTimestamp) > sevenDaysAgo)
        .sort((a,b) => new Date(b.resolvedTimestamp!).getTime() - new Date(a.resolvedTimestamp!).getTime());

    const handleApprove = (requestId: string) => {
        const request = newLocationRequests.find(r => r.id === requestId);
        if (request) {
            resolveNewLocationRequest && resolveNewLocationRequest(request.id, true);
        }
    };
    
    const handleSaveEdit = (requestId: string, correctedLocation: { city: string, region: string, country: string }) => {
        resolveNewLocationRequest && resolveNewLocationRequest(requestId, true, correctedLocation);
    };

    const handleReject = (requestId: string) => {
        resolveNewLocationRequest && resolveNewLocationRequest(requestId, false);
    };

    return (
        <>
            <EditLocationModal 
                isOpen={!!editingRequest}
                onClose={() => setEditingRequest(null)}
                request={editingRequest}
                onSave={handleSaveEdit}
            />
             <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Запросы на добавление локации</h2>
                 {pendingRequests.length > 0 ? (
                    <div className="space-y-3">
                        {pendingRequests.map(req => {
                            const user = users.find(u => u.id === req.userId);
                            return (
                                <div key={req.id} className="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                                    <div>
                                        <p className="font-semibold">{req.submittedCountry}, {req.submittedRegion}, {req.submittedCity}</p>
                                        <p className="text-sm text-gray-600 flex items-center gap-2">
                                            <span>Пользователь: {user ? `${user.name} ${user.surname}` : 'N/A'}</span>
                                            {user && (user.subscription?.tier === SubscriptionTier.Maximum) && <AnimatedStar />}
                                            <span className="font-mono text-xs text-gray-500">(ID: {req.userId})</span>
                                        </p>
                                        <p className="text-xs text-gray-500">Запрос от: {new Date(req.requestTimestamp).toLocaleString('ru-RU')}</p>
                                    </div>
                                    <div className="flex items-center space-x-2 self-end sm:self-center">
                                        <button onClick={() => handleReject(req.id)} className="bg-brand-danger text-white px-3 py-1.5 rounded-md text-sm font-semibold hover:bg-red-700 transition">Отклонить</button>
                                        <button onClick={() => setEditingRequest(req)} className="bg-gray-200 text-gray-800 px-3 py-1.5 rounded-md text-sm font-semibold hover:bg-gray-300 transition">Изменить</button>
                                        <button onClick={() => handleApprove(req.id)} className="bg-brand-accent text-white px-3 py-1.5 rounded-md text-sm font-semibold hover:bg-green-600 transition">Одобрить</button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ) : <p className="text-gray-500">Нет активных запросов.</p>}

                {historyRequests.length > 0 && (
                    <div className="mt-6">
                         <button onClick={() => setShowHistory(!showHistory)} className="text-sm text-brand-primary hover:underline">
                            {showHistory ? 'Скрыть историю' : 'История (за 7 дней)'}
                        </button>
                        {showHistory && (
                            <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm space-y-3">
                                {historyRequests.map(req => {
                                    const user = users.find(u => u.id === req.userId);
                                    const admin = users.find(u => u.id === req.resolvedBy);
                                    return (
                                        <div key={req.id} className="p-2 border-b last:border-b-0">
                                            <div className="flex justify-between items-center">
                                                <p><span className={`font-semibold ${req.status === 'approved' ? 'text-green-700' : 'text-red-700'}`}>{req.status === 'approved' ? 'ОДОБРЕНО' : 'ОТКЛОНЕНО'}</span>: {req.submittedCountry}, {req.submittedRegion}, {req.submittedCity}</p>
                                                <span className="text-xs text-gray-500">от {user ? `${user.name} ${user.surname}` : 'N/A'}</span>
                                            </div>
                                            <p className="text-xs text-gray-500">Резолюция: {new Date(req.resolvedTimestamp!).toLocaleString('ru-RU')} админом {admin ? admin.name : 'N/A'}</p>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    )
};


export const AdminRequestsPage: React.FC = () => {
    return (
        <div className="space-y-6">
            <PasswordResetManager />
            <LocationRequestManager />
        </div>
    )
};
