import React, { useContext, useMemo } from 'react';
import { AuthContext, DataContext } from '../App';
import { User, UserRole, TrainingSession, SubscriptionTier } from '../types';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import AnimatedStar from './AnimatedStar';
import StaticStar from './StaticStar';

interface UserInfoModalProps {
    user: User | null;
    isOpen: boolean;
    onClose: () => void;
    onBonusesClick?: (user: User) => void;
}

const COLORS = ['#2c5282', '#2a69ac', '#4299e1', '#63b3ed', '#90cdf4', '#a0aec0'];

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-gray-50 p-4 rounded-lg flex flex-col items-center justify-center text-center h-full">
        <div className="text-brand-primary mb-2">{icon}</div>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{title}</p>
    </div>
);


const UserInfoModal: React.FC<UserInfoModalProps> = ({ user, isOpen, onClose, onBonusesClick }) => {
    const auth = useContext(AuthContext);
    const data = useContext(DataContext);

    const userDetails = useMemo(() => {
        if (!user || !auth || !data) return null;

        const { users } = auth;
        const { trainings } = data;

        const personalTrainings = trainings.filter(t => {
            const userParticipant = t.participants.find(p => p.userId === user.id);
            if (!userParticipant) return false;

            const isSoloTraining = t.participants.length === 1;
            const isUserStudentInSession = userParticipant.role === UserRole.Student;

            const isCompleted = t.status !== 'cancelled' && t.participants.every(p => p.confirmed);
            const isPast = new Date(t.date) < new Date();

            return isPast && isCompleted && (isUserStudentInSession || isSoloTraining);
        });

        const allSelfRatings = personalTrainings.flatMap(t => t.ratings?.filter(r => r.userId === user.id) || []);
        const allTrainerRatings = personalTrainings.flatMap(t =>
            t.ratings?.filter(r => {
                const participant = t.participants.find(p => p.userId === r.userId);
                return participant?.role === UserRole.Trainer;
            }) || []
        );

        const calculateAverage = (ratings: { score: number }[]) => {
            if (ratings.length === 0) return 'Н/Д';
            const sum = ratings.reduce((acc, item) => acc + item.score, 0);
            return (sum / ratings.length).toFixed(2);
        };
        
        const avgSelfRating = calculateAverage(allSelfRatings);
        const avgTrainerRating = calculateAverage(allTrainerRatings);

        const trainingTypesCount = personalTrainings.reduce((acc, t) => {
            const type = t.type || 'Свободный';
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        
        const trainingTypesData = Object.entries(trainingTypesCount).map(([name, value]) => ({ name, value }));
        
        const linkedUsers = users.filter(u => user.linkedUsers.includes(u.id) && !u.isDeleted);
        const linkedTrainers = linkedUsers.filter(u => u.role === UserRole.Trainer);
        const linkedStudents = linkedUsers.filter(u => u.role === UserRole.Student);

        return {
            totalTrainings: personalTrainings.length,
            avgSelfRating,
            avgTrainerRating,
            trainingTypesData,
            linkedTrainers,
            linkedStudents,
        };
    }, [user, auth, data]);

    if (!isOpen || !user || !userDetails) return null;

    const hasLinkedUsers = user.role === UserRole.Trainer ? userDetails.linkedStudents.length > 0 : userDetails.linkedTrainers.length > 0;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col relative" onClick={e => e.stopPropagation()}>
                {user.isDeleted && (
                    <div className="absolute top-0 left-0 right-0 p-1 bg-red-600 text-white text-center text-sm font-bold z-10 rounded-t-lg">
                        ПОЛЬЗОВАТЕЛЬ УДАЛЁН
                    </div>
                )}
                <div className={`p-4 border-b flex items-center space-x-4 flex-shrink-0 ${user.isDeleted ? 'pt-8' : ''}`}>
                    <img src={user.avatarUrl || `https://ui-avatars.com/api/?name=${user.name}+${user.surname}&background=2c5282&color=fff&size=128&rounded=true`} alt="avatar" className="w-16 h-16 rounded-full" />
                    <div className="flex-grow">
                        <h2 className="text-xl font-bold text-gray-800">{user.name} {user.surname}</h2>
                        <p className="text-sm text-gray-500">
                            {user.role} &middot; {user.city} &middot; Рег: {new Date(user.registrationDate).toLocaleDateString('ru-RU')}
                        </p>
                    </div>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700 text-3xl">&times;</button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto">
                    {user.role !== UserRole.Spectator && (
                        <>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 text-center">
                                <StatCard title="Собств. тренировок" value={userDetails.totalTrainings} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>} />
                                <StatCard title="Ср. своя оценка" value={userDetails.avgSelfRating} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>} />
                                <StatCard title="Ср. оценка тренера" value={userDetails.avgTrainerRating} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.324l5.584.545a.563.563 0 01.328.959l-4.184 3.548a.563.563 0 00-.154.543l1.236 5.348a.563.563 0 01-.844.62l-4.733-2.735a.563.563 0 00-.536 0l-4.734 2.735a.563.563 0 01-.844-.62l1.236-5.348a.563.563 0 00-.154-.543l-4.184-3.548a.563.563 0 01.328-.959l5.584-.545a.563.563 0 00.475-.324l2.125-5.111z" /></svg>} />
                                <div onClick={() => onBonusesClick && onBonusesClick(user)} className={onBonusesClick ? "cursor-pointer rounded-lg hover:bg-gray-100 transition-colors" : ""}>
                                  <StatCard title="Бонусы" value={user.bonuses || 0} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 5a3 3 0 015.252-2.121l.738.738a.75.75 0 01-1.06 1.06l-.738-.738A1.5 1.5 0 005 5zm4.748 9.252a.75.75 0 011.06-1.06l.738.738a3 3 0 01-5.252 2.121l-.738-.738a.75.75 0 011.06-1.06l.738.738A1.5 1.5 0 009.748 14.252zM10 15a5 5 0 100-10 5 5 0 000 10z" clipRule="evenodd" /></svg>} />
                                </div>
                                <div className="bg-gray-50 p-4 rounded-lg flex flex-col items-center justify-center text-center h-full">
                                    <div className="mb-2 h-6 flex items-center justify-center">
                                        {user.subscription?.tier === SubscriptionTier.Maximum && <AnimatedStar />}
                                        {user.subscription?.tier === SubscriptionTier.Pro && <StaticStar color="#c0c0c0" />}
                                    </div>
                                    <p className="text-2xl font-bold text-gray-800">{user.subscription?.tier || 'Нет'}</p>
                                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mt-1">Подписка</p>
                                    <p className="text-xs text-gray-500 mt-1">{user.subscription?.expiresAt ? `до ${new Date(user.subscription.expiresAt).toLocaleDateString('ru-RU')}` : 'Бессрочно'}</p>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-gray-700 mb-2">Распределение по типам тренировок</h3>
                                {userDetails.trainingTypesData.length > 0 ? (
                                    <div style={{ width: '100%', height: 250 }}>
                                    <ResponsiveContainer>
                                        <PieChart>
                                            <Pie data={userDetails.trainingTypesData} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="value" nameKey="name" label={(entry) => `${entry.name} (${entry.value})`}>
                                                {userDetails.trainingTypesData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    </div>
                                ) : (
                                    <p className="text-sm text-center text-gray-500 p-4 bg-gray-50 rounded-md">Нет данных о типах тренировок.</p>
                                )}
                            </div>
                        </>
                    )}

                    {user.role !== UserRole.Spectator && (
                        <div>
                            <h3 className="text-lg font-semibold text-gray-700 mb-2">
                                {user.role === UserRole.Trainer ? 'Привязанные ученики' : 'Привязанные тренеры'}
                            </h3>
                            {hasLinkedUsers ? (
                                <ul className="space-y-2">
                                    {(user.role === UserRole.Trainer ? userDetails.linkedStudents : userDetails.linkedTrainers).map(linkedUser => (
                                        <li key={linkedUser.id} className="flex items-center p-2 bg-gray-50 rounded-md">
                                            <img src={linkedUser.avatarUrl || `https://ui-avatars.com/api/?name=${linkedUser.name}+${linkedUser.surname}&background=2a69ac&color=fff`} alt="avatar" className="w-8 h-8 rounded-full mr-3" />
                                            <div>
                                                <p className="text-sm font-medium text-gray-800">{linkedUser.name} {linkedUser.surname}</p>
                                                <p className="text-xs text-gray-500">{linkedUser.city}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-center text-gray-500 p-4 bg-gray-50 rounded-md">Нет привязанных пользователей.</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserInfoModal;