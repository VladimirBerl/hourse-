
import React, { useContext, useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext, DataContext } from '../App';
import { UserRole, User, TrainingSession, Announcement, DeletionInfo, BonusTransaction, SubscriptionTier, AppSettings } from '../types';
import {
    LineChart, Line, BarChart, Bar, Cell, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
// FIX: Import 'CartesianGrid' from 'recharts' to resolve 'Cannot find name' error.
    CartesianGrid
} from 'recharts';
import ConfirmationModal from '../components/ConfirmationModal';
import ColumnToggler, { usePersistentColumns } from '../components/ColumnToggler';
import UserInfoModal from '../components/UserInfoModal';
// FIX: Aliased the custom Tooltip component to avoid a name collision with the one from 'recharts'.
import CustomTooltip from '../components/Tooltip';
import SubscriptionStats from '../components/SubscriptionStats';

const AdminBonusModal: React.FC<{
    user: User | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (userId: string, amount: number, description: string) => Promise<void>;
    transactions: BonusTransaction[];
    settings: AppSettings;
    onSettingsSave: (settings: Partial<AppSettings>) => Promise<void>;
    allUsers: User[];
}> = ({ user, isOpen, onClose, onSave, transactions, settings, onSettingsSave, allUsers }) => {
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [expirationMonths, setExpirationMonths] = useState(settings.bonusExpirationMonths ?? 6);
    const [settingsMessage, setSettingsMessage] = useState('');

    const userTransactions = useMemo(() => {
        if (!user) return [];
        return transactions
            .filter(t => t.userId === user.id)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [transactions, user]);

    useEffect(() => {
        if (isOpen) {
            setAmount('');
            setDescription('');
            setExpirationMonths(settings.bonusExpirationMonths ?? 6);
            setSettingsMessage('');
        }
    }, [isOpen, settings]);

    if (!isOpen || !user) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const numAmount = parseInt(amount, 10);
        if (isNaN(numAmount) || numAmount === 0) {
            alert('Пожалуйста, введите корректную ненулевую сумму.');
            return;
        }
        await onSave(user.id, numAmount, description.trim());
        setAmount('');
        setDescription('');
    };

    const handleSettingsSave = async () => {
        await onSettingsSave({ bonusExpirationMonths: expirationMonths });
        setSettingsMessage('Сохранено!');
        setTimeout(() => setSettingsMessage(''), 2000);
    };

    const getAdminActionText = (transaction: BonusTransaction) => {
        if (!transaction.adminId) return '';
        const admin = allUsers.find(u => u.id === transaction.adminId);
        const adminName = admin ? `${admin.name} ${admin.surname}` : 'Неизвестный админ';
        return transaction.amount >= 0 ? `Начислил: ${adminName}` : `Списал: ${adminName}`;
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[70] flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b flex-shrink-0 text-center">
                    <h2 className="text-xl font-bold text-gray-800">Управление бонусами</h2>
                    <p className="text-sm text-gray-500 mt-1">{user.name} {user.surname}</p>
                    <p className="text-gray-600 mt-2">Текущий баланс:</p>
                    <p className="text-5xl font-bold text-brand-primary">{user.bonuses || 0}</p>
                </div>
                
                <div className="p-6 space-y-4 overflow-y-auto">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700" htmlFor="bonus-amount">Сумма</label>
                            <input
                                type="number"
                                id="bonus-amount"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="Например, 100 или -50"
                                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700" htmlFor="bonus-description">Описание/причина</label>
                            <input
                                type="text"
                                id="bonus-description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Например, 'За участие в конкурсе'"
                                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                            />
                        </div>

                        <div className="flex justify-end pt-2">
                            <button type="submit" className="bg-brand-primary text-white px-4 py-2 rounded-md hover:bg-brand-secondary">Сохранить</button>
                        </div>
                    </form>

                    <div className="border-t pt-4 mt-4">
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">Глобальные настройки</h3>
                        <div className="flex items-end gap-2">
                            <div className="flex-grow">
                                <label className="block text-sm font-medium text-gray-700" htmlFor="bonus-expiration">
                                    Срок действия бонусов (мес.)
                                </label>
                                <input
                                    type="number"
                                    id="bonus-expiration"
                                    value={expirationMonths}
                                    onChange={e => setExpirationMonths(parseInt(e.target.value, 10) || 1)}
                                    min="1"
                                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                                />
                            </div>
                            <button type="button" onClick={handleSettingsSave} className="bg-brand-secondary text-white px-4 py-2 rounded-md hover:bg-brand-primary h-11">
                                Сохранить
                            </button>
                        </div>
                        {settingsMessage && <p className="text-sm text-green-600 mt-2">{settingsMessage}</p>}
                    </div>
                    
                    <div className="border-t pt-4 mt-4">
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">История бонусов</h3>
                        {userTransactions.length > 0 ? (
                            <ul className="space-y-3 max-h-64 overflow-y-auto pr-2">
                                {userTransactions.map(t => (
                                    <li key={t.id} className="p-3 bg-gray-50 rounded-md border-l-4" style={{ borderColor: t.amount >= 0 ? '#38a169' : '#e53e3e' }}>
                                        <div>
                                            <p className={`font-bold text-2xl ${t.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {t.amount > 0 ? '+' : ''}{t.amount}
                                            </p>
                                            <p className="text-base text-gray-700">{t.description}</p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {new Date(t.timestamp).toLocaleString('ru-RU')}
                                                {t.adminId && ` - ${getAdminActionText(t)}`}
                                            </p>
                                            {t.source === 'referral' && t.sourceUserId && (
                                                (() => {
                                                    const sourceUser = allUsers.find(u => u.id === t.sourceUserId);
                                                    return <p className="text-xs text-gray-500">от: {sourceUser ? `${sourceUser.name} ${sourceUser.surname}` : 'Неизвестный'}</p>;
                                                })()
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-center text-gray-500 py-4">История операций пуста.</p>
                        )}
                    </div>
                </div>

                <div className="p-4 border-t flex-shrink-0 flex justify-end">
                    <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300">Закрыть</button>
                </div>
            </div>
        </div>
    );
};

const ReferralDetailsModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    user: User | null;
    allUsers: User[];
    bonusTransactions: BonusTransaction[];
}> = ({ isOpen, onClose, user, allUsers, bonusTransactions }) => {
    
    const referralData = useMemo(() => {
        if (!user) return [];

        const referredUsers = allUsers.filter(u => u.referredBy === user.id);

        const referralBonuses = bonusTransactions.filter(
            t => t.userId === user.id && t.source === 'referral' && t.sourceUserId
        );

        return referredUsers.map(referred => {
            const totalBonus = referralBonuses
                .filter(t => t.sourceUserId === referred.id)
                .reduce((sum, t) => sum + t.amount, 0);
            
            return {
                ...referred,
                totalBonusEarned: totalBonus
            };
        }).sort((a, b) => new Date(b.registrationDate).getTime() - new Date(a.registrationDate).getTime());

    }, [user, allUsers, bonusTransactions]);

    if (!isOpen || !user) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[70] flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b flex-shrink-0">
                    <h2 className="text-xl font-bold text-gray-800">Рефералы пользователя {user.name} {user.surname}</h2>
                </div>
                <div className="p-6 flex-grow overflow-y-auto">
                    {referralData.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Пользователь</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Дата регистрации</th>
                                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Получено бонусов</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {referralData.map(referredUser => (
                                        <tr key={referredUser.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{referredUser.name} {referredUser.surname}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(referredUser.registrationDate).toLocaleDateString('ru-RU')}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-green-600">
                                                {referredUser.totalBonusEarned.toFixed(0)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-center text-gray-500 py-8">У этого пользователя нет рефералов.</p>
                    )}
                </div>
                 <div className="p-4 border-t flex-shrink-0 flex justify-end">
                    <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300">Закрыть</button>
                </div>
            </div>
        </div>
    );
};

const BonusHistoryModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    user: User;
    transactions: BonusTransaction[];
    allUsers: User[];
}> = ({ isOpen, onClose, user, transactions, allUsers }) => {
    const userTransactions = useMemo(() => {
        return transactions
            .filter(t => t.userId === user.id)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [transactions, user.id]);

    if (!isOpen) return null;

    const getAdminActionText = (transaction: BonusTransaction) => {
        if (!transaction.adminId) return '';
        const admin = allUsers.find(u => u.id === transaction.adminId);
        const adminName = admin ? `${admin.name} ${admin.surname}` : 'Неизвестный админ';
        return transaction.amount >= 0 ? `Начислил: ${adminName}` : `Списал: ${adminName}`;
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[70] flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b flex justify-between items-center flex-shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">История бонусов</h2>
                        <p className="text-sm text-gray-500">{user.name} {user.surname}</p>
                    </div>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700 text-3xl">&times;</button>
                </div>
                <div className="p-6 flex-shrink-0">
                    <p className="text-center text-gray-600">Общий баланс:</p>
                    <p className="text-center text-4xl font-bold text-brand-primary">{user.bonuses || 0}</p>
                </div>
                <div className="px-6 pb-6 flex-grow overflow-y-auto">
                    {userTransactions.length > 0 ? (
                        <ul className="space-y-3">
                            {userTransactions.map(t => (
                                <li key={t.id} className="p-3 bg-gray-50 rounded-md border-l-4 flex justify-between items-start" style={{ borderColor: t.amount >= 0 ? '#38a169' : '#e53e3e' }}>
                                    <div>
                                        <p className={`font-bold text-lg ${t.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {t.amount > 0 ? '+' : ''}{t.amount}
                                        </p>
                                        <p className="text-sm text-gray-700">{t.description}</p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {new Date(t.timestamp).toLocaleString('ru-RU')}
                                            {t.adminId && ` - ${getAdminActionText(t)}`}
                                        </p>
                                        {t.source === 'referral' && t.sourceUserId && (
                                            (() => {
                                                const sourceUser = allUsers.find(u => u.id === t.sourceUserId);
                                                return <p className="text-xs text-gray-500">от: {sourceUser ? `${sourceUser.name} ${sourceUser.surname}` : 'Неизвестный'}</p>;
                                            })()
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-center text-gray-500 py-8">История операций пуста.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

const AdminSubscriptionModal: React.FC<{
    user: User | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (userId: string, subscription: { tier: SubscriptionTier; expiresAt: string | null; }) => Promise<void>;
}> = ({ user, isOpen, onClose, onSave }) => {
    const [tier, setTier] = useState<SubscriptionTier>(SubscriptionTier.Base);
    const [date, setDate] = useState('');
    const [time, setTime] = useState('23:59');

    useEffect(() => {
        if (user && isOpen) {
            setTier(user.subscription?.tier || SubscriptionTier.Base);
            const expires = user.subscription?.expiresAt;
            if (expires) {
                const d = new Date(expires);
                setDate(d.toISOString().split('T')[0]);
                setTime(d.toTimeString().substring(0, 5));
            } else {
                setDate('');
                setTime('23:59');
            }
        }
    }, [user, isOpen]);

    if (!isOpen || !user) return null;

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        let expiresAt: string | null = null;
        if (date) {
            // Combine date and time, ensuring time is set to end of day if not specified
            const finalTime = time || '23:59';
            expiresAt = new Date(`${date}T${finalTime}`).toISOString();
        }
        await onSave(user.id, { tier, expiresAt });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[70] flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSave}>
                    <div className="p-6 border-b">
                        <h2 className="text-xl font-bold text-gray-800">Изменение подписки</h2>
                        <p className="text-sm text-gray-500">{user.name} {user.surname}</p>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Тариф</label>
                            <select value={tier} onChange={e => setTier(e.target.value as SubscriptionTier)} className="mt-1 w-full p-2 border rounded bg-white">
                                {Object.values(SubscriptionTier).map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Дата окончания (оставить пустым для бессрочной)</label>
                            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1 w-full p-2 border rounded" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Время окончания</label>
                            <input type="time" value={time} onChange={e => setTime(e.target.value)} className="mt-1 w-full p-2 border rounded" />
                        </div>
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

const allTrainingTypes = [
    'Свободный', 'Манежная езда', 'Прыжковая работа', 'Полевая работа', 'Работа на корде/в руках'
];

const COLORS = ['#2c5282', '#2a69ac', '#4299e1', '#63b3ed', '#90cdf4', '#a0aec0'];

type Period = 'day' | 'week' | 'month' | 'year';
type View = 'dashboard' | 'all-users' | 'trainers' | 'students' | 'spectators' | 'trainings' | 'bonus-history';
type SortDirection = 'ascending' | 'descending';
type SortConfig = { key: string | null; direction: SortDirection; };

const useSortableData = (items: any[], initialConfig: SortConfig) => {
    const [sortConfig, setSortConfig] = useState<SortConfig>(initialConfig);

    useEffect(() => {
        setSortConfig(initialConfig);
    }, [initialConfig.key, initialConfig.direction]);

    const sortedItems = useMemo(() => {
        let sortableItems = [...items];
        if (sortConfig.key) {
            sortableItems.sort((a, b) => {
                const valA = a[sortConfig.key!];
                const valB = b[sortConfig.key!];

                if (['studentCount', 'approvedAnnouncementCount', 'effectiveDiscount', 'bonuses', 'referralCount', 'amount'].includes(sortConfig.key!)) {
                     const numA = valA === null || valA === undefined ? -1 : valA;
                     const numB = valB === null || valB === undefined ? -1 : valB;
                     if (sortConfig.direction === 'ascending') {
                         return numA - numB;
                     }
                     return numB - numA;
                }

                const isDate = ['registrationDate', 'date', 'deletionTimestamp', 'timestamp'].includes(sortConfig.key!);
                if (isDate) {
                    const dateA = valA ? new Date(valA).getTime() : 0;
                    const dateB = valB ? new Date(valB).getTime() : 0;
                    return sortConfig.direction === 'ascending'
                        ? dateA - dateB
                        : dateB - dateA;
                }

                if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [items, sortConfig]);

    const requestSort = (key: string) => {
        let direction: SortDirection = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    return { items: sortedItems, requestSort, sortConfig };
};

const SortableHeader: React.FC<{
    columnKey: string;
    title: string;
    requestSort: (key: string) => void;
    sortConfig: SortConfig;
    className?: string;
}> = ({ columnKey, title, requestSort, sortConfig, className }) => {
    const isSorted = sortConfig.key === columnKey;
    const indicator = isSorted ? (sortConfig.direction === 'ascending' ? ' ▲' : ' ▼') : '';
    return (
        <th
            scope="col"
            className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer ${className || ''}`}
            onClick={() => requestSort(columnKey)}
        >
            {title}{indicator}
        </th>
    );
};


const CombinedStatCard: React.FC<{ title: string; value: number | string; change?: number; icon: React.ReactNode }> = ({ title, value, change, icon }) => {
    const hasChange = typeof change === 'number' && isFinite(change);
    const isPositive = hasChange && change >= 0;
    const changeText = hasChange ? `${isPositive ? '+' : ''}${change.toFixed(1)}%` : null;
    
    return (
        <div className="p-4">
            <div className="flex items-center space-x-4">
                <div className="bg-brand-light p-3 rounded-full">{icon}</div>
                <div>
                    <p className="text-3xl font-bold text-gray-800">{value}</p>
                    <p className="text-sm text-gray-500 font-medium">{title}</p>
                </div>
            </div>
             {changeText && (
                <p className={`mt-2 text-sm font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                    {isPositive ? '▲' : '▼'} {changeText} (за 30 дней)
                </p>
            )}
        </div>
    );
};

const EditUserModal: React.FC<{ user: User | null; isOpen: boolean; onClose: () => void; onSave: (oldId: string, data: Partial<User>) => Promise<boolean>; locations: Record<string, Record<string, string[]>> }> = ({ user, isOpen, onClose, onSave, locations }) => {
    const [formData, setFormData] = useState<Partial<User>>({});
    const [error, setError] = useState('');

    useEffect(() => {
        if (user) {
            setFormData({
                id: user.id,
                name: user.name,
                surname: user.surname,
                country: user.country,
                region: user.region,
                city: user.city,
                role: user.role,
                email: user.email
            });
            setError('');
        }
    }, [user, isOpen]);

    const countries = Object.keys(locations);
    const regions = formData.country ? Object.keys(locations[formData.country] || {}) : [];
    const cities = formData.country && formData.region ? (locations[formData.country]?.[formData.region] || []) : [];

    if (!isOpen || !user) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => {
            if (name === 'country') {
                return { ...prev, country: value, region: '', city: '' };
            }
            if (name === 'region') {
                return { ...prev, region: value, city: '' };
            }
            return { ...prev, [name]: value };
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const success = await onSave(user.id, formData);
        if (success) {
            onClose();
        } else {
            setError('Ошибка: Пользователь с таким ID уже существует.');
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b"><h2 className="text-xl font-bold">Редактировать пользователя</h2></div>
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    <input name="name" value={formData.name || ''} onChange={handleChange} className="w-full p-2 border rounded" placeholder="Имя" />
                    <input name="surname" value={formData.surname || ''} onChange={handleChange} className="w-full p-2 border rounded" placeholder="Фамилия" />
                    
                    <div>
                        <label htmlFor="country-edit" className="block text-sm font-medium text-gray-700">Страна</label>
                        <select name="country" id="country-edit" value={formData.country || ''} onChange={handleChange} className="mt-1 w-full p-2 border rounded bg-white">
                            <option value="">Выберите страну</option>
                            {countries.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="region-edit" className="block text-sm font-medium text-gray-700">Регион/Область</label>
                        <select name="region" id="region-edit" value={formData.region || ''} onChange={handleChange} disabled={!formData.country} className="mt-1 w-full p-2 border rounded bg-white disabled:bg-gray-100">
                            <option value="">Выберите регион</option>
                            {regions.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="city-edit" className="block text-sm font-medium text-gray-700">Город</label>
                        <select name="city" id="city-edit" value={formData.city || ''} onChange={handleChange} disabled={!formData.region} className="mt-1 w-full p-2 border rounded bg-white disabled:bg-gray-100">
                            <option value="">Выберите город</option>
                            {cities.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    <input name="email" value={formData.email || ''} onChange={handleChange} className="w-full p-2 border rounded" placeholder="Email" />
                    <select name="role" value={formData.role || ''} onChange={handleChange} className="w-full p-2 border rounded bg-white">
                        <option value={UserRole.Student}>Ученик</option>
                        <option value={UserRole.Trainer}>Тренер</option>
                        <option value={UserRole.Spectator}>Пользователь</option>
                    </select>
                     <div>
                        <label htmlFor="user-id-edit" className="block text-sm font-medium text-gray-700">ID пользователя (изменять с осторожностью)</label>
                        <input id="user-id-edit" name="id" value={formData.id || ''} onChange={handleChange} className="mt-1 w-full p-2 border rounded font-mono" placeholder="ID" />
                    </div>
                    {error && <p className="text-sm text-red-600 text-center mt-2">{error}</p>}
                </div>
                <div className="p-6 border-t flex justify-end space-x-3">
                    <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300">Отмена</button>
                    <button type="submit" className="bg-brand-primary text-white px-4 py-2 rounded-md hover:bg-brand-secondary">Сохранить</button>
                </div>
            </form>
        </div>
    );
};

const EditDiscountModal: React.FC<{ 
    user: User | null; 
    isOpen: boolean; 
    onClose: () => void; 
    onSave: (userId: string, discount: number | undefined) => Promise<void>; 
}> = ({ user, isOpen, onClose, onSave }) => {
    const [discount, setDiscount] = useState('');

    useEffect(() => {
        if (user) {
            setDiscount(user.discount !== undefined ? String(user.discount) : '');
        }
    }, [user]);

    if (!isOpen || !user) return null;

    const publishedCount = (user as any).approvedAnnouncementCount || 0;
    const calculatedDiscount = Math.min(Math.floor(publishedCount / 10) * 5, 50);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const numDiscount = parseInt(discount, 10);
        if (discount === '' || isNaN(numDiscount) || numDiscount < 0 || numDiscount > 100) {
            alert('Пожалуйста, введите число от 0 до 100.');
            return;
        }
        await onSave(user.id, numDiscount);
        onClose();
    };

    const handleReset = async () => {
        await onSave(user.id, undefined);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b">
                        <h2 className="text-xl font-bold text-gray-800">Изменить скидку</h2>
                        <p className="text-sm text-gray-500 mt-1">{user.name} {user.surname}</p>
                    </div>
                    <div className="p-6 space-y-4">
                        <p className="text-sm text-gray-600">
                            Автоматическая скидка: <span className="font-bold">{calculatedDiscount}%</span> (на основе {publishedCount} опубликованных объявлений).
                        </p>
                        <div>
                            <label htmlFor="discount" className="block text-sm font-medium text-gray-700">Ручная установка скидки (%)</label>
                            <input
                                id="discount"
                                type="number"
                                value={discount}
                                onChange={e => setDiscount(e.target.value)}
                                placeholder="Например, 15"
                                min="0"
                                max="100"
                                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                            />
                        </div>
                    </div>
                    <div className="p-6 border-t flex justify-between items-center">
                        <button type="button" onClick={handleReset} className="text-sm text-brand-danger hover:underline">Сбросить на авто</button>
                        <div className="space-x-3">
                            <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300">Отмена</button>
                            <button type="submit" className="bg-brand-primary text-white px-4 py-2 rounded-md hover:bg-brand-secondary">Сохранить</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

const CopyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 hover:text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>;
const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>;

const userColumnsConfig: Record<string, string> = {
    id: 'ID',
    city: 'Город',
    role: 'Роль',
    subscription: 'Подписка',
    referralCount: 'Рефералы',
    studentCount: 'Ученики',
    approvedAnnouncementCount: 'Объявления',
    effectiveDiscount: 'Скидка (%)',
    bonuses: 'Бонусы',
    registrationDate: 'Дата рег.',
    deletionStatus: 'Статус',
};

const UserActionButtons: React.FC<{
    user: User;
    onInfo: (user: User) => void;
    onEdit: (user: User) => void;
    onDelete: (user: User) => void;
    className?: string;
    buttonClassName?: string;
}> = ({ user, onInfo, onEdit, onDelete, className, buttonClassName }) => (
    <div className={`flex flex-wrap items-center ${className} gap-x-4 gap-y-2`}>
        <button onClick={() => onInfo(user)} className={`font-semibold text-gray-600 hover:text-gray-900 ${buttonClassName}`}>Инфо</button>
        <button onClick={() => onEdit(user)} disabled={!!user.isDeleted} className={`font-semibold text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed ${buttonClassName}`}>Ред.</button>
        <button onClick={() => onDelete(user)} disabled={!!user.isDeleted} className={`font-semibold text-red-600 hover:text-red-800 disabled:text-gray-400 disabled:cursor-not-allowed ${buttonClassName}`}>Удал.</button>
    </div>
);

const UserSearchModal: React.FC<{ 
    users: User[]; 
    onEdit: (user: User) => void; 
    onDelete: (user: User) => void; 
    onEditDiscount: (user: User) => void;
    onInfo: (user: User) => void;
    onCopy: (id: string) => void;
    copiedId: string | null;
    onViewReferrals: (user: User) => void;
}> = ({ users, onEdit, onDelete, onEditDiscount, onInfo, onCopy, copiedId, onViewReferrals }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [visibleColumns, setVisibleColumns] = usePersistentColumns('adminSearchModalColumns', userColumnsConfig);
    const data = useContext(DataContext);
    if (!data) return null;
    const { announcements } = data;

    const augmentedUsers = useMemo(() => {
        return users
            .filter(user => user.role !== UserRole.Admin && !user.isDeleted)
            .map(user => {
                const publishedCount = announcements.filter(a =>
                    a.submittedById === user.id &&
                    a.status === 'published' &&
                    (!a.publishTimestamp || new Date(a.publishTimestamp) <= new Date())
                ).length;
                const calculatedDiscount = Math.min(Math.floor(publishedCount / 10) * 5, 50);
                const effectiveDiscount = user.discount !== undefined ? user.discount : calculatedDiscount;
                let studentCount = null;
                if (user.role === UserRole.Trainer) {
                    studentCount = user.linkedUsers.filter(linkedId => {
                        const linkedUser = users.find(u => u.id === linkedId);
                        return linkedUser && linkedUser.role === UserRole.Student;
                    }).length;
                }
                return { ...user, studentCount, approvedAnnouncementCount: publishedCount, effectiveDiscount, referralCount: user.referralCount || 0 };
            });
    }, [users, announcements]);
    
    const filteredUsers = useMemo(() => {
        return augmentedUsers.filter(user => {
            if (!searchQuery) return true;
            const query = searchQuery.toLowerCase();
            return (
                user.id.toLowerCase().includes(query) ||
                user.name.toLowerCase().includes(query) ||
                user.surname.toLowerCase().includes(query) ||
                `${user.name.toLowerCase()} ${user.surname.toLowerCase()}`.includes(query) ||
                user.email.toLowerCase().includes(query) ||
                user.city.toLowerCase().includes(query) ||
                user.role.toLowerCase().includes(query) ||
                (user.studentCount !== null && String(user.studentCount).includes(query))
            );
        });
    }, [searchQuery, augmentedUsers]);

    return (
        <>
            <div className="p-4 border-b">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold">Поиск пользователя</h2>
                     <ColumnToggler columns={userColumnsConfig} visibleColumns={visibleColumns} setVisibleColumns={setVisibleColumns} />
                </div>
                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Поиск по имени, фамилии, городу, роли, ID..." className="w-full p-2 border rounded mt-2" />
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto">
                {filteredUsers.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y">
                             <thead>
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Пользователь</th>
                                    {visibleColumns.includes('id') && <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID</th>}
                                    {visibleColumns.includes('role') && <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Роль</th>}
                                    {visibleColumns.includes('referralCount') && <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase text-center">Рефералы</th>}
                                    {visibleColumns.includes('studentCount') && <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase text-center">Ученики</th>}
                                    {visibleColumns.includes('approvedAnnouncementCount') && <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase text-center">Объявления</th>}
                                    {visibleColumns.includes('effectiveDiscount') && <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase text-center">Скидка</th>}
                                    {visibleColumns.includes('city') && <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Город</th>}
                                    {visibleColumns.includes('registrationDate') && <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Дата рег.</th>}
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Действия</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y">
                                {filteredUsers.map(user => (
                                    <tr key={user.id}>
                                        <td className="px-4 py-2 text-sm font-medium">
                                          <div className="flex items-center">
                                            <img src={user.avatarUrl || `https://ui-avatars.com/api/?name=${user.name}+${user.surname}&background=2c5282&color=fff&size=128&rounded=true`} alt="avatar" className="w-8 h-8 rounded-full mr-3" />
                                            <div>
                                                <p>{user.name} {user.surname}</p>
                                            </div>
                                          </div>
                                        </td>
                                        {visibleColumns.includes('id') && (
                                            <td className="px-4 py-2 text-sm font-mono align-middle">
                                                <div className="flex items-center space-x-2">
                                                    <span>{user.id}</span>
                                                    <button type="button" onClick={() => onCopy(user.id)} title="Копировать ID">
                                                        {copiedId === user.id ? <CheckIcon /> : <CopyIcon />}
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                        {visibleColumns.includes('role') && <td className="px-4 py-2 text-sm">{user.role}</td>}
                                        {visibleColumns.includes('referralCount') && (
                                            <td className="px-4 py-2 text-sm text-center">
                                                {user.referralCount > 0 ? (
                                                    <button
                                                        onClick={() => onViewReferrals(user as User)}
                                                        className="font-semibold text-brand-secondary hover:underline"
                                                        title="Посмотреть рефералов"
                                                    >
                                                        {user.referralCount}
                                                    </button>
                                                ) : (
                                                    <span>{user.referralCount}</span>
                                                )}
                                            </td>
                                        )}
                                        {visibleColumns.includes('studentCount') && <td className="px-4 py-2 text-sm text-center">{user.studentCount !== null ? user.studentCount : '—'}</td>}
                                        {visibleColumns.includes('approvedAnnouncementCount') && <td className="px-4 py-2 text-sm text-center">{user.approvedAnnouncementCount}</td>}
                                        {visibleColumns.includes('effectiveDiscount') && 
                                            <td className="px-4 py-2 text-sm text-center">
                                                <button onClick={() => onEditDiscount(user as User)} className="hover:underline" title="Редактировать скидку">
                                                    {user.effectiveDiscount}%
                                                </button>
                                            </td>
                                        }
                                        {visibleColumns.includes('city') && <td className="px-4 py-2 text-sm">{user.city}</td>}
                                        {visibleColumns.includes('registrationDate') && <td className="px-4 py-2 text-sm">{new Date(user.registrationDate).toLocaleDateString('ru-RU')}</td>}
                                        <td className="px-4 py-2 text-sm">
                                            <UserActionButtons 
                                                user={user as User}
                                                onInfo={onInfo}
                                                onEdit={onEdit}
                                                onDelete={onDelete}
                                                className="justify-start"
                                                buttonClassName="text-sm"
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-center text-gray-500 p-8">Пользователи не найдены.</p>
                )}
            </div>
        </>
    );
};

const getTrainingDateTime = (t: TrainingSession) => new Date(`${t.date.split('T')[0]}T${t.startTime}`);

const getDeletionMethodText = (method?: DeletionInfo['method']): string => {
    switch (method) {
        case 'self': return 'Самостоятельно';
        case 'auto': return 'Автоматически';
        case 'admin': return 'Администратором';
        default: return 'Неизвестно';
    }
};

const BonusHistoryView: React.FC<{ setView: React.Dispatch<React.SetStateAction<View>> }> = ({ setView }) => {
    const data = useContext(DataContext);
    const auth = useContext(AuthContext);

    // Filters state
    const [period, setPeriod] = useState<'week' | 'month' | 'year' | 'custom'>('month');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [countryFilter, setCountryFilter] = useState('all');
    const [regionFilter, setRegionFilter] = useState('all');
    const [cityFilter, setCityFilter] = useState('all');
    const [sourceFilter, setSourceFilter] = useState<'all' | 'referral' | 'admin_action' | 'system'>('all');
    const [typeFilter, setTypeFilter] = useState<'all' | 'accrual' | 'deduction'>('all');
    const [listSearch, setListSearch] = useState('');

    if (!data || !auth) return <div>Загрузка...</div>;
    const { bonusTransactions, locations } = data;
    const { users } = auth;

    // Location dropdown options
    const countries = useMemo(() => ['all', ...Object.keys(locations || {}).sort()], [locations]);
    const regions = useMemo(() => {
        if (countryFilter === 'all' || !locations[countryFilter]) return ['all'];
        return ['all', ...Object.keys(locations[countryFilter]).sort()];
    }, [countryFilter, locations]);
    const cities = useMemo(() => {
        if (countryFilter === 'all' || regionFilter === 'all' || !locations[countryFilter]?.[regionFilter]) return ['all'];
        return ['all', ...locations[countryFilter][regionFilter].sort()];
    }, [countryFilter, regionFilter, locations]);

    const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setCountryFilter(e.target.value);
        setRegionFilter('all');
        setCityFilter('all');
    };
    const handleRegionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setRegionFilter(e.target.value);
        setCityFilter('all');
    };

    const augmentedTransactions = useMemo(() => {
        return bonusTransactions.map(t => {
            const user = users.find(u => u.id === t.userId);
            const admin = t.adminId ? users.find(u => u.id === t.adminId) : null;
            const sourceUser = t.sourceUserId ? users.find(u => u.id === t.sourceUserId) : null;
            return {
                ...t,
                userName: user ? `${user.name} ${user.surname}` : 'N/A',
                userCity: user?.city,
                userRegion: user?.region,
                userCountry: user?.country,
                adminName: admin ? `${admin.name} ${admin.surname}` : 'N/A',
                sourceUserName: sourceUser ? `${sourceUser.name} ${sourceUser.surname}` : null
            };
        });
    }, [bonusTransactions, users]);

    const filteredItems = useMemo(() => {
        const now = new Date();
        let startDate = new Date();
        let endDate = new Date();
        endDate.setHours(23, 59, 59, 999);

        switch (period) {
            case 'week': startDate.setDate(now.getDate() - 6); break;
            case 'year': startDate.setFullYear(now.getFullYear() - 1); break;
            case 'custom':
                if (customStartDate && customEndDate) {
                    startDate = new Date(customStartDate);
                    endDate = new Date(customEndDate);
                    endDate.setHours(23, 59, 59, 999);
                } else {
                    return [];
                }
                break;
            case 'month':
            default: startDate.setMonth(now.getMonth() - 1); break;
        }
        startDate.setHours(0, 0, 0, 0);

        return augmentedTransactions.filter(item => {
            const itemDate = new Date(item.timestamp);
            if (itemDate < startDate || itemDate > endDate) return false;
            if (countryFilter !== 'all' && item.userCountry !== countryFilter) return false;
            if (regionFilter !== 'all' && item.userRegion !== regionFilter) return false;
            if (cityFilter !== 'all' && item.userCity !== cityFilter) return false;
            if (sourceFilter !== 'all' && (item.source || 'system') !== sourceFilter) return false;
            if (typeFilter === 'accrual' && item.amount <= 0) return false;
            if (typeFilter === 'deduction' && item.amount >= 0) return false;
            if (listSearch) {
                const search = listSearch.toLowerCase();
                return (
                    item.userName.toLowerCase().includes(search) ||
                    item.userId.includes(search) ||
                    item.description.toLowerCase().includes(search) ||
                    String(item.amount).includes(search) ||
                    (item.adminName && item.adminName.toLowerCase().includes(search)) ||
                    (item.sourceUserName && item.sourceUserName.toLowerCase().includes(search))
                );
            }
            return true;
        });
    }, [augmentedTransactions, period, customStartDate, customEndDate, countryFilter, regionFilter, cityFilter, sourceFilter, typeFilter, listSearch]);

    const { items: sortedItems, requestSort, sortConfig } = useSortableData(filteredItems, { key: 'timestamp', direction: 'descending' });

    const summary = useMemo(() => {
        const totalAccrued = sortedItems.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
        const totalSpent = sortedItems.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0);
        return { totalAccrued, totalSpent };
    }, [sortedItems]);

    const getSourceText = (transaction: typeof sortedItems[0]) => {
        switch (transaction.source) {
            case 'admin_action': return `Админ: ${transaction.adminName}`;
            case 'referral': return `Реферал: ${transaction.sourceUserName || transaction.sourceUserId}`;
            case 'system': return 'Система';
            default: return 'Покупка/Списание';
        }
    };
    
    return (
        <div className="bg-white p-6 rounded-lg shadow-md space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <h2 className="text-2xl font-bold">История всех бонусов</h2>
                <button onClick={() => setView('dashboard')} className="text-sm font-medium text-brand-primary hover:underline self-start sm:self-center">Назад к панели</button>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg border space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="text-xs font-medium text-gray-500">Период</label>
                        <select value={period} onChange={e => setPeriod(e.target.value as any)} className="w-full p-2 border rounded-md text-sm mt-1">
                            <option value="week">Неделя</option>
                            <option value="month">Месяц</option>
                            <option value="year">Год</option>
                            <option value="custom">Выбрать даты</option>
                        </select>
                    </div>
                    {period === 'custom' && (
                        <>
                            <div>
                                <label className="text-xs font-medium text-gray-500">С</label>
                                <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} className="w-full p-2 border rounded-md text-sm mt-1"/>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500">По</label>
                                <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} className="w-full p-2 border rounded-md text-sm mt-1"/>
                            </div>
                        </>
                    )}
                    <div>
                        <label className="text-xs font-medium text-gray-500">Тип</label>
                        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as any)} className="w-full p-2 border rounded-md text-sm mt-1">
                            <option value="all">Все</option>
                            <option value="accrual">Начисления</option>
                            <option value="deduction">Списания</option>
                        </select>
                    </div>
                     <div>
                        <label className="text-xs font-medium text-gray-500">Источник</label>
                        <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value as any)} className="w-full p-2 border rounded-md text-sm mt-1">
                            <option value="all">Все</option>
                            <option value="admin_action">От админов</option>
                            <option value="referral">От рефералов</option>
                            <option value="system">Система/Другое</option>
                        </select>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="text-xs font-medium text-gray-500">Страна</label>
                        <select value={countryFilter} onChange={handleCountryChange} className="w-full p-2 border rounded-md text-sm mt-1">
                            {countries.map(c => <option key={c} value={c}>{c === 'all' ? 'Все страны' : c}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-medium text-gray-500">Регион</label>
                        <select value={regionFilter} onChange={handleRegionChange} disabled={regions.length <= 1} className="w-full p-2 border rounded-md text-sm mt-1 disabled:bg-gray-200">
                             {regions.map(r => <option key={r} value={r}>{r === 'all' ? 'Все регионы' : r}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-medium text-gray-500">Город</label>
                        <select value={cityFilter} onChange={e => setCityFilter(e.target.value)} disabled={cities.length <= 1} className="w-full p-2 border rounded-md text-sm mt-1 disabled:bg-gray-200">
                             {cities.map(c => <option key={c} value={c}>{c === 'all' ? 'Все города' : c}</option>)}
                        </select>
                    </div>
                </div>
                <input type="text" value={listSearch} onChange={e => setListSearch(e.target.value)} placeholder="Поиск по пользователю (имя, ID), описанию, сумме..." className="w-full p-2 border rounded-md text-sm" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-green-50 text-green-800 p-4 rounded-lg text-center">
                    <p className="text-sm font-medium">Начислено за период</p>
                    <p className="text-2xl font-bold">{summary.totalAccrued.toFixed(0)}</p>
                </div>
                <div className="bg-red-50 text-red-800 p-4 rounded-lg text-center">
                    <p className="text-sm font-medium">Списано за период</p>
                    <p className="text-2xl font-bold">{summary.totalSpent.toFixed(0)}</p>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            <SortableHeader columnKey="timestamp" title="Дата" requestSort={requestSort} sortConfig={sortConfig} />
                            <SortableHeader columnKey="userName" title="Пользователь" requestSort={requestSort} sortConfig={sortConfig} />
                            <SortableHeader columnKey="amount" title="Сумма" requestSort={requestSort} sortConfig={sortConfig} />
                            <SortableHeader columnKey="description" title="Описание" requestSort={requestSort} sortConfig={sortConfig} />
                            <SortableHeader columnKey="source" title="Источник" requestSort={requestSort} sortConfig={sortConfig} />
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {sortedItems.map(item => (
                            <tr key={item.id}>
                                <td className="px-6 py-4 whitespace-nowrap">{new Date(item.timestamp).toLocaleString('ru-RU')}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <p className="font-medium">{item.userName}</p>
                                    <p className="text-xs text-gray-500">{item.userId}</p>
                                    <p className="text-xs text-gray-500">{item.userCity}, {item.userCountry}</p>
                                </td>
                                <td className={`px-6 py-4 whitespace-nowrap font-semibold ${item.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>{item.amount}</td>
                                <td className="px-6 py-4">{item.description}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{getSourceText(item)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {sortedItems.length === 0 && <p className="text-center text-gray-500 py-8">Нет транзакций за выбранный период.</p>}
            </div>
        </div>
    );
};


const AdminDashboardPage: React.FC = () => {
    const auth = useContext(AuthContext);
    const data = useContext(DataContext);
    const navigate = useNavigate();
    const [registrationPeriod, setRegistrationPeriod] = useState<Period>('month');
    const [trainingTypesPeriod, setTrainingTypesPeriod] = useState<Period>('month');
    const [view, setView] = useState<View>('dashboard');
    const [listSearch, setListSearch] = useState('');
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [deletingUser, setDeletingUser] = useState<User | null>(null);
    const [deletingTraining, setDeletingTraining] = useState<TrainingSession | null>(null);
    const [isSearchModalOpen, setSearchModalOpen] = useState(false);
    const [trainingsTab, setTrainingsTab] = useState<'past' | 'future'>('past');
    const [editingDiscountUser, setEditingDiscountUser] = useState<User | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [pageSize, setPageSize] = useState(50);
    const [visibleCount, setVisibleCount] = useState(50);
    const [infoUser, setInfoUser] = useState<User | null>(null);
    
    // State for showing deleted users
    const [showDeletedUsers, setShowDeletedUsers] = useState(false);
    const [visibleUserColumns, setVisibleUserColumns] = usePersistentColumns(`adminUserListColumns${showDeletedUsers ? '_deleted' : ''}`, userColumnsConfig);

    // New location filters state
    const [countryFilter, setCountryFilter] = useState('Все страны');
    const [regionFilter, setRegionFilter] = useState('Все регионы');
    const [cityFilter, setCityFilter] = useState('Все города');

    const [editingBonusesForUser, setEditingBonusesForUser] = useState<User | null>(null);
    const [viewingBonusHistoryFor, setViewingBonusHistoryFor] = useState<User | null>(null);
    const [editingSubscriptionUser, setEditingSubscriptionUser] = useState<User | null>(null);
    const [viewingReferralsFor, setViewingReferralsFor] = useState<User | null>(null);

    const [prices, setPrices] = useState(data?.settings?.subscriptionPrices || {
        [SubscriptionTier.Pro]: { month: 499, year: 4990 },
        [SubscriptionTier.Maximum]: { month: 999, year: 9990 },
    });
    const [paymentOptions, setPaymentOptions] = useState(data?.settings?.subscriptionPaymentOptions || {
        [SubscriptionTier.Pro]: { month: true, year: true },
        [SubscriptionTier.Maximum]: { month: true, year: true },
    });
    const [trial, setTrial] = useState(data?.settings?.trialSettings || { durationDays: 30, tier: SubscriptionTier.Pro });
    const [bonusPercentage, setBonusPercentage] = useState(data?.settings?.bonusPaymentPercentage ?? 25);
    const [subscriptionsMessage, setSubscriptionsMessage] = useState('');
    const [activeSubscriptionTab, setActiveSubscriptionTab] = useState('stats');

    useEffect(() => {
        if (data?.settings) {
            setPrices(data.settings.subscriptionPrices || {
                [SubscriptionTier.Pro]: { month: 499, year: 4990 },
                [SubscriptionTier.Maximum]: { month: 999, year: 9990 },
            });
            setPaymentOptions(data.settings.subscriptionPaymentOptions || {
                [SubscriptionTier.Pro]: { month: true, year: true },
                [SubscriptionTier.Maximum]: { month: true, year: true },
            });
            setTrial(data.settings.trialSettings || { durationDays: 30, tier: SubscriptionTier.Pro });
            setBonusPercentage(data.settings.bonusPaymentPercentage ?? 25);
        }
    }, [data?.settings]);

    const handleCopy = (id: string) => {
        navigator.clipboard.writeText(id).then(() => {
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2000);
        });
    };

    if (!auth || !auth.user || !data || auth.user.role !== UserRole.Admin) {
        return <div>Доступ запрещен.</div>;
    }

    const { user: currentUser, users, deleteUser, updateUsers, updateUserAndId, adminUpdateBonuses, silentlyUpdateUserInList } = auth;
    const { trainings, deleteTraining, announcements, locations, bonusTransactions, updateSettings, settings } = data;

    const handleSaveSubscription = async (userId: string, subscription: { tier: SubscriptionTier; expiresAt: string | null; }) => {
        if (silentlyUpdateUserInList) {
            await silentlyUpdateUserInList(userId, { subscription });
            setEditingSubscriptionUser(null);
        }
    };

    const handleSaveAllSubscriptionSettings = async () => {
        if (!updateSettings) return;
        setSubscriptionsMessage('Сохранение...');
        await updateSettings({
            subscriptionPrices: prices,
            subscriptionPaymentOptions: paymentOptions,
            trialSettings: trial,
            bonusPaymentPercentage: bonusPercentage,
        });
        setSubscriptionsMessage('Сохранено!');
        setTimeout(() => setSubscriptionsMessage(''), 3000);
    };

    const handlePriceChange = (tier: SubscriptionTier.Pro | SubscriptionTier.Maximum, duration: 'month' | 'year', value: string) => {
        const newPrices = JSON.parse(JSON.stringify(prices)); // Deep copy
        if (!newPrices[tier]) {
            newPrices[tier] = { month: 0, year: 0 };
        }
        newPrices[tier]![duration] = parseInt(value, 10) || 0;
        setPrices(newPrices);
    };
    
    const handleOptionToggle = (tier: SubscriptionTier.Pro | SubscriptionTier.Maximum, duration: 'month' | 'year', isEnabled: boolean) => {
        setPaymentOptions(prev => {
            const newOptions = JSON.parse(JSON.stringify(prev)); // Deep copy
            if (!newOptions[tier]) {
                newOptions[tier] = { month: false, year: false };
            }
            newOptions[tier]![duration] = isEnabled;
            return newOptions;
        });
    };

    useEffect(() => {
        if (editingBonusesForUser) {
            const updatedUser = users.find(u => u.id === editingBonusesForUser.id);
            if (updatedUser) {
                setEditingBonusesForUser(updatedUser);
            }
        }
    }, [users, editingBonusesForUser]);
    
    const canViewStats = currentUser.permissions?.canViewStats;
    const canManageUsers = currentUser.permissions?.canManageUsers;
    const canManageSubscriptions = currentUser.permissions?.canManageSubscriptions;

    // Location dropdown options
    const countries = useMemo(() => ['Все страны', ...Object.keys(locations || {}).sort()], [locations]);
    const regions = useMemo(() => {
        if (countryFilter === 'Все страны' || !locations[countryFilter]) {
            return ['Все регионы'];
        }
        return ['Все регионы', ...Object.keys(locations[countryFilter]).sort()];
    }, [countryFilter, locations]);
    const cities = useMemo(() => {
        if (countryFilter === 'Все страны' || regionFilter === 'Все регионы' || !locations[countryFilter]?.[regionFilter]) {
            return ['Все города'];
        }
        return ['Все города', ...locations[countryFilter][regionFilter].sort()];
    }, [countryFilter, regionFilter, locations]);
    
    const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setCountryFilter(e.target.value);
        setRegionFilter('Все регионы');
        setCityFilter('Все города');
    };
    const handleRegionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setRegionFilter(e.target.value);
        setCityFilter('Все города');
    };
    
    const filteredData = useMemo(() => {
        let baseUsers = users.filter(u => u.role !== UserRole.Admin);
        baseUsers = baseUsers.filter(u => showDeletedUsers ? u.isDeleted : !u.isDeleted);
        
        if (countryFilter !== 'Все страны') {
            baseUsers = baseUsers.filter(u => u.country === countryFilter);
            if (regionFilter !== 'Все регионы') {
                baseUsers = baseUsers.filter(u => u.region === regionFilter);
                if (cityFilter !== 'Все города') {
                    baseUsers = baseUsers.filter(u => u.city === cityFilter);
                }
            }
        }
        
        const filteredUserIds = new Set(baseUsers.map(u => u.id));
        
        const locationFilteredTrainings = trainings.filter(t => t.participants.some(p => filteredUserIds.has(p.userId)));

        return {
            users: baseUsers,
            trainings: locationFilteredTrainings,
        };
    }, [users, trainings, countryFilter, regionFilter, cityFilter, showDeletedUsers]);

    const stats = useMemo(() => {
        const { bonusTransactions } = data;
        const now = new Date();
        const periodStart1 = new Date(new Date().setDate(now.getDate() - 30));
        const periodStart2 = new Date(new Date().setDate(now.getDate() - 60));
        const calculateChange = (current: number, previous: number) => previous === 0 ? (current > 0 ? 100 : 0) : ((current - previous) / previous) * 100;

        const isCompletedAndPast = (t: TrainingSession) => {
            return getTrainingDateTime(t) < now && t.participants.every(p => p.confirmed) && t.status !== 'cancelled';
        };

        const completedTrainings = filteredData.trainings.filter(isCompletedAndPast);

        let userChange, trainingChange, trainerChange, studentChange, spectatorChange, bonusChange;

        const isGlobal = countryFilter === 'Все страны';
        if (isGlobal && !showDeletedUsers) {
            const allNonAdminUsers = users.filter(u => u.role !== UserRole.Admin && !u.isDeleted);
            
            const newUsers1 = allNonAdminUsers.filter(u => new Date(u.registrationDate) >= periodStart1).length;
            const newUsers2 = allNonAdminUsers.filter(u => new Date(u.registrationDate) >= periodStart2 && new Date(u.registrationDate) < periodStart1).length;
            userChange = calculateChange(newUsers1, newUsers2);
            
            const completedTrainingsAll = trainings.filter(isCompletedAndPast);
            const newTrainings1 = completedTrainingsAll.filter(t => new Date(t.date) >= periodStart1).length;
            const newTrainings2 = completedTrainingsAll.filter(t => new Date(t.date) >= periodStart2 && new Date(t.date) < periodStart1).length;
            trainingChange = calculateChange(newTrainings1, newTrainings2);
            
            const newTrainers1 = allNonAdminUsers.filter(u => u.role === UserRole.Trainer && new Date(u.registrationDate) >= periodStart1).length;
            const newTrainers2 = allNonAdminUsers.filter(u => u.role === UserRole.Trainer && new Date(u.registrationDate) >= periodStart2 && new Date(u.registrationDate) < periodStart1).length;
            trainerChange = calculateChange(newTrainers1, newTrainers2);

            const newStudents1 = allNonAdminUsers.filter(u => u.role === UserRole.Student && new Date(u.registrationDate) >= periodStart1).length;
            const newStudents2 = allNonAdminUsers.filter(u => u.role === UserRole.Student && new Date(u.registrationDate) >= periodStart2 && new Date(u.registrationDate) < periodStart1).length;
            studentChange = calculateChange(newStudents1, newStudents2);

            const newSpectators1 = allNonAdminUsers.filter(u => u.role === UserRole.Spectator && new Date(u.registrationDate) >= periodStart1).length;
            const newSpectators2 = allNonAdminUsers.filter(u => u.role === UserRole.Spectator && new Date(u.registrationDate) >= periodStart2 && new Date(u.registrationDate) < periodStart1).length;
            spectatorChange = calculateChange(newSpectators1, newSpectators2);

            const bonusesLast30Days = bonusTransactions.filter(t => t.amount > 0 && new Date(t.timestamp) >= periodStart1).reduce((sum, t) => sum + t.amount, 0);
            const bonusesPrev30Days = bonusTransactions.filter(t => t.amount > 0 && new Date(t.timestamp) >= periodStart2 && new Date(t.timestamp) < periodStart1).reduce((sum, t) => sum + t.amount, 0);
            bonusChange = calculateChange(bonusesLast30Days, bonusesPrev30Days);
        }
        
        return {
            totalUsers: { value: filteredData.users.length, change: userChange },
            trainerCount: { value: filteredData.users.filter(u => u.role === UserRole.Trainer).length, change: trainerChange },
            studentCount: { value: filteredData.users.filter(u => u.role === UserRole.Student).length, change: studentChange },
            spectatorCount: { value: filteredData.users.filter(u => u.role === UserRole.Spectator).length, change: spectatorChange },
            totalTrainings: { value: completedTrainings.length, change: trainingChange },
            totalBonusesTurnover: { value: bonusTransactions.filter(t => t.amount > 0 && new Date(t.timestamp) >= periodStart1).reduce((sum, t) => sum + t.amount, 0), change: bonusChange },
        };
    }, [filteredData, users, trainings, data.bonusTransactions, countryFilter, showDeletedUsers]);


    const userRegistrationData = useMemo(() => {
        const dataPoints: { date: string, count: number }[] = [];
        const now = new Date();
        const userRegistrations = filteredData.users; 
    
        if (registrationPeriod === 'day') {
            for (let i = 6; i >= 0; i--) {
                const d = new Date(now);
                d.setDate(d.getDate() - i);
                dataPoints.push({ date: d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }), count: 0 });
            }
            userRegistrations.forEach(user => {
                const regDate = new Date(user.registrationDate);
                if (regDate >= new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)) {
                    const formattedDate = regDate.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
                    const point = dataPoints.find(p => p.date === formattedDate);
                    if (point) point.count++;
                }
            });
        } else if (registrationPeriod === 'week') {
            for (let i = 3; i >= 0; i--) {
                const weekStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + 1 - (i * 7));
                dataPoints.push({ date: weekStartDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'numeric' }), count: 0 });
            }
            userRegistrations.forEach(user => {
                const regDate = new Date(user.registrationDate);
                 if (regDate > new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + 1 - (4*7))) {
                    const weekIndex = Math.floor((now.getTime() - regDate.getTime()) / (1000 * 3600 * 24 * 7));
                    if(dataPoints[3-weekIndex]) dataPoints[3-weekIndex].count++;
                }
            });
        } else if (registrationPeriod === 'month') {
            for (let i = 11; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                dataPoints.push({ date: d.toLocaleString('ru-RU', { month: 'short' }), count: 0 });
            }
            userRegistrations.forEach(user => {
                const regDate = new Date(user.registrationDate);
                if (regDate >= new Date(now.getFullYear(), now.getMonth() - 11, 1)) {
                    const formattedDate = regDate.toLocaleString('ru-RU', { month: 'short' });
                    const point = dataPoints.find(p => p.date === formattedDate);
                    if (point) point.count++;
                }
            });
        } else if (registrationPeriod === 'year') {
             for (let i = 4; i >= 0; i--) {
                const year = now.getFullYear() - i;
// FIX: Changed `String(year)` to `year.toString()` to resolve a "not callable" type error, likely from a TS inference issue.
                dataPoints.push({ date: year.toString(), count: 0 });
            }
             userRegistrations.forEach(user => {
                const regYear = new Date(user.registrationDate).getFullYear();
                if (regYear >= now.getFullYear() - 4) {
// FIX: Changed `String(regYear)` to `regYear.toString()` to resolve a "not callable" type error.
                    const point = dataPoints.find(p => p.date === regYear.toString());
                    if (point) point.count++;
                }
            });
        }
        return dataPoints;
    }, [filteredData.users, registrationPeriod]);
    
    const trainingTypesChartData = useMemo(() => {
        const now = new Date();
        const startDate = new Date();
    
        switch (trainingTypesPeriod) {
            case 'day':
                startDate.setDate(now.getDate() - 1);
                break;
            case 'week':
                startDate.setDate(now.getDate() - 7);
                break;
            case 'year':
                startDate.setFullYear(now.getFullYear() - 1);
                break;
            case 'month':
            default:
                startDate.setMonth(now.getMonth() - 1);
                break;
        }
        startDate.setHours(0, 0, 0, 0);
    
        const confirmedPastTrainings = filteredData.trainings.filter(t => {
            const trainingDateTime = getTrainingDateTime(t);
            return trainingDateTime < now &&
                   trainingDateTime >= startDate &&
                   t.participants.every(p => p.confirmed) &&
                   t.status !== 'cancelled';
        });
    
        const typeCounts = confirmedPastTrainings.reduce((acc, training) => {
            const type = training.type || 'Свободный';
            if (allTrainingTypes.includes(type)) {
                acc[type] = (acc[type] || 0) + 1;
            }
            return acc;
        }, {} as { [key: string]: number });
    
        return allTrainingTypes.map(type => ({
            name: type,
            value: typeCounts[type] || 0,
        }));
    }, [filteredData.trainings, trainingTypesPeriod]);

    
    const confirmDeleteUser = async () => {
        if (deletingUser) {
            await deleteUser(deletingUser.id);
            setDeletingUser(null);
        }
    };

    const confirmDeleteTraining = async () => {
        if (deletingTraining) {
            await deleteTraining(deletingTraining.id);
            setDeletingTraining(null);
        }
    };
    
    const handleSaveDiscount = async (userId: string, discount: number | undefined) => {
        const updatedUsersList = users.map(u => 
            u.id === userId
                ? { ...u, discount: discount }
                : u
        );
        await updateUsers(updatedUsersList);
    };

    const listData = useMemo(() => {
        if (view === 'dashboard' || view === 'bonus-history') {
            return { title: '', filteredItems: [], initialSortKey: 'registrationDate' };
        }

        let title = '';
        let items: (User | TrainingSession)[] = [];
        let activeUsers = filteredData.users;

        switch (view) {
            case 'all-users': title = showDeletedUsers ? 'Удаленные пользователи' : 'Все пользователи'; items = activeUsers; break;
            case 'trainers': title = showDeletedUsers ? 'Удаленные тренеры' : 'Тренеры'; items = activeUsers.filter(u => u.role === UserRole.Trainer); break;
            case 'students': title = showDeletedUsers ? 'Удаленные ученики' : 'Ученики'; items = activeUsers.filter(u => u.role === UserRole.Student); break;
            case 'spectators': title = showDeletedUsers ? `Удаленные (${UserRole.Spectator})` : `Роль "${UserRole.Spectator}"`; items = activeUsers.filter(u => u.role === UserRole.Spectator); break;
            case 'trainings': {
                const now = new Date();
                now.setHours(0, 0, 0, 0);

                const pastTrainings = filteredData.trainings.filter(t => new Date(t.date) < now);
                const futureTrainings = filteredData.trainings.filter(t => new Date(t.date) >= now);

                items = trainingsTab === 'past' ? pastTrainings : futureTrainings;
                title = trainingsTab === 'past' ? 'Прошедшие тренировки' : 'Запланированные тренировки';
                break;
            }
        }
        
        const augmentedItems = items.map(item => {
            if ('role' in item) { // It's a User
                const user = item as User;
                const publishedCount = announcements.filter(a => a.submittedById === user.id && a.status === 'published' && (!a.publishTimestamp || new Date(a.publishTimestamp) <= new Date())).length;
                const calculatedDiscount = Math.min(Math.floor(publishedCount / 10) * 5, 50);
                const effectiveDiscount = user.discount !== undefined ? user.discount : calculatedDiscount;
                let studentCount = null;
                if (user.role === UserRole.Trainer) {
                    studentCount = user.linkedUsers.filter(linkedId => {
                        const linkedUser = users.find(u => u.id === linkedId);
                        return linkedUser && linkedUser.role === UserRole.Student;
                    }).length;
                }
                return { 
                    ...user, 
                    studentCount, 
                    effectiveDiscount, 
                    approvedAnnouncementCount: publishedCount, 
                    deletionTimestamp: user.deletionInfo?.timestamp, 
                    bonuses: user.bonuses || 0,
                    subscriptionTier: user.subscription?.tier || 'AAA', // for sorting 'Нет' first
                    referralCount: user.referralCount || 0,
                };
            }
            return item; // It's a TrainingSession
        });

        const filteredItems = augmentedItems.filter(item => {
            if (!listSearch) return true;
            const search = listSearch.toLowerCase();
            const searchableItem = { ...item };
            if ('studentCount' in searchableItem && searchableItem.studentCount === null) {
                (searchableItem as any).studentCount = '';
            }
            return Object.values(searchableItem).some(val => String(val).toLowerCase().includes(search));
        });
        
        const initialSortKey = view === 'trainings' 
            ? 'date' 
            : (showDeletedUsers ? 'deletionTimestamp' : 'registrationDate');

        return { title, filteredItems, initialSortKey };
    }, [view, filteredData, listSearch, trainingsTab, announcements, users, showDeletedUsers]);
    
    const initialSortConfig = useMemo(() => ({
        key: listData.initialSortKey,
        direction: 'descending' as SortDirection,
    }), [listData.initialSortKey]);

    const { items: sortedItems, requestSort, sortConfig } = useSortableData(listData.filteredItems, initialSortConfig);
    
    useEffect(() => {
        setVisibleCount(pageSize);
    }, [sortedItems, pageSize]);

    const displayedItems = sortedItems.slice(0, visibleCount);
    const totalItems = sortedItems.length;

    const handleShowMore = () => {
        setVisibleCount(prev => Math.min(prev + pageSize, totalItems));
    };
    
    let pageContent;

    if (view === 'bonus-history') {
        // FIX: Only show this view if admin has canManageUsers permission.
        if (!canManageUsers) {
             pageContent = <div className="bg-white p-6 rounded-lg shadow-md text-center text-red-600">У вас нет прав для просмотра этого раздела.</div>;
        } else {
            pageContent = <BonusHistoryView setView={setView} />;
        }
    } else if (view !== 'dashboard') {
        if (!canManageUsers) {
            pageContent = <div className="bg-white p-6 rounded-lg shadow-md">Доступ запрещен.</div>;
        } else {
            const { title } = listData;
            pageContent = (
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold">{title}</h2>
                        <button onClick={() => setView('dashboard')} className="text-sm font-medium text-brand-primary hover:underline">Назад к панели</button>
                    </div>
                    {view === 'trainings' && (
                         <div className="mb-4 border-b border-gray-200">
                            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                                <button
                                    onClick={() => setTrainingsTab('past')}
                                    className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                                        trainingsTab === 'past'
                                        ? 'border-brand-primary text-brand-primary'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                                >
                                    Прошедшие
                                </button>
                                <button
                                    onClick={() => setTrainingsTab('future')}
                                    className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                                        trainingsTab === 'future'
                                        ? 'border-brand-primary text-brand-primary'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                                >
                                    Запланированные
                                </button>
                            </nav>
                        </div>
                    )}
                     <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                        <input type="text" value={listSearch} onChange={e => setListSearch(e.target.value)} placeholder="Поиск по всем параметрам..." className="w-full sm:w-auto flex-grow p-2 border rounded" />
                        <div className="flex items-center gap-4">
                            {view !== 'trainings' && (
                                <>
                                 <label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={showDeletedUsers}
                                        onChange={(e) => setShowDeletedUsers(e.target.checked)}
                                        className="h-4 w-4 text-brand-primary border-gray-300 rounded focus:ring-brand-primary"
                                    />
                                    <span className="text-sm font-medium text-gray-700">Показывать удалённых</span>
                                </label>
                                <ColumnToggler columns={userColumnsConfig} visibleColumns={visibleUserColumns} setVisibleColumns={setVisibleUserColumns} />
                                </>
                            )}
                        </div>
                    </div>
    
                    <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                        <div className="flex items-center gap-2">
                             <label htmlFor="page-size" className="text-sm font-medium text-gray-700">Показывать по:</label>
                             <select
                                 id="page-size"
                                 value={pageSize}
                                 onChange={e => setPageSize(Number(e.target.value))}
                                 className="border border-gray-300 rounded-md shadow-sm px-2 py-1 focus:ring-brand-secondary focus:border-brand-secondary bg-white text-sm"
                             >
                                 <option value={10}>10</option>
                                 <option value={50}>50</option>
                                 <option value={100}>100</option>
                                 <option value={500}>500</option>
                             </select>
                        </div>
                        <div className="text-sm text-gray-600">
                            Показано {Math.min(visibleCount, totalItems)} из {totalItems}
                        </div>
                    </div>
    
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y">
                            <thead className="bg-gray-50">
                                {view !== 'trainings' ? (
                                    <tr>
                                        <SortableHeader columnKey="name" title="Пользователь" requestSort={requestSort} sortConfig={sortConfig} />
                                        {visibleUserColumns.includes('id') && <SortableHeader columnKey="id" title="ID" requestSort={requestSort} sortConfig={sortConfig} />}
                                        {visibleUserColumns.includes('city') && <SortableHeader columnKey="city" title="Город" requestSort={requestSort} sortConfig={sortConfig} />}
                                        {visibleUserColumns.includes('role') && <SortableHeader columnKey="role" title="Роль" requestSort={requestSort} sortConfig={sortConfig} />}
                                        {visibleUserColumns.includes('subscription') && <SortableHeader columnKey="subscriptionTier" title="Подписка" requestSort={requestSort} sortConfig={sortConfig} />}
                                        {visibleUserColumns.includes('referralCount') && <SortableHeader columnKey="referralCount" title="Рефералы" requestSort={requestSort} sortConfig={sortConfig} className="text-center" />}
                                        {!showDeletedUsers && visibleUserColumns.includes('studentCount') && <SortableHeader columnKey="studentCount" title="Ученики" requestSort={requestSort} sortConfig={sortConfig} className="text-center" />}
                                        {!showDeletedUsers && visibleUserColumns.includes('approvedAnnouncementCount') && <SortableHeader columnKey="approvedAnnouncementCount" title="Объявления" requestSort={requestSort} sortConfig={sortConfig} className="text-center" />}
                                        {!showDeletedUsers && visibleUserColumns.includes('effectiveDiscount') && <SortableHeader columnKey="effectiveDiscount" title="Скидка" requestSort={requestSort} sortConfig={sortConfig} className="text-center" />}
                                        {!showDeletedUsers && visibleUserColumns.includes('bonuses') && <SortableHeader columnKey="bonuses" title="Бонусы" requestSort={requestSort} sortConfig={sortConfig} className="text-center" />}
                                        <SortableHeader columnKey="registrationDate" title="Дата рег." requestSort={requestSort} sortConfig={sortConfig} />
                                        {showDeletedUsers && visibleUserColumns.includes('deletionStatus') && <SortableHeader columnKey="deletionTimestamp" title="Статус" requestSort={requestSort} sortConfig={sortConfig} />}
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Действия</th>
                                    </tr>
                                ) : (
                                     <tr>
                                        <SortableHeader columnKey="id" title="ID" requestSort={requestSort} sortConfig={sortConfig} />
                                        <SortableHeader columnKey="date" title="Дата" requestSort={requestSort} sortConfig={sortConfig} />
                                        <SortableHeader columnKey="startTime" title="Время" requestSort={requestSort} sortConfig={sortConfig} />
                                        <SortableHeader columnKey="type" title="Тип" requestSort={requestSort} sortConfig={sortConfig} />
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Действия</th>
                                    </tr>
                                )}
                            </thead>
                            <tbody className="bg-white divide-y">
                                {displayedItems.map(item => 'role' in item ? (
                                    <tr key={item.id}>
                                        <td className="px-6 py-4 text-sm font-medium">
                                            <div className="flex items-center">
                                                <img src={item.avatarUrl || `https://ui-avatars.com/api/?name=${item.name}+${item.surname}&background=2c5282&color=fff&size=128&rounded=true`} alt="avatar" className="w-10 h-10 rounded-full mr-4" />
                                                <div>
                                                    <p>{item.name} {item.surname}</p>
                                                </div>
                                            </div>
                                        </td>
                                        {visibleUserColumns.includes('id') && (
                                            <td className="px-6 py-4 text-sm font-mono align-middle">
                                                <div className="flex items-center space-x-2">
                                                    <span>{item.id}</span>
                                                    <button type="button" onClick={() => handleCopy(item.id)} title="Копировать ID">
                                                        {copiedId === item.id ? <CheckIcon /> : <CopyIcon />}
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                        {visibleUserColumns.includes('city') && <td className="px-6 py-4 text-sm">{item.city}</td>}
                                        {visibleUserColumns.includes('role') && <td className="px-6 py-4 text-sm">{item.role}</td>}
                                        {visibleUserColumns.includes('subscription') && (
                                            <td className="px-6 py-4 text-sm whitespace-nowrap">
                                                <button onClick={() => setEditingSubscriptionUser(item as User)} className="hover:underline text-left" disabled={!!item.isDeleted}>
                                                    <p className="font-semibold">{item.subscription?.tier || 'Нет'}</p>
                                                    {item.subscription?.expiresAt ? (
                                                        <p className="text-xs text-gray-500">до {new Date(item.subscription.expiresAt).toLocaleDateString('ru-RU')}</p>
                                                    ) : (
                                                        <p className="text-xs text-gray-500">Бессрочно</p>
                                                    )}
                                                </button>
                                            </td>
                                        )}
                                        {visibleUserColumns.includes('referralCount') && (
                                            <td className="px-6 py-4 text-sm text-center">
                                                {(item as any).referralCount > 0 ? (
                                                    <button
                                                        onClick={() => setViewingReferralsFor(item as User)}
                                                        className="font-semibold text-brand-secondary hover:underline"
                                                        title="Посмотреть рефералов"
                                                    >
                                                        {(item as any).referralCount}
                                                    </button>
                                                ) : (
                                                    <span>{(item as any).referralCount}</span>
                                                )}
                                            </td>
                                        )}
                                        {!showDeletedUsers && visibleUserColumns.includes('studentCount') && <td className="px-6 py-4 text-sm text-center">{(item as any).studentCount !== null ? (item as any).studentCount : '—'}</td>}
                                        {!showDeletedUsers && visibleUserColumns.includes('approvedAnnouncementCount') && <td className="px-6 py-4 text-sm text-center">{(item as any).approvedAnnouncementCount}</td>}
                                        {!showDeletedUsers && visibleUserColumns.includes('effectiveDiscount') && 
                                            <td className="px-6 py-4 text-sm text-center">
                                                <button onClick={() => setEditingDiscountUser(item as User)} className="hover:underline" title="Редактировать скидку">
                                                    {(item as any).effectiveDiscount}%
                                                </button>
                                            </td>
                                        }
                                        {!showDeletedUsers && visibleUserColumns.includes('bonuses') && 
                                            <td className="px-6 py-4 text-sm text-center">
                                                <button onClick={() => setEditingBonusesForUser(item as User)} className="font-semibold text-brand-secondary hover:underline" title="Изменить бонусы">
                                                    {(item as any).bonuses || 0}
                                                </button>
                                            </td>
                                        }
                                        <td className="px-6 py-4 text-sm">{new Date(item.registrationDate).toLocaleDateString('ru-RU')}</td>
                                        {showDeletedUsers && visibleUserColumns.includes('deletionStatus') && (
                                            <td className="px-6 py-4 text-sm">
                                                <p className="font-semibold">{getDeletionMethodText(item.deletionInfo?.method)}</p>
                                                <p className="text-xs text-gray-500">{new Date(item.deletionInfo!.timestamp).toLocaleString('ru-RU')}</p>
                                            </td>
                                        )}
                                        <td className="px-6 py-4 text-sm">
                                            <UserActionButtons 
                                                user={item as User}
                                                onInfo={setInfoUser}
                                                onEdit={setEditingUser}
                                                onDelete={setDeletingUser}
                                                className="justify-start"
                                                buttonClassName="text-sm"
                                            />
                                        </td>
                                    </tr>
                                ) : (
                                    <tr key={item.id}>
                                        <td className="px-6 py-4 text-sm font-mono">{item.id}</td>
                                        <td className="px-6 py-4 text-sm">{new Date(item.date).toLocaleDateString('ru-RU')}</td>
                                        <td className="px-6 py-4 text-sm">{item.startTime}</td>
                                        <td className="px-6 py-4 text-sm">{item.type || 'Без типа'}</td>
                                        <td className="px-6 py-4 text-sm">
                                            <button onClick={() => setDeletingTraining(item as TrainingSession)} className="font-semibold text-red-600 hover:text-red-800">Удал.</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                     {visibleCount < totalItems && (
                         <div className="mt-6 text-center">
                             <button
                                 onClick={handleShowMore}
                                 className="bg-brand-secondary text-white font-semibold px-6 py-2 rounded-lg shadow hover:bg-brand-primary transition-colors"
                             >
                                 Показать ещё
                             </button>
                         </div>
                     )}
                </div>
            );
        }
    } else { // Dashboard View
        pageContent = (
            <div className="space-y-6">
                {(!canViewStats && !canManageUsers) && (
                    <div className="bg-white p-6 rounded-lg shadow-md text-center">
                        <p>У вас нет прав для просмотра этого раздела.</p>
                    </div>
                )}
    
                {/* FIX: Restricted "General Statistics" block to 'canManageUsers' only. */}
                {canManageUsers && (
                    <div className="bg-white p-6 rounded-lg shadow-md">
                         <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4">
                            <h3 className="text-xl font-semibold text-gray-700">Общая статистика</h3>
                            <button onClick={() => setSearchModalOpen(true)} className="bg-brand-secondary text-white font-semibold px-4 py-2 rounded-lg shadow hover:bg-brand-primary transition-colors flex items-center text-sm">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="http://www.w3.org/2000/svg" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>
                                Найти пользователя
                            </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 border rounded-lg">
                            <div onClick={() => setView('all-users')} className="cursor-pointer hover:bg-gray-50 rounded-tl-lg"><CombinedStatCard title="Активных пользователей" value={stats.totalUsers.value} change={stats.totalUsers.change} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.084-1.28-.24-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.084-1.28.24-1.857m10 0a5 5 0 00-9.5 0m9.5 0a5.002 5.002 0 01-2.24 4.242M9.24 15.757a5.002 5.002 0 01-2.24-4.242M12 11a4 4 0 110-8 4 4 0 010 8z" /></svg>} /></div>
                            <div onClick={() => setView('trainings')} className="cursor-pointer hover:bg-gray-50 sm:border-l"><CombinedStatCard title="Завершенных тренировок" value={stats.totalTrainings.value} change={stats.totalTrainings.change} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-brand-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0h18" /></svg>} /></div>
                            <div onClick={() => setView('trainers')} className="cursor-pointer hover:bg-gray-50 border-t lg:border-t-0 sm:border-l lg:border-l rounded-tr-lg"><CombinedStatCard title="Всего тренеров" value={stats.trainerCount.value} change={stats.trainerCount.change} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.324l5.584.545a.563.563 0 01.328.959l-4.184 3.548a.563.563 0 00-.154.543l1.236 5.348a.563.563 0 01-.844.62l-4.733-2.735a.563.563 0 00-.536 0l-4.734 2.735a.563.563 0 01-.844-.62l1.236-5.348a.563.563 0 00-.154-.543l-4.184-3.548a.563.563 0 01.328-.959l5.584-.545a.563.563 0 00.475-.324l2.125-5.111z" /></svg>} /></div>
                            <div onClick={() => setView('students')} className="cursor-pointer hover:bg-gray-50 border-t sm:border-l-0 lg:border-l-0"><CombinedStatCard title="Всего учеников" value={stats.studentCount.value} change={stats.studentCount.change} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-brand-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>} /></div>
                            <div onClick={() => setView('spectators')} className="cursor-pointer hover:bg-gray-50 border-t sm:border-l"><CombinedStatCard title={`Роль "${UserRole.Spectator}"`} value={stats.spectatorCount.value} change={stats.spectatorCount.change} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>} /></div>
                            <div onClick={() => setView('bonus-history')} className="cursor-pointer hover:bg-gray-50 border-t sm:border-l lg:border-l"><CombinedStatCard title="Оборот бонусов (30 дн)" value={stats.totalBonusesTurnover.value.toFixed(0)} change={stats.totalBonusesTurnover.change} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 5a3 3 0 015.252-2.121l.738.738a.75.75 0 01-1.06 1.06l-.738-.738A1.5 1.5 0 005 5zm4.748 9.252a.75.75 0 011.06-1.06l.738.738a3 3 0 01-5.252 2.121l-.738-.738a.75.75 0 011.06-1.06l.738.738A1.5 1.5 0 009.748 14.252zM10 15a5 5 0 100-10 5 5 0 000 10z" clipRule="evenodd" /></svg>} /></div>
                        </div>
                    </div>
                )}
                
                {canViewStats && (
                    <>
                    <div className="bg-white p-6 rounded-lg shadow-md">
                         <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
                            <h3 className="text-xl font-semibold text-gray-700">Динамика регистраций</h3>
                            <div className="flex items-center gap-2 flex-wrap">
                                <select value={registrationPeriod} onChange={e => setRegistrationPeriod(e.target.value as Period)} className="bg-white p-1.5 border border-gray-300 rounded-lg text-sm font-semibold focus:ring-brand-secondary focus:border-brand-secondary">
                                    <option value="day">День</option>
                                    <option value="week">Неделя</option>
                                    <option value="month">Месяц</option>
                                    <option value="year">Год</option>
                                </select>
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <select value={countryFilter} onChange={handleCountryChange} className="bg-white p-1.5 border border-gray-300 rounded-lg text-sm font-semibold focus:ring-brand-secondary focus:border-brand-secondary">
                                        {countries.map(c => <option key={c} value={c}>{c === 'Все страны' ? c : c}</option>)}
                                    </select>
                                     <select value={regionFilter} onChange={handleRegionChange} disabled={regions.length <= 1} className="bg-white p-1.5 border border-gray-300 rounded-lg text-sm font-semibold focus:ring-brand-secondary focus:border-brand-secondary disabled:bg-gray-200">
                                        {regions.map(r => <option key={r} value={r}>{r === 'Все регионы' ? r : r}</option>)}
                                    </select>
                                     <select value={cityFilter} onChange={e => setCityFilter(e.target.value)} disabled={cities.length <= 1} className="bg-white p-1.5 border border-gray-300 rounded-lg text-sm font-semibold focus:ring-brand-secondary focus:border-brand-secondary disabled:bg-gray-200">
                                        {cities.map(c => <option key={c} value={c}>{c === 'Все города' ? c : c}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={userRegistrationData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis allowDecimals={false} />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="count" name="Регистрации" stroke="#2c5282" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-semibold text-gray-700">Завершенные тренировок по типам</h3>
                             <select value={trainingTypesPeriod} onChange={e => setTrainingTypesPeriod(e.target.value as Period)} className="bg-white p-1.5 border border-gray-300 rounded-lg text-sm font-semibold focus:ring-brand-secondary focus:border-brand-secondary">
                                <option value="day">За день</option>
                                <option value="week">За неделю</option>
                                <option value="month">За месяц</option>
                                <option value="year">За год</option>
                            </select>
                        </div>
                         <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={trainingTypesChartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-45} textAnchor="end" height={60} />
                                <YAxis allowDecimals={false}/>
                                <Tooltip />
                                <Bar dataKey="value" name="Количество">
                                    {trainingTypesChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    </>
                )}
                {canManageSubscriptions && (
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">Настройки подписок</h2>
                        <div className="border-b border-gray-200">
                            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                                <button
                                    onClick={() => setActiveSubscriptionTab('stats')}
                                    className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                                        activeSubscriptionTab === 'stats'
                                        ? 'border-brand-primary text-brand-primary'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                                >
                                    Статистика
                                </button>
                                <button
                                    onClick={() => setActiveSubscriptionTab('settings')}
                                    className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                                        activeSubscriptionTab === 'settings'
                                        ? 'border-brand-primary text-brand-primary'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                                >
                                    Настройки
                                </button>
                            </nav>
                        </div>

                        <div className="mt-6">
                            {activeSubscriptionTab === 'stats' && <SubscriptionStats users={users} settings={settings} />}
                            {activeSubscriptionTab === 'settings' && (
                                <div className="space-y-8">
                                    <div className="space-y-6 p-4 border rounded-lg bg-gray-50">
                                        <div>
                                            <h3 className="text-lg font-semibold">Цены и опции оплаты</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                                <div className="space-y-3 p-3 border rounded-md bg-white">
                                                    <h4 className="font-semibold">{SubscriptionTier.Pro}</h4>
                                                    <div className="flex items-center gap-2"><label className="w-16">Месяц:</label><input type="number" value={prices[SubscriptionTier.Pro]?.month} onChange={e => handlePriceChange(SubscriptionTier.Pro, 'month', e.target.value)} className="p-1 border rounded w-24" /><label className="flex items-center gap-1"><input type="checkbox" checked={paymentOptions[SubscriptionTier.Pro]?.month} onChange={e => handleOptionToggle(SubscriptionTier.Pro, 'month', e.target.checked)} /><span>Вкл</span></label></div>
                                                    <div className="flex items-center gap-2"><label className="w-16">Год:</label><input type="number" value={prices[SubscriptionTier.Pro]?.year} onChange={e => handlePriceChange(SubscriptionTier.Pro, 'year', e.target.value)} className="p-1 border rounded w-24" /><label className="flex items-center gap-1"><input type="checkbox" checked={paymentOptions[SubscriptionTier.Pro]?.year} onChange={e => handleOptionToggle(SubscriptionTier.Pro, 'year', e.target.checked)} /><span>Вкл</span></label></div>
                                                </div>
                                                 <div className="space-y-3 p-3 border rounded-md bg-white">
                                                    <h4 className="font-semibold">{SubscriptionTier.Maximum}</h4>
                                                    <div className="flex items-center gap-2"><label className="w-16">Месяц:</label><input type="number" value={prices[SubscriptionTier.Maximum]?.month} onChange={e => handlePriceChange(SubscriptionTier.Maximum, 'month', e.target.value)} className="p-1 border rounded w-24" /><label className="flex items-center gap-1"><input type="checkbox" checked={paymentOptions[SubscriptionTier.Maximum]?.month} onChange={e => handleOptionToggle(SubscriptionTier.Maximum, 'month', e.target.checked)} /><span>Вкл</span></label></div>
                                                    <div className="flex items-center gap-2"><label className="w-16">Год:</label><input type="number" value={prices[SubscriptionTier.Maximum]?.year} onChange={e => handlePriceChange(SubscriptionTier.Maximum, 'year', e.target.value)} className="p-1 border rounded w-24" /><label className="flex items-center gap-1"><input type="checkbox" checked={paymentOptions[SubscriptionTier.Maximum]?.year} onChange={e => handleOptionToggle(SubscriptionTier.Maximum, 'year', e.target.checked)} /><span>Вкл</span></label></div>
                                                </div>
                                            </div>
                                        </div>
                                         <div>
                                            <h3 className="text-lg font-semibold">Пробный период</h3>
                                            <div className="flex items-center gap-4 mt-2">
                                                <div><label className="text-sm">Длительность (дни):</label><input type="number" value={trial.durationDays} onChange={e => setTrial(t => ({...t, durationDays: parseInt(e.target.value, 10) || 0}))} className="p-1 border rounded w-24 mt-1" /></div>
                                                <div><label className="text-sm">Тариф:</label><select value={trial.tier} onChange={e => setTrial(t => ({...t, tier: e.target.value as SubscriptionTier}))} className="p-1.5 border rounded mt-1 bg-white"><option value={SubscriptionTier.Pro}>{SubscriptionTier.Pro}</option><option value={SubscriptionTier.Maximum}>{SubscriptionTier.Maximum}</option></select></div>
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold">Оплата бонусами</h3>
                                            <div className="flex items-center gap-4 mt-2">
                                                <div><label className="text-sm">Макс. % оплаты бонусами:</label><input type="number" value={bonusPercentage} onChange={e => setBonusPercentage(parseInt(e.target.value, 10) || 0)} min="0" max="100" className="p-1 border rounded w-24 mt-1" /></div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex justify-end items-center gap-4 mt-6">
                                        {subscriptionsMessage && <p className="text-sm text-green-600">{subscriptionsMessage}</p>}
                                        <button onClick={handleSaveAllSubscriptionSettings} className="bg-brand-primary text-white px-4 py-2 rounded-md hover:bg-brand-secondary">
                                            Сохранить все настройки
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <ConfirmationModal isOpen={!!deletingUser} onClose={() => setDeletingUser(null)} onConfirm={confirmDeleteUser} title="Подтвердить удаление" message={`Вы уверены, что хотите удалить пользователя ${deletingUser?.name} ${deletingUser?.surname}? Это действие нельзя отменить.`} />
            <ConfirmationModal isOpen={!!deletingTraining} onClose={() => setDeletingTraining(null)} onConfirm={confirmDeleteTraining} title="Подтвердить удаление" message={`Вы уверены, что хотите удалить тренировку ${deletingTraining?.id}? Это действие нельзя отменить.`} />
            <EditUserModal user={editingUser} isOpen={!!editingUser} onClose={() => setEditingUser(null)} onSave={updateUserAndId} locations={locations} />
            <EditDiscountModal user={editingDiscountUser} isOpen={!!editingDiscountUser} onClose={() => setEditingDiscountUser(null)} onSave={handleSaveDiscount} />
            <UserInfoModal user={infoUser} isOpen={!!infoUser} onClose={() => setInfoUser(null)} onBonusesClick={canManageUsers ? setEditingBonusesForUser : undefined} />
            <AdminBonusModal user={editingBonusesForUser} isOpen={!!editingBonusesForUser} onClose={() => setEditingBonusesForUser(null)} onSave={adminUpdateBonuses} transactions={bonusTransactions} settings={settings} onSettingsSave={updateSettings} allUsers={users} />
            <AdminSubscriptionModal user={editingSubscriptionUser} isOpen={!!editingSubscriptionUser} onClose={() => setEditingSubscriptionUser(null)} onSave={handleSaveSubscription} />
             <ReferralDetailsModal isOpen={!!viewingReferralsFor} onClose={() => setViewingReferralsFor(null)} user={viewingReferralsFor} allUsers={users} bonusTransactions={bonusTransactions} />

            {/* User Search Modal */}
            {isSearchModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-start pt-10 p-4" onClick={() => setSearchModalOpen(false)}>
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl" onClick={e => e.stopPropagation()}>
                        <UserSearchModal 
                            users={users} 
                            onEdit={setEditingUser} 
                            onDelete={setDeletingUser} 
                            onEditDiscount={setEditingDiscountUser} 
                            onInfo={setInfoUser}
                            onCopy={handleCopy}
                            copiedId={copiedId}
                            onViewReferrals={setViewingReferralsFor}
                        />
                    </div>
                </div>
            )}
            
            {pageContent}
        </div>
    );
};

export default AdminDashboardPage;
