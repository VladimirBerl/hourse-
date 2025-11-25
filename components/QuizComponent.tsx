import React, { useState, useMemo, useContext, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { AuthContext, DataContext } from '../App';
import { UserRole, Announcement, NewsItem, LibraryPost, Quiz, User } from '../types';

interface QuizComponentProps<T extends { id: string; quiz?: Quiz }> {
    item: T;
    itemType: 'announcement' | 'news' | 'library';
}

const QuizComponent: React.FC<QuizComponentProps<any>> = ({ item, itemType }) => {
    const auth = useContext(AuthContext);
    const data = useContext(DataContext);
    const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
    const [showVoterDetails, setShowVoterDetails] = useState(false);

    if (!item.quiz || !auth?.user || !data?.submitQuizAnswer) return null;

    const { user: currentUser, users } = auth;
    const { submitQuizAnswer } = data;
    const { quiz } = item;
    const isAdmin = currentUser.role === UserRole.Admin;

    const userSubmission = useMemo(() => {
        return quiz.submissions.find(s => s.userId === currentUser.id);
    }, [quiz.submissions, currentUser.id]);

    const handleOptionChange = (optionId: string) => {
        if (quiz.allowMultipleAnswers) {
            setSelectedOptions(prev =>
                prev.includes(optionId) ? prev.filter(id => id !== optionId) : [...prev, optionId]
            );
        } else {
            setSelectedOptions([optionId]);
        }
    };
    
    // Trigger confetti only once after submission for non-admins
    useEffect(() => {
        if (userSubmission && !isAdmin) {
            const sortedUserAnswer = [...userSubmission.optionIds].sort();
            const sortedCorrectAnswer = [...quiz.correctOptionIds].sort();
            const isCorrect = JSON.stringify(sortedUserAnswer) === JSON.stringify(sortedCorrectAnswer);

            if (isCorrect) {
                confetti({
                    particleCount: 150,
                    spread: 70,
                    origin: { y: 0.6 },
                    zIndex: 9999
                });
            }
        }
    }, [userSubmission, isAdmin, quiz.correctOptionIds]); 

    const handleQuizSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedOptions.length > 0) {
            submitQuizAnswer(item.id, itemType, selectedOptions);
        }
    };

    const handleStopQuiz = () => {
        if (!isAdmin || !quiz) return;
        switch(itemType) {
            case 'announcement': data?.updateAnnouncement(item.id, { quiz: { ...quiz, isStopped: true } }); break;
            case 'news': data?.updateNewsItem(item.id, { quiz: { ...quiz, isStopped: true } }); break;
            case 'library': data?.updateLibraryPost(item.id, { quiz: { ...quiz, isStopped: true } }); break;
        }
    };

    const getVotersForOption = (optionId: string): User[] => {
        const voterIds = quiz.submissions
            .filter(s => s.optionIds.includes(optionId))
            .map(s => s.userId);
        return users.filter(u => voterIds.includes(u.id));
    };

    const quizResults = useMemo(() => {
        const totalSubmissions = quiz.submissions.length;
        if (totalSubmissions === 0) {
            return quiz.options.map(option => ({ option, submissionCount: 0, percentage: 0 }));
        }
        return quiz.options.map(option => {
            const submissionCount = quiz.submissions.filter(s => s.optionIds.includes(option.id)).length;
            return {
                option,
                submissionCount,
                percentage: (submissionCount / totalSubmissions) * 100,
            };
        });
    }, [quiz]);

    const isStopped = quiz.isStopped;
    const showResults = userSubmission || isAdmin || isStopped;
    
    return (
        <div className="mt-4 pt-4 border-t">
            <h4 className="font-bold text-gray-800 mb-2">Викторина!</h4>
            {isStopped && (
                <div className="text-sm text-center text-gray-500 bg-gray-100 p-2 rounded-md mb-3">
                    Викторина завершена.
                </div>
            )}
            {showResults ? (
                // Results View
                <div className="space-y-2">
                    {quizResults.map(({ option, submissionCount, percentage }) => {
                        const isCorrect = quiz.correctOptionIds.includes(option.id);
                        const didUserChooseThis = userSubmission?.optionIds.includes(option.id);
                        
                        let barColorClass = 'bg-gray-300';
                        if (isAdmin || isStopped) {
                            barColorClass = isCorrect ? 'bg-green-500' : 'bg-brand-secondary';
                        } else if (userSubmission) {
                            if (isCorrect) {
                                barColorClass = 'bg-green-500';
                            } else if (didUserChooseThis && !isCorrect) {
                                barColorClass = 'bg-red-500';
                            }
                        }

                        let textClass = 'text-gray-700';
                        if (!isAdmin && didUserChooseThis) {
                            textClass = 'font-bold text-brand-primary';
                        }

                        return (
                            <div key={option.id}>
                                <div className="flex justify-between items-center text-sm mb-1">
                                    <div className="flex items-center">
                                         {isCorrect && <span className="text-green-600 mr-2">✔</span>}
                                         <span className={textClass}>{option.text}</span>
                                    </div>
                                    <span className="text-gray-600 font-semibold">{submissionCount}</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2.5">
                                    <div className={`${barColorClass} h-2.5 rounded-full`} style={{ width: `${percentage}%` }}></div>
                                </div>
                            </div>
                        );
                    })}
                    <p className="text-right text-sm text-gray-500 pt-2">Всего ответов: {quiz.submissions.length}</p>
                     {isAdmin && (
                        <div className="mt-4">
                            <button onClick={() => setShowVoterDetails(!showVoterDetails)} className="text-sm text-brand-primary hover:underline">
                                {showVoterDetails ? 'Скрыть детали' : 'Показать, кто как ответил'}
                            </button>
                            {showVoterDetails && (
                                <div className="mt-2 p-3 bg-gray-50 rounded-lg text-xs space-y-2">
                                    {quiz.options.map(option => (
                                        <div key={option.id}>
                                            <p className="font-semibold">{option.text}</p>
                                            <p className="pl-2">
                                                {getVotersForOption(option.id).map(u => `${u.name} ${u.surname}`).join(', ') || 'Нет ответов'}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                // Answering View
                <form onSubmit={handleQuizSubmit} className="space-y-3">
                    {quiz.options.map(option => (
                        <label key={option.id} className="flex items-center p-2 rounded-md hover:bg-gray-100 cursor-pointer">
                            <input
                                type={quiz.allowMultipleAnswers ? "checkbox" : "radio"}
                                name="quizOption"
                                checked={selectedOptions.includes(option.id)}
                                onChange={() => handleOptionChange(option.id)}
                                className={`h-4 w-4 text-brand-primary border-gray-300 focus:ring-brand-primary ${quiz.allowMultipleAnswers ? 'rounded' : 'rounded-full'}`}
                            />
                            <span className="ml-3 text-gray-700">{option.text}</span>
                        </label>
                    ))}
                    <button type="submit" className="bg-brand-accent text-white font-semibold px-4 py-2 rounded-lg shadow hover:bg-green-600 transition-colors text-sm mt-3">
                        Ответить
                    </button>
                </form>
            )}
            {isAdmin && !quiz.isStopped && (
                <div className="mt-4 pt-4 border-t text-center">
                    <button
                        onClick={handleStopQuiz}
                        className="bg-yellow-500 text-white font-semibold px-4 py-2 rounded-lg shadow hover:bg-yellow-600 transition-colors text-sm"
                    >
                        Остановить викторину
                    </button>
                </div>
            )}
        </div>
    );
};

export default QuizComponent;