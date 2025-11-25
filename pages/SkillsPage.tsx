import React, { useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext, DataContext } from '../App';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { UserRole, TrainingSession, SubscriptionTier } from '../types';

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const myScore = payload.find((p: any) => p.dataKey === 'Моя оценка')?.value;
      const trainerScore = payload.find((p: any) => p.dataKey === 'Оценка тренера')?.value;
      const displayLabel = label ? String(label).split('#')[0] : '';
  
      return (
        <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg text-sm">
          <p className="font-bold mb-2">{`Дата: ${displayLabel}`}</p>
          {myScore !== undefined && myScore !== null && <p style={{ color: '#2c5282' }}>{`Моя оценка: ${myScore}`}</p>}
          {trainerScore !== undefined && trainerScore !== null && <p style={{ color: '#38a169' }}>{`Оценка тренера: ${trainerScore}`}</p>}
        </div>
      );
    }
  
    return null;
  };

// FIX: Changed to a named export to resolve a circular dependency with App.tsx, which was causing type inference issues.
export const SkillsPage: React.FC = () => {
    const auth = useContext(AuthContext);
    const data = useContext(DataContext);
    const navigate = useNavigate();

    if (!auth || !auth.user || !data) return <div>Загрузка...</div>;

    const { user, users } = auth;
    const { trainings } = data;

    if (user.subscription?.tier === SubscriptionTier.Base) {
        return (
            <div className="relative h-[calc(100vh-10rem)]">
                <div className="filter blur-lg pointer-events-none opacity-50">
                    {/* Placeholder for blurred content */}
                    <div className="space-y-6">
                        <div className="bg-white p-4 rounded-lg shadow-md h-40 animate-pulse"></div>
                        <h2 className="text-2xl font-bold text-gray-400 pt-4">Динамика оценок</h2>
                        <div className="bg-white p-6 rounded-lg shadow-md h-96 animate-pulse"></div>
                        <div className="bg-white p-6 rounded-lg shadow-md h-96 animate-pulse"></div>
                    </div>
                </div>
                <div className="absolute inset-0 bg-white/30 flex flex-col items-center justify-center text-center p-4 rounded-lg">
                    <div className="bg-white/80 backdrop-blur-sm p-8 rounded-xl shadow-lg">
                        <h3 className="text-2xl font-bold text-gray-800">Полная статистика доступна на тарифах 'Про' и 'Максимум'.</h3>
                        <p className="text-gray-600 mt-2 mb-6">Получите доступ к подробной аналитике вашего прогресса.</p>
                        <button 
                            onClick={() => navigate('/dashboard', { state: { openSubscriptionModal: true } })}
                            className="bg-brand-accent text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-green-600 transition-transform transform hover:scale-105"
                        >
                            Улучшить подписку
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Correct the roles in trainer-trainer sessions before processing.
    const correctedTrainings: TrainingSession[] = useMemo(() => {
        // FIX: Add a guard to prevent errors when `trainings` is inferred as `unknown` due to a circular dependency.
        if (!Array.isArray(trainings)) {
            return [];
        }
        return trainings.map((t: TrainingSession) => {
            if (t.participants.length !== 2) return t;

            const user1 = users.find(u => u.id === t.participants[0].userId);
            const user2 = users.find(u => u.id === t.participants[1].userId);

            if (!user1 || !user2 || user1.role !== UserRole.Trainer || user2.role !== UserRole.Trainer) {
                return t;
            }

            const authorParticipant = t.participants.find(p => p.userId === t.authorId);
            const partnerParticipant = t.participants.find(p => p.userId !== t.authorId);

            if (!authorParticipant || !partnerParticipant) return t;

            const correctedPartnerRole = authorParticipant.role === UserRole.Trainer ? UserRole.Student : UserRole.Trainer;

            if (partnerParticipant.role === correctedPartnerRole) return t;

            return {
                ...t,
                participants: t.participants.map(p => 
                    p.userId === partnerParticipant.userId ? { ...p, role: correctedPartnerRole } : p
                ),
            };
        });
    }, [trainings, users]);

    const userPastTrainings: TrainingSession[] = useMemo(() => {
        const now = new Date();
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(now.getFullYear() - 1);

        // FIX: Add a guard to prevent errors when `correctedTrainings` is inferred as `unknown` due to a circular dependency.
        if (!Array.isArray(correctedTrainings)) {
            return [];
        }
        return correctedTrainings
            // FIX: Add explicit type to lambda parameter to fix type inference issues.
            .filter((t: TrainingSession) => {
                const trainingDate = new Date(`${t.date.split('T')[0]}T${t.startTime}`);
                const isPast = trainingDate < now;
                const isWithinLastYear = trainingDate >= oneYearAgo;
                const isParticipant = t.participants.some(p => p.userId === user.id);
                const isConfirmed = t.participants.every(p => p.confirmed);
                const isNotCancelled = t.status !== 'cancelled';
                
                return isPast && isWithinLastYear && isParticipant && isConfirmed && isNotCancelled;
            })
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [correctedTrainings, user.id]);

    const trainingsAsStudent: TrainingSession[] = useMemo(() => {
        // FIX: Add a guard to prevent errors when `userPastTrainings` is inferred as `unknown` due to a circular dependency.
        if (!Array.isArray(userPastTrainings)) {
            return [];
        }
        // FIX: Add explicit type to lambda parameter to fix type inference issues.
        return userPastTrainings.filter((t: TrainingSession) => {
            const userParticipant = t.participants.find(p => p.userId === user.id);
            return userParticipant?.role === UserRole.Student || t.participants.length === 1;
        });
    }, [userPastTrainings, user.id]);
    
    const trainingsAsStudentCount = useMemo(() => {
        if (user.role !== UserRole.Trainer) return 0;
        // FIX: Add a guard to prevent errors when `userPastTrainings` is inferred as `unknown` due to a circular dependency.
        if (!Array.isArray(userPastTrainings)) {
            return 0;
        }
        // FIX: Add explicit type to lambda parameter to fix type inference issues.
        return userPastTrainings.filter((t: TrainingSession) => {
            const userParticipant = t.participants.find(p => p.userId === user.id);
            return userParticipant?.role === UserRole.Student;
        }).length;
    }, [userPastTrainings, user.id, user.role]);
    
    const conductedTrainingsCount = useMemo(() => {
        if (user.role !== UserRole.Trainer) return 0;
        // FIX: Add a guard to prevent errors when `userPastTrainings` is inferred as `unknown` due to a circular dependency.
        if (!Array.isArray(userPastTrainings)) {
            return 0;
        }
        // FIX: Add explicit type to lambda parameter to fix type inference issues.
        return userPastTrainings.filter((t: TrainingSession) => {
            const userParticipant = t.participants.find(p => p.userId === user.id);
            return userParticipant?.role === UserRole.Trainer;
        }).length;
    }, [userPastTrainings, user.id, user.role]);

    const calculateAverage = (ratings: { score: number }[]) => {
        // FIX: Add a guard to prevent errors when `ratings` is not an array.
        if (!Array.isArray(ratings) || ratings.length === 0) return 'Н/Д';
        const sum = ratings.reduce((acc, item) => acc + item.score, 0);
        return (sum / ratings.length).toFixed(2);
    };
    
    const allSelfRatings = useMemo(() => {
        // FIX: Add a guard to prevent errors when `trainingsAsStudent` is inferred as `unknown` due to a circular dependency.
        if (!Array.isArray(trainingsAsStudent)) {
            return [];
        }
        // FIX: Add explicit type to lambda parameter to fix type inference issues.
        return trainingsAsStudent.reduce((acc, t: TrainingSession) => acc.concat(t.ratings?.filter(r => r.userId === user.id) || []), [] as { userId: string; score: number }[]);
    }, [trainingsAsStudent, user.id]);
    const allTrainerRatings = useMemo(() => {
        // FIX: Add a guard to prevent errors when `trainingsAsStudent` is inferred as `unknown` due to a circular dependency.
        if (!Array.isArray(trainingsAsStudent)) {
            return [];
        }
        // FIX: Add explicit type to lambda parameter to fix type inference issues.
        return trainingsAsStudent.reduce((acc, t: TrainingSession) => {
            const trainerInSession = t.participants.find(p => p.role === UserRole.Trainer && p.userId !== user.id);
            if (!trainerInSession) return acc;
            return acc.concat(t.ratings?.filter(r => r.userId === trainerInSession.userId) || []);
        }, [] as { userId: string; score: number }[]);
    }, [trainingsAsStudent, user.id]);
    
    const overallAverageSelf = calculateAverage(allSelfRatings);
    const overallAverageTrainer = calculateAverage(allTrainerRatings);

    const trainingsByType = useMemo(() => {
        // FIX: Add a guard to prevent errors when `trainingsAsStudent` is inferred as `unknown` due to a circular dependency.
        if (!Array.isArray(trainingsAsStudent)) {
            return {};
        }
        const groups: { [key: string]: TrainingSession[] } = {};
        for (const training of trainingsAsStudent) {
            const type = training.type || 'Свободный';
            if (!groups[type]) {
                groups[type] = [];
            }
            groups[type].push(training);
        }
        return groups;
    }, [trainingsAsStudent]);

    const SummaryCard: React.FC = () => {
         return (
            <div className="bg-white p-4 rounded-lg shadow-md">
                 <div className="flex flex-col sm:flex-row justify-around items-center divide-y sm:divide-y-0 sm:divide-x">
                    {user.role === UserRole.Trainer ? (
                        <>
                            <div className="w-full sm:w-1/2 p-4 text-center">
                                <p className="text-gray-500 text-sm font-medium">Тренировок как ученик</p>
                                <p className="text-4xl font-bold text-brand-primary mt-1">{trainingsAsStudentCount}</p>
                                <div className="flex flex-col sm:flex-row justify-center items-center sm:space-x-4 mt-2 text-sm">
                                    <p><span className="font-semibold text-blue-600">Моя ср. оценка (всего):</span> {overallAverageSelf}</p>
                                    <p><span className="font-semibold text-green-600">Ср. от тренера (всего):</span> {overallAverageTrainer}</p>
                                </div>
                            </div>
                            <div className="w-full sm:w-1/2 p-4 text-center">
                                <p className="text-gray-500 text-sm font-medium">Провёл тренировок</p>
                                <p className="text-4xl font-bold text-gray-700 mt-1">{conductedTrainingsCount}</p>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="w-full sm:w-1/2 p-4 text-center">
                                <p className="text-gray-500 text-sm font-medium">Всего тренировок</p>
                                <p className="text-4xl font-bold text-brand-primary mt-1">{trainingsAsStudent.length}</p>
                            </div>
                            <div className="w-full sm:w-1/2 p-4 text-center">
                                <p className="text-gray-500 text-sm font-medium">Общая средняя оценка</p>
                                <div className="flex flex-col sm:flex-row justify-center items-center sm:space-x-4 mt-2">
                                    <p className="text-lg font-bold"><span className="text-blue-600">Моя:</span> {overallAverageSelf}</p>
                                    <p className="text-lg font-bold"><span className="text-green-600">От тренера:</span> {overallAverageTrainer}</p>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    }


    return (
        <div className="space-y-6">
            <SummaryCard />

            <h2 className="text-2xl font-bold text-gray-800 pt-4">Динамика оценок по типам тренировок</h2>

            {/* @ts-ignore */}
            {Object.keys(trainingsByType).length > 0 && Array.isArray(trainingsAsStudent) && trainingsAsStudent.length > 0 ? Object.entries(trainingsByType).map(([type, typeTrainings]) => {
                {/* FIX: Add Array.isArray guard to fix type inference issues from circular dependency. */}
                 if (!Array.isArray(typeTrainings) || typeTrainings.length < 1) return null;

                 const chartData = typeTrainings.map(t => {
                     const selfRating = t.ratings?.find(r => r.userId === user.id)?.score;
                     
                     const trainerParticipant = t.participants.find(p => p.role === UserRole.Trainer && p.userId !== user.id);
                     const trainerRating = trainerParticipant 
                         ? t.ratings?.find(r => r.userId === trainerParticipant.userId)?.score
                         : null;
                    
                     const dateLabel = new Date(t.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });

                     return {
                         uniqueDateKey: `${dateLabel}#${t.id}`,
                         'Моя оценка': selfRating,
                         'Оценка тренера': trainerRating,
                     };
                 });

                 const typeSelfRatings = typeTrainings.reduce((acc, t) => acc.concat(t.ratings?.filter(r => r.userId === user.id) || []), [] as { userId: string; score: number }[]);
                 const typeTrainerRatings = typeTrainings.reduce((acc, t) => {
                     const trainerInSession = t.participants.find(p => p.role === UserRole.Trainer && p.userId !== user.id);
                     if (!trainerInSession) return acc;
                     return acc.concat(t.ratings?.filter(r => r.userId === trainerInSession.userId) || []);
                 }, [] as { userId: string; score: number }[]);

                 const avgSelf = calculateAverage(typeSelfRatings);
                 const avgTrainer = calculateAverage(typeTrainerRatings);
                 
                 const hasDataForChart = chartData.some(d => d['Моя оценка'] !== undefined || d['Оценка тренера'] !== null);
                 if (!hasDataForChart) return null;

                 return (
                     <div key={type} className="bg-white p-6 rounded-lg shadow-md">
                         <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4">
                            <h3 className="text-xl font-semibold text-gray-700">{type}</h3>
                            <div className="flex items-center space-x-4 mt-2 sm:mt-0 text-sm">
                                <p>Средняя (моя): <span className="font-bold text-blue-600">{avgSelf}</span></p>
                                <p>Средняя (тренер): <span className="font-bold text-green-600">{avgTrainer}</span></p>
                            </div>
                         </div>
                        <div style={{ height: '350px' }}>
                             <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                     <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis 
                                        dataKey="uniqueDateKey" 
                                        tickFormatter={(tick) => String(tick).split('#')[0]}
                                        interval="preserveStartEnd"
                                    />
                                    <YAxis domain={[1, 10]} width={30} ticks={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}/>
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend />
                                    <Line type="monotone" dataKey="Моя оценка" stroke="#2c5282" strokeWidth={2} activeDot={{ r: 8 }} connectNulls />
                                    <Line type="monotone" dataKey="Оценка тренера" stroke="#38a169" strokeWidth={2} activeDot={{ r: 8 }} connectNulls />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                 );
            }) : (
                 <div className="bg-white p-6 rounded-lg shadow-md">
                    <p className="text-gray-500 text-center py-10">Недостаточно данных для построения графиков. Оцените как минимум одну подтвержденную тренировку.</p>
                </div>
            )}
        </div>
    );
};
