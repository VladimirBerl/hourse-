import React, { useState, useContext, useMemo, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthContext, DataContext } from '../App';
import { User, Conversation, ChatMessage, UserRole, SubscriptionTier } from '../types';
import { linkify } from '../utils/textUtils';
import AnimatedStar from '../components/AnimatedStar';
import StaticStar from '../components/StaticStar';

const MessageStatusIcon: React.FC<{ status?: 'sent' | 'delivered' | 'read' }> = ({ status }) => {
  if (!status) return null;

  const singleCheck = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );

  const doubleCheck = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 12.75l6 6 9-13.5" />
    </svg>
  );

  switch (status) {
    case 'sent':
      return <span className="text-gray-400">{singleCheck}</span>;
    case 'delivered':
      return <span className="text-gray-400">{doubleCheck}</span>;
    case 'read':
      return <span className="text-blue-500">{doubleCheck}</span>;
    default:
      return null;
  }
};

const formatTime = (time: number) => {
  if (isNaN(time) || time === Infinity) {
    return '0:00';
  }
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

const AudioPlayer: React.FC<{
  message: ChatMessage;
  playbackRate: number;
  onSpeedChange: () => void;
}> = ({ message, playbackRate, onSpeedChange }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(message.media?.duration || 0);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
      const handleLoadedMetadata = () => {
        if (audio.duration !== Infinity && !isNaN(audio.duration)) {
          setDuration(audio.duration);
        }
      };
      const handleEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };

      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('ended', handleEnded);

      return () => {
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('ended', handleEnded);
      };
    }
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (audio) {
      if (isPlaying) {
        audio.pause();
      } else {
        audio.play().catch((e) => console.error('Audio play failed:', e));
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const progressBar = progressRef.current;
    const audio = audioRef.current;
    if (progressBar && audio && duration > 0) {
      const rect = progressBar.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const newTime = (clickX / rect.width) * duration;
      audio.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-2 w-full max-w-xs p-2">
      <audio ref={audioRef} src={message.media?.url} preload="metadata"></audio>
      <button
        type="button"
        onClick={togglePlayPause}
        className="p-3 rounded-full bg-brand-secondary text-white flex-shrink-0 focus:outline-none"
      >
        {isPlaying ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </button>
      <div className="flex-grow flex items-center gap-2">
        <div
          ref={progressRef}
          onClick={handleSeek}
          className="w-full h-1 bg-gray-300 rounded-full cursor-pointer relative group"
        >
          <div className="bg-brand-primary h-1 rounded-full" style={{ width: `${progress}%` }}></div>
          <div
            className="absolute top-1/2 -translate-y-1/2 h-3 w-3 bg-brand-primary rounded-full transform transition-transform group-hover:scale-125"
            style={{ left: `calc(${progress}% - 6px)` }}
          ></div>
        </div>
      </div>
      <div className="text-xs text-gray-500 font-mono whitespace-nowrap">
        {formatTime(currentTime)} / {formatTime(duration)}
      </div>
      <button
        onClick={onSpeedChange}
        className="bg-gray-200 text-gray-700 text-xs font-semibold rounded-full w-8 h-8 flex-shrink-0 flex items-center justify-center hover:bg-gray-300"
      >
        {playbackRate}x
      </button>
    </div>
  );
};

const ChatPage: React.FC = () => {
  const auth = useContext(AuthContext);

  const data = useContext(DataContext);
  const location = useLocation();
  const locationState = location.state as { openChatId?: string } | null;
  const navigate = useNavigate();

  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResult, setSearchResult] = useState<User | null | 'not_found'>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isChatVisible, setIsChatVisible] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; convoId: string } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingLocked, setIsRecordingLocked] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [dragStartY, setDragStartY] = useState(0);
  const recordingIntervalRef = useRef<number | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const [playbackRates, setPlaybackRates] = useState<Record<string, number>>({});

  // State for MediaRecorder
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const shouldSendOnStop = useRef(true);
  const isRecordingRef = useRef(false);

  const emojiCategories = {
    Смайлики: [
      '😀',
      '😂',
      '😍',
      '🤔',
      '😎',
      '😢',
      '😡',
      '👍',
      '👎',
      '👋',
      '🙏',
      '💪',
      '🥳',
      '🎉',
      '❤️‍🔥',
      '💔',
      '💯',
    ],
    Люди: ['🧑', '👩', '👨‍🚀', '👮', '🧑‍🎨', '🧑‍🏫', '🤷', '🤦', '🙋', '🙇'],
    'Животные и природа': ['🐶', '🐱', '🐴', '🦄', '🦊', '🦁', '🌿', '🌸', '☀️', '🌙', '🌎', '🔥', '💧'],
    'Еда и напитки': ['🍎', '🍔', '🍕', '🍰', '☕️', '🍺', '🍿', '🍩', '🍇'],
    'Спорт и активность': ['🏇', '🏆', '⚽️', '🏀', '🎯', '🎮', '🎬', '🎤', '🎸', '🎨'],
    Объекты: ['📱', '💻', '💡', '💰', '🔑', '🎁', '💎', '💣', '⚙️'],
  };

  const [activeEmojiTab, setActiveEmojiTab] = useState(Object.keys(emojiCategories)[0]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [data?.chatMessages, selectedConversationId]);

  const handleContextMenu = (e: React.MouseEvent, convoId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.pageX, y: e.pageY, convoId });
  };

  const closeContextMenu = () => setContextMenu(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenu) {
        closeContextMenu();
      }
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [contextMenu]);

  const handleTogglePin = (convoId: string) => {
    if (!data || !auth?.user) return;
    const convo = data.conversations.find((c) => c.id === convoId);
    if (!convo) return;

    const currentUserId = auth.user.id;
    const pinnedBy = convo.pinnedBy || [];
    const isPinned = pinnedBy.includes(currentUserId);

    const newPinnedBy = isPinned
      ? pinnedBy.filter((id) => id !== currentUserId)
      : [...pinnedBy, currentUserId];

    data.updateConversation(convoId, { pinnedBy: newPinnedBy });
  };

  const conversationsWithDetails = useMemo(() => {
    if (!auth?.user || !data) return [];
    const { user: currentUser, users } = auth;
    const { conversations, chatMessages } = data;
    

    const mappedConversations = conversations.map((convo) => {
      const lastMessage = chatMessages
        .filter((m) => m.chatId === convo.id)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

      const isServiceChat = convo.id.startsWith('service-chat-');
      let partner:
        | User
        | { name: string; surname: string; avatarUrl?: string; isSystem?: boolean; isDeleted?: boolean }
        | undefined;

      if (isServiceChat && currentUser.role !== UserRole.Admin) {
        partner = { name: 'Техподдержка', surname: '', isSystem: true };
      } else {
        const partnerId = convo.participantIds.find((id) => {
          if (id === currentUser.id) return false;
          if (isServiceChat) {
            const potentialPartner = users.find((u) => u.id === id);
            return potentialPartner?.role !== UserRole.Admin;
          }
          return true;
        });
        partner = users.find((u) => u.id === partnerId);
      }

      const lastRead = currentUser.lastReadTimestamps?.[convo.id];
      let isUnread =
        lastMessage &&
        lastMessage.senderId !== currentUser.id &&
        (!lastRead || new Date(lastMessage.timestamp) > new Date(lastRead));

      if (isUnread && currentUser.role === UserRole.Admin && lastMessage) {
        if (new Date(lastMessage.timestamp) < new Date(currentUser.registrationDate)) {
          isUnread = false;
        } else if (convo.id.startsWith('service-chat-')) {
          const sender = users.find((u) => u.id === lastMessage.senderId);
          if (sender && sender.role === UserRole.Admin) {
            isUnread = false;
          }
        }
      }

      return { ...convo, partner, lastMessage, isUnread };
    });

    return mappedConversations.sort((a, b) => {
      const isAPinned = a.pinnedBy?.includes(currentUser.id) ?? false;
      const isBPinned = b.pinnedBy?.includes(currentUser.id) ?? false;
      if (isAPinned && !isBPinned) return -1;
      if (!isAPinned && isBPinned) return 1;

      if (currentUser.role !== UserRole.Admin) {
        if (a.id.startsWith('service-chat-')) return -1;
        if (b.id.startsWith('service-chat-')) return 1;
      }
      if (a.isUnread && !b.isUnread) return -1;
      if (!a.isUnread && b.isUnread) return 1;
      if (!a.lastMessage) return 1;
      if (!b.lastMessage) return -1;
      return new Date(b.lastMessage.timestamp).getTime() - new Date(a.lastMessage.timestamp).getTime();
    });
  }, [data?.conversations, data?.chatMessages, auth?.users, auth?.user]);

  console.log(conversationsWithDetails);
  

  const selectedConversation = useMemo(() => {
    return conversationsWithDetails.find((c) => c.id === selectedConversationId);
  }, [selectedConversationId, conversationsWithDetails]);

  const messagesForSelectedConvo = useMemo(() => {
    if (!selectedConversationId || !data) return [];
    return data.chatMessages
      .filter((m) => m.chatId === selectedConversationId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [selectedConversationId, data?.chatMessages]);

  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
    setIsChatVisible(true);
    setSearchTerm('');
    setSearchResult(null);
    
    if (data?.updateLastReadTimestamp) {
      data.updateLastReadTimestamp(id);
    }
  };

  useEffect(() => {
    const chatIdToOpen = locationState?.openChatId;
    
    if (chatIdToOpen && conversationsWithDetails.length > 0) {
      const chatExists = conversationsWithDetails.some((c) => c.id === chatIdToOpen);
      if (chatExists) {
        handleSelectConversation(chatIdToOpen);
        navigate(location.pathname, { replace: true, state: {} });
      }
    }
  }, [locationState, conversationsWithDetails, navigate, location.pathname]);

  const handleSearch = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!auth?.users || !auth.user) {
        setSearchResult('not_found');
        return;
      }
      setIsSearching(true);
      const foundUser = auth.users.find((u) => u.id === searchTerm && u.id !== auth.user?.id && !u.isDeleted);

      setSearchResult(foundUser || 'not_found');
      setIsSearching(false);
    },
    [auth]
  );

  const handleStartChat = async (targetUser: User) => {
    if (!data?.findOrCreateConversation) return;
    const conversation = await data.findOrCreateConversation(targetUser.id);
    if (conversation) {
      handleSelectConversation(conversation.id);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() && selectedConversationId && data?.sendMessage) {
      await data.sendMessage(selectedConversationId, { text: newMessage.trim() });
      setNewMessage('');
      setShowEmojiPicker(false);
    }
  };

  const handleSendAttachment = async () => {
    if (!selectedConversationId || !data?.sendMessage) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*'; // Removed audio/* to guide users to the voice message button
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        if (file.size > 10 * 1024 * 1024) {
          // 10MB limit
          alert('Размер файла не должен превышать 10 МБ.');
          return;
        }

        const reader = new FileReader();
        reader.onload = async (event) => {
          const url = event.target?.result as string;

          if (file.type.startsWith('video/')) {
            const video = document.createElement('video');
            video.src = url;
            video.onloadedmetadata = async () => {
              const duration = video.duration;
              await data.sendMessage(selectedConversationId, { media: { url, type: file.type, duration } });
            };
          } else {
            await data.sendMessage(selectedConversationId, { media: { url, type: file.type } });
          }
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleEmojiClick = (emoji: string) => {
    setNewMessage((prev) => prev + emoji);
  };

  const handleSpeedChange = (messageId: string) => {
    const speeds = [1, 1.25, 1.5, 2];
    const currentRate = playbackRates[messageId] || 1;
    const currentIndex = speeds.indexOf(currentRate);
    const nextIndex = (currentIndex + 1) % speeds.length;
    const nextRate = speeds[nextIndex];

    setPlaybackRates((prev) => ({ ...prev, [messageId]: nextRate }));
  };

  if (!auth || !data || !auth.user) {
    return <div className="text-center p-8">Загрузка чата...</div>;
  }
  const { user: currentUser, users, silentlyUpdateUserInList } = auth;
  const hasMaximumSubscription =
    currentUser.subscription?.tier === SubscriptionTier.Maximum || currentUser.role === UserRole.Admin;

  const handleToggleReplyPermission = async (targetUser: User) => {
    if (!silentlyUpdateUserInList) return;
    await silentlyUpdateUserInList(targetUser.id, { canReplyToAdmin: !targetUser.canReplyToAdmin });
  };

  const partnerUser = users.find(
    (u) => u.id === selectedConversation?.participantIds.find((id) => id !== currentUser.id)
  );
  const isPartnerDeleted = !!(partnerUser && partnerUser.isDeleted);
  const isUserChatForAdmin =
    currentUser.role === UserRole.Admin && partnerUser && partnerUser.role !== UserRole.Admin;
  const isServiceChat = selectedConversation?.id.startsWith('service-chat');
  const canCurrentUserReply =
    !isServiceChat ||
    (isServiceChat && currentUser.role === UserRole.Admin) ||
    (isServiceChat && !!currentUser.canReplyToAdmin);

  // --- Voice Recording Logic ---
  const cleanupRecordingListeners = () => {
    window.removeEventListener('mousemove', handleDragMove);
    window.removeEventListener('mouseup', handleRecordingEnd);
    window.removeEventListener('touchmove', handleDragMove as any);
    window.removeEventListener('touchend', handleRecordingEnd);
  };

  const stopRecordingAndSend = () => {
    cleanupRecordingListeners();
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === 'recording') {
      shouldSendOnStop.current = true;
      recorder.stop();
    }
    isRecordingRef.current = false;
    setIsRecording(false);
    setIsRecordingLocked(false);
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
  };

  const cancelRecording = () => {
    cleanupRecordingListeners();
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === 'recording') {
      shouldSendOnStop.current = false;
      recorder.stop();
    }
    isRecordingRef.current = false;
    setIsRecording(false);
    setIsRecordingLocked(false);
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    setRecordingTime(0);
  };

  const handleDragMove = (e: MouseEvent | TouchEvent) => {
    if (!isRecordingRef.current || isRecordingLocked) return;
    const currentY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    if (dragStartY - currentY > 50) {
      // 50px threshold to lock
      setIsRecordingLocked(true);
      cleanupRecordingListeners();
    }
  };

  const handleRecordingEnd = (e: MouseEvent | TouchEvent) => {
    e.preventDefault();
    if (!isRecordingRef.current || isRecordingLocked) return;
    stopRecordingAndSend();
  };

  const startRecording = async (e: React.MouseEvent | React.TouchEvent) => {
    if (isRecordingRef.current) return;
    isRecordingRef.current = true;

    e.preventDefault();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('Запись аудио не поддерживается в вашем браузере.');
      isRecordingRef.current = false;
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const options = { mimeType: 'audio/webm;codecs=opus' };
      const newMediaRecorder = MediaRecorder.isTypeSupported(options.mimeType)
        ? new MediaRecorder(stream, options)
        : new MediaRecorder(stream);

      mediaRecorderRef.current = newMediaRecorder;

      audioChunksRef.current = [];
      newMediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      newMediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());

        if (shouldSendOnStop.current && audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: newMediaRecorder.mimeType });

          const tempAudio = document.createElement('audio');
          tempAudio.src = URL.createObjectURL(audioBlob);

          tempAudio.onloadedmetadata = () => {
            const duration = tempAudio.duration && isFinite(tempAudio.duration) ? tempAudio.duration : 0;
            URL.revokeObjectURL(tempAudio.src);

            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = () => {
              const base64data = reader.result as string;
              if (selectedConversationId && data?.sendMessage) {
                data.sendMessage(selectedConversationId, {
                  media: { url: base64data, type: audioBlob.type, duration },
                });
              }
            };
          };

          tempAudio.onerror = () => {
            console.error('Error loading temporary audio for duration calculation.');
            URL.revokeObjectURL(tempAudio.src);
          };
        }
        audioChunksRef.current = [];
      };

      newMediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      const y =
        'touches' in e.nativeEvent
          ? (e.nativeEvent as TouchEvent).touches[0].clientY
          : (e.nativeEvent as MouseEvent).clientY;
      setDragStartY(y);

      recordingIntervalRef.current = window.setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleRecordingEnd);
      window.addEventListener('touchmove', handleDragMove as any, { passive: false });
      window.addEventListener('touchend', handleRecordingEnd);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Не удалось получить доступ к микрофону. Проверьте разрешения в настройках браузера.');
      isRecordingRef.current = false;
      setIsRecording(false);
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    }
  };

  return (
    <div className="flex h-[calc(100vh-10rem)] bg-white rounded-lg shadow-md overflow-hidden">
      {contextMenu && (
        <div
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed z-50 bg-white shadow-lg rounded-md py-1 border text-sm"
        >
          <button
            onClick={() => handleTogglePin(contextMenu.convoId)}
            className="block w-full text-left px-4 py-2 hover:bg-gray-100"
          >
            {conversationsWithDetails
              .find((c) => c.id === contextMenu.convoId)
              ?.pinnedBy?.includes(currentUser.id)
              ? 'Открепить'
              : 'Закрепить'}
          </button>
        </div>
      )}
      <div
        className={`w-full md:w-1/3 lg:w-1/4 border-r border-gray-200 flex flex-col ${
          isChatVisible ? 'hidden md:flex' : 'flex'
        }`}
      >
        <div className="p-4 border-b border-gray-200">
          <form onSubmit={handleSearch} className="flex items-center space-x-2">
            <div className="relative flex-grow">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setSearchResult(null);
                }}
                placeholder="Поиск по ID"
                className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-brand-secondary"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-semibold hover:bg-brand-secondary transition-colors"
              disabled={isSearching}
            >
              {isSearching ? '...' : 'Найти'}
            </button>
          </form>
        </div>
        <div className="flex-grow overflow-y-auto">
          {searchResult === 'not_found' && (
            <p className="p-4 text-sm text-center text-gray-500">Пользователь не найден.</p>
          )}
          {searchResult && searchResult !== 'not_found' && (
            <div className="p-2">
              <div
                className="p-2 rounded-lg hover:bg-gray-100 cursor-pointer"
                onClick={() => handleStartChat(searchResult)}
              >
                <div className="flex items-center">
                  <img
                    src={
                      searchResult.avatarUrl ||
                      `https://ui-avatars.com/api/?name=${searchResult.name}+${searchResult.surname}&background=2c5282&color=fff&size=128&rounded=true`
                    }
                    alt="avatar"
                    className="w-12 h-12 rounded-full"
                  />
                  <div className="ml-3 flex-grow">
                    <p className="font-semibold text-gray-800">
                      {searchResult.name} {searchResult.surname}
                    </p>
                    <p className="text-sm text-gray-500">Начать диалог</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          {!searchTerm &&
            conversationsWithDetails.map((convo) => {
              const isSelected = convo.id === selectedConversationId;
              const isPinned = convo.pinnedBy?.includes(currentUser.id);
              const partnerIsMax =
                (convo.partner as User)?.subscription?.tier === SubscriptionTier.Maximum ||
                (convo.partner as User)?.role === UserRole.Admin;
              const partnerIsPro = (convo.partner as User)?.subscription?.tier === SubscriptionTier.Pro;
              let lastMessageText = 'Нет сообщений';
              if (convo.lastMessage) {
                if (convo.lastMessage.media) {
                  const mediaType = convo.lastMessage.media.type || '';
                  if (mediaType.startsWith('image/')) {
                    lastMessageText = '[Изображение]';
                  } else if (mediaType.startsWith('video/')) {
                    lastMessageText = '[Видео]';
                  } else if (mediaType.startsWith('audio/')) {
                    lastMessageText = `Голосовое сообщение: ${formatTime(
                      convo.lastMessage.media.duration || 0
                    )}`;
                  } else {
                    lastMessageText = '[Медиафайл]';
                  }
                } else if (convo.lastMessage.mediaExpired) {
                  lastMessageText = '[Медиафайл удален]';
                } else {
                  lastMessageText = convo.lastMessage.text;
                }
              }

              console.log(convo);
              

              return (
                <div
                  key={convo.id}
                  className={`p-4 cursor-pointer border-l-4 ${
                    isSelected ? 'bg-brand-light border-brand-primary' : 'border-transparent hover:bg-gray-50'
                  }`}
                  onClick={() => handleSelectConversation(convo.id)}
                  onContextMenu={(e) => handleContextMenu(e, convo.id)}
                >
                  <div className="flex items-center">
                    <div className="relative">
                      {(convo.partner as any)?.isSystem ? (
                        <div className="w-12 h-12 rounded-full bg-brand-secondary flex items-center justify-center">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-6 w-6 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                            />
                          </svg>
                        </div>
                      ) : (
                        <>
                          <img
                            src={
                              convo.partner?.avatarUrl ||
                              `https://ui-avatars.com/api/?name=${convo.partner?.name}+${convo.partner?.surname}&background=2a69ac&color=fff&size=128&rounded=true`
                            }
                            alt="avatar"
                            className="w-12 h-12 rounded-full"
                          />
                          {(convo.partner as User)?.isOnline &&
                            !convo.partner?.isDeleted &&
                            !convo.id.startsWith('service-chat') && (
                              <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-green-500 border-2 border-white"></span>
                            )}
                        </>
                      )}
                    </div>
                    <div className="ml-3 flex-grow overflow-hidden">
                      <p className="font-semibold text-gray-800 truncate flex items-center gap-2">
                        <span>
                          {convo.partner?.name} {convo.partner?.surname}
                        </span>
                        {partnerIsMax && <AnimatedStar />}
                        {partnerIsPro && <StaticStar color="silver" />}
                        {convo.partner?.isDeleted && (
                          <span className="text-red-500 font-normal text-xs ml-1">(удалён)</span>
                        )}
                      </p>
                      <p
                        className={`text-sm truncate ${
                          convo.isUnread ? 'text-black font-semibold' : 'text-gray-500'
                        }`}
                      >
                        {lastMessageText}
                      </p>
                    </div>
                    <div className="flex flex-col items-end text-xs text-gray-400 ml-2 space-y-1">
                      <span>
                        {convo.lastMessage
                          ? new Date(convo.lastMessage.timestamp).toLocaleTimeString('ru-RU', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : ''}
                      </span>
                      {convo.isUnread && <span className="w-3 h-3 bg-red-500 rounded-full"></span>}
                      {isPinned && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-3 w-3 text-gray-500"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                            clipRule="evenodd"
                            transform="rotate(45 10 10)"
                          />
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      <div className={`w-full md:w-2/3 lg:w-3/4 flex flex-col ${isChatVisible ? 'flex' : 'hidden md:flex'}`}>
        {selectedConversation ? (
          <>
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => setIsChatVisible(false)} className="md:hidden text-gray-600">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M10 19l-7-7m0 0l7-7m-7 7h18"
                    />
                  </svg>
                </button>
                {(selectedConversation.partner as any)?.isSystem ? (
                  <div className="w-10 h-10 rounded-full bg-brand-secondary flex items-center justify-center flex-shrink-0">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                  </div>
                ) : (
                  <img
                    src={
                      selectedConversation.partner?.avatarUrl ||
                      `https://ui-avatars.com/api/?name=${selectedConversation.partner?.name}+${selectedConversation.partner?.surname}&background=2a69ac&color=fff&size=128&rounded=true`
                    }
                    alt="avatar"
                    className="w-10 h-10 rounded-full flex-shrink-0"
                  />
                )}
                <div>
                  <p className="font-semibold text-gray-800 flex items-center gap-2">
                    <span>
                      {selectedConversation.partner?.name} {selectedConversation.partner?.surname}
                    </span>
                    {((selectedConversation.partner as User)?.subscription?.tier ===
                      SubscriptionTier.Maximum ||
                      (selectedConversation.partner as User)?.role === UserRole.Admin) && <AnimatedStar />}
                    {(selectedConversation.partner as User)?.subscription?.tier === SubscriptionTier.Pro && (
                      <StaticStar color="silver" />
                    )}
                    {selectedConversation.partner?.isDeleted && (
                      <span className="text-red-500 font-normal text-sm ml-2">(удалён)</span>
                    )}
                  </p>
                  {(selectedConversation.partner as User)?.isOnline &&
                    !selectedConversation.partner?.isDeleted &&
                    !selectedConversation.id.startsWith('service-chat') && (
                      <p className="text-xs text-green-600">В сети</p>
                    )}
                </div>
              </div>
              {isUserChatForAdmin && partnerUser && (
                <div className="p-2 text-center bg-gray-50">
                  <label className="text-xs text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!partnerUser.canReplyToAdmin}
                      onChange={() => handleToggleReplyPermission(partnerUser)}
                      className="mr-2 h-4 w-4 text-brand-primary border-gray-300 rounded focus:ring-brand-primary"
                    />
                    Разрешить пользователю отвечать
                  </label>
                </div>
              )}
            </div>
            <div className="flex-grow p-4 overflow-y-auto bg-gray-50">
              <div className="space-y-4">
                {messagesForSelectedConvo.map((msg, index) => {
                  const isCurrentUser = msg.senderId === currentUser.id;
                  const sender = users.find((u) => u.id === msg.senderId);
                  const showAvatar =
                    index === messagesForSelectedConvo.length - 1 ||
                    messagesForSelectedConvo[index + 1].senderId !== msg.senderId;
                  return (
                    <div
                      key={msg.id}
                      className={`flex items-end gap-2 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isCurrentUser && (
                        <div className="w-8 h-8 flex-shrink-0">
                          {showAvatar && sender && (
                            <img
                              src={
                                sender.avatarUrl ||
                                `https://ui-avatars.com/api/?name=${sender.name}+${sender.surname}&background=2a69ac&color=fff&size=128&rounded=true`
                              }
                              alt="avatar"
                              className="w-8 h-8 rounded-full"
                            />
                          )}
                        </div>
                      )}
                      <div>
                        <div
                          className={`px-4 py-2 rounded-xl max-w-xs md:max-w-md ${
                            isCurrentUser
                              ? 'bg-brand-primary text-white rounded-br-none'
                              : 'bg-white text-gray-800 rounded-bl-none border'
                          }`}
                        >
                          {msg.media && msg.media.type.startsWith('image/') && (
                            <img
                              src={msg.media.url}
                              alt="Прикрепленное изображение"
                              className="rounded-lg mb-2 max-w-full h-auto"
                            />
                          )}
                          {msg.media && msg.media.type.startsWith('video/') && (
                            <video
                              src={msg.media.url}
                              controls
                              className="rounded-lg mb-2 max-w-full h-auto"
                            />
                          )}
                          {msg.media && msg.media.type.startsWith('audio/') && (
                            <AudioPlayer
                              message={msg}
                              playbackRate={playbackRates[msg.id] || 1}
                              onSpeedChange={() => handleSpeedChange(msg.id)}
                            />
                          )}
                          {msg.mediaExpired && (
                            <div className="p-2 bg-gray-100 text-gray-500 rounded-md text-center text-xs italic my-2">
                              <p>Медиафайл удален</p>
                              <p>(срок хранения истек)</p>
                            </div>
                          )}
                          {msg.text && (
                            <p
                              className="text-sm whitespace-pre-wrap"
                              dangerouslySetInnerHTML={{ __html: linkify(msg.text) }}
                            />
                          )}
                        </div>
                        <div
                          className={`mt-1 text-xs text-gray-400 flex items-center gap-1 ${
                            isCurrentUser ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          <span>
                            {new Date(msg.timestamp).toLocaleTimeString('ru-RU', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {isCurrentUser && <MessageStatusIcon status={msg.status} />}
                        </div>
                      </div>
                      {isCurrentUser && (
                        <div className="w-8 h-8 flex-shrink-0">
                          {showAvatar && (
                            <img
                              src={
                                currentUser.avatarUrl ||
                                `https://ui-avatars.com/api/?name=${currentUser.name}+${currentUser.surname}&background=2c5282&color=fff&size=128&rounded=true`
                              }
                              alt="avatar"
                              className="w-8 h-8 rounded-full"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </div>
            {isPartnerDeleted ? (
              <div className="p-4 border-t bg-gray-100 text-center text-sm text-gray-500">
                Пользователь был удален. Вы не можете отправлять сообщения в этот чат.
              </div>
            ) : canCurrentUserReply ? (
              <div className="p-1 sm:p-2 border-t bg-white relative" ref={emojiPickerRef}>
                {showEmojiPicker && (
                  <div className="absolute bottom-full left-4 mb-2 bg-white border rounded-lg shadow-lg w-72 h-64 flex flex-col">
                    <div className="flex border-b overflow-x-auto">
                      {Object.keys(emojiCategories).map((category) => (
                        <button
                          key={category}
                          type="button"
                          onClick={() => setActiveEmojiTab(category)}
                          className={`px-3 py-2 text-sm font-medium whitespace-nowrap ${
                            activeEmojiTab === category
                              ? 'text-brand-primary border-b-2 border-brand-primary'
                              : 'text-gray-500'
                          }`}
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                    <div className="p-2 flex-grow overflow-y-auto">
                      <div className="grid grid-cols-7 gap-1">
                        {emojiCategories[activeEmojiTab as keyof typeof emojiCategories].map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => handleEmojiClick(emoji)}
                            className="text-2xl p-1 rounded-md hover:bg-gray-100"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {isRecording && !isRecordingLocked && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-black/60 rounded-lg flex items-center text-white text-sm animate-fade-in-up">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-2 animate-bounce"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                    </svg>
                    <span>Смахните вверх для фиксации</span>
                  </div>
                )}

                {isRecordingLocked ? (
                  <div className="flex items-center p-2 space-x-2">
                    <button
                      type="button"
                      onClick={cancelRecording}
                      className="p-2 text-gray-500 hover:text-red-600 rounded-full"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                    <div className="flex-grow bg-gray-100 rounded-full h-10 flex items-center justify-center">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-2"></div>
                      <span className="font-mono text-gray-700">{formatTime(recordingTime)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={stopRecordingAndSend}
                      className="bg-brand-primary text-white rounded-full p-3 hover:bg-brand-secondary transition-colors"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                        />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSendMessage} className="flex items-center space-x-1 sm:space-x-2">
                    {hasMaximumSubscription && (
                      <>
                        <button
                          type="button"
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          className="p-2 text-gray-500 hover:text-brand-primary rounded-full"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-6 w-6"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={handleSendAttachment}
                          className="p-2 text-gray-500 hover:text-brand-primary rounded-full"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-6 w-6"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                            />
                          </svg>
                        </button>
                      </>
                    )}
                    <div className="flex-grow min-w-0 relative">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={isRecording ? 'Запись...' : 'Напишите сообщение...'}
                        className="w-full px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-brand-secondary"
                        disabled={isRecording}
                      />
                      {isRecording && (
                        <div className="absolute inset-0 bg-gray-100 rounded-full flex items-center px-4">
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-2"></div>
                          <span className="font-mono text-gray-700">{formatTime(recordingTime)}</span>
                        </div>
                      )}
                    </div>
                    {currentUser.subscription.tier === SubscriptionTier.Maximum &&newMessage.trim() === '' ? (
                      <button
                        type="button"
                        onMouseDown={startRecording}
                        onTouchStart={startRecording}
                        className="bg-brand-primary text-white rounded-full p-3 hover:bg-brand-secondary transition-colors"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-6 w-6"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                          />
                        </svg>
                      </button>
                    ) : (
                      <button
                        type="submit"
                        className="bg-brand-primary text-white rounded-full p-3 hover:bg-brand-secondary transition-colors"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-6 w-6"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                          />
                        </svg>
                      </button>
                    )}
                  </form>
                )}
              </div>
            ) : (
              <div className="p-4 border-t bg-gray-100 text-center text-sm text-gray-500">
                Вы не можете отвечать в этом чате. Если у вас есть вопрос, создайте новое обращение в
                техподдержку через профиль.
              </div>
            )}
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 bg-gray-50">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 text-gray-300 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <h2 className="text-xl font-semibold text-gray-700">Выберите чат</h2>
            <p className="text-gray-500 mt-1">Выберите диалог из списка слева, чтобы начать общение.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
