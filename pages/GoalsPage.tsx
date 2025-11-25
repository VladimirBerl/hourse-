import React, { useContext, useState, useMemo, useEffect } from 'react';
// FIX: Updated react-router-dom imports for v6, using useNavigate and useLocation.
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthContext, DataContext } from '../App';
import { UserRole, Announcement, User, Poll, PollOption, Quiz, SubscriptionTier } from '../types';
import ConfirmationModal from '../components/ConfirmationModal';
import PublicationEditorModal from '../components/PublicationEditorModal';
import UserAnnouncementEditorModal from '../components/UserAnnouncementEditorModal';
import QuizComponent from '../components/QuizComponent';
import { linkify } from '../utils/textUtils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import AnimatedStar from '../components/AnimatedStar';

const getVoteWord = (count: number): string => {
    const cases = [2, 0, 1, 1, 1, 2];
    const titles = ['голос', 'голоса', 'голосов'];
    return titles[(count % 100 > 4 && count % 100 < 20) ? 2 : cases[(count % 10 < 5) ? count % 10 : 5]];
};

const AnnouncementsStats: React.FC<{ announcements: Announcement[], users: User[] }> = ({ announcements, users }) => {
    const data = useContext(DataContext);
    const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year' | 'custom'>('month');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [locationMetric, setLocationMetric] = useState<'sum' | 'count'>('sum');

    const approvedAnnouncementsWithPrice = useMemo(() => {
        if (!data) return [];
        const { settings } = data;
        const basePrice = settings.announcementBasePrice;

        return announcements
            .filter(ann => {
                const submitter = users.find(u => u.id === ann.submittedById);
                return ann.status === 'published' && ann.submittedById && submitter && submitter.role !== UserRole.Admin;
            })
            .map(ann => {
                const submitter = users.find(u => u.id === ann.submittedById)!;
                let finalPrice = ann.moderatedPrice;

                if (finalPrice === undefined) {
                     const publishedCount = announcements.filter(a =>
                        a.submittedById === submitter.id &&
                        a.status === 'published' &&
                        (!a.publishTimestamp || new Date(a.publishTimestamp) <= new Date())
                    ).length;
                    const calculatedDiscount = Math.min(Math.floor(publishedCount / 10) * 5, 50);
                    const discountPercentage = submitter.discount !== undefined ? submitter.discount : calculatedDiscount;
                    finalPrice = Math.round(Math.max(0, basePrice * (1 - discountPercentage / 100)));
                }

                return {
                    ...ann,
                    price: finalPrice || 0,
                };
            });
    }, [announcements, users, data]);

    const stats = useMemo(() => {
        const now = new Date();
        const published = approvedAnnouncementsWithPrice.filter(ann => !ann.publishTimestamp || new Date(ann.publishTimestamp) <= now);
        const scheduled = approvedAnnouncementsWithPrice.filter(ann => ann.publishTimestamp && new Date(ann.publishTimestamp) > now);

        const sumPrice = (items: typeof approvedAnnouncementsWithPrice) => items.reduce((sum, item) => sum + item.price, 0);

        return {
            published: {
                count: published.length,
                sum: sumPrice(published),
            },
            scheduled: {
                count: scheduled.length,
                sum: sumPrice(scheduled),
            }
        };
    }, [approvedAnnouncementsWithPrice]);
    
    const { chartData, totalPublishedSum } = useMemo(() => {
        const now = new Date();
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);
    
        let startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        let endDate = new Date(todayEnd);
    
        const aDay = 24 * 60 * 60 * 1000;
    
        switch (period) {
            case 'day':
                // startDate is already today 00:00, endDate is today 23:59
                break;
            case 'week':
                startDate.setDate(now.getDate() - 6);
                break;
            case 'month':
                startDate.setDate(now.getDate() - 29);
                break;
            case 'year':
                startDate.setFullYear(now.getFullYear() - 1);
                startDate.setDate(now.getDate() + 1);
                break;
            case 'custom':
                if (customStartDate && customEndDate) {
                    startDate = new Date(customStartDate);
                    startDate.setHours(0, 0, 0, 0);
                    endDate = new Date(customEndDate);
                    endDate.setHours(23, 59, 59, 999);
                } else {
                    return { chartData: [], totalPublishedSum: 0 };
                }
                break;
        }
    
        const filteredByPeriod = approvedAnnouncementsWithPrice.filter(ann => {
            const annDate = new Date(ann.publishTimestamp || ann.timestamp);
            return annDate >= startDate && annDate <= endDate;
        });
    
        const dataMap = new Map<string, { publishedSum: number, scheduledSum: number }>();
    
        const diffDays = Math.round((endDate.getTime() - startDate.getTime()) / aDay);
        const groupMonthly = period === 'year' || (period === 'custom' && diffDays > 60);
    
        const getGroupKey = (date: Date): string => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            if (groupMonthly) {
                return `${year}-${month}`;
            }
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };
    
        // Initialize map with all keys in the range to show empty days/months
        if (groupMonthly) {
            let currentDate = new Date(startDate);
            currentDate.setDate(1); // Start from the first day of the start month
            while (currentDate <= endDate) {
                const key = getGroupKey(currentDate);
                if (!dataMap.has(key)) {
                    dataMap.set(key, { publishedSum: 0, scheduledSum: 0 });
                }
                currentDate.setMonth(currentDate.getMonth() + 1);
            }
        } else {
            for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                const key = getGroupKey(new Date(d));
                if (!dataMap.has(key)) {
                    dataMap.set(key, { publishedSum: 0, scheduledSum: 0 });
                }
            }
        }
    
        // Populate the map with data
        filteredByPeriod.forEach(ann => {
            const annDate = new Date(ann.publishTimestamp || ann.timestamp);
            const key = getGroupKey(annDate);
    
            const entry = dataMap.get(key);
            if (entry) {
                const isPublished = !ann.publishTimestamp || new Date(ann.publishTimestamp) <= now;
                if (isPublished) {
                    entry.publishedSum += ann.price;
                } else { // is scheduled for future
                    entry.scheduledSum += ann.price;
                }
            }
        });
    
        const sortedKeys = Array.from(dataMap.keys()).sort();
    
        const chartDataResult = sortedKeys.map(key => {
            const sums = dataMap.get(key)!;
            let formattedDate = key;
            if (groupMonthly) {
                const [year, month] = key.split('-');
                formattedDate = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('ru-RU', { month: 'short', year: 'numeric' });
            } else {
                const [year, month, day] = key.split('-');
                formattedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
            }
            return { date: formattedDate, ...sums };
        });
    
        const totalSum = filteredByPeriod
            .filter(ann => !ann.publishTimestamp || new Date(ann.publishTimestamp) <= now)
            .reduce((sum, item) => sum + item.price, 0);
    
        return { chartData: chartDataResult, totalPublishedSum: totalSum };
    }, [approvedAnnouncementsWithPrice, period, customStartDate, customEndDate]);
    
    const locationData = useMemo(() => {
        const dataByLocation: Record<string, { sum: number, count: number }> = {};
    
        approvedAnnouncementsWithPrice.forEach(ann => {
            const submitter = users.find(u => u.id === ann.submittedById);
            if (!submitter || !submitter.country || !submitter.region) return;
    
            const locationKey = `${submitter.country}, ${submitter.region}`;
            if (!dataByLocation[locationKey]) {
                dataByLocation[locationKey] = { sum: 0, count: 0 };
            }
            dataByLocation[locationKey].sum += ann.price;
            dataByLocation[locationKey].count += 1;
        });
    
        return Object.entries(dataByLocation)
            .map(([name, values]) => ({ name, ...values }))
            .sort((a, b) => b[locationMetric] - a[locationMetric])
            .slice(0, 15); // Show top 15
    }, [approvedAnnouncementsWithPrice, users, locationMetric]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-lg font-semibold text-gray-700">Опубликованные объявления</h3>
                    <p className="text-3xl font-bold text-brand-primary mt-2">{stats.published.count}</p>
                    <p className="text-xl font-semibold text-brand-accent mt-1">{stats.published.sum.toFixed(0)} руб.</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-lg font-semibold text-gray-700">Запланированные объявления</h3>
                    <p className="text-3xl font-bold text-gray-800 mt-2">{stats.scheduled.count}</p>
                    <p className="text-xl font-semibold text-green-600 mt-1">{stats.scheduled.sum.toFixed(0)} руб.</p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex flex-col md:flex-row justify-between md:items-center mb-4 gap-4">
                    <h3 className="text-lg font-semibold text-gray-700">Динамика выручки</h3>
                    <div className="flex flex-wrap items-center gap-2 bg-gray-100 p-1 rounded-lg">
                        {(['day', 'week', 'month', 'year'] as const).map(p => (
                            <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1 text-sm font-semibold rounded-md ${period === p ? 'bg-brand-primary text-white' : 'text-gray-600 hover:bg-gray-200'}`}>
                                {p === 'day' ? 'День' : p === 'week' ? 'Неделя' : p === 'month' ? 'Месяц' : 'Год'}
                            </button>
                        ))}
                         <button onClick={() => setPeriod('custom')} className={`px-3 py-1 text-sm font-semibold rounded-md ${period === 'custom' ? 'bg-brand-primary text-white' : 'text-gray-600 hover:bg-gray-200'}`}>
                            Выбрать даты
                        </button>
                    </div>
                </div>
                 {period === 'custom' && (
                    <div className="flex flex-wrap items-center gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
                        <label className="text-sm font-medium">С</label>
                        <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} className="p-1 border rounded-md"/>
                        <label className="text-sm font-medium">По</label>
                        <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} className="p-1 border rounded-md"/>
                    </div>
                )}
                <div className="text-center mb-4">
                    <p className="text-gray-600">Заработано за период (опубликованные):</p>
                    <p className="text-2xl font-bold text-brand-accent">{totalPublishedSum.toFixed(0)} руб.</p>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip formatter={(value: number) => [`${value.toFixed(0)} руб.`]} />
                        <Legend />
                        <Line type="monotone" dataKey="publishedSum" name="Опубликованные" stroke="#2c5282" strokeWidth={2} />
                        <Line type="monotone" dataKey="scheduledSum" name="Запланированные" stroke="#38a169" strokeWidth={2} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
            
             <div className="bg-white p-2 sm:p-6 rounded-lg shadow-md">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-2">
                    <h3 className="text-lg font-semibold text-gray-700">Статистика по локациям</h3>
                    <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg self-end sm:self-center">
                        <button onClick={() => setLocationMetric('sum')} className={`px-3 py-1 text-sm font-semibold rounded-md ${locationMetric === 'sum' ? 'bg-brand-primary text-white' : 'text-gray-600 hover:bg-gray-200'}`}>Выручка</button>
                        <button onClick={() => setLocationMetric('count')} className={`px-3 py-1 text-sm font-semibold rounded-md ${locationMetric === 'count' ? 'bg-brand-primary text-white' : 'text-gray-600 hover:bg-gray-200'}`}>Количество</button>
                    </div>
                </div>
                <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={locationData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} interval={0} />
                        <Tooltip formatter={(value: number) => [locationMetric === 'sum' ? `${value.toFixed(0)} руб.` : `${value} шт.`, locationMetric === 'sum' ? 'Выручка' : 'Кол-во']} />
                        <Bar dataKey={locationMetric} name={locationMetric === 'sum' ? "Выручка" : "Количество"} fill="#2a69ac" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};


const PollComponent: React.FC<{ item: Announcement, users: User[] }> = ({ item, users }) => {
    const auth = useContext(AuthContext);
    const data = useContext(DataContext);
    const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
    const [showVoterDetails, setShowVoterDetails] = useState(false);

    if (!item.poll || !auth?.user || !data) return null;

    const { user: currentUser } = auth;
    const { submitVote, updateAnnouncement } = data;
    const { poll } = item;
    
    const userVote = poll.votes.find(v => v.userId === currentUser.id);
    const isPollClosed = poll.pollEndsAt ? new Date() > new Date(poll.pollEndsAt) : false;
    const isAdmin = currentUser.role === UserRole.Admin;

    const handleStopPoll = () => {
        if (!isAdmin || !updateAnnouncement || !item.poll) return;
        updateAnnouncement(item.id, { poll: { ...item.poll, isStopped: true } });
    };
    
    const showResults = isAdmin || poll.isStopped || (!poll.isHidden && (userVote || isPollClosed));
    
    const handleOptionChange = (optionId: string) => {
        if (poll.allowMultipleVotes) {
            setSelectedOptions(prev => 
                prev.includes(optionId) ? prev.filter(id => id !== optionId) : [...prev, optionId]
            );
        } else {
            setSelectedOptions([optionId]);
        }
    };

    const handleVoteSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedOptions.length > 0) {
            submitVote(item.id, 'announcement', selectedOptions);
        }
    };
    
    const getVotersForOption = (optionId: string): User[] => {
        const voterIds = poll.votes
            .filter(v => v.optionIds.includes(optionId))
            .map(v => v.userId);
        return users.filter(u => voterIds.includes(u.id));
    };

    const pollResults = useMemo(() => {
        const totalVotesCast = poll.votes.reduce((total, vote) => total + vote.optionIds.length, 0);
        return poll.options.map(option => {
            const voteCount = poll.votes.filter(v => v.optionIds.includes(option.id)).length;
            return {
                option,
                voteCount,
                percentage: totalVotesCast > 0 ? (voteCount / totalVotesCast) * 100 : 0,
            };
        });
    }, [poll]);

    return (
        <div className="mt-4 pt-4 border-t">
            {!isPollClosed && poll.pollEndsAt && (
                <div className="text-sm text-center text-gray-500 bg-gray-100 p-2 rounded-md mb-3">
                    Голосование завершится {new Date(poll.pollEndsAt).toLocaleString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}.
                </div>
            )}
            {isPollClosed && poll.pollEndsAt && (
                <div className="text-sm text-center text-gray-500 bg-gray-100 p-2 rounded-md mb-3">
                    Голосование завершено {new Date(poll.pollEndsAt!).toLocaleString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}.
                </div>
            )}
            {poll.isStopped && (
                 <div className="text-sm text-center text-gray-500 bg-gray-100 p-2 rounded-md mb-3">
                    Голосование остановлено администратором.
                </div>
            )}

            {showResults ? (
                // Results View
                <div className="space-y-2">
                    {pollResults.map(({ option, voteCount, percentage }) => {
                        const didUserVoteForThis = userVote?.optionIds.includes(option.id);
                        return (
                            <div key={option.id}>
                                <div className="flex justify-between items-center text-sm mb-1">
                                    <span className={`font-semibold ${didUserVoteForThis ? 'text-brand-primary' : 'text-gray-700'}`}>{option.text}</span>
                                    <span className="text-gray-600 font-semibold">{voteCount} {getVoteWord(voteCount)}</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2.5">
                                    <div className="bg-brand-secondary h-2.5 rounded-full" style={{ width: `${percentage}%` }}></div>
                                </div>
                            </div>
                        );
                    })}
                    <p className="text-right text-sm text-gray-500 pt-2">Всего проголосовало: {poll.votes.length}</p>
                    {isAdmin && currentUser.permissions?.canManageAdmins && (
                        <div className="mt-4">
                            <button onClick={() => setShowVoterDetails(!showVoterDetails)} className="text-sm text-brand-primary hover:underline">
                                {showVoterDetails ? 'Скрыть детали' : 'Показать, кто как проголосовал'}
                            </button>
                            {showVoterDetails && (
                                <div className="mt-2 p-3 bg-gray-50 rounded-lg text-xs space-y-2">
                                    {poll.options.map(option => (
                                        <div key={option.id}>
                                            <p className="font-semibold">{option.text}</p>
                                            <p className="pl-2">
                                                {getVotersForOption(option.id).map(u => `${u.name} ${u.surname}`).join(', ') || 'Нет голосов'}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ) : userVote ? (
                <div className="text-center p-4">
                    <p className="font-semibold">Спасибо, ваш голос учтён!</p>
                    <p className="text-sm text-gray-600 mt-2">Результаты будут доступны после завершения голосования.</p>
                </div>
            ) : (
                // Voting View
                <form onSubmit={handleVoteSubmit} className="space-y-3">
                    {poll.options.map(option => (
                        <label key={option.id} className="flex items-center p-2 rounded-md hover:bg-gray-100 cursor-pointer">
                            <input
                                type={poll.allowMultipleVotes ? "checkbox" : "radio"}
                                name="pollOption"
                                checked={selectedOptions.includes(option.id)}
                                onChange={() => handleOptionChange(option.id)}
                                className={`h-4 w-4 text-brand-primary border-gray-300 focus:ring-brand-primary ${poll.allowMultipleVotes ? 'rounded' : 'rounded-full'}`}
                            />
                            <span className="ml-3 text-gray-700">{option.text}</span>
                        </label>
                    ))}
                    <button type="submit" className="bg-brand-primary text-white font-semibold px-4 py-2 rounded-lg shadow hover:bg-brand-secondary transition-colors text-sm mt-3">
                        Голосовать
                    </button>
                </form>
            )}
             {isAdmin && !poll.isStopped && (
                <div className="mt-4 pt-4 border-t text-center">
                    <button
                        onClick={handleStopPoll}
                        className="bg-yellow-500 text-white font-semibold px-4 py-2 rounded-lg shadow hover:bg-yellow-600 transition-colors text-sm"
                    >
                        Остановить голосование
                    </button>
                </div>
            )}
        </div>
    );
};


const AnnouncementsPage: React.FC = () => {
    const auth = useContext(AuthContext);
    const data = useContext(DataContext);
    // FIX: Updated `useLocation` to react-router-dom v6 syntax.
    const location = useLocation();
    const locationState = location.state as { view?: string } | null;
    // FIX: Using useNavigate for react-router-dom v6.
    const navigate = useNavigate();

    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [isEditorModalOpen, setEditorModalOpen] = useState(false);
    const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
    const [deletingAnnouncementId, setDeletingAnnouncementId] = useState<string | null>(null);
    const [permanentlyDeletingId, setPermanentlyDeletingId] = useState<string | null>(null);
    const [adminTab, setAdminTab] = useState<'published' | 'pending' | 'trashed' | 'statistics'>('published');
    const [isSubmitConfirmOpen, setSubmitConfirmOpen] = useState(false);
    const [isSubmitFormOpen, setSubmitFormOpen] = useState(false);
    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
    const [submissionCost, setSubmissionCost] = useState({ finalPrice: 0, discount: 0 });
    const [announcementPrice, setAnnouncementPrice] = useState(data?.settings.announcementBasePrice || 0);
    const [priceMessage, setPriceMessage] = useState('');
    
    const [defaultDeletion, setDefaultDeletion] = useState(data?.settings.defaultAnnouncementDeletion || 'none');
    const [defaultDeletionMessage, setDefaultDeletionMessage] = useState('');

    const [moderationSearchQuery, setModerationSearchQuery] = useState('');
    const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
    const [newPrice, setNewPrice] = useState('');

    if (!auth?.user || !data) return <div>Загрузка...</div>;
    const { user, updateUserSilently, users } = auth;
    const { announcements, addAdminAnnouncement, addUserAnnouncement, updateAnnouncement, updateAnnouncementSilently, deleteAnnouncement, moderateAnnouncement, settings, findOrCreateConversation, updateSettings, restoreAnnouncement, permanentlyDeleteAnnouncement, locations } = data;

    const handleEditPrice = (ann: Announcement, currentPrice: number) => {
        setEditingPriceId(ann.id);
        setNewPrice(String(currentPrice.toFixed(0)));
    };

    const handleSavePrice = async () => {
        if (editingPriceId) {
            const priceValue = parseFloat(newPrice);
            if (!isNaN(priceValue) && priceValue >= 0) {
                await updateAnnouncementSilently(editingPriceId, { moderatedPrice: priceValue });
                setEditingPriceId(null);
            }
        }
    };

    const handleCancelEditPrice = () => {
        setEditingPriceId(null);
    };

    useEffect(() => {
        if (locationState?.view === 'pending' && user.role === UserRole.Admin) {
            setAdminTab('pending');
        }
    }, [locationState, user.role]);

    const pendingAnnouncements = useMemo(() => {
        return announcements
            .filter(a => a.status === 'pending')
            .sort((a,b) => {
                const submitterA = users.find(u => u.id === a.submittedById);
                const submitterB = users.find(u => u.id === b.submittedById);
                const tierA = submitterA?.subscription?.tier === SubscriptionTier.Maximum ? 1 : 0;
                const tierB = submitterB?.subscription?.tier === SubscriptionTier.Maximum ? 1 : 0;
                if (tierA !== tierB) {
                    return tierB - tierA;
                }
                return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            });
    }, [announcements, users]);
    
    const filteredPendingAnnouncements = useMemo(() => {
        if (!moderationSearchQuery) {
            return pendingAnnouncements;
        }

        const searchQueryLower = moderationSearchQuery.toLowerCase();

        return pendingAnnouncements.filter(ann => {
            const submitter = users.find(u => u.id === ann.submittedById);
            const submitterName = submitter ? `${submitter.name} ${submitter.surname}`.toLowerCase() : '';
            const submitterId = submitter ? submitter.id : '';

            return (
                ann.title.toLowerCase().includes(searchQueryLower) ||
                ann.content.toLowerCase().includes(searchQueryLower) ||
                submitterName.includes(searchQueryLower) ||
                submitterId.includes(searchQueryLower)
            );
        });
    }, [pendingAnnouncements, moderationSearchQuery, users]);

    const trashedAnnouncements = useMemo(() => {
        return announcements.filter(a => a.status === 'trashed')
            .sort((a,b) => new Date(b.trashedTimestamp!).getTime() - new Date(a.trashedTimestamp!).getTime());
    }, [announcements]);

    const publishedAnnouncements = useMemo(() => {
        const now = new Date();
    
        if (user.role === UserRole.Admin) {
            const allPublished = announcements.filter(a => a.status === 'published');
            const pinned = allPublished.filter(a => a.isPinned);
            const unpinned = allPublished.filter(a => !a.isPinned);

            const sortAdminItems = (items: Announcement[]) => {
                const scheduled = items.filter(a => a.publishTimestamp && new Date(a.publishTimestamp) > now);
                const published = items.filter(a => !a.publishTimestamp || new Date(a.publishTimestamp) <= now);
            
                scheduled.sort((a, b) => new Date(a.publishTimestamp!).getTime() - new Date(b.publishTimestamp!).getTime());
                published.sort((a, b) => new Date(b.publishTimestamp || b.timestamp).getTime() - new Date(a.publishTimestamp || a.timestamp).getTime());

                return [...scheduled, ...published];
            };
            
            return [...sortAdminItems(pinned), ...sortAdminItems(unpinned)];
        }
        
        const filteredForUser = announcements.filter(a => {
            if (a.status !== 'published') return false;
            if (a.publishTimestamp && new Date(a.publishTimestamp) > now) return false;

            // Subscription check
            if (a.targetSubscriptionTiers && a.targetSubscriptionTiers.length > 0) {
                if (!user.subscription || !a.targetSubscriptionTiers.includes(user.subscription.tier)) {
                    return false;
                }
            }

            // Role check
            const roleMatch = !a.targetRoles || a.targetRoles.length === 0 || a.targetRoles.includes(user.role);
            if (!roleMatch) return false;
        
            // Location check
            const hasLocationTarget = (a.targetCountries && a.targetCountries.length > 0) ||
                                      (a.targetRegions && a.targetRegions.length > 0) ||
                                      (a.targetCities && a.targetCities.length > 0);
        
            if (!hasLocationTarget) {
                return true; // Global post, location matches
            }
        
            const countryMatch = a.targetCountries && a.targetCountries.includes(user.country);
            const regionMatch = a.targetRegions && a.targetRegions.includes(user.region);
            const cityMatch = a.targetCities && a.targetCities.includes(user.city);
        
            return countryMatch || regionMatch || cityMatch;
        });

        const pinned = filteredForUser.filter(a => a.isPinned);
        const unpinned = filteredForUser.filter(a => !a.isPinned);
        
        const sortByDateDesc = (a: Announcement, b: Announcement) => new Date(b.publishTimestamp || b.timestamp).getTime() - new Date(a.publishTimestamp || a.timestamp).getTime();

        pinned.sort(sortByDateDesc);
        unpinned.sort(sortByDateDesc);

        return [...pinned, ...unpinned];
    
    }, [announcements, user]);

    const getTargetUsers = (item: Announcement) => {
        const allNonAdmins = users.filter(u => u.role !== UserRole.Admin && !u.isDeleted);
        
        return allNonAdmins.filter(u => {
            const roleMatch = !item.targetRoles || item.targetRoles.length === 0 || item.targetRoles.includes(u.role);
            if (!roleMatch) return false;

            const hasLocationTarget = (item.targetCountries && item.targetCountries.length > 0) ||
                                      (item.targetRegions && item.targetRegions.length > 0) ||
                                      (item.targetCities && item.targetCities.length > 0);

            if (!hasLocationTarget) {
                return true;
            }
            
            const countryMatch = item.targetCountries && item.targetCountries.includes(u.country);
            const regionMatch = item.targetRegions && item.targetRegions.includes(u.region);
            const cityMatch = item.targetCities && item.targetCities.includes(u.city);

            return !!(countryMatch || regionMatch || cityMatch);
        });
    };

    const handleToggle = (id: string) => {
        setExpandedId(prev => {
            const newExpandedId = prev === id ? null : id;
            if (newExpandedId !== null && !user.readAnnouncementIds?.includes(id)) {
                updateUserSilently({ readAnnouncementIds: [...(user.readAnnouncementIds || []), id] });
            }
            return newExpandedId;
        });
    };
    
    const handleAddNew = () => {
        setEditingAnnouncement(null);
        setEditorModalOpen(true);
    };

    const handleEdit = (announcement: Announcement) => {
        setEditingAnnouncement(announcement);
        setEditorModalOpen(true);
    };
    
    const handleDelete = (announcementId: string) => setDeletingAnnouncementId(announcementId);
    const confirmDelete = async () => {
        if (deletingAnnouncementId) {
            await deleteAnnouncement(deletingAnnouncementId);
            setDeletingAnnouncementId(null);
        }
    };
    
    const confirmPermanentDelete = async () => {
        if (permanentlyDeletingId) {
            await permanentlyDeleteAnnouncement(permanentlyDeletingId);
            setPermanentlyDeletingId(null);
        }
    };
    
    const handleAdminSave = async (data: Omit<Announcement, 'id' | 'authorId' | 'timestamp' | 'status'>) => {
        if (editingAnnouncement) {
            await updateAnnouncement(editingAnnouncement.id, data);
        } else {
            await addAdminAnnouncement(data);
        }
    };

    const handleUserSubmitFlow = () => {
        const publishedCount = announcements.filter(a =>
            a.submittedById === user.id &&
            a.status === 'published' &&
            (!a.publishTimestamp || new Date(a.publishTimestamp) <= new Date())
        ).length;

        const basePrice = settings.announcementBasePrice;
        const calculatedDiscount = Math.min(Math.floor(publishedCount / 10) * 5, 50);
        const discountPercentage = user.discount !== undefined ? user.discount : calculatedDiscount;

        const finalPrice = Math.round(Math.max(0, basePrice * (1 - discountPercentage / 100)));
        setSubmissionCost({ finalPrice, discount: discountPercentage });
        setSubmitConfirmOpen(true);
    };

    const handleConfirmSubmission = () => {
        setSubmitConfirmOpen(false);
        setSubmitFormOpen(true);
    };

    const handleSaveUserAnnouncement = async (data: Omit<Announcement, 'id' | 'authorId' | 'timestamp' | 'status'| 'submittedById'|'sentToUserIds'>) => {
        await addUserAnnouncement(data);
        setSubmitFormOpen(false);
        setIsSuccessModalOpen(true);
    };

    const handleGoToChat = async (targetUserId: string) => {
        if (!findOrCreateConversation) return;
        const conversation = await findOrCreateConversation(targetUserId);
        if (conversation) {
            navigate('/chat', { state: { openChatId: conversation.id } });
        }
    };

    const handleGoToServiceChat = (targetUserId: string) => {
        const serviceChatId = `service-chat-${targetUserId}`;
        navigate('/chat', { state: { openChatId: serviceChatId } });
    };
    
    const handlePriceSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setPriceMessage('');
        if (announcementPrice < 0) {
            setPriceMessage('Цена не может быть отрицательной.');
            return;
        }
        await updateSettings({ announcementBasePrice: announcementPrice });
        setPriceMessage('Сохранено!');
        setTimeout(() => setPriceMessage(''), 2000);
    };

    const handleSaveDefaultDeletion = async (e: React.FormEvent) => {
        e.preventDefault();
        await updateSettings({ defaultAnnouncementDeletion: defaultDeletion });
        setDefaultDeletionMessage('Настройка по умолчанию сохранена!');
        setTimeout(() => setDefaultDeletionMessage(''), 2000);
    };

    const handleModerationCheck = async (announcement: Announcement) => {
        await updateAnnouncementSilently(announcement.id, { isModerated: !announcement.isModerated });
    };

    const AdminTabs = () => (
        <div className="border-b border-gray-200 overflow-x-auto">
            <nav className="-mb-px flex space-x-8 whitespace-nowrap" aria-label="Tabs">
                <button
                    onClick={() => setAdminTab('published')}
                    className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                        adminTab === 'published'
                        ? 'border-brand-primary text-brand-primary'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                    Опубликованные
                </button>
                <button
                    onClick={() => setAdminTab('pending')}
                    className={`relative whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                        adminTab === 'pending'
                        ? 'border-brand-primary text-brand-primary'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                    На модерации
                    {pendingAnnouncements.length > 0 && (
                        <span className="absolute top-3 -right-3 ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">{pendingAnnouncements.length}</span>
                    )}
                </button>
                <button
                    onClick={() => setAdminTab('trashed')}
                    className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                        adminTab === 'trashed'
                        ? 'border-brand-primary text-brand-primary'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                    Корзина
                </button>
                {user.permissions?.canManageAdmins && (
                     <button
                        onClick={() => setAdminTab('statistics')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                            adminTab === 'statistics'
                            ? 'border-brand-primary text-brand-primary'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        Статистика
                    </button>
                )}
            </nav>
        </div>
    );
    
    const renderAnnouncement = (ann: Announcement, viewType: 'published' | 'moderation' | 'trashed' = 'published') => {
        const isRead = user.readAnnouncementIds?.includes(ann.id) ?? true;
        const targetUsers = getTargetUsers(ann);
        const sentToCount = targetUsers.length;
        const readCount = targetUsers.filter(u => u.readAnnouncementIds?.includes(ann.id)).length;
        const isScheduled = ann.publishTimestamp && new Date(ann.publishTimestamp) > new Date();
        const images = ann.images || [];
        const submitter = users.find(u => u.id === ann.submittedById);
        
        let userSubmissionCost: { finalPrice: number, discount: number } | null = null;
        let publishedCount = 0;

        if (viewType === 'moderation' && submitter) {
            publishedCount = announcements.filter(a =>
                a.submittedById === submitter.id &&
                a.status === 'published' &&
                (!a.publishTimestamp || new Date(a.publishTimestamp) <= new Date())
            ).length;
            
            const basePrice = settings.announcementBasePrice;
            const calculatedDiscount = Math.min(Math.floor(publishedCount / 10) * 5, 50);
            const discountPercentage = submitter.discount !== undefined ? submitter.discount : calculatedDiscount;
            const finalPrice = Math.round(Math.max(0, basePrice * (1 - discountPercentage / 100)));
            userSubmissionCost = { finalPrice, discount: discountPercentage };
        }
        
        const displayPrice = userSubmissionCost ? (ann.moderatedPrice !== undefined ? ann.moderatedPrice : userSubmissionCost.finalPrice) : 0;


        const renderTargetLocations = () => {
            const hasTargeting = (ann.targetCountries && ann.targetCountries.length > 0) ||
                                 (ann.targetRegions && ann.targetRegions.length > 0) ||
                                 (ann.targetCities && ann.targetCities.length > 0);
    
            if (!hasTargeting) {
                return 'Все локации';
            }
    
            const displayableRegions = ann.targetRegions?.filter(region => {
                const parentCountry = Object.keys(locations).find(c => locations[c] && Object.keys(locations[c]).includes(region));
                return !parentCountry || !ann.targetCountries?.includes(parentCountry);
            }) || [];
    
            const displayableCities = ann.targetCities?.filter(city => {
                let parentRegionName: string | undefined;
                for (const country of Object.keys(locations)) {
                    const region = Object.keys(locations[country]).find(r => locations[country][r].includes(city));
                    if (region) {
                        parentRegionName = region;
                        break;
                    }
                }
                return !parentRegionName || !ann.targetRegions?.includes(parentRegionName);
            }) || [];
    
            const parts = [
                ...(ann.targetCountries || []),
                ...displayableRegions,
                ...displayableCities
            ];
    
            if (parts.length === 0) {
                 return 'Все локации';
            }
    
            return parts.join(', ');
        };

        return (
             <div key={ann.id} className={`bg-white rounded-lg shadow-md overflow-hidden border-2 ${ann.isPinned && viewType === 'published' ? 'border-brand-primary' : 'border-transparent'}`}>
                <div className="p-4 cursor-pointer" onClick={() => handleToggle(ann.id)}>
                   <div className="flex justify-between items-start">
                        <div className="flex-grow pr-4">
                            <div className="flex items-center flex-wrap gap-2">
                                {ann.isPinned && viewType === 'published' && <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-brand-primary mr-2 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M16 9V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z"/></svg>}
                                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                    <span>{ann.title}</span>
                                    {ann.targetSubscriptionTiers?.includes(SubscriptionTier.Maximum) && <AnimatedStar />}
                                </h3>
                                {user.role === UserRole.Admin && isScheduled && viewType === 'published' && (
                                    <span className="text-xs font-bold text-orange-600 bg-orange-100 px-2 py-1 rounded-full">Запланировано</span>
                                )}
                            </div>
                            {submitter && (
                                <p className="text-sm text-gray-600 mt-1 flex items-center gap-2">
                                    <span>От:</span>
                                    <span className="font-semibold">{submitter.name} {submitter.surname}</span>
                                    {submitter.subscription?.tier === SubscriptionTier.Maximum && <AnimatedStar />}
                                    <span className="font-mono text-xs text-gray-500">(ID: {submitter.id})</span>
                                </p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                                {new Date(ann.publishTimestamp || ann.timestamp).toLocaleString('ru-RU')}
                                {user.role === UserRole.Admin && viewType === 'published' && <span className="ml-4">Отправлено: {sentToCount} / Прочитано: {readCount}</span>}
                                {isScheduled && <span> / Публикация: {new Date(ann.publishTimestamp!).toLocaleString('ru-RU')}</span>}
                            </p>
                             {user.role === UserRole.Admin && ann.deletionTimestamp && (
                                <p className="text-xs text-red-500 mt-1">
                                    Удаление поста: {new Date(ann.deletionTimestamp).toLocaleString('ru-RU')}
                                </p>
                            )}
                            {viewType === 'trashed' && ann.trashedTimestamp && (
                                <p className="text-xs text-red-500 mt-1">
                                    Перемещено в корзину: {new Date(ann.trashedTimestamp).toLocaleString('ru-RU')}
                                </p>
                            )}
                        </div>
                         <div className="flex items-center flex-wrap gap-x-2 sm:gap-x-4 gap-y-1 flex-shrink-0 justify-end">
                            {viewType === 'moderation' && (
                                <div onClick={(e) => e.stopPropagation()}>
                                    <label className="inline-flex items-center space-x-2 text-sm font-medium text-gray-700 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={!!ann.isModerated}
                                            onChange={() => handleModerationCheck(ann)}
                                            className="h-4 w-4 text-brand-primary border-gray-300 rounded focus:ring-brand-secondary"
                                        />
                                        <span>Модерация пройдена</span>
                                    </label>
                                </div>
                            )}
                            {user.role === UserRole.Admin && user.permissions?.canManageAnnouncements && viewType === 'published' && (
                                 <>
                                    <button onClick={(e) => { e.stopPropagation(); updateAnnouncement(ann.id, { isPinned: !ann.isPinned }); }} title={ann.isPinned ? "Открепить" : "Закрепить"} className={`p-1 rounded-full hover:bg-gray-100 ${ann.isPinned ? 'text-brand-primary' : 'text-gray-400'}`}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M16 9V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z"/></svg>
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); handleEdit(ann); }} title="Редактировать" className="font-semibold text-blue-600 hover:text-blue-800">Ред.</button>
                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(ann.id); }} title="Удалить" className="font-semibold text-red-600 hover:text-red-800">Удал.</button>
                                </>
                            )}
                            {!isRead && user.role !== UserRole.Admin && <span className="w-3 h-3 bg-red-500 rounded-full flex-shrink-0" title="Новое"></span>}
                            <button className="focus:outline-none"><svg className={`w-5 h-5 text-gray-500 transform transition-transform ${expandedId === ann.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></button>
                        </div>
                   </div>
                </div>
                <div className={`transition-all duration-700 ease-in-out overflow-hidden ${expandedId === ann.id ? 'max-h-[3000px]' : 'max-h-0'}`}>
                    <div className="px-4 pb-4">
                        <div className="border-t pt-4 text-gray-700 whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: linkify(ann.content) }} />
                        {images.map(img => <img key={img.id} src={img.url} alt={ann.title} className="w-full h-auto object-cover rounded-lg mt-4" />)}
                        {ann.poll && <PollComponent item={ann} users={users} />}
                        {ann.quiz && <QuizComponent item={ann} itemType="announcement" />}
                        {viewType === 'moderation' && submitter && (
                            <div className="mt-4 pt-4 border-t space-y-3">
                                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md space-y-2">
                                    <p className="font-semibold text-gray-800">Информация для модератора:</p>
                                    {userSubmissionCost && (
                                        <div className="pb-2">
                                            <p>Опубликовано объявлений: <span className="font-bold">{publishedCount}</span></p>
                                            <p>Расчетная стоимость для <span className="font-semibold">{submitter.name} {submitter.surname}</span>:</p>
                                            <p className="pl-4">Скидка: <span className="font-bold">{userSubmissionCost.discount}%</span></p>
                                            <div className="pl-4 flex items-center gap-2">
                                                <span>Итого:</span>
                                                {editingPriceId === ann.id ? (
                                                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                                        <input 
                                                            type="number"
                                                            value={newPrice}
                                                            onChange={(e) => setNewPrice(e.target.value)}
                                                            className="w-24 px-2 py-1 border border-gray-300 rounded-md text-sm"
                                                            autoFocus
                                                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSavePrice(); } if (e.key === 'Escape') { e.preventDefault(); handleCancelEditPrice(); } }}
                                                        />
                                                        <button type="button" onClick={handleSavePrice} className="text-green-600 hover:text-green-800 p-1">Сохранить</button>
                                                        <button type="button" onClick={handleCancelEditPrice} className="text-red-600 hover:text-red-800 p-1">Отмена</button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-brand-accent">{displayPrice.toFixed(0)} руб.</span>
                                                        <button 
                                                            type="button" 
                                                            onClick={(e) => { e.stopPropagation(); handleEditPrice(ann, displayPrice); }}
                                                            className="text-gray-500 hover:text-brand-primary"
                                                            title="Изменить стоимость"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" /></svg>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    <div className="pt-2 border-t">
                                        <p><strong>Целевые роли:</strong> {ann.targetRoles && ann.targetRoles.length > 0 ? ann.targetRoles.join(', ') : 'Все роли'}</p>
                                        <p><strong>Целевые локации:</strong> {renderTargetLocations()}</p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-end flex-wrap gap-2">
                                     <button onClick={(e) => { e.stopPropagation(); updateAnnouncement(ann.id, { isPinned: !ann.isPinned }); }} title={ann.isPinned ? "Открепить" : "Закрепить"} className={`p-2 rounded-full hover:bg-gray-100 ${ann.isPinned ? 'text-brand-primary' : 'text-gray-400'}`}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M16 9V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z"/></svg>
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); handleEdit(ann); }} className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm font-semibold hover:bg-blue-700 transition">Редактировать</button>
                                    <button onClick={() => handleGoToServiceChat(submitter.id)} className="bg-gray-200 text-gray-800 px-3 py-1.5 rounded-md text-sm font-semibold hover:bg-gray-300 transition">Написать</button>
                                    <button onClick={() => moderateAnnouncement(ann.id, false)} className="bg-brand-danger text-white px-3 py-1.5 rounded-md text-sm font-semibold hover:bg-red-700 transition">Отклонить</button>
                                    <button onClick={() => moderateAnnouncement(ann.id, true)} className="bg-brand-accent text-white px-3 py-1.5 rounded-md text-sm font-semibold hover:bg-green-600 transition">Одобрить</button>
                                </div>
                            </div>
                        )}
                        {user.role !== UserRole.Admin && submitter && expandedId === ann.id && (
                             <div className="flex items-center justify-end mt-4 pt-4 border-t">
                                <button onClick={() => handleGoToChat(submitter.id)} className="bg-brand-secondary text-white px-3 py-1.5 rounded-md text-sm font-semibold hover:bg-brand-primary transition">Написать</button>
                            </div>
                        )}
                         {viewType === 'trashed' && (
                            <div className="flex items-center justify-end mt-4 pt-4 border-t">
                                <button onClick={() => setPermanentlyDeletingId(ann.id)} className="text-red-600 hover:text-red-800 font-semibold text-sm mr-4">Удалить навсегда</button>
                                <button onClick={() => restoreAnnouncement(ann.id)} className="bg-brand-accent text-white px-3 py-1.5 rounded-md text-sm font-semibold hover:bg-green-600 transition">Восстановить</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            <PublicationEditorModal isOpen={isEditorModalOpen} onClose={() => setEditorModalOpen(false)} onSave={handleAdminSave} editingItem={editingAnnouncement} itemType="announcement" allUsers={users} locations={locations} defaultAutoDeleteOption={settings.defaultAnnouncementDeletion} />
            <UserAnnouncementEditorModal isOpen={isSubmitFormOpen} onClose={() => setSubmitFormOpen(false)} onSave={handleSaveUserAnnouncement} locations={locations} />
            <ConfirmationModal isOpen={!!deletingAnnouncementId} onClose={() => setDeletingAnnouncementId(null)} onConfirm={confirmDelete} title="Переместить в корзину" message="Вы уверены, что хотите удалить это объявление? Оно будет перемещено в корзину на 7 дней." confirmText="Переместить" />
            <ConfirmationModal isOpen={!!permanentlyDeletingId} onClose={() => setPermanentlyDeletingId(null)} onConfirm={confirmPermanentDelete} title="Удалить навсегда" message="Вы уверены? Это действие нельзя отменить." />
            <ConfirmationModal 
                isOpen={isSubmitConfirmOpen}
                onClose={() => setSubmitConfirmOpen(false)}
                onConfirm={handleConfirmSubmission}
                title="Подтверждение подачи объявления"
                message={
                    <div>
                        <p>Вы собираетесь подать объявление на модерацию.</p>
                        <p className="mt-2">Базовая стоимость: <span className="font-semibold">{settings.announcementBasePrice} руб.</span></p>
                        <p>Ваша скидка: <span className="font-semibold">{submissionCost.discount}%</span></p>
                        <p className="mt-2 text-lg font-bold">Итоговая стоимость: <span className="text-brand-accent">{submissionCost.finalPrice.toFixed(0)} руб.</span></p>
                        <p className="text-sm text-gray-600 mt-4">Продолжить?</p>
                    </div>
                }
                confirmText="Продолжить"
                confirmButtonClass="bg-brand-primary text-white hover:bg-brand-secondary"
            />
             <ConfirmationModal
                isOpen={isSuccessModalOpen}
                onClose={() => setIsSuccessModalOpen(false)}
                onConfirm={() => setIsSuccessModalOpen(false)}
                title="Успешно!"
                message="Объявление отправлено на модерацию. В ближайшее время с вами свяжутся в разделе чат."
                confirmText="Хорошо"
                confirmButtonClass="bg-brand-primary text-white hover:bg-brand-secondary"
                hideCancelButton={true}
            />

            {user.role === UserRole.Admin && user.permissions?.canManageAnnouncements && (
                <div className="flex flex-wrap justify-between items-center gap-4">
                     <form onSubmit={handleSaveDefaultDeletion} className="flex flex-wrap items-center gap-4 bg-gray-50 p-3 rounded-lg">
                        <label htmlFor="default-deletion" className="text-sm font-medium text-gray-700 whitespace-nowrap">Удаление постов по умолчанию:</label>
                        <select id="default-deletion" value={defaultDeletion} onChange={e => setDefaultDeletion(e.target.value)} className="w-full max-w-xs px-2 py-1 border border-gray-300 rounded-md bg-white">
                            <option value="none">Без ограничений</option>
                            <option value="1w">1 неделя</option>
                            <option value="2w">2 недели</option>
                            <option value="3w">3 недели</option>
                            <option value="4w">4 недели</option>
                        </select>
                        <button type="submit" className="bg-brand-secondary text-white px-3 py-1 rounded-md text-sm font-semibold hover:bg-brand-primary">Сохранить</button>
                        {defaultDeletionMessage && <p className="text-sm text-green-600">{defaultDeletionMessage}</p>}
                    </form>
                    <button onClick={handleAddNew} className="bg-brand-primary text-white font-semibold px-4 py-2 rounded-lg shadow hover:bg-brand-secondary transition-colors flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" /></svg>
                        Создать объявление
                    </button>
                </div>
            )}
            
            {user.role !== UserRole.Admin && (
                 <div className="flex justify-end items-center">
                    <button onClick={handleUserSubmitFlow} className="bg-brand-accent text-white font-semibold px-4 py-2 rounded-lg shadow hover:bg-green-600 transition-colors flex items-center">
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" /></svg>
                        Подать объявление
                    </button>
                </div>
            )}

            {user.role === UserRole.Admin && <AdminTabs />}
            
            <div className="space-y-4">
                {user.role === UserRole.Admin && adminTab === 'statistics' && user.permissions?.canManageAdmins && (
                    <AnnouncementsStats announcements={announcements} users={users} />
                )}

                {user.role === UserRole.Admin && adminTab === 'pending' && (
                     <div className="space-y-4">
                        <div className="bg-white p-4 rounded-lg shadow-md">
                            <form onSubmit={handlePriceSave} className="flex flex-wrap items-center gap-y-2 gap-x-4">
                                <label htmlFor="ann-price" className="text-sm font-medium text-gray-700 whitespace-nowrap">Базовая стоимость объявления:</label>
                                <input id="ann-price" type="number" value={announcementPrice} onChange={e => setAnnouncementPrice(Number(e.target.value))} className="w-full max-w-xs px-2 py-1 border border-gray-300 rounded-md" />
                                <button type="submit" className="bg-brand-secondary text-white px-3 py-1 rounded-md text-sm font-semibold hover:bg-brand-primary">Сохранить</button>
                                {priceMessage && <p className="text-sm text-green-600">{priceMessage}</p>}
                            </form>
                        </div>
                         <div className="bg-white p-4 rounded-lg shadow-md">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Поиск по ID, имени, заголовку или содержанию..."
                                    value={moderationSearchQuery}
                                    onChange={(e) => setModerationSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-brand-secondary focus:outline-none"
                                />
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>
                                </span>
                            </div>
                        </div>
                        {filteredPendingAnnouncements.length > 0 ? filteredPendingAnnouncements.map(ann => renderAnnouncement(ann, 'moderation')) : <p className="text-center text-gray-500 py-8">{moderationSearchQuery ? 'Ничего не найдено.' : 'Нет объявлений для модерации.'}</p>}
                     </div>
                )}
                
                {user.role === UserRole.Admin && adminTab === 'published' && (
                    publishedAnnouncements.length > 0 ? publishedAnnouncements.map(ann => renderAnnouncement(ann, 'published')) : <p className="text-center text-gray-500 py-8">Нет опубликованных объявлений.</p>
                )}
                
                {user.role === UserRole.Admin && adminTab === 'trashed' && (
                     trashedAnnouncements.length > 0 ? trashedAnnouncements.map(ann => renderAnnouncement(ann, 'trashed')) : <p className="text-center text-gray-500 py-8">Корзина пуста.</p>
                )}

                {user.role !== UserRole.Admin && (
                    publishedAnnouncements.length > 0 ? publishedAnnouncements.map(ann => renderAnnouncement(ann)) : <p className="text-center text-gray-500 py-8">Объявлений пока нет.</p>
                )}
            </div>
        </div>
    );
};

export default AnnouncementsPage;