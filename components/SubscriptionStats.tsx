import React, { useMemo, useState } from 'react';
import { User, AppSettings, SubscriptionTier, UserRole } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface SubscriptionStatsProps {
    users: User[];
    settings: AppSettings;
}

const COLORS = {
    [SubscriptionTier.Base]: '#a0aec0',    // gray
    [SubscriptionTier.Pro]: '#4299e1',     // blue
    [SubscriptionTier.Maximum]: '#f6e05e', // yellow
};

const SubscriptionStats: React.FC<SubscriptionStatsProps> = ({ users, settings }) => {
    const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year' | 'custom'>('month');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');

    const nonAdminUsers = useMemo(() => users.filter(u => u.role !== UserRole.Admin), [users]);

    const simulatedPurchases = useMemo(() => {
        const trialSettings = settings.trialSettings;

        return nonAdminUsers.map(user => {
            if (!user.subscription || !user.subscription.expiresAt || user.subscription.tier === SubscriptionTier.Base) {
                return null;
            }

            // New logic with payment details
            if (user.subscription.lastPayment) {
                const { lastPayment } = user.subscription;
                return {
                    userId: user.id,
                    tier: user.subscription.tier,
                    purchaseDate: new Date(lastPayment.date),
                    price: lastPayment.amountPaid // This is the money part, as requested
                };
            }

            // Fallback logic for data without `lastPayment` (e.g., admin-set subscriptions)
            // Check if it's a trial subscription
            let isTrial = false;
            if (trialSettings && user.subscription.tier === trialSettings.tier) {
                const regDate = new Date(user.registrationDate);
                // Trial subscription expires exactly `trialSettings.durationDays` after registration
                const trialEndDate = new Date(regDate.getTime() + trialSettings.durationDays * 24 * 60 * 60 * 1000);
                const expiryDate = new Date(user.subscription.expiresAt);

                // Allow a tolerance (e.g., 1 minute) to account for small discrepancies during creation
                if (Math.abs(trialEndDate.getTime() - expiryDate.getTime()) < 60000) {
                    isTrial = true;
                }
            }

            if (isTrial) {
                return null; // Don't count trial subscriptions as purchases
            }
            
            // For old data or admin-set subscriptions without payment info, we can't reliably calculate revenue.
            // So we return null to exclude them from revenue calculation, which is the safest approach.
            return null;

        }).filter(Boolean) as { userId: string; tier: SubscriptionTier; purchaseDate: Date; price: number }[];
    }, [nonAdminUsers, settings.trialSettings]);

    const { chartData, totalRevenue } = useMemo(() => {
        const roleFilteredPurchases = roleFilter === 'all'
            ? simulatedPurchases
            : simulatedPurchases.filter(p => {
                const user = users.find(u => u.id === p.userId);
                return user?.role === roleFilter;
            });

        const now = new Date();
        let startDate = new Date();
        let endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
        
        const aDay = 24 * 60 * 60 * 1000;

        switch (period) {
            case 'day': startDate.setDate(now.getDate()); break;
            case 'week': startDate.setDate(now.getDate() - 6); break;
            case 'year': startDate.setFullYear(now.getFullYear() - 1); startDate.setDate(now.getDate() + 1); break;
            case 'custom':
                if (customStartDate && customEndDate) {
                    startDate = new Date(customStartDate);
                    endDate = new Date(customEndDate);
                    endDate.setHours(23, 59, 59, 999);
                } else {
                    return { chartData: [], totalRevenue: 0 };
                }
                break;
            case 'month':
            default:
                startDate.setDate(now.getDate() - 29);
                break;
        }
        startDate.setHours(0, 0, 0, 0);

        const filteredPurchases = roleFilteredPurchases.filter(p => p.purchaseDate >= startDate && p.purchaseDate <= endDate);
        const revenue = filteredPurchases.reduce((sum, p) => sum + p.price, 0);

        const dataMap = new Map<string, { [SubscriptionTier.Pro]: number, [SubscriptionTier.Maximum]: number }>();
        const diffDays = Math.round((endDate.getTime() - startDate.getTime()) / aDay);
        const groupMonthly = period === 'year' || (period === 'custom' && diffDays > 60);

        const getGroupKey = (date: Date): string => {
            if (groupMonthly) return date.toLocaleDateString('ru-RU', { month: 'short', year: 'numeric' });
            return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
        };

        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const key = getGroupKey(new Date(d));
            if (!dataMap.has(key)) {
                dataMap.set(key, { [SubscriptionTier.Pro]: 0, [SubscriptionTier.Maximum]: 0 });
            }
        }
        
        filteredPurchases.forEach(p => {
            const key = getGroupKey(p.purchaseDate);
            const entry = dataMap.get(key);
            if (entry && (p.tier === SubscriptionTier.Pro || p.tier === SubscriptionTier.Maximum)) {
                entry[p.tier]++;
            }
        });

        const finalChartData = Array.from(dataMap.entries()).map(([date, counts]) => ({ date, ...counts }));

        return { chartData: finalChartData, totalRevenue: revenue };

    }, [simulatedPurchases, period, customStartDate, customEndDate, roleFilter, users]);

    const subsByRoleStats = useMemo(() => {
        const roles = [UserRole.Student, UserRole.Trainer, UserRole.Spectator];
        const stats: Record<string, {
            total: number;
            paid: number;
            percentage: number;
            tiers: {
                [SubscriptionTier.Pro]: number;
                [SubscriptionTier.Maximum]: number;
            }
        }> = {};

        roles.forEach(role => {
            const usersInRole = nonAdminUsers.filter(u => u.role === role);
            const total = usersInRole.length;
            
            const proCount = usersInRole.filter(u => u.subscription?.tier === SubscriptionTier.Pro).length;
            const maxCount = usersInRole.filter(u => u.subscription?.tier === SubscriptionTier.Maximum).length;
            
            const paid = proCount + maxCount;
            const percentage = total > 0 ? (paid / total) * 100 : 0;

            stats[role] = {
                total,
                paid,
                percentage,
                tiers: {
                    [SubscriptionTier.Pro]: proCount,
                    [SubscriptionTier.Maximum]: maxCount,
                }
            };
        });

        return stats;
    }, [nonAdminUsers]);
    
    const subsByTier = useMemo(() => ({
        [SubscriptionTier.Base]: nonAdminUsers.filter(u => u.subscription?.tier === SubscriptionTier.Base || !u.subscription).length,
        [SubscriptionTier.Pro]: nonAdminUsers.filter(u => u.subscription?.tier === SubscriptionTier.Pro).length,
        [SubscriptionTier.Maximum]: nonAdminUsers.filter(u => u.subscription?.tier === SubscriptionTier.Maximum).length,
    }), [nonAdminUsers]);

    const subscriptionDistributionData = useMemo(() => {
        return Object.entries(subsByTier).map(([name, value]) => ({ name, value }));
    }, [subsByTier]);
    
    // FIX: Accessing object properties with enum values as keys requires bracket notation.
    const totalSubs = subsByTier[SubscriptionTier.Base] + subsByTier[SubscriptionTier.Pro] + subsByTier[SubscriptionTier.Maximum];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-lg font-semibold text-gray-700">Всего пользователей</h3>
                    <p className="text-3xl font-bold text-brand-primary mt-2">{nonAdminUsers.length}</p>
                    <div className="text-sm mt-2 space-y-2 text-gray-600">
                        <div>
                            <p className="font-semibold">{UserRole.Student}: {subsByRoleStats[UserRole.Student].total}</p>
                            <div className="text-xs text-gray-500 pl-4">
                                <p>{subsByRoleStats[UserRole.Student].paid} с подпиской ({subsByRoleStats[UserRole.Student].percentage.toFixed(1)}%)</p>
                                {/* FIX: Accessing object properties with enum values as keys requires bracket notation. */}
                                <p className="pl-2">└ {SubscriptionTier.Pro}: {subsByRoleStats[UserRole.Student].tiers[SubscriptionTier.Pro]}</p>
                                {/* FIX: Accessing object properties with enum values as keys requires bracket notation. */}
                                <p className="pl-2">└ {SubscriptionTier.Maximum}: {subsByRoleStats[UserRole.Student].tiers[SubscriptionTier.Maximum]}</p>
                            </div>
                        </div>
                        <div>
                            <p className="font-semibold">{UserRole.Trainer}: {subsByRoleStats[UserRole.Trainer].total}</p>
                            <div className="text-xs text-gray-500 pl-4">
                                <p>{subsByRoleStats[UserRole.Trainer].paid} с подпиской ({subsByRoleStats[UserRole.Trainer].percentage.toFixed(1)}%)</p>
                                {/* FIX: Accessing object properties with enum values as keys requires bracket notation. */}
                                <p className="pl-2">└ {SubscriptionTier.Pro}: {subsByRoleStats[UserRole.Trainer].tiers[SubscriptionTier.Pro]}</p>
                                {/* FIX: Accessing object properties with enum values as keys requires bracket notation. */}
                                <p className="pl-2">└ {SubscriptionTier.Maximum}: {subsByRoleStats[UserRole.Trainer].tiers[SubscriptionTier.Maximum]}</p>
                            </div>
                        </div>
                        <div>
                            <p className="font-semibold">{UserRole.Spectator}: {subsByRoleStats[UserRole.Spectator].total}</p>
                            <div className="text-xs text-gray-500 pl-4">
                                <p>{subsByRoleStats[UserRole.Spectator].paid} с подпиской ({subsByRoleStats[UserRole.Spectator].percentage.toFixed(1)}%)</p>
                                {/* FIX: Accessing object properties with enum values as keys requires bracket notation. */}
                                <p className="pl-2">└ {SubscriptionTier.Pro}: {subsByRoleStats[UserRole.Spectator].tiers[SubscriptionTier.Pro]}</p>
                                {/* FIX: Accessing object properties with enum values as keys requires bracket notation. */}
                                <p className="pl-2">└ {SubscriptionTier.Maximum}: {subsByRoleStats[UserRole.Spectator].tiers[SubscriptionTier.Maximum]}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-lg font-semibold text-gray-700">Всего подписок</h3>
                    <p className="text-3xl font-bold text-brand-primary mt-2">{totalSubs}</p>
                     <div className="text-sm mt-1 space-y-1 text-gray-600">
                        {/* FIX: Accessing object properties with enum values as keys requires bracket notation. */}
                        <p>{SubscriptionTier.Base}: {subsByTier[SubscriptionTier.Base]} ({totalSubs > 0 ? (subsByTier[SubscriptionTier.Base] / totalSubs * 100).toFixed(1) : 0}%)</p>
                        {/* FIX: Accessing object properties with enum values as keys requires bracket notation. */}
                        <p>{SubscriptionTier.Pro}: {subsByTier[SubscriptionTier.Pro]} ({totalSubs > 0 ? (subsByTier[SubscriptionTier.Pro] / totalSubs * 100).toFixed(1) : 0}%)</p>
                        {/* FIX: Accessing object properties with enum values as keys requires bracket notation. */}
                        <p>{SubscriptionTier.Maximum}: {subsByTier[SubscriptionTier.Maximum]} ({totalSubs > 0 ? (subsByTier[SubscriptionTier.Maximum] / totalSubs * 100).toFixed(1) : 0}%)</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-lg font-semibold text-gray-700">Общая выручка (за период)</h3>
                    <p className="text-3xl font-bold text-brand-accent mt-2">{totalRevenue.toFixed(0)} руб.</p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex flex-col md:flex-row justify-between md:items-center mb-4 gap-4">
                    <h3 className="text-lg font-semibold text-gray-700">Динамика покупок подписок</h3>
                    <div className="flex flex-wrap items-center gap-4">
                        <select
                            value={roleFilter}
                            onChange={e => setRoleFilter(e.target.value as UserRole | 'all')}
                            className="bg-white p-1.5 border border-gray-300 rounded-lg text-sm font-semibold focus:ring-brand-secondary focus:border-brand-secondary"
                        >
                            <option value="all">Все роли</option>
                            <option value={UserRole.Student}>{UserRole.Student}</option>
                            <option value={UserRole.Trainer}>{UserRole.Trainer}</option>
                            <option value={UserRole.Spectator}>{UserRole.Spectator}</option>
                        </select>
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
                </div>
                 {period === 'custom' && (
                    <div className="flex flex-wrap items-center gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
                        <label className="text-sm font-medium">С</label>
                        <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} className="p-1 border rounded-md"/>
                        <label className="text-sm font-medium">По</label>
                        <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} className="p-1 border rounded-md"/>
                    </div>
                )}
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Legend />
                        {/* FIX: Accessing object properties with enum values as keys requires bracket notation. */}
                        <Line type="monotone" dataKey={SubscriptionTier.Pro} name={SubscriptionTier.Pro} stroke={COLORS[SubscriptionTier.Pro]} strokeWidth={2} />
                        {/* FIX: Accessing object properties with enum values as keys requires bracket notation. */}
                        <Line type="monotone" dataKey={SubscriptionTier.Maximum} name={SubscriptionTier.Maximum} stroke={COLORS[SubscriptionTier.Maximum]} strokeWidth={2} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
            
             <div className="bg-white p-2 sm:p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Распределение подписок</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie data={subscriptionDistributionData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                            {subscriptionDistributionData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[entry.name as SubscriptionTier]} />
                            ))}
                        </Pie>
                        <Tooltip formatter={(value) => `${value} (${(Number(value) / totalSubs * 100).toFixed(1)}%)`} />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default SubscriptionStats;