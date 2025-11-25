

import React, { useContext, useState } from 'react';
import { TrainingSession, User, UserRole, Skill } from '../types';
import { AuthContext, DataContext } from '../App';
import ConfirmationModal from './ConfirmationModal';

interface TrainingDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    date: Date | null;
    trainings: TrainingSession[];
}

const TrainingDetailsModal: React.FC<TrainingDetailsModalProps> = ({ isOpen, onClose, date, trainings }) => {
    const auth = useContext(AuthContext);
    const data = useContext(DataContext);
    const [confirmModalOpen, setConfirmModalOpen] = useState(false);
    const [trainingAction, setTrainingAction] = useState<{ id: string, accept: boolean } | null>(null);


    if (!isOpen || !date || !auth?.user || !data) return null;

    const { user: currentUser, users } = auth;
    const { skills, updateTraining } = data;

    const sortedTrainings = [...trainings].sort((a, b) => a.startTime.localeCompare(b.startTime));
    
    const handleTrainingResponseClick = (trainingId: string, accept: boolean) => {
        if (!accept) { // Only show confirmation for rejection
            setTrainingAction({ id: trainingId, accept });
            setConfirmModalOpen(true);
        } else {
            handleTrainingResponse(trainingId, accept);
        }
    };
    
    const confirmTrainingResponse = () => {
        if (trainingAction) {
            handleTrainingResponse(trainingAction.id, trainingAction.accept);
        }
        setTrainingAction(null);
        setConfirmModalOpen(false);
    };

    const handleTrainingResponse = async (trainingId: string, accept: boolean) => {
        const training = trainings.find(t => t.id === trainingId);
        if (!training) return;

        if (accept) {
            const updatedParticipants = training.participants.map(p => p.userId === currentUser.id ? { ...p, confirmed: true } : p);
            await updateTraining(trainingId, { participants: updatedParticipants });
        } else {
            await updateTraining(trainingId, { status: 'cancelled' });
        }
    };


    const TrainingItem: React.FC<{ training: TrainingSession }> = ({ training }) => {
        const partnerParticipant = training.participants.find(p => p.userId !== currentUser.id);
        const partner = partnerParticipant ? users.find(u => u.id === partnerParticipant.userId) : null;
        const isPendingCurrentUserConfirmation = training.participants.some(p => p.userId === currentUser.id && !p.confirmed);

        return (
             <div className="p-4 bg-blue-50 border-l-4 border-brand-secondary rounded-lg">
                <div className="flex justify-between items-start">
                    <h3 className="font-bold text-lg text-gray-800">{training.type || 'Тренировка'}</h3>
                    {training.participants.some(p => !p.confirmed) && training.status !== 'cancelled' &&
                        <span className="text-xs font-bold text-yellow-600 bg-yellow-100 px-2 py-1 rounded-full">ОЖИДАЕТ</span>
                    }
                    {training.status === 'cancelled' &&
                        <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded-full">ОТМЕНЕНА</span>
                    }
                </div>

                <p className="text-sm text-gray-600 mt-1">{training.startTime}, {training.duration} мин.</p>
                {partner && <p className="text-sm text-gray-500">{partnerParticipant?.role}: {partner.name} {partner.surname} {partner.isDeleted && <span className="text-red-500 font-semibold">(удалён)</span>}</p>}
                
                {training.comments && <p className="text-sm text-gray-700 mt-2 italic">"{training.comments}"</p>}
                
                {training.ratings && training.ratings.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-blue-100">
                        <h4 className="font-semibold text-sm text-gray-700 mb-2">Оценки:</h4>
                         <div className="text-sm space-y-2">
                            {training.ratings.map(rating => {
                                const ratingUser = users.find(u => u.id === rating.userId);
                                const ratingUserRoleInSession = training.participants.find(p => p.userId === rating.userId)?.role;

                                const getRatingColorClass = (role: UserRole | undefined) => role === UserRole.Trainer ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800';
                                
                                const label = ratingUser?.id === currentUser.id ? 'Моя оценка' : `Оценка (${ratingUser?.name || 'Партнер'}${ratingUser?.isDeleted ? ' (удалён)' : ''})`;
                                
                                return (
                                    <div key={rating.userId} className={`p-2 rounded-md ${getRatingColorClass(ratingUserRoleInSession)}`}>
                                        <strong>{label}:</strong> <span className="font-bold text-lg">{rating.score}</span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
                 {isPendingCurrentUserConfirmation && training.status === 'scheduled' && (
                     <div className="mt-3 pt-3 border-t border-yellow-200">
                        <p className="text-sm text-yellow-800 mb-2">Запрос на участие в этой тренировке.</p>
                        <div className="flex items-center space-x-3">
                             <button onClick={() => handleTrainingResponseClick(training.id, true)} className="bg-brand-accent text-white px-3 py-1 rounded-md text-sm font-semibold hover:bg-green-600 transition">Принять</button>
                             <button onClick={() => handleTrainingResponseClick(training.id, false)} className="bg-gray-300 text-gray-800 px-3 py-1 rounded-md text-sm font-semibold hover:bg-gray-400 transition">Отклонить</button>
                        </div>
                     </div>
                )}
            </div>
        )
    }

    return (
        <>
            <ConfirmationModal 
                isOpen={confirmModalOpen}
                onClose={() => setConfirmModalOpen(false)}
                onConfirm={confirmTrainingResponse}
                title="Подтвердить отклонение"
                message="Вы уверены, что хотите отклонить/отменить эту тренировку?"
            />
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose} role="dialog" aria-modal="true">
                <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-gray-800">Тренировки на {date.toLocaleDateString('ru-RU')}</h2>
                        <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl" aria-label="Close modal">&times;</button>
                    </div>
                    {sortedTrainings.length > 0 ? (
                        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                            {sortedTrainings.map(t => <TrainingItem key={t.id} training={t} />)}
                        </div>
                    ) : (
                        <p className="text-gray-500 text-center py-8">Нет тренировок на эту дату.</p>
                    )}
                </div>
            </div>
        </>
    );
};

export default TrainingDetailsModal;