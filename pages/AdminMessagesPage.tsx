import React, { useContext, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext, DataContext } from '../App';
import { UserRole, SubscriptionTier } from '../types';
import { linkify } from '../utils/textUtils';
import ConfirmationModal from '../components/ConfirmationModal';
import AnimatedStar from '../components/AnimatedStar';
import StaticStar from '../components/StaticStar';

export const AdminMessagesPage: React.FC = () => {
    const auth = useContext(AuthContext);
    const data = useContext(DataContext);
    const navigate = useNavigate();
    const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'open' | 'closed'>('open');

    if (!auth || !auth.user || !data) {
        return <div>Загрузка...</div>;
    }
    
    if (auth.user.role !== UserRole.Admin) {
        return <div className="bg-white p-6 rounded-lg shadow-md text-center">Доступ к этой странице есть только у администраторов.</div>;
    }

    const { user, users } = auth;
    const { developerMessages, updateDeveloperMessage, deleteDeveloperMessage, findOrCreateConversation } = data;

    const sortedMessages = useMemo(() => {
        const messagesToDisplay = developerMessages.filter(msg => {
            if (activeTab === 'open') {
                return msg.status !== 'closed'; // Treat undefined as 'open'
            }
            return msg.status === 'closed';
        });

        return [...messagesToDisplay].sort((a, b) => {
            if (activeTab === 'open') {
                const senderA = users.find(u => u.id === a.senderId);
                const senderB = users.find(u => u.id === b.senderId);
                const tierA = senderA?.subscription?.tier === SubscriptionTier.Maximum ? 1 : 0;
                const tierB = senderB?.subscription?.tier === SubscriptionTier.Maximum ? 1 : 0;

                // Priority 1: Subscription Tier
                if (tierA !== tierB) {
                    return tierB - tierA;
                }
                
                const isAUnread = !a.isRead;
                const isBUnread = !b.isRead;
                // Priority 2: Read Status
                if (isAUnread !== isBUnread) {
                    return isAUnread ? -1 : 1;
                }
            }
            // Priority 3: Timestamp
            return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        });
    }, [developerMessages, users, activeTab]);

    const canAccessChat = user.permissions?.canAccessChat;

    const toggleReadStatus = async (messageId: string, currentStatus: boolean) => {
        await updateDeveloperMessage(messageId, { isRead: !currentStatus });
    };

    const toggleMessageStatus = async (messageId: string, currentStatus: 'open' | 'closed' | undefined) => {
        const newStatus = (currentStatus === 'closed') ? 'open' : 'closed';
        await updateDeveloperMessage(messageId, { status: newStatus });
    };

    const handleWriteToUser = async (userId: string) => {
        if (!findOrCreateConversation) return;

        const targetUser = users.find(u => u.id === userId);
        if (!targetUser || targetUser.isDeleted) {
            alert("Невозможно начать чат с удаленным пользователем.");
            return;
        }

        const conversation = await findOrCreateConversation(userId);
        if (conversation) {
            navigate('/chat', { state: { openChatId: conversation.id } });
        }
    };
    
    const handleDelete = async () => {
        if (deletingMessageId) {
            await deleteDeveloperMessage(deletingMessageId);
            setDeletingMessageId(null);
        }
    };

    const TabButton: React.FC<{ tabId: 'open' | 'closed', label: string }> = ({ tabId, label }) => (
        <button
            type="button"
            onClick={() => setActiveTab(tabId)}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tabId
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
        >
            {label}
        </button>
    );

    return (
        <div className="space-y-4">
            <ConfirmationModal
                isOpen={!!deletingMessageId}
                onClose={() => setDeletingMessageId(null)}
                onConfirm={handleDelete}
                title="Удалить сообщение"
                message="Вы уверены, что хотите удалить это сообщение? Это действие нельзя отменить."
            />
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h1 className="text-2xl font-bold text-gray-800 mb-4">Сообщения для техподдержки</h1>
                
                 <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                        <TabButton tabId="open" label="Открытые" />
                        <TabButton tabId="closed" label="Закрытые" />
                    </nav>
                </div>

                {sortedMessages.length > 0 ? (
                    <div className="divide-y divide-gray-200 mt-4">
                        {sortedMessages.map(msg => {
                            const sender = users.find(u => u.id === msg.senderId);
                            const senderIsDeleted = sender?.isDeleted;
                            const hasMaximumSub = sender?.subscription?.tier === SubscriptionTier.Maximum;
                            const hasProSub = sender?.subscription?.tier === SubscriptionTier.Pro;
                            return (
                                <div key={msg.id} className={`p-4 ${!msg.isRead && activeTab === 'open' ? 'bg-yellow-50' : ''}`}>
                                    <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-y-2">
                                        <div>
                                            <p className="font-semibold text-lg text-gray-800">{msg.subject}</p>
                                            <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                                                <span>От: {sender ? `${sender.name} ${sender.surname}` : 'Неизвестный'}</span>
                                                {hasMaximumSub && <AnimatedStar />}
                                                {hasProSub && <StaticStar color="silver" />}
                                                {senderIsDeleted && <span className="text-red-500 font-semibold">(удалён)</span>}
                                                <span className="font-mono text-xs text-gray-400">(ID: {msg.senderId})</span>
                                            </div>
                                            <p className="text-xs text-gray-400">
                                                {new Date(msg.timestamp).toLocaleString('ru-RU')}
                                            </p>
                                        </div>
                                        <div className="flex items-center flex-wrap justify-end gap-2 sm:flex-shrink-0 sm:ml-4">
                                            <button 
                                                onClick={() => toggleReadStatus(msg.id, msg.isRead)} 
                                                className={`text-sm font-semibold ${msg.isRead ? 'text-gray-500 hover:text-gray-800' : 'text-blue-600 hover:text-blue-800'}`}
                                            >
                                                {msg.isRead ? 'Отметить как непрочитанное' : 'Отметить как прочитанное'}
                                            </button>
                                            {activeTab === 'open' ? (
                                                <button onClick={() => toggleMessageStatus(msg.id, msg.status)} className="bg-green-600 text-white px-3 py-1.5 rounded-md text-sm font-semibold hover:bg-green-700 transition">
                                                    Закрыть
                                                </button>
                                            ) : (
                                                <button onClick={() => toggleMessageStatus(msg.id, msg.status)} className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm font-semibold hover:bg-blue-700 transition">
                                                    Открыть заново
                                                </button>
                                            )}
                                            {canAccessChat && sender && !sender.canReplyToAdmin && (
                                                <button onClick={() => handleWriteToUser(msg.senderId)} className="bg-brand-primary text-white px-3 py-1.5 rounded-md text-sm font-semibold hover:bg-brand-secondary transition">
                                                    Ответить
                                                </button>
                                            )}
                                            {canAccessChat && sender && sender.canReplyToAdmin && (
                                                 <span className="text-xs text-gray-500 italic bg-gray-100 px-2 py-1 rounded">Ответ в чат разрешен</span>
                                            )}
                                            <button onClick={() => setDeletingMessageId(msg.id)} className="text-red-600 hover:text-red-800 font-semibold text-sm">Удалить</button>
                                        </div>
                                    </div>
                                    <div className="mt-4 text-gray-700 whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: linkify(msg.message) }}></div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-gray-500 text-center py-8">Нет сообщений в этом разделе.</p>
                )}
            </div>
        </div>
    );
};