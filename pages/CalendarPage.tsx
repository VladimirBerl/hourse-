

// FIX: Changed to a named export to resolve circular dependency issue.
import React, { useContext, useState, useEffect, useMemo } from 'react';
// FIX: Updated react-router-dom imports for v6, using useNavigate instead of useHistory.
import { useNavigate } from 'react-router-dom';
import { AuthContext, DataContext } from '../App';
import { TrainingSession, User, UserRole } from '../types';
import TrainingCalendar from '../components/TrainingCalendar';
import TrainingDetailsModal from '../components/TrainingDetailsModal';
import ConfirmationModal from '../components/ConfirmationModal';
import { linkify } from '../utils/textUtils';


const trainingTypes = [
    'Свободный', 'Манежная езда', 'Прыжковая работа', 'Полевая работа', 'Работа на корде/в руках'
];

const CreateTrainingModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    onSave: (data: any) => Promise<void>;
    partners: User[];
    userRole: UserRole;
}> = ({ isOpen, onClose, onSave, partners, userRole }) => {
    const [formData, setFormData] = useState({
        type: trainingTypes[0],
        date: '',
        startTime: '',
        duration: 45,
        comments: '',
        partnerId: '', // Empty string for "Самостоятельная"
    });
    const [creatorRoleForSession, setCreatorRoleForSession] = useState<UserRole>(UserRole.Trainer);
    
    useEffect(() => {
        if (!isOpen) {
            // Reset form on close
            setFormData({ type: trainingTypes[0], date: '', startTime: '', duration: 45, comments: '', partnerId: '' });
            setCreatorRoleForSession(UserRole.Trainer);
        }
    }, [isOpen]);

    if (!isOpen) return null;
    
    const selectedPartner = partners.find(p => p.id === formData.partnerId);
    const showRoleSelection = userRole === UserRole.Trainer && selectedPartner?.role === UserRole.Trainer;

    const getYesterdayDateString = () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return yesterday.toISOString().split('T')[0];
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({...prev, [name]: value }));
    };
    
    const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const numValue = parseInt(value, 10);
        setFormData(prev => ({...prev, [name]: isNaN(numValue) ? 0 : numValue }));
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!formData.date || !formData.startTime) {
            alert("Пожалуйста, укажите дату и время начала тренировки.");
            return;
        }
        const dataToSave = { ...formData, creatorRoleForSession: showRoleSelection ? creatorRoleForSession : null };
        await onSave(dataToSave);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="flex-shrink-0 p-6 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-gray-800">Создать новую тренировку</h2>
                </div>
                
                <div className="flex-grow p-6 space-y-4 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="partnerId" className="block text-sm font-medium text-gray-700">{userRole === UserRole.Student ? 'Тренер' : 'Тренер/ученик'}</label>
                            <select name="partnerId" id="partnerId" value={formData.partnerId} onChange={handleChange} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-brand-secondary focus:border-brand-secondary bg-white">
                                <option value="">Самостоятельная</option>
                                {partners.map(p => <option key={p.id} value={p.id}>{p.name} {p.surname} ({p.role})</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="type" className="block text-sm font-medium text-gray-700">Тип тренировки</label>
                            <select name="type" id="type" value={formData.type} onChange={handleChange} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-brand-secondary focus:border-brand-secondary bg-white">
                                 {trainingTypes.map(type => <option key={type} value={type}>{type}</option>)}
                            </select>
                        </div>
                    </div>

                    {showRoleSelection && (
                        <div className="p-3 bg-gray-50 rounded-md border">
                             <label className="block text-sm font-medium text-gray-700 mb-2">Ваша роль в этой тренировке:</label>
                             <div className="flex justify-center space-x-4">
                                <button type="button" onClick={() => setCreatorRoleForSession(UserRole.Trainer)} className={`px-6 py-2 rounded-lg font-semibold border-2 transition-colors w-1/2 ${creatorRoleForSession === UserRole.Trainer ? 'bg-brand-primary text-white border-brand-primary' : 'bg-white text-gray-700 border-gray-300 hover:border-brand-secondary'}`}>
                                    {UserRole.Trainer}
                                </button>
                                <button type="button" onClick={() => setCreatorRoleForSession(UserRole.Student)} className={`px-6 py-2 rounded-lg font-semibold border-2 transition-colors w-1/2 ${creatorRoleForSession === UserRole.Student ? 'bg-brand-primary text-white border-brand-primary' : 'bg-white text-gray-700 border-gray-300 hover:border-brand-secondary'}`}>
                                    {UserRole.Student}
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="date" className="block text-sm font-medium text-gray-700">Дата <span className="text-red-500">*</span></label>
                             <input 
                                type="date" 
                                name="date" 
                                id="date" 
                                value={formData.date} 
                                onChange={handleChange} 
                                required 
                                min={getYesterdayDateString()} 
                                className="mt-1 w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-brand-secondary focus:border-brand-secondary text-lg cursor-pointer"
                            />
                        </div>
                        <div>
                            <label htmlFor="startTime" className="block text-sm font-medium text-gray-700">Время начала <span className="text-red-500">*</span></label>
                            <input 
                                type="time" 
                                name="startTime" 
                                id="startTime" 
                                value={formData.startTime} 
                                onChange={handleChange} 
                                required 
                                className="mt-1 w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-brand-secondary focus:border-brand-secondary text-lg cursor-pointer"
                            />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="duration" className="block text-sm font-medium text-gray-700">Продолжительность (в минутах)</label>
                        <div className="mt-1 flex items-center space-x-2">
                           <button type="button" onClick={() => setFormData(prev => ({...prev, duration: Math.max(10, prev.duration - 5)}))} className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-lg font-bold text-gray-700 bg-gray-50 hover:bg-gray-100">-5</button>
                            <input 
                                type="number" 
                                name="duration" 
                                id="duration" 
                                value={formData.duration} 
                                onChange={handleNumberChange} 
                                min="10" 
                                step="5" 
                                className="w-24 text-center px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-brand-secondary focus:border-brand-secondary" 
                            />
                            <button type="button" onClick={() => setFormData(prev => ({...prev, duration: prev.duration + 5}))} className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-lg font-bold text-gray-700 bg-gray-50 hover:bg-gray-100">+5</button>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="comments" className="block text-sm font-medium text-gray-700">Комментарий</label>
                        <textarea name="comments" id="comments" value={formData.comments} onChange={handleChange} rows={3} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-brand-secondary focus:border-brand-secondary" placeholder="План на тренировку, заметки..."></textarea>
                    </div>
                </div>

                <div className="flex-shrink-0 p-6 border-t border-gray-200 flex justify-end space-x-3">
                    <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300">Отмена</button>
                    <button type="submit" className="bg-brand-primary text-white px-4 py-2 rounded-md hover:bg-brand-secondary">Создать</button>
                </div>
            </form>
        </div>
    );
};

const TrainingFeedbackModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    training: TrainingSession | null;
    onSave: (trainingId: string, feedback: { ratings: { userId: string; score: number }[] }) => Promise<void>;
}> = ({ isOpen, onClose, training, onSave }) => {
    const auth = useContext(AuthContext);
    const [selectedRating, setSelectedRating] = useState<number | null>(null);

    useEffect(() => {
        if (!isOpen) {
            setSelectedRating(null);
        }
    }, [isOpen]);

    if (!isOpen || !training || !auth?.user) return null;
    
    const { user } = auth;

    const userRoleInSession = training.participants.find(p => p.userId === user.id)?.role;
    const isTrainerRatingStudent = userRoleInSession === UserRole.Trainer && training.participants.length > 1;
    const isSoloTraining = training.participants.length === 1;

    const feedbackPrompt = isTrainerRatingStudent
        ? "Пожалуйста, объективно оцените работу ученика. Эта оценка поможет отслеживать его прогресс в будущем."
        : `Выберите общую оценку для тренировки от ${new Date(training.date).toLocaleDateString('ru-RU')}.`;


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedRating === null) return;
        
        const newRating = { userId: user.id, score: selectedRating };
        const otherRatings = training.ratings?.filter(r => r.userId !== user.id) || [];
        const updatedRatings = [...otherRatings, newRating];
        
        await onSave(training.id, { ratings: updatedRatings });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Оценить тренировку</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <p className="text-sm text-gray-600">
                        {isSoloTraining
                            ? `Выберите общую оценку для тренировки от ${new Date(training.date).toLocaleDateString('ru-RU')}.`
                            : feedbackPrompt
                        }
                    </p>
                    
                    <div className="flex justify-center items-center space-x-1 sm:space-x-2">
                        {Array.from({ length: 10 }, (_, i) => i + 1).map(score => (
                             <button
                                type="button"
                                key={score}
                                onClick={() => setSelectedRating(score)}
                                className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-lg font-bold border-2 transition-all duration-200 transform hover:scale-110
                                    ${selectedRating === score 
                                        ? 'bg-brand-primary border-brand-primary text-white shadow-lg scale-110' 
                                        : 'bg-white border-gray-300 text-gray-700 hover:border-brand-secondary'
                                    }`
                                }
                            >
                                {score}
                            </button>
                        ))}
                    </div>

                    <div className="mt-8 flex justify-end space-x-3">
                        <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300">Отмена</button>
                        <button type="submit" disabled={selectedRating === null} className="bg-brand-primary text-white px-4 py-2 rounded-md hover:bg-brand-secondary disabled:bg-gray-400 disabled:cursor-not-allowed">
                            Сохранить
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


type Tab = 'future' | 'past' | 'cancelled';

export const CalendarPage: React.FC = () => {
    const auth = useContext(AuthContext);
    const data = useContext(DataContext);
    // FIX: Using useNavigate for react-router-dom v6.
    const navigate = useNavigate();
    const [isCreateModalOpen, setCreateModalOpen] = useState(false);
    const [isDetailsModalOpen, setDetailsModalOpen] = useState(false);
    const [selectedDateForModal, setSelectedDateForModal] = useState<Date | null>(null);
    const [trainingsForModal, setTrainingsForModal] = useState<TrainingSession[]>([]);
    const [activeTab, setActiveTab] = useState<Tab>('future');
    const [confirmCancelModalOpen, setConfirmCancelModalOpen] = useState(false);
    const [trainingToCancel, setTrainingToCancel] = useState<string | null>(null);
    const [isFeedbackModalOpen, setFeedbackModalOpen] = useState(false);
    const [trainingToRate, setTrainingToRate] = useState<TrainingSession | null>(null);
    const [confirmDeleteModalOpen, setConfirmDeleteModalOpen] = useState(false);
    const [trainingToDelete, setTrainingToDelete] = useState<string | null>(null);

    if (!auth || !auth.user || !data) return <div>Загрузка...</div>;
    const { user, users } = auth;
    const { trainings, addTraining, updateTraining, conversations, findOrCreateConversation, deleteTraining } = data;

    // This logic ensures that trainer-trainer sessions have distinct roles for this session,
    // which is crucial for displaying correct rating colors and stats.
    const correctedTrainings: TrainingSession[] = useMemo(() => {
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

    const userTrainings = correctedTrainings.filter(t => {
        const isParticipant = t.participants.some(p => p.userId === user.id);
        const isHidden = t.hiddenBy?.includes(user.id);
        return isParticipant && !isHidden;
    });
    const linkedPartners = users.filter(u => user.linkedUsers.includes(u.id) && !u.isDeleted);


    const handleDateClick = (date: Date) => {
        const trainingsOnDate = userTrainings.filter(t => new Date(t.date).toDateString() === date.toDateString() && t.status !== 'cancelled');
        setTrainingsForModal(trainingsOnDate);
        setSelectedDateForModal(date);
        setDetailsModalOpen(true);
    };

    const handleTrainingResponse = async (trainingId: string, accept: boolean) => {
        const training = trainings.find(t => t.id === trainingId);
        if (!training) return;

        if (accept) {
            const updatedParticipants = training.participants.map(p => p.userId === user.id ? { ...p, confirmed: true } : p);
            await updateTraining(trainingId, { participants: updatedParticipants });
        } else {
            await updateTraining(trainingId, { status: 'cancelled' });
        }
    };
    
    const handleCancelClick = (trainingId: string) => {
        setTrainingToCancel(trainingId);
        setConfirmCancelModalOpen(true);
    };

    const confirmCancelTraining = async () => {
        if (trainingToCancel) {
            await updateTraining(trainingToCancel, { status: 'cancelled' });
            setTrainingToCancel(null);
            setConfirmCancelModalOpen(false);
        }
    };
    
    const handleDeleteClick = (trainingId: string) => {
        setTrainingToDelete(trainingId);
        setConfirmDeleteModalOpen(true);
    };

    const confirmDeleteTraining = async () => {
        if (trainingToDelete) {
            const training = trainings.find(t => t.id === trainingToDelete);
            if (training) {
                const hiddenBy = Array.from(new Set([...(training.hiddenBy || []), user.id]));
                await updateTraining(trainingToDelete, { hiddenBy });
            }
            setTrainingToDelete(null);
            setConfirmDeleteModalOpen(false);
        }
    };

    const handleRateClick = (training: TrainingSession) => {
        setTrainingToRate(training);
        setFeedbackModalOpen(true);
    };

    const handleSaveFeedback = async (trainingId: string, feedback: { ratings: { userId: string; score: number }[] }) => {
        await updateTraining(trainingId, feedback);
    };

    const getTrainingDateTime = (t: TrainingSession) => {
        const datePart = t.date.split('T')[0];
        return new Date(`${datePart}T${t.startTime}`);
    }
    
    const now = new Date();

    const futureTrainings = userTrainings.filter(t => getTrainingDateTime(t) >= now && t.status !== 'cancelled').sort((a,b) => getTrainingDateTime(a).getTime() - getTrainingDateTime(b).getTime());
    const pastTrainings = userTrainings.filter(t => getTrainingDateTime(t) < now && t.status !== 'cancelled').sort((a,b) => getTrainingDateTime(b).getTime() - getTrainingDateTime(a).getTime());
    const cancelledTrainings = userTrainings.filter(t => t.status === 'cancelled').sort((a,b) => getTrainingDateTime(b).getTime() - getTrainingDateTime(a).getTime());

    const hasUnratedPastTrainings = useMemo(() => {
        return pastTrainings.some(training => {
            const userRating = training.ratings?.find(r => r.userId === user.id);
            const isSoloTraining = training.participants.length === 1;
            const isFullyConfirmed = training.participants.every(p => p.confirmed);
            return !userRating && (isSoloTraining || isFullyConfirmed);
        });
    }, [pastTrainings, user.id]);

    const trainingsToShow = {
        future: futureTrainings,
        past: pastTrainings,
        cancelled: cancelledTrainings,
    }[activeTab];

    const TrainingListItem: React.FC<{ training: TrainingSession }> = ({ training }) => {
        const partnerParticipant = training.participants.find(p => p.userId !== user.id);
        const partner = partnerParticipant ? users.find(u => u.id === partnerParticipant.userId) : null;
        const isPendingCurrentUser = training.participants.some(p => p.userId === user.id && !p.confirmed);
        const isFullyConfirmed = training.participants.every(p => p.confirmed);
        const isSoloTraining = training.participants.length === 1;
        const isUnconfirmedByPartner = !isPendingCurrentUser && !isFullyConfirmed && !!partner;
        const userRating = training.ratings?.find(r => r.userId === user.id);
        const isRateable = activeTab === 'past' && !userRating && (isSoloTraining || isFullyConfirmed);
        
        const partnerRatingInfo = training.ratings?.map(rating => {
            if (rating.userId === user.id) return null;
            const ratingUser = users.find(u => u.id === rating.userId);
            if (!ratingUser) return null;
            const ratingUserRoleInSession = training.participants.find(p => p.userId === rating.userId)?.role;
            return {
                score: rating.score,
                name: `${ratingUser.name} ${ratingUser.surname}`,
                role: ratingUserRoleInSession || ratingUser.role,
                isDeleted: ratingUser.isDeleted,
            };
        }).filter(Boolean)[0];

        const handleWriteClick = async () => {
            if (!partner || !findOrCreateConversation) return;
        
            const existingConvo = conversations.find(c => 
                c.participantIds.length === 2 &&
                c.participantIds.includes(user.id) &&
                c.participantIds.includes(partner.id)
            );
        
            if (existingConvo) {
                navigate('/chat', { state: { openChatId: existingConvo.id } });
            } else {
                const newConversation = await findOrCreateConversation(partner.id);
                if (newConversation) {
                    navigate('/chat', { state: { openChatId: newConversation.id } });
                }
            }
        };

        const writeButton = partner && !partner.isDeleted ? (
            <button 
                onClick={handleWriteClick} 
                className="bg-brand-secondary text-white px-3 py-1 rounded-md text-sm font-semibold hover:bg-brand-primary transition"
            >
                Написать
            </button>
        ) : null;

        let actionContent = null;
        
        if (activeTab === 'cancelled') {
            actionContent = (
                <button onClick={() => handleDeleteClick(training.id)} className="bg-brand-danger text-white px-3 py-1 rounded-md text-sm font-semibold hover:bg-red-700 transition">Удалить</button>
            );
        } else if (isPendingCurrentUser) {
            actionContent = (
                <>
                    <span className="text-sm text-yellow-800 flex-grow">Требуется ваше подтверждение</span>
                    {partner && writeButton}
                    <button onClick={() => handleTrainingResponse(training.id, true)} className="bg-brand-accent text-white px-3 py-1 rounded-md text-sm font-semibold hover:bg-green-600 transition">Принять</button>
                    <button onClick={() => handleCancelClick(training.id)} className="bg-brand-danger text-white px-3 py-1 rounded-md text-sm font-semibold hover:bg-red-700 transition">Отклонить</button>
                </>
            );
        } else if (activeTab === 'past') {
            if (isRateable) {
                 actionContent = (
                    <div className="relative">
                        <button onClick={() => handleRateClick(training)} className="bg-brand-secondary text-white px-4 py-1.5 rounded-md text-sm font-semibold hover:bg-brand-primary transition">Оценить</button>
                        <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                        </span>
                    </div>
                );
            } else if (!isSoloTraining && !isFullyConfirmed) {
                 actionContent = <span className="text-sm text-gray-500 italic">Ожидание подтверждения от партнера</span>;
            }
        } else if (activeTab === 'future') {
            actionContent = (
                <>
                    {partner && writeButton}
                    <button onClick={() => handleCancelClick(training.id)} className="bg-brand-danger text-white px-3 py-1 rounded-md text-sm font-semibold hover:bg-red-700 transition">Отменить</button>
                </>
            );
        }
        
        const getRatingColorClass = (raterRoleInSession: UserRole, isSolo: boolean) => {
            // A trainer's self-assessment in a solo training is blue.
            if (raterRoleInSession === UserRole.Trainer && isSolo) {
                return 'bg-blue-100 text-blue-800';
            }
            // A trainer's assessment of a student is green.
            if (raterRoleInSession === UserRole.Trainer) {
                return 'bg-green-100 text-green-800';
            }
            // A student's self-assessment is blue.
            return 'bg-blue-100 text-blue-800';
        };

        const myRoleInSession = training.participants.find(p => p.userId === user.id)?.role;

        return (
            <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="font-bold text-lg text-brand-primary">{training.type || 'Тренировка'}</p>
                        <p className="text-sm text-gray-600">
                            {new Date(training.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}, {training.startTime}, {training.duration} мин.
                        </p>
                        <p className="text-sm text-gray-500">{partner ? `${partnerParticipant?.role}: ${partner.name} ${partner.surname}` : 'Самостоятельная'} {partner?.isDeleted && <span className="text-red-500 font-semibold">(удалён)</span>}</p>
                    </div>
                     {(isUnconfirmedByPartner || (isPendingCurrentUser && partner)) && activeTab === 'future' && (
                         <span className="text-xs font-bold text-yellow-600 bg-yellow-100 px-2 py-1 rounded-full">
                            ОЖИДАЕТ ПОДТВЕРЖДЕНИЯ
                        </span>
                    )}
                </div>
                 {training.comments && <div className="mt-2 text-sm text-gray-600 italic bg-gray-50 p-2 rounded-md" dangerouslySetInnerHTML={{ __html: `"${linkify(training.comments)}"` }} />}
                {(userRating || partnerRatingInfo) && (
                    <div className="mt-3 pt-3 border-t border-gray-200 text-sm space-y-2">
                        {userRating && myRoleInSession && (
                            <div className={`p-2 rounded-md ${getRatingColorClass(myRoleInSession, isSoloTraining)}`}>
                                <strong>Моя оценка:</strong> <span className="font-bold text-lg">{userRating.score}</span>
                            </div>
                        )}
                        {partnerRatingInfo && (
                             <div className={`p-2 rounded-md ${getRatingColorClass(partnerRatingInfo.role, false)}`}>
                                <strong>
                                     {`Оценка (${partnerRatingInfo.name})`}:
                                </strong> <span className="font-bold text-lg">{partnerRatingInfo.score}</span>
                                {partnerRatingInfo.isDeleted && <span className="text-red-500 font-semibold text-xs ml-2">(удалён)</span>}
                            </div>
                        )}
                    </div>
                )}
                 {actionContent && (
                    <div className={`mt-3 ${userRating || partnerRatingInfo ? '' : 'pt-3 border-t border-gray-200'}`}>
                        <div className="flex items-center justify-end flex-wrap gap-2 min-h-[28px]">
                            {actionContent}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const TabButton: React.FC<{ tab: Tab; label: string; hasNotification?: boolean }> = ({ tab, label, hasNotification }) => (
        <button
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-sm font-semibold text-center border-b-2 transition-colors ${
                activeTab === tab 
                ? 'border-brand-primary text-brand-primary' 
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
        >
            <div className="relative inline-flex items-center">
                {label}
                {hasNotification && (
                    <span className="absolute -top-1 -right-3 flex h-2 w-2">
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                )}
            </div>
        </button>
    );

    return (
        <div className="space-y-6">
             <CreateTrainingModal isOpen={isCreateModalOpen} onClose={() => setCreateModalOpen(false)} onSave={addTraining} partners={linkedPartners} userRole={user.role} />
             <TrainingDetailsModal 
                isOpen={isDetailsModalOpen} 
                onClose={() => setDetailsModalOpen(false)} 
                date={selectedDateForModal} 
                trainings={trainingsForModal}
             />
             <ConfirmationModal
                isOpen={confirmCancelModalOpen}
                onClose={() => setConfirmCancelModalOpen(false)}
                onConfirm={confirmCancelTraining}
                title="Подтвердить отмену"
                message="Вы уверены, что хотите отменить эту тренировку? Это действие нельзя будет отменить."
            />
            <ConfirmationModal
                isOpen={confirmDeleteModalOpen}
                onClose={() => setConfirmDeleteModalOpen(false)}
                onConfirm={confirmDeleteTraining}
                title="Подтвердить удаление"
                message="Вы уверены, что хотите удалить эту запись о тренировке? Это действие нельзя будет отменить."
            />
            <TrainingFeedbackModal 
                isOpen={isFeedbackModalOpen}
                onClose={() => setFeedbackModalOpen(false)}
                training={trainingToRate}
                onSave={handleSaveFeedback}
            />
            
            <div className="flex justify-end items-center">
                <button type="button" onClick={() => setCreateModalOpen(true)} className="bg-brand-primary text-white font-semibold px-4 py-2 rounded-lg shadow hover:bg-brand-secondary transition-colors flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" /></svg>
                    Запланировать
                </button>
            </div>

             <div className="bg-white p-6 rounded-lg shadow-md">
                <TrainingCalendar trainings={userTrainings} onDateClick={handleDateClick} />
            </div>

            <div>
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                        <TabButton tab="future" label="Предстоящие" hasNotification={futureTrainings.some(t => t.participants.some(p => p.userId === user.id && !p.confirmed))} />
                        <TabButton tab="past" label="Прошедшие" hasNotification={hasUnratedPastTrainings} />
                        <TabButton tab="cancelled" label="Отмененные" />
                    </nav>
                </div>
                <div className="mt-6 space-y-4">
                    {trainingsToShow.length > 0 ? (
                        trainingsToShow.map(t => <TrainingListItem key={t.id} training={t} />)
                    ) : (
                        <div className="text-center text-gray-500 py-10 bg-white rounded-lg shadow-sm">
                            <p>Нет тренировок в этом разделе.</p>
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
};
