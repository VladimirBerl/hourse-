

import React, { useContext, useState, useRef, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthContext, DataContext } from '../App';
import { TrainingSession, User, UserRole, BonusTransaction, SubscriptionTier, AppSettings } from '../types';
import TrainingCalendar from '../components/TrainingCalendar';
import TrainingDetailsModal from '../components/TrainingDetailsModal';
import ConfirmationModal from '../components/ConfirmationModal';
import AnimatedStar from '../components/AnimatedStar';
import StaticStar from '../components/StaticStar';
import * as api from '../services/api';

interface BonusHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User;
    transactions: BonusTransaction[];
    allUsers: User[];
}

const BonusHistoryModal: React.FC<BonusHistoryModalProps> = ({ isOpen, onClose, user, transactions, allUsers }) => {
    const userTransactions = React.useMemo(() => {
        return transactions
            .filter(t => t.userId === user.id)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [transactions, user.id]);

    if (!isOpen) return null;

    const getAdminActionText = (transaction: BonusTransaction) => {
        if (!transaction.adminId) return '';
        return transaction.amount >= 0 ? 'Начисление сервиса' : 'Списание сервиса';
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

const EditProfileModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    user: User;
    onSave: (data: Partial<User>) => Promise<void>;
}> = ({ isOpen, onClose, user, onSave }) => {
    const data = useContext(DataContext);
    const [formData, setFormData] = useState({ name: user.name, surname: user.surname, country: user.country, region: user.region, city: user.city });
    const [selectedRole, setSelectedRole] = useState<UserRole.Student | UserRole.Trainer>(UserRole.Student);
    
    const countries = Object.keys(data?.locations || {});
    const regions = formData.country ? Object.keys(data?.locations[formData.country] || {}) : [];
    const cities = formData.country && formData.region ? (data?.locations[formData.country]?.[formData.region] || []) : [];
    
    useEffect(() => { 
        if (isOpen) { 
            setFormData({ name: user.name, surname: user.surname, country: user.country, region: user.region, city: user.city }); 
        } 
    }, [user, isOpen]);
    
    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'country') {
            setFormData(prev => ({ ...prev, country: value, region: '', city: '' }));
        } else if (name === 'region') {
            setFormData(prev => ({ ...prev, region: value, city: '' }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => { 
        e.preventDefault(); 
        const dataToSave: Partial<User> = { ...formData };
        if (user.role === UserRole.Spectator) {
            dataToSave.role = selectedRole;
        }
        await onSave(dataToSave); 
        onClose(); 
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose} role="dialog" aria-modal="true">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold text-gray-800">Изменить профиль</h2><button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl" aria-label="Close modal">&times;</button></div>
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div><label htmlFor="name" className="block text-sm font-medium text-gray-700">Имя</label><input type="text" name="name" id="name" value={formData.name} onChange={handleChange} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-brand-secondary focus:border-brand-secondary" /></div>
                        <div><label htmlFor="surname" className="block text-sm font-medium text-gray-700">Фамилия</label><input type="text" name="surname" id="surname" value={formData.surname} onChange={handleChange} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-brand-secondary focus:border-brand-secondary" /></div>
                        
                        <div>
                            <label htmlFor="country" className="block text-sm font-medium text-gray-700">Страна</label>
                            <select name="country" id="country" value={formData.country} onChange={handleChange} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-brand-secondary focus:border-brand-secondary bg-white">
                                <option value="" disabled>Выберите страну</option>
                                {countries.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="region" className="block text-sm font-medium text-gray-700">Регион/Область</label>
                            <select name="region" id="region" value={formData.region} onChange={handleChange} disabled={!formData.country} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-brand-secondary focus:border-brand-secondary bg-white disabled:bg-gray-100">
                                <option value="" disabled>Выберите регион</option>
                                {regions.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="city" className="block text-sm font-medium text-gray-700">Город</label>
                            <select name="city" id="city" value={formData.city} onChange={handleChange} disabled={!formData.region} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-brand-secondary focus:border-brand-secondary bg-white disabled:bg-gray-100">
                                <option value="" disabled>Выберите город</option>
                                {cities.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        {user.role === UserRole.Spectator && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Выберите вашу роль (один раз)</label>
                                <div className="flex justify-center space-x-4 mt-2">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedRole(UserRole.Student)}
                                        className={`px-6 py-2 rounded-lg font-semibold border-2 transition-colors w-1/2 ${
                                            selectedRole === UserRole.Student ? 'bg-brand-primary text-white border-brand-primary' : 'bg-white text-gray-700 border-gray-300 hover:border-brand-secondary'
                                        }`}
                                    >
                                        {UserRole.Student}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedRole(UserRole.Trainer)}
                                        className={`px-6 py-2 rounded-lg font-semibold border-2 transition-colors w-1/2 ${
                                            selectedRole === UserRole.Trainer ? 'bg-brand-primary text-white border-brand-primary' : 'bg-white text-gray-700 border-gray-300 hover:border-brand-secondary'
                                        }`}
                                    >
                                        {UserRole.Trainer}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="mt-6 flex justify-end space-x-3"><button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300">Отмена</button><button type="submit" className="bg-brand-primary text-white px-4 py-2 rounded-md hover:bg-brand-secondary">Сохранить</button></div>
                </form>
            </div>
        </div>
    );
};

const AddTrainerModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSendRequest: (trainerId: string) => Promise<{ success: boolean; message: string; }>;
}> = ({ isOpen, onClose, onSendRequest }) => {
    const [trainerId, setTrainerId] = useState('');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleCloseAndReset = () => {
        setTrainerId('');
        setMessage('');
        setIsSubmitting(false);
        onClose();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;

        setIsSubmitting(true);
        const result = await onSendRequest(trainerId);
        setMessage(result.message);

        if (result.success) {
            setTrainerId('');
            setTimeout(() => {
                handleCloseAndReset();
            }, 2000);
        } else {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={handleCloseAndReset}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-gray-800 mb-4">Добавить тренера</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <p className="text-sm text-gray-600">Введите 6-значный ID тренера, чтобы отправить ему запрос на привязку.</p>
                    <div>
                        <label htmlFor="trainerId" className="sr-only">ID тренера</label>
                        <input type="text" name="trainerId" id="trainerId" value={trainerId} onChange={e => setTrainerId(e.target.value)} maxLength={6} placeholder="123456" className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-brand-secondary focus:border-brand-secondary" />
                    </div>
                     {message && <p className={`text-sm text-center font-semibold ${message.includes('успешно') ? 'text-green-600' : 'text-red-600'}`}>{message}</p>}
                    <div className="mt-6 flex justify-end space-x-3">
                        <button type="button" onClick={handleCloseAndReset} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300">Отмена</button>
                        <button type="submit" disabled={isSubmitting} className="bg-brand-primary text-white px-4 py-2 rounded-md hover:bg-brand-secondary disabled:bg-gray-400 disabled:cursor-not-allowed">
                            {isSubmitting ? 'Отправка...' : 'Отправить запрос'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const ContactDeveloperModal: React.FC<{ isOpen: boolean, onClose: () => void, onSend: (subject: string, message: string) => Promise<void> }> = ({ isOpen, onClose, onSend }) => {
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleCloseAndReset = () => {
        setSubject('');
        setMessage('');
        setError('');
        setSuccess(false);
        onClose();
    }

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!subject.trim() || !message.trim()) {
            setError('Тема и сообщение не могут быть пустыми.');
            return;
        }
        await onSend(subject, message);
        setSuccess(true);
        setTimeout(handleCloseAndReset, 2000);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={handleCloseAndReset}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Написать в техподдержку</h2>
                {success ? (
                    <div className="text-center py-10">
                        <p className="text-lg font-semibold text-brand-accent">Спасибо!</p>
                        <p className="text-gray-600 mt-2">Ваше сообщение было успешно отправлено.</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div><label htmlFor="subject" className="block text-sm font-medium text-gray-700">Тема <span className="text-red-500">*</span></label><input type="text" name="subject" id="subject" value={subject} onChange={e => setSubject(e.target.value)} required className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-brand-secondary focus:border-brand-secondary" /></div>
                        <div><label htmlFor="message" className="block text-sm font-medium text-gray-700">Сообщение <span className="text-red-500">*</span></label><textarea name="message" id="message" value={message} onChange={e => setMessage(e.target.value)} rows={5} required className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-brand-secondary focus:border-brand-secondary"></textarea></div>
                        {error && <p className="text-sm text-red-600">{error}</p>}
                        <div className="mt-6 flex justify-end space-x-3"><button type="button" onClick={handleCloseAndReset} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300">Отмена</button><button type="submit" className="bg-brand-primary text-white px-4 py-2 rounded-md hover:bg-brand-secondary">Отправить</button></div>
                    </form>
                )}
            </div>
        </div>
    );
};

const CheckmarkIcon = () => (
    <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
);

const SubscriptionModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSelectPlan: (tier: SubscriptionTier, duration: 'month' | 'year') => void;
}> = ({ isOpen, onClose, onSelectPlan }) => {
    const data = useContext(DataContext);
    const auth = useContext(AuthContext);
    const [billingPeriod, setBillingPeriod] = useState<'month' | 'year'>('month');

    if (!isOpen || !data || !auth?.user) return null;

    const { user } = auth;
    const prices = data.settings.subscriptionPrices;
    const paymentOptions = data.settings.subscriptionPaymentOptions;
    const proPrice = prices?.[SubscriptionTier.Pro]?.[billingPeriod] ?? (billingPeriod === 'month' ? 499 : 4990);
    const maxPrice = prices?.[SubscriptionTier.Maximum]?.[billingPeriod] ?? (billingPeriod === 'month' ? 999 : 9990);

    const tiersForAthletes = {
        [SubscriptionTier.Base]: {
            title: "Базовая",
            price: "Бесплатно",
            features: [
                "Ведение журнала и планирование тренировок",
                "Тренировки с тренером и система оценок",
                "Общение в личном чате",
                "Доступ к разделам \"Новости\" и \"Объявления\"",
            ],
        },
        [SubscriptionTier.Pro]: {
            title: "Про",
            price: `${proPrice} ₽/${billingPeriod === 'month' ? 'мес' : 'год'}`,
            features: [
                "Все преимущества тарифа \"Базовая\"",
                "Доступ к аналитике ваших тренировок в разделе \"Статистика\"",
                "Доступ к \"Библиотеке\"",
            ],
        },
        [SubscriptionTier.Maximum]: {
            title: "Максимум",
            price: `${maxPrice} ₽/${billingPeriod === 'month' ? 'мес' : 'год'}`,
            features: [
                "Все преимущества тарифа \"Про\"",
                "Приоритетная поддержка",
                "Расширенные возможности чата (голосовые, фото, видео, смайлы)",
                "Специальные статьи в разделе \"Библиотека\"",
            ],
        },
    };

    const tiersForSpectators = {
        [SubscriptionTier.Base]: {
            title: "Базовая",
            price: "Бесплатно",
            features: [
                "Общение в личном чате",
                "Доступ к разделам \"Новости\" и \"Объявления\"",
            ],
        },
        [SubscriptionTier.Maximum]: {
            title: "Максимум",
            price: `${maxPrice} ₽/${billingPeriod === 'month' ? 'мес' : 'год'}`,
            features: [
                "Все преимущества тарифа \"Базовая\"",
                "Приоритетная поддержка",
                "Расширенные возможности чата (голосовые, фото, видео, смайлы)",
            ],
        },
    };

    const tiers = user.role === UserRole.Spectator ? tiersForSpectators : tiersForAthletes;
    const numTiers = Object.keys(tiers).length;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-800">Управление подпиской</h2>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700 text-3xl">&times;</button>
                </div>
                <div className="p-4 sm:p-8 flex-grow overflow-y-auto">
                    <div className="flex justify-center mb-8">
                        <div className="bg-gray-200 p-1 rounded-full flex items-center">
                            <button onClick={() => setBillingPeriod('month')} className={`px-6 py-2 rounded-full text-sm font-semibold transition ${billingPeriod === 'month' ? 'bg-white shadow' : 'text-gray-600'}`}>Месяц</button>
                            <button onClick={() => setBillingPeriod('year')} className={`px-6 py-2 rounded-full text-sm font-semibold transition ${billingPeriod === 'year' ? 'bg-white shadow' : 'text-gray-600'}`}>Год</button>
                        </div>
                    </div>
                    <div className={`grid grid-cols-1 ${numTiers === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-8`}>
                        {Object.values(tiers).map(tier => {
                             const isCurrentPlan = user.subscription?.tier === tier.title;
                             const isOptionEnabled = paymentOptions?.[tier.title as SubscriptionTier]?.[billingPeriod] ?? true;
                            return (
                            <div key={tier.title} className={`border rounded-lg p-6 flex flex-col relative ${isCurrentPlan ? 'border-brand-primary border-2' : 'border-gray-200'}`}>
                                {isCurrentPlan && <div className="absolute top-2 right-2 bg-brand-primary text-white text-xs font-bold px-2 py-1 rounded">Текущий план</div>}
                                <h3 className="text-xl font-bold text-brand-primary flex items-center">
                                    {tier.title}
                                    {tier.title === SubscriptionTier.Maximum && <AnimatedStar />}
                                    {tier.title === SubscriptionTier.Pro && <StaticStar color="silver" />}
                                </h3>
                                <p className="text-2xl font-semibold my-4">{tier.price}</p>
                                <ul className="space-y-2 text-sm text-gray-600 flex-grow">
                                    {tier.features.map(feature => (
                                        <li key={feature} className="flex items-start"><CheckmarkIcon /><span>{feature}</span></li>
                                    ))}
                                </ul>
                                {tier.title !== 'Базовая' && (
                                    <div className="mt-6">
                                        <button onClick={() => onSelectPlan(tier.title as SubscriptionTier, billingPeriod)} className="w-full bg-brand-secondary text-white py-2 rounded-lg font-semibold hover:bg-brand-primary transition disabled:bg-gray-300 disabled:cursor-not-allowed" disabled={isCurrentPlan || !isOptionEnabled}>
                                            {isCurrentPlan ? 'Выбран' : (isOptionEnabled ? 'Выбрать' : 'Недоступно')}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )})}
                    </div>
                </div>
                <div className="p-4 border-t text-center text-xs text-gray-500">
                    Стоимость подписки не возвращается.
                </div>
            </div>
        </div>
    );
};

interface PaymentDetails {
    tier: SubscriptionTier;
    duration: 'month' | 'year';
    isUpgrade: boolean;
    isDowngrade: boolean;
    newPrice: number;
    remainingValue?: number;
    priceToPay?: number;
    currentTier?: SubscriptionTier;
    currentExpiresAt?: string | null;
}

const PaymentSimulationModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (bonusesToSpend: number) => void;
    details: PaymentDetails | null;
    user: User;
    settings: AppSettings;
}> = ({ isOpen, onClose, onConfirm, details, user, settings }) => {
    const [useBonuses, setUseBonuses] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const maxBonusesToUse = useMemo(() => {
        if (!details || !user.bonuses || !settings.bonusPaymentPercentage) return 0;
        const maxFromPrice = (details.priceToPay || 0) * (settings.bonusPaymentPercentage / 100);
        return Math.floor(Math.min(user.bonuses, maxFromPrice));
    }, [details, user, settings]);

    const priceAfterBonuses = useBonuses ? Math.max(0, (details?.priceToPay || 0) - maxBonusesToUse) : (details?.priceToPay || 0);
    const bonusesSpent = useBonuses ? (details?.priceToPay || 0) - priceAfterBonuses : 0;

    useEffect(() => {
        if (!isOpen) {
            setUseBonuses(false);
            setIsProcessing(false);
        }
    }, [isOpen]);

    const handlePay = () => {
        setIsProcessing(true);
        // TODO: Здесь будет интеграция с платежным шлюзом.
        // Например, вызов виджета оплаты от банка по предоставленному коду.
        // После успешной оплаты (по callback'у от платежной системы) вызывается onConfirm.
        // Симулируем успешную оплату через 2 секунды.
        setTimeout(() => {
            onConfirm(bonusesSpent);
            setIsProcessing(false); // Modal will close, but this is good practice
        }, 2000);
    };

    if (!isOpen || !details) return null;

    const durationText = details.duration === 'month' ? '1 месяц' : '1 год';

    if (details.isDowngrade) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex justify-center items-center p-4" onClick={onClose}>
                <div className="bg-white rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                    <div className="p-6 border-b"><h2 className="text-xl font-bold text-gray-800">Изменение подписки</h2></div>
                    <div className="p-6 space-y-4 text-center">
                        <p className="text-gray-700">
                            Ваша текущая подписка <span className="font-bold">"{details.currentTier}"</span> будет действовать до {new Date(details.currentExpiresAt!).toLocaleDateString('ru-RU')}.
                        </p>
                        <p className="text-gray-700 mt-2">
                            Новый тариф <span className="font-bold">"{details.tier}"</span> будет активирован после этой даты.
                        </p>
                    </div>
                    <div className="p-6 border-t flex justify-end">
                        <button onClick={onClose} className="bg-brand-primary text-white px-6 py-2 rounded-lg font-semibold hover:bg-brand-secondary transition">Понятно</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex justify-center items-center p-4" onClick={!isProcessing ? onClose : undefined}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b">
                    <h2 className="text-xl font-bold text-gray-800">Оплата подписки</h2>
                </div>
                <div className="p-6 space-y-4">
                    <p className="text-gray-700 text-center">
                        Вы выбрали подписку <span className="font-bold">"{details.tier}"</span> на <span className="font-bold">{durationText}</span>.
                    </p>
                    
                    <div className="p-3 bg-gray-100 rounded-md text-sm border-t mt-4">
                        <p>Стоимость новой подписки: <span className="font-semibold float-right">{details.newPrice.toFixed(2)} ₽</span></p>
                        {details.isUpgrade && (details.remainingValue ?? 0) > 0 && (
                            <p>Учтен остаток от текущей подписки: <span className="font-semibold float-right">- {details.remainingValue!.toFixed(2)} ₽</span></p>
                        )}
                        <p>К оплате (без бонусов): <span className="font-semibold float-right">{(details.priceToPay ?? 0).toFixed(2)} ₽</span></p>
                        
                        {(user.bonuses || 0) > 0 && maxBonusesToUse > 0 && (
                             <div className="pt-2 mt-2 border-t">
                                <label className="flex items-center cursor-pointer">
                                    <input type="checkbox" checked={useBonuses} onChange={e => setUseBonuses(e.target.checked)} className="h-4 w-4 text-brand-primary rounded" />
                                    <span className="ml-2 text-sm font-medium">Использовать бонусы ({user.bonuses} доступно)</span>
                                </label>
                                {useBonuses && (
                                    <p className="text-sm text-green-600">Будет списано {bonusesSpent.toFixed(0)} бонусов.</p>
                                )}
                            </div>
                        )}
                        <p className="text-base font-bold mt-2 pt-2 border-t">Итого к оплате: <span className="float-right">{priceAfterBonuses.toFixed(2)} ₽</span></p>
                    </div>
                </div>
                <div className="p-6 border-t">
                    <div className="flex justify-between items-center space-x-3">
                        <button type="button" onClick={!isProcessing ? onClose : undefined} disabled={isProcessing} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 disabled:opacity-50">
                            Отмена
                        </button>
                        <button 
                            onClick={handlePay} 
                            disabled={isProcessing}
                            className="flex-grow bg-brand-accent text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-600 transition disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                            {isProcessing && (
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            )}
                            {isProcessing ? 'Обработка...' : `Оплатить ${priceAfterBonuses.toFixed(2)} ₽`}
                        </button>
                    </div>
                    <p className="text-center text-xs text-gray-500 pt-4">
                        Стоимость подписки не возвращается.
                    </p>
                </div>
            </div>
        </div>
    );
};


// FIX: Changed to a named export to resolve a potential circular dependency with App.tsx.
export const DashboardPage: React.FC = () => {
    const auth = useContext(AuthContext);
    const data = useContext(DataContext);
    const location = useLocation();
    const navigate = useNavigate();

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [isTrainingModalOpen, setTrainingModalOpen] = useState(false);
    const [isContactModalOpen, setContactModalOpen] = useState(false);
    const [isAddTrainerModalOpen, setAddTrainerModalOpen] = useState(false);
    const [isBonusHistoryOpen, setBonusHistoryOpen] = useState(false);
    const [isSubscriptionModalOpen, setSubscriptionModalOpen] = useState(false);
    const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);

    const [selectedDateForModal, setSelectedDateForModal] = useState<Date | null>(null);
    const [trainingsForModal, setTrainingsForModal] = useState<TrainingSession[]>([]);
    const [copySuccess, setCopySuccess] = useState('');
    const [confirmUnlinkModalOpen, setConfirmUnlinkModalOpen] = useState(false);
    const [trainerToUnlink, setTrainerToUnlink] = useState<string | null>(null);
    const [avatarError, setAvatarError] = useState('');

    useEffect(() => {
        if (location.state?.openSubscriptionModal) {
            setSubscriptionModalOpen(true);
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state, navigate, location.pathname]);

    if (!auth || !auth.user || !data) return <div>Загрузка...</div>;
    const { user, users, updateUser, updateUsers } = auth;
    const { trainings, addDeveloperMessage, bonusTransactions, settings } = data;

    const handleOpenSubscriptionModal = () => setSubscriptionModalOpen(true);
    
    const handleSelectPlan = (tier: SubscriptionTier, duration: 'month' | 'year') => {
        const { subscription } = user;
        const { subscriptionPrices, trialSettings } = settings;
        if (!subscriptionPrices) return;

        const newPrice = subscriptionPrices[tier as keyof typeof subscriptionPrices]?.[duration] ?? 0;
        
        const currentTier = subscription?.tier;
        const currentExpiresAt = subscription?.expiresAt;
        const isCurrentSubActive = currentTier && currentTier !== SubscriptionTier.Base && currentExpiresAt && new Date(currentExpiresAt) > new Date();

        let isTrial = false;
        if (isCurrentSubActive && trialSettings && currentTier === trialSettings.tier && currentExpiresAt) {
            const regDate = new Date(user.registrationDate);
            // Trial subscription expires exactly `trialSettings.durationDays` after registration
            const trialEndDate = new Date(regDate.getTime() + trialSettings.durationDays * 24 * 60 * 60 * 1000);
            const expiryDate = new Date(currentExpiresAt);

            // Allow a tolerance (e.g., 1 minute) to account for small discrepancies during creation
            if (Math.abs(trialEndDate.getTime() - expiryDate.getTime()) < 60000) {
                isTrial = true;
            }
        }

        const tierValue = (t: SubscriptionTier) => t === SubscriptionTier.Maximum ? 2 : (t === SubscriptionTier.Pro ? 1 : 0);

        if (isCurrentSubActive && currentTier && !isTrial) { // Don't calculate remaining value for trial subs
            if (tierValue(tier) < tierValue(currentTier)) {
                // Downgrade
                setPaymentDetails({
                    tier,
                    duration,
                    isUpgrade: false,
                    isDowngrade: true,
                    newPrice: 0,
                    currentTier,
                    currentExpiresAt
                });
            } else {
                // Upgrade or Extension
                const currentPriceMonthly = subscriptionPrices[currentTier as keyof typeof subscriptionPrices]?.month ?? 0;
                const remainingDays = Math.max(0, (new Date(currentExpiresAt!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                const remainingValue = (currentPriceMonthly / 30) * remainingDays;
                const priceToPay = Math.max(0, newPrice - remainingValue);
                
                setPaymentDetails({
                    tier,
                    duration,
                    isUpgrade: true,
                    isDowngrade: false,
                    newPrice,
                    remainingValue,
                    priceToPay
                });
            }
        } else {
            // New Purchase or Upgrade from Trial
            setPaymentDetails({
                tier,
                duration,
                isUpgrade: !!isCurrentSubActive,
                isDowngrade: false,
                newPrice,
                priceToPay: newPrice, // Full price
                remainingValue: 0,
            });
        }
    };


    const handleConfirmPayment = async (bonusesToSpend: number) => {
        if (!paymentDetails) return;
        // Downgrades are handled by closing the info modal, no data change needed here.
        if (paymentDetails.isDowngrade) {
            setPaymentDetails(null);
            return;
        }

        const now = new Date();
        const expiresAt = new Date(now);
        if (paymentDetails.duration === 'month') {
            expiresAt.setMonth(now.getMonth() + 1);
        } else {
            expiresAt.setFullYear(now.getFullYear() + 1);
        }
        const updatedSubscription = {
            tier: paymentDetails.tier,
            expiresAt: expiresAt.toISOString(),
            lastPayment: {
                date: now.toISOString(),
                amountPaid: paymentDetails.priceToPay ? Math.max(0, paymentDetails.priceToPay - bonusesToSpend) : 0,
                bonusesSpent: bonusesToSpend,
                duration: paymentDetails.duration
            }
        };

        const updatePayload: Partial<User> = { subscription: updatedSubscription };
        if (bonusesToSpend > 0) {
            updatePayload.bonuses = (user.bonuses || 0) - bonusesToSpend;
        }

        await updateUser(updatePayload);
        setPaymentDetails(null);
        setSubscriptionModalOpen(false);
    };


    const avatarSrc = user.avatarUrl || `https://ui-avatars.com/api/?name=${user.name}+${user.surname}&background=2c5282&color=fff&size=128&rounded=true`;
    const handleAvatarClick = () => fileInputRef.current?.click();
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setAvatarError('');
        const file = event.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { // 5 MB limit
                setAvatarError('Размер файла не должен превышать 5 МБ.');
                if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                }
                setTimeout(() => setAvatarError(''), 5000);
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => updateUser({ avatarUrl: e.target?.result as string });
            reader.readAsDataURL(file);
        }
    };
    const handleSaveProfile = async (data: Partial<User>) => await updateUser(data);
    const copyToClipboard = (textToCopy: string, type: 'ID' | 'Link') => { 
        navigator.clipboard.writeText(textToCopy).then(() => { 
            setCopySuccess(`${type === 'ID' ? 'ID' : 'Ссылка'} скопирован!`); 
            setTimeout(() => setCopySuccess(''), 2000); 
        }, () => { 
            setCopySuccess('Ошибка копирования'); 
            setTimeout(() => setCopySuccess(''), 2000); 
        }); 
    };

    const userTrainings = trainings.filter(t => t.participants.some(p => p.userId === user.id));
    
    const handleDateClick = (date: Date) => {
        const trainingsOnDate = userTrainings.filter(t => new Date(t.date).toDateString() === date.toDateString() && t.status !== 'cancelled');
        setTrainingsForModal(trainingsOnDate);
        setSelectedDateForModal(date);
        setTrainingModalOpen(true);
    };

    const handleSendTrainerRequest = async (trainerId: string): Promise<{ success: boolean, message: string }> => {
        const trainer = users.find(u => u.id === trainerId && !u.isDeleted);
        if (!trainer || trainer.role !== UserRole.Trainer) {
            return { success: false, message: 'Тренер с таким ID не найден.' };
        }
        if (trainer.id === user.id) {
            return { success: false, message: 'Вы не можете добавить самого себя.' };
        }
        if (user.linkedUsers.includes(trainer.id)) {
            return { success: false, message: 'Этот тренер уже привязан к вам.' };
        }
        if ((user.role === UserRole.Trainer && trainer.trainerRequests?.includes(user.id)) || 
            (user.role === UserRole.Student && trainer.studentRequests?.includes(user.id))) {
            return { success: false, message: 'Вы уже отправили запрос этому тренеру.' };
        }
    
        try {
            const token = sessionStorage.getItem('authToken');
            if (!token) {
                return { success: false, message: 'Необходима авторизация.' };
            }
            
            const result = await api.apiSendLinkRequest(trainerId, token);
            if (result.success) {
                // Refresh users list to get updated request status
                const freshUsers = await api.apiGetAllUsers();
                await updateUsers(freshUsers);
                return { success: true, message: 'Запрос успешно отправлен.' };
            }
            return { success: false, message: result.message || 'Ошибка при отправке запроса.' };
        } catch (error: any) {
            console.error('Error sending link request:', error);
            return { success: false, message: error.message || 'Ошибка при отправке запроса.' };
        }
    };
    
    const confirmUnlinkTrainer = async () => {
        if (!trainerToUnlink) return;
        const updatedUsers = users.map(u => {
            if (u.id === user.id) return { ...u, linkedUsers: u.linkedUsers.filter(id => id !== trainerToUnlink) };
            if (u.id === trainerToUnlink) return { ...u, linkedUsers: u.linkedUsers.filter(id => id !== user.id) };
            return u;
        });
        await updateUsers(updatedUsers);
        setTrainerToUnlink(null);
        setConfirmUnlinkModalOpen(false);
    };

    const ProfileHeader: React.FC<{ onBonusesClick: () => void }> = ({ onBonusesClick }) => {
        const [inviteCopySuccess, setInviteCopySuccess] = useState('');

        const handleCopyReferralLink = () => {
            // This creates a link that is robust to however the app is hosted.
            // It takes the URL before any hash, and appends the correct hash route.
            const baseUrl = window.location.href.split('#')[0];
            const referralLink = `${baseUrl}#/login?ref=${user.id}`;
            copyToClipboard(referralLink, 'Link');
            setInviteCopySuccess('Ссылка для приглашения скопирована!');
            setTimeout(() => setInviteCopySuccess(''), 3000);
        };

        return (
            <div className="bg-white p-6 rounded-lg shadow-md mb-6 text-center">
                <div className="relative inline-block group">
                    <img src={avatarSrc} alt="Аватар пользователя" className="w-32 h-32 rounded-full mx-auto object-cover border-4 border-brand-light cursor-pointer" onClick={handleAvatarClick} />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 rounded-full flex items-center justify-center cursor-pointer transition-opacity" onClick={handleAvatarClick} aria-hidden="true">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white opacity-0 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </div>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" aria-label="Upload new avatar" />
                <h1 className="text-2xl font-bold text-gray-800 mt-4 flex items-center justify-center gap-2">
                    {user.name} {user.surname}
                    {user.subscription?.tier === SubscriptionTier.Maximum && <AnimatedStar />}
                    {user.subscription?.tier === SubscriptionTier.Pro && <StaticStar color="silver" />}
                </h1>
                <p className="text-gray-600 mt-1">{user.role} &middot; {user.city}, {user.region}</p>
                {user.role !== UserRole.Admin && user.subscription && (
                    <div className="mt-2 text-sm text-gray-600 flex items-center justify-center">
                        {user.subscription.tier === SubscriptionTier.Maximum && <AnimatedStar />}
                        {user.subscription.tier === SubscriptionTier.Pro && <StaticStar color="silver" />}
                        <span className={user.subscription.tier !== SubscriptionTier.Base ? "ml-1" : ""}>Статус подписки: <strong>{user.subscription.tier}</strong> {user.subscription.expiresAt ? `(до ${new Date(user.subscription.expiresAt).toLocaleDateString('ru-RU')})` : ''}</span>
                    </div>
                )}
                <div className="mt-4 flex flex-col items-center justify-center space-y-3">
                    <button type="button" onClick={() => setEditModalOpen(true)} className="w-full max-w-xs px-4 py-2 bg-brand-secondary text-white text-sm font-semibold rounded-lg hover:bg-brand-primary transition duration-300">Изменить данные</button>
                    <button type="button" onClick={onBonusesClick} className="w-full max-w-xs inline-flex items-center justify-center space-x-2 bg-yellow-100 text-yellow-800 font-semibold px-4 py-2 rounded-lg hover:bg-yellow-200 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                          <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                        </svg>
                        <span>Бонусы: {user.bonuses || 0}</span>
                    </button>
                    <button type="button" onClick={handleCopyReferralLink} className="w-full max-w-xs px-4 py-2 bg-indigo-100 text-indigo-800 text-sm font-semibold rounded-lg hover:bg-indigo-200 transition duration-300 flex items-center justify-center space-x-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                        </svg>
                        <span>Пригласить ({user.referralCount || 0})</span>
                    </button>
                     {user.role !== UserRole.Admin && (
                        <button type="button" onClick={handleOpenSubscriptionModal} className="w-full max-w-xs px-4 py-2 bg-gray-100 text-gray-800 text-sm font-semibold rounded-lg hover:bg-gray-200 transition duration-300">Управление подпиской</button>
                     )}
                </div>
                <div className="mt-4 space-y-2">
                    <p className="text-xs text-gray-400">Дата регистрации: {new Date(user.registrationDate).toLocaleDateString('ru-RU')}</p>
                    <div className="bg-gray-100 px-2 py-1 inline-flex items-center rounded-lg space-x-2">
                        <p className="text-sm text-gray-600 font-mono">Ваш ID: {user.id}</p>
                        <button type="button" onClick={() => copyToClipboard(user.id, 'ID')} title="Копировать ID" className="text-gray-500 hover:text-brand-primary p-1 rounded-full hover:bg-gray-200 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        </button>
                    </div>
                    {copySuccess && <p className="text-xs text-brand-accent mt-1">{copySuccess}</p>}
                    {inviteCopySuccess && <p className="text-xs text-indigo-600 mt-1">{inviteCopySuccess}</p>}
                    {avatarError && <p className="text-xs text-red-600 mt-1">{avatarError}</p>}
                </div>
            </div>
        );
    }
    
    const TrainerLink: React.FC = () => {
        const linkedTrainers = users.filter(u => user.linkedUsers.includes(u.id) && u.role === UserRole.Trainer && !u.isDeleted);
        const pendingTrainer = users.find(u => u.id === user.pendingTrainerRequestFrom && !u.isDeleted);
        
        const incomingTrainerRequestIds = user.trainerRequests || [];
        const incomingTrainerRequesters = users.filter(u => incomingTrainerRequestIds.includes(u.id) && !u.isDeleted);

        const handleUnlinkClick = (trainerId: string) => {
            setTrainerToUnlink(trainerId);
            setConfirmUnlinkModalOpen(true);
        };

        const handleStudentRequestResponse = async (accept: boolean) => {
             if (!pendingTrainer) return;
             
             try {
                const token = sessionStorage.getItem('authToken');
                if (!token) {
                    console.error('No auth token');
                    return;
                }
                
                const result = await api.apiRespondToLinkRequest(pendingTrainer.id, accept, token);
                if (result.success) {
                    // Refresh users list to get updated state
                    const freshUsers = await api.apiGetAllUsers();
                    await updateUsers(freshUsers);
                }
             } catch (error: any) {
                console.error('Error responding to link request:', error);
             }
        };

        const handleTrainerRequestResponse = async (requesterId: string, accept: boolean) => {
            const requester = users.find(u => u.id === requesterId);
            if (!requester) return;
    
            try {
                const token = sessionStorage.getItem('authToken');
                if (!token) {
                    console.error('No auth token');
                    return;
                }
                
                const result = await api.apiRespondToLinkRequest(requesterId, accept, token);
                if (result.success) {
                    // Refresh users list to get updated state
                    const freshUsers = await api.apiGetAllUsers();
                    await updateUsers(freshUsers);
                }
             } catch (error: any) {
                console.error('Error responding to link request:', error);
             }
        };


        return (
             <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-700">Мои тренеры</h2>
                    {user.role !== UserRole.Spectator && (
                    <button type="button" onClick={() => setAddTrainerModalOpen(true)} className="bg-brand-primary text-white font-semibold px-3 py-1.5 rounded-lg shadow hover:bg-brand-secondary transition-colors text-sm flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                        Добавить
                    </button>
                    )}
                </div>
                {pendingTrainer && (
                    <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-lg mb-4"><p className="font-semibold text-yellow-800">Входящий запрос</p><p className="text-sm text-yellow-700">Тренер {pendingTrainer.name} {pendingTrainer.surname} хочет добавить вас в ученики.</p><div className="mt-3 space-x-3"><button type="button" onClick={() => handleStudentRequestResponse(true)} className="bg-brand-accent text-white px-3 py-1 rounded-md text-sm font-semibold hover:bg-green-600 transition">Принять</button><button type="button" onClick={() => handleStudentRequestResponse(false)} className="bg-gray-300 text-gray-800 px-3 py-1 rounded-md text-sm font-semibold hover:bg-gray-400 transition">Отклонить</button></div></div>
                )}
                {user.role === UserRole.Trainer && incomingTrainerRequesters.length > 0 && (
                    <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-lg mb-4 space-y-4">
                        <p className="font-semibold text-yellow-800">Входящие запросы от тренеров:</p>
                        {incomingTrainerRequesters.map(requester => (
                            <div key={requester.id}>
                                <p className="text-sm text-yellow-700">Тренер {requester.name} {requester.surname} хочет добавить вас в свой список.</p>
                                <div className="mt-3 space-x-3">
                                    <button type="button" onClick={() => handleTrainerRequestResponse(requester.id, true)} className="bg-brand-accent text-white px-3 py-1 rounded-md text-sm font-semibold hover:bg-green-600 transition">Принять</button>
                                    <button type="button" onClick={() => handleTrainerRequestResponse(requester.id, false)} className="bg-gray-300 text-gray-800 px-3 py-1 rounded-md text-sm font-semibold hover:bg-gray-400 transition">Отклонить</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                {linkedTrainers.length > 0 ? (
                     <ul className="space-y-3">
                        {linkedTrainers.map(trainer => (
                             <li key={trainer.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center"><img src={trainer.avatarUrl || `https://ui-avatars.com/api/?name=${trainer.name}+${trainer.surname}&background=2a69ac&color=fff`} alt="avatar" className="w-10 h-10 rounded-full mr-4" /><div><p className="font-semibold text-gray-800">{trainer.name} {trainer.surname}</p><p className="text-sm text-gray-500">{trainer.city}</p></div></div>
                                <button type="button" onClick={() => handleUnlinkClick(trainer.id)} className="bg-brand-danger text-white px-3 py-1 rounded-md text-sm font-semibold hover:bg-red-700 transition-colors">Открепить</button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    !pendingTrainer && incomingTrainerRequesters.length === 0 && (
                        <div className="text-center text-gray-500 p-4 bg-gray-50 rounded-lg"><p>У вас еще нет привязанных тренеров.</p>
                        {user.role !== UserRole.Spectator && <p className="text-sm mt-2">Чтобы добавить тренера, нажмите кнопку "Добавить" и введите его ID.</p>}</div>
                    )
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <EditProfileModal isOpen={isEditModalOpen} onClose={() => setEditModalOpen(false)} user={user} onSave={handleSaveProfile} />
            <TrainingDetailsModal isOpen={isTrainingModalOpen} onClose={() => setTrainingModalOpen(false)} date={selectedDateForModal} trainings={trainingsForModal} />
            <ContactDeveloperModal isOpen={isContactModalOpen} onClose={() => setContactModalOpen(false)} onSend={addDeveloperMessage} />
            <AddTrainerModal isOpen={isAddTrainerModalOpen} onClose={() => setAddTrainerModalOpen(false)} onSendRequest={handleSendTrainerRequest} />
             <ConfirmationModal 
                isOpen={confirmUnlinkModalOpen}
                onClose={() => setConfirmUnlinkModalOpen(false)}
                onConfirm={confirmUnlinkTrainer}
                title="Подтвердить открепление"
                message={`Вы уверены, что хотите открепить тренера? Это действие не может быть отменено.`}
            />
            <BonusHistoryModal
                isOpen={isBonusHistoryOpen}
                onClose={() => setBonusHistoryOpen(false)}
                user={user}
                transactions={bonusTransactions}
                allUsers={users}
            />
            <SubscriptionModal
                isOpen={isSubscriptionModalOpen}
                onClose={() => setSubscriptionModalOpen(false)}
                onSelectPlan={handleSelectPlan}
            />
             <PaymentSimulationModal
                isOpen={!!paymentDetails}
                onClose={() => setPaymentDetails(null)}
                onConfirm={handleConfirmPayment}
                details={paymentDetails}
                user={user}
                settings={settings}
            />
            
            <ProfileHeader onBonusesClick={() => setBonusHistoryOpen(true)} />
            {user.role !== UserRole.Spectator && <TrainerLink />}
            
            {user.role !== UserRole.Spectator && (
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold text-gray-700 mb-4">Календарь предстоящих тренировок</h2>
                    <TrainingCalendar trainings={userTrainings} onDateClick={handleDateClick} />
                </div>
            )}
            
            <div className="text-center py-2">
                <button type="button" onClick={() => setContactModalOpen(true)} className="text-brand-primary hover:underline">
                    Написать в техподдержку
                </button>
            </div>
        </div>
    );
};