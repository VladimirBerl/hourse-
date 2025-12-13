import React, { useContext, useState, useMemo } from 'react';
import { AuthContext, DataContext } from '../App';
import { UserRole, LibraryPost, User, Poll, PollOption, Quiz, SubscriptionTier } from '../types';
import ConfirmationModal from '../components/ConfirmationModal';
import PublicationEditorModal from '../components/PublicationEditorModal';
import QuizComponent from '../components/QuizComponent';
import { linkify } from '../utils/textUtils';
import AnimatedStar from '../components/AnimatedStar';

const getVoteWord = (count: number): string => {
    const cases = [2, 0, 1, 1, 1, 2];
    const titles = ['голос', 'голоса', 'голосов'];
    return titles[(count % 100 > 4 && count % 100 < 20) ? 2 : cases[(count % 10 < 5) ? count % 10 : 5]];
};

const PollComponent: React.FC<{ item: LibraryPost, users: User[] }> = ({ item, users }) => {
    const auth = useContext(AuthContext);
    const data = useContext(DataContext);
    const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
    const [showVoterDetails, setShowVoterDetails] = useState(false);

    if (!item.poll || !auth?.user || !data) return null;

    const { user: currentUser } = auth;
    const { submitVote, updateLibraryPost } = data;
    const { poll } = item;
    
    const rawUserVote = poll.votes.find(v => v.userId === currentUser.id);
    const userVote = rawUserVote ? {
        ...rawUserVote,
        optionIds: Array.isArray(rawUserVote.optionIds) 
            ? rawUserVote.optionIds 
            : (typeof rawUserVote.optionIds === 'string' 
                ? (() => { try { return JSON.parse(rawUserVote.optionIds); } catch { return []; } })() 
                : [])
    } : undefined;
    const isPollClosed = poll.pollEndsAt ? new Date() > new Date(poll.pollEndsAt) : false;
    const isAdmin = currentUser.role === UserRole.Admin;

    const handleStopPoll = () => {
        if (!isAdmin || !updateLibraryPost || !item.poll) return;
        updateLibraryPost(item.id, { poll: { ...item.poll, isStopped: true } });
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
            submitVote(item.id, 'library', selectedOptions);
        }
    };
    
    const getVotersForOption = (optionId: string): User[] => {
        const normalizedVotes = poll.votes.map(vote => {
            let optionIds = vote.optionIds;
            if (!Array.isArray(optionIds)) {
                if (typeof optionIds === 'string') {
                    try {
                        optionIds = JSON.parse(optionIds);
                    } catch (e) {
                        console.error('Error parsing optionIds:', e);
                        optionIds = [];
                    }
                } else {
                    optionIds = [];
                }
            }
            return {
                ...vote,
                optionIds
            };
        });
        const voterIds = normalizedVotes
            .filter(v => Array.isArray(v.optionIds) && v.optionIds.includes(optionId))
            .map(v => v.userId);
        return users.filter(u => voterIds.includes(u.id));
    };

    const pollResults = useMemo(() => {
        // Normalize optionIds to ensure they are arrays
        const normalizedVotes = poll.votes.map(vote => {
            let optionIds = vote.optionIds;
            if (!Array.isArray(optionIds)) {
                if (typeof optionIds === 'string') {
                    try {
                        optionIds = JSON.parse(optionIds);
                    } catch (e) {
                        console.error('Error parsing optionIds:', e);
                        optionIds = [];
                    }
                } else {
                    optionIds = [];
                }
            }
            return {
                ...vote,
                optionIds
            };
        });
        
        const totalVotesCast = normalizedVotes.reduce((total, vote) => total + (vote.optionIds?.length || 0), 0);
        return poll.options.map(option => {
            // Count votes where this option is selected
            const voteCount = normalizedVotes.filter(v => Array.isArray(v.optionIds) && v.optionIds.includes(option.id)).length;
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


const LibraryPage: React.FC = () => {
    const auth = useContext(AuthContext);
    const data = useContext(DataContext);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [isEditorModalOpen, setEditorModalOpen] = useState(false);
    const [editingPost, setEditingPost] = useState<LibraryPost | null>(null);
    const [deletingPostId, setDeletingPostId] = useState<string | null>(null);

    const [defaultDeletion, setDefaultDeletion] = useState(data?.settings.defaultLibraryDeletion || 'none');
    const [defaultDeletionMessage, setDefaultDeletionMessage] = useState('');

    if (!auth?.user || !data) return <div>Загрузка...</div>;
    const { user, updateUserSilently, users } = auth;
    const { libraryPosts, addLibraryPost, updateLibraryPost, deleteLibraryPost, settings, updateSettings, locations } = data;

    const relevantLibraryPosts = useMemo(() => {
        const now = new Date();

        if (user.role === UserRole.Admin) {
            const pinned = libraryPosts.filter(p => p.isPinned);
            const unpinned = libraryPosts.filter(p => !p.isPinned);
            
            const sortAdminItems = (items: LibraryPost[]) => {
                const scheduled = items.filter(p => p.publishTimestamp && new Date(p.publishTimestamp) > now);
                const published = items.filter(p => !p.publishTimestamp || new Date(p.publishTimestamp) <= now);
                
                scheduled.sort((a, b) => new Date(a.publishTimestamp!).getTime() - new Date(b.publishTimestamp!).getTime());
                published.sort((a, b) => new Date(b.publishTimestamp || b.timestamp).getTime() - new Date(a.publishTimestamp || a.timestamp).getTime());
                
                return [...scheduled, ...published];
            };
            
            return [...sortAdminItems(pinned), ...sortAdminItems(unpinned)];
        }
        
        const filteredForUser = libraryPosts.filter(p => {
            if (p.publishTimestamp && new Date(p.publishTimestamp) > now) return false;
            
            // Subscription check
            if (p.targetSubscriptionTiers && p.targetSubscriptionTiers.length > 0) {
                if (!user.subscription || !p.targetSubscriptionTiers.includes(user.subscription.tier)) {
                    return false;
                }
            }
            
            // Role check
            const roleMatch = !p.targetRoles || p.targetRoles.length === 0 || p.targetRoles.includes(user.role);
            if (!roleMatch) return false;

            // Location check
            const hasLocationTarget = (p.targetCountries && p.targetCountries.length > 0) ||
                                      (p.targetRegions && p.targetRegions.length > 0) ||
                                      (p.targetCities && p.targetCities.length > 0);

            if (!hasLocationTarget) {
                return true; // Global post, location matches
            }

            const countryMatch = p.targetCountries && p.targetCountries.includes(user.country);
            const regionMatch = p.targetRegions && p.targetRegions.includes(user.region);
            const cityMatch = p.targetCities && p.targetCities.includes(user.city);

            return countryMatch || regionMatch || cityMatch;
        });

        const pinned = filteredForUser.filter(p => p.isPinned);
        const unpinned = filteredForUser.filter(p => !p.isPinned);

        const sortByDateDesc = (a: LibraryPost, b: LibraryPost) => new Date(b.publishTimestamp || b.timestamp).getTime() - new Date(a.publishTimestamp || a.timestamp).getTime();

        pinned.sort(sortByDateDesc);
        unpinned.sort(sortByDateDesc);

        return [...pinned, ...unpinned];
    }, [libraryPosts, user]);

    const getTargetUsers = (item: LibraryPost) => {
        const allNonAdmins = users.filter(u => u.role !== UserRole.Admin && !u.isDeleted);
        
        return allNonAdmins
            .filter(u => {
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
            if (newExpandedId !== null) {
                if (!user.readLibraryPostIds?.includes(id)) {
                    updateUserSilently({ readLibraryPostIds: [...(user.readLibraryPostIds || []), id] });
                }
            }
            return newExpandedId;
        });
    };
    
    const handleAddNew = () => {
        setEditingPost(null);
        setEditorModalOpen(true);
    };

    const handleEdit = (post: LibraryPost) => {
        setEditingPost(post);
        setEditorModalOpen(true);
    };
    
    const handleDelete = (postId: string) => {
        setDeletingPostId(postId);
    };

    const confirmDelete = async () => {
        if (deletingPostId) {
            await deleteLibraryPost(deletingPostId);
            setDeletingPostId(null);
        }
    };
    
    const handleSave = async (data: Omit<LibraryPost, 'id' | 'authorId' | 'timestamp'>) => {
        if (editingPost) {
            await updateLibraryPost(editingPost.id, data);
        } else {
            await addLibraryPost(data);
        }
    };

    const handleSaveDefaultDeletion = async (e: React.FormEvent) => {
        e.preventDefault();
        await updateSettings({ defaultLibraryDeletion: defaultDeletion });
        setDefaultDeletionMessage('Настройка по умолчанию сохранена!');
        setTimeout(() => setDefaultDeletionMessage(''), 2000);
    };

    return (
        <div className="space-y-6">
            <PublicationEditorModal 
                isOpen={isEditorModalOpen} 
                onClose={() => setEditorModalOpen(false)} 
                onSave={handleSave}
                editingItem={editingPost}
                itemType="library"
                allUsers={users}
                locations={locations}
                defaultAutoDeleteOption={settings.defaultLibraryDeletion}
            />
             <ConfirmationModal
                isOpen={!!deletingPostId}
                onClose={() => setDeletingPostId(null)}
                onConfirm={confirmDelete}
                title="Удалить статью"
                message="Вы уверены, что хотите удалить эту статью? Это действие нельзя отменить."
            />

            {user.role === UserRole.Admin && user.permissions?.canManageLibraryPosts && (
                <div className="flex flex-wrap justify-between items-center gap-4">
                    <form onSubmit={handleSaveDefaultDeletion} className="flex flex-wrap items-center gap-4 bg-gray-50 p-3 rounded-lg">
                        <label htmlFor="default-deletion-lib" className="text-sm font-medium text-gray-700 whitespace-nowrap">Удаление постов по умолчанию:</label>
                        <select id="default-deletion-lib" value={defaultDeletion} onChange={e => setDefaultDeletion(e.target.value)} className="w-full max-w-xs px-2 py-1 border border-gray-300 rounded-md bg-white">
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
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
                        </svg>
                        Добавить статью
                    </button>
                </div>
            )}

            <div className="space-y-4">
                {relevantLibraryPosts.length > 0 ? relevantLibraryPosts.map(post => {
                    const isRead = user.readLibraryPostIds?.includes(post.id) ?? true;
                    const targetUsers = getTargetUsers(post);
                    const sentToCount = targetUsers.length;
                    const readCount = targetUsers.filter(u => u.readLibraryPostIds?.includes(post.id)).length;
                    const isScheduled = post.publishTimestamp && new Date(post.publishTimestamp) > new Date();
                    
                    const imagesAboveTitle = post.images?.filter(img => img.position === 'aboveTitle') || [];
                    const imagesBeforeContent = post.images?.filter(img => img.position === 'beforeContent') || [];
                    const imagesAfterContent = post.images?.filter(img => img.position === 'afterContent') || [];

                    return (
                         <div key={post.id} className={`bg-white rounded-lg shadow-md overflow-hidden border-2 ${post.isPinned ? 'border-brand-primary' : 'border-transparent'}`}>
                             {imagesAboveTitle.map(img => <img key={img.id} src={img.url} alt={post.title} className="w-full h-auto object-cover" />)}
                            <div className="p-4 cursor-pointer" onClick={() => handleToggle(post.id)}>
                               <div className="flex justify-between items-start">
                                    <div className="flex-grow pr-4">
                                        <div className="flex items-center flex-wrap gap-2">
                                            {post.isPinned && <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-brand-primary mr-2 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M16 9V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z"/></svg>}
                                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                                <span>{post.title}</span>
                                                {post.targetSubscriptionTiers?.includes(SubscriptionTier.Maximum) && <AnimatedStar />}
                                            </h3>
                                            {user.role === UserRole.Admin && isScheduled && (
                                                <span className="text-xs font-bold text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
                                                    Запланировано
                                                </span>
                                            )}
                                        </div>
                                        {user.role === UserRole.Admin ? (
                                            <div>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {new Date(post.timestamp).toLocaleString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    <span className="ml-4">Отправлено: <span className="font-semibold">{sentToCount}</span> / Прочитано: <span className="font-semibold">{readCount}</span></span>
                                                    {isScheduled && <span> / Публикация: {new Date(post.publishTimestamp!).toLocaleString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>}
                                                </p>
                                                {post.deletionTimestamp && (
                                                    <p className="text-xs text-red-500 mt-1">
                                                        Удаление поста: {new Date(post.deletionTimestamp).toLocaleString('ru-RU')}
                                                    </p>
                                                )}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-gray-500 mt-1">
                                                {new Date(post.publishTimestamp || post.timestamp).toLocaleString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        )}
                                    </div>
                                     <div className="flex items-center flex-wrap gap-x-2 sm:gap-x-4 gap-y-1 flex-shrink-0 justify-end">
                                        {user.role === UserRole.Admin && user.permissions?.canManageLibraryPosts && (
                                             <>
                                                <button onClick={(e) => { e.stopPropagation(); updateLibraryPost(post.id, { isPinned: !post.isPinned }); }} title={post.isPinned ? "Открепить" : "Закрепить"} className={`p-1 rounded-full hover:bg-gray-100 ${post.isPinned ? 'text-brand-primary' : 'text-gray-400'}`}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M16 9V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z"/></svg>
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); handleEdit(post); }} title="Редактировать" className="font-semibold text-blue-600 hover:text-blue-800">Ред.</button>
                                                <button onClick={(e) => { e.stopPropagation(); handleDelete(post.id); }} title="Удалить" className="font-semibold text-red-600 hover:text-red-800">Удал.</button>
                                            </>
                                        )}
                                        {!isRead && user.role !== UserRole.Admin && <span className="w-3 h-3 bg-red-500 rounded-full flex-shrink-0" title="Новое"></span>}
                                        <button className="focus:outline-none"><svg className={`w-5 h-5 text-gray-500 transform transition-transform ${expandedId === post.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></button>
                                    </div>
                               </div>
                            </div>
                            <div className={`transition-all duration-700 ease-in-out overflow-hidden ${expandedId === post.id ? 'max-h-[2000px]' : 'max-h-0'}`}>
                                <div className="px-4 pb-4">
                                     {imagesBeforeContent.map(img => <img key={img.id} src={img.url} alt={post.title} className="w-full h-auto object-cover rounded-lg my-4" />)}
                                    <div className="border-t pt-4 text-gray-700 whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: linkify(post.content) }} />
                                    {imagesAfterContent.map(img => <img key={img.id} src={img.url} alt={post.title} className="w-full h-auto object-cover rounded-lg mt-4" />)}
                                    {post.poll && <PollComponent item={post} users={users} />}
                                    {post.quiz && <QuizComponent item={post} itemType="library" />}
                                </div>
                            </div>
                        </div>
                    );
                }) : (
                     <div className="bg-white p-6 rounded-lg shadow-md text-center text-gray-500">
                        <p>В библиотеке пока нет статей.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LibraryPage;