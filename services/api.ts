import { fetcher } from './fetcher';
import * as localDb from './localDb';
import {
  User,
  TrainingSession,
  Skill,
  Announcement,
  NewsItem,
  DeveloperMessage,
  AdminPermissions,
  LibraryPost,
  Conversation,
  ChatMessage,
  AppSettings,
  PasswordResetRequest,
  NewLocationRequest,
  WelcomePageContent,
  DeletionInfo,
  BonusTransaction,
} from '../types';

const NETWORK_DELAY = 0; // Removed delay for real network
const clone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));

// --- Generic Fetcher for Offline Support ---
const networkFirstFetcher = async <T>(
  storeName: string,
  networkFetch: () => Promise<T[]>,
  hasId: boolean = true
): Promise<T[]> => {
  try {
    const data = await networkFetch();
    localDb
      .saveData(storeName, data as any)
      .catch((err) => console.error(`Failed to cache ${storeName}`, err));
    return data;
  } catch (error) {
    console.warn(`Network fetch failed for ${storeName}. Falling back to local data.`, error);
    const localData = await localDb.getData<T>(storeName);
    if (localData && localData.length > 0) {
      return localData;
    }
    throw error;
  }
};

const handleMutation = async <T>(
  type: string,
  payload: any,
  networkFn: () => Promise<T>,
  optimisticUpdate?: () => Promise<T>
): Promise<T> => {
  if (!navigator.onLine) {
    await localDb.addToSyncQueue({ type, payload, timestamp: new Date().toISOString() });
    if (optimisticUpdate) {
      return await optimisticUpdate();
    }
    throw new Error('Offline. The action has been queued.');
  }
  return await networkFn();
};

// --- API Calls implementing backend endpoints ---

const _apiGetAllUsers = () => fetcher.get<User[]>('/users');
const _apiGetAllTrainings = () => fetcher.get<TrainingSession[]>('/trainings');
const _apiGetAllAnnouncements = () => fetcher.get<Announcement[]>('/announcements');
const _apiGetAllNews = () => fetcher.get<NewsItem[]>('/news');
const _apiGetAllLibraryPosts = () => fetcher.get<LibraryPost[]>('/library');
const _apiGetAllDeveloperMessages = () => fetcher.get<DeveloperMessage[]>('/messages');
const _apiGetConversations = (userId: string) => fetcher.get<Conversation[]>('/chat/conversations');
const _apiGetAllChatMessages = () => fetcher.get<ChatMessage[]>('/chat/messages');
const _apiGetSettings = () => fetcher.get<AppSettings>('/settings');
const _apiGetAllPasswordResetRequests = () => fetcher.get<PasswordResetRequest[]>('/requests/password-reset');
const _apiGetAllNewLocationRequests = () => fetcher.get<NewLocationRequest[]>('/requests/location');
const _apiGetLocations = () => fetcher.get<Record<string, Record<string, string[]>>>('/settings/locations');
const _apiGetWelcomePageContent = () => fetcher.get<WelcomePageContent>('/settings/welcome');
const _apiGetAllBonusTransactions = () => fetcher.get<BonusTransaction[]>('/settings/bonuses');

// --- Mock Data Placeholders ---
// Skills are not fully implemented in backend handlers yet (DB model exists), using basic fetch
const _apiGetAllSkills = async () => [];

// --- Public API Functions ---

export const apiGetAllUsers = () => networkFirstFetcher('users', _apiGetAllUsers);
export const apiGetAllTrainings = () => networkFirstFetcher('trainings', _apiGetAllTrainings);
export const apiGetAllSkills = () => networkFirstFetcher('skills', _apiGetAllSkills);
export const apiGetAllAnnouncements = () => networkFirstFetcher('announcements', _apiGetAllAnnouncements);
export const apiGetAllNews = () => networkFirstFetcher('news', _apiGetAllNews);
export const apiGetAllLibraryPosts = () => networkFirstFetcher('libraryPosts', _apiGetAllLibraryPosts);
export const apiGetAllDeveloperMessages = () =>
  networkFirstFetcher('developerMessages', _apiGetAllDeveloperMessages);
export const apiGetConversations = (userId: string) =>
  networkFirstFetcher('conversations', () => _apiGetConversations(userId));
export const apiGetAllChatMessages = () => networkFirstFetcher('chatMessages', _apiGetAllChatMessages);
export const apiGetSettings = () =>
  networkFirstFetcher(
    'settings',
    async () => {
      const settings = await _apiGetSettings();
      return settings ? [settings] : [];
    },
    true
  ).then((s) => s[0] || null);
export const apiGetAllPasswordResetRequests = () =>
  networkFirstFetcher('passwordResetRequests', _apiGetAllPasswordResetRequests);
export const apiGetAllNewLocationRequests = () =>
  networkFirstFetcher('newLocationRequests', _apiGetAllNewLocationRequests);
export const apiGetLocations = () =>
  networkFirstFetcher('locations', async () => {
    const locs = await _apiGetLocations();
    return locs ? [{ id: 'singleton', data: locs }] : [];
  }).then((l) => l[0]?.data || null);
export const apiGetWelcomePageContent = () =>
  networkFirstFetcher(
    'welcomePageContent',
    async () => {
      const content = await _apiGetWelcomePageContent();

      // Ensure content has id for IndexedDB storage (it should already have it per type, but ensure it)
      if (content) {
        const contentWithId = content.id ? content : { id: 'singleton' as const, ...content };
        return [contentWithId];
      }
      return [];
    },
    true
  ).then((c) => {
    // Return the content (id is part of WelcomePageContent type)
    if (c && c.length > 0 && c[0]) {
      return c[0] as WelcomePageContent;
    }
    return null;
  });
export const apiGetAllBonusTransactions = () =>
  networkFirstFetcher('bonusTransactions', _apiGetAllBonusTransactions);

// Cleanup functions - moved to backend logic usually, but endpoints triggered here
export const apiCleanupOldMedia = async () => {
  /* Backend handles cleanup tasks usually */ return false;
};
export const apiCleanupOldChatMedia = async () => {
  return false;
};
export const apiCleanupDeletedUserAvatars = async () => {
  return false;
};

export const apiGetUserById = async (userId: string): Promise<User | null> => {
  try {
    const users = await _apiGetAllUsers(); // Optimally backend has getById, but for now reuse list
    return users.find((u) => u.id === userId) || null;
  } catch (e) {
    const users = await localDb.getData<User>('users');
    return users.find((u) => u.id === userId) || null;
  }
};

// --- Mutations ---

// Auth
export const apiLogin = (email: string, password?: string) =>
  fetcher.post<{ user: User; token: string }>('/auth/login', { email, password });
export const apiRegister = (newUserPartial: any) =>
  fetcher.post<{ user: User; token: string }>('/auth/register', newUserPartial);
export const apiVerifyToken = (token: string) => fetcher.get<User>('/auth/verify', token);
export const apiLogout = async (token: string) => {
  /* Stateless JWT, client just drops token */
};

// User
export const apiUpdateUser = (userId: string, updatedData: Partial<User>, token: string) =>
  handleMutation('UPDATE_USER', { userId, updatedData, token }, () =>
    fetcher.put<User>(`/users/${userId}`, updatedData, token)
  );
export const apiUpdateAllUsers = (users: User[], token: string) => Promise.resolve(); // Not typically needed in real backend
export const apiSendLinkRequest = (targetUserId: string, token: string) =>
  handleMutation('SEND_LINK_REQUEST', { targetUserId, token }, () =>
    fetcher.post<{ success: boolean; message: string }>(`/users/${targetUserId}/request-link`, {}, token)
  );
export const apiRespondToLinkRequest = (requesterId: string, accept: boolean, token: string) =>
  handleMutation('RESPOND_LINK_REQUEST', { requesterId, accept, token }, () =>
    fetcher.post<{ success: boolean; message: string }>(
      `/users/${requesterId}/respond-link-request`,
      { accept },
      token
    )
  );
export const apiDeleteUser = (userId: string, token: string, method: DeletionInfo['method']) =>
  handleMutation('DELETE_USER', { userId, token, method }, () =>
    fetcher.delete(`/users/${userId}`, { method }, token)
  );
export const apiUpdateUserAndId = (oldId: string, updatedData: Partial<User>, token: string) =>
  handleMutation('UPDATE_USER_AND_ID', { oldId, updatedData, token }, () =>
    fetcher.post<{ success: boolean }>(`/users/update-id/${oldId}`, updatedData, token)
  );
export const apiCreateAdminUser = (data: any, token: string) =>
  fetcher.post<User>('/auth/register', { ...data, role: 'Admin' }, token); // Using register for admin creation
export const apiChangePassword = (oldPass: string, newPass: string, token: string) =>
  Promise.resolve({ success: false, message: 'Endpoint not implemented' }); // Needs specific endpoint
export const apiAdminResetPassword = (targetUserId: string, newPass: string, token: string) =>
  fetcher
    .post(
      '/requests/password-reset/resolve',
      { requestId: 'manual', newPassword: newPass, targetUserId },
      token
    )
    .then(() => ({ success: true, message: 'Password reset' })); // Adjusted logic needed

// Training
export const apiAddTraining = (newTrainingData: any, author: User, token: string) =>
  handleMutation('ADD_TRAINING', { newTrainingData, author, token }, () =>
    fetcher.post<TrainingSession[]>('/trainings', newTrainingData, token)
  );
export const apiUpdateTraining = (trainingId: string, updatedData: Partial<TrainingSession>, token: string) =>
  handleMutation('UPDATE_TRAINING', { trainingId, updatedData, token }, () =>
    fetcher.put<TrainingSession[]>(`/trainings/${trainingId}`, updatedData, token).then(() => {})
  );
export const apiDeleteTraining = (trainingId: string, token: string) =>
  handleMutation('DELETE_TRAINING', { trainingId, token }, () =>
    fetcher.delete(`/trainings/${trainingId}`, {}, token).then(() => {})
  );

// Announcement
export const apiAddAdminAnnouncement = (data: any, token: string) =>
  handleMutation('ADD_ADMIN_ANNOUNCEMENT', { data, token }, () =>
    fetcher.post<Announcement[]>('/announcements', data, token)
  );
export const apiAddUserAnnouncement = (data: any, user: User, token: string) =>
  handleMutation('ADD_USER_ANNOUNCEMENT', { data, user, token }, () =>
    fetcher.post<Announcement[]>('/announcements', data, token)
  );
export const apiUpdateAnnouncement = (id: string, data: any, token: string) =>
  handleMutation('UPDATE_ANNOUNCEMENT', { id, data, token }, () =>
    fetcher.put<Announcement[]>(`/announcements/${id}`, data, token)
  );
export const apiModerateAnnouncement = (id: string, isApproved: boolean, token: string) =>
  handleMutation('MODERATE_ANNOUNCEMENT', { id, isApproved, token }, () =>
    fetcher.put<void>(
      `/announcements/${id}`,
      { isModerated: true, status: isApproved ? 'published' : 'trashed' },
      token
    )
  );
export const apiDeleteAnnouncement = (id: string, token: string) =>
  handleMutation('DELETE_ANNOUNCEMENT', { id, token }, () =>
    fetcher.delete(`/announcements/${id}`, {}, token).then(() => {})
  );
export const apiRestoreAnnouncement = (id: string, token: string) =>
  handleMutation('RESTORE_ANNOUNCEMENT', { id, token }, () =>
    fetcher.put(`/announcements/${id}`, { status: 'published' }, token).then(() => {})
  );
export const apiPermanentlyDeleteAnnouncement = (id: string, token: string) =>
  handleMutation('PERMANENTLY_DELETE_ANNOUNCEMENT', { id, token }, () =>
    fetcher.delete(`/announcements/${id}`, {}, token).then(() => {})
  );

// News & Library
export const apiAddNewsItem = (data: any, token: string) =>
  handleMutation('ADD_NEWS_ITEM', { data, token }, () => fetcher.post<NewsItem[]>('/news', data, token));
export const apiUpdateNewsItem = (id: string, data: any, token: string) =>
  handleMutation('UPDATE_NEWS_ITEM', { id, data, token }, () =>
    fetcher.put<NewsItem[]>(`/news/${id}`, data, token)
  );
export const apiDeleteNewsItem = (id: string, token: string) =>
  handleMutation('DELETE_NEWS_ITEM', { id, token }, () =>
    fetcher.delete(`/news/${id}`, {}, token).then(() => {})
  );

export const apiAddLibraryPost = (data: any, token: string) =>
  handleMutation('ADD_LIBRARY_POST', { data, token }, () =>
    fetcher.post<LibraryPost[]>('/library', data, token)
  );
export const apiUpdateLibraryPost = (id: string, data: any, token: string) =>
  handleMutation('UPDATE_LIBRARY_POST', { id, data, token }, () =>
    fetcher.put<LibraryPost[]>(`/library/${id}`, data, token)
  );
export const apiDeleteLibraryPost = (id: string, token: string) =>
  handleMutation('DELETE_LIBRARY_POST', { id, token }, () =>
    fetcher.delete(`/library/${id}`, {}, token).then(() => {})
  );

// Messages & Chat
export const apiAddDeveloperMessage = (subject: string, message: string, token: string) =>
  handleMutation('ADD_DEV_MESSAGE', { subject, message, token }, () =>
    fetcher.post('/messages', { subject, message }, token)
  );
export const apiUpdateDeveloperMessage = (id: string, data: any, token: string) =>
  handleMutation('UPDATE_DEV_MESSAGE', { id, data, token }, () =>
    fetcher.put(`/messages/${id}`, data, token)
  );
export const apiDeleteDeveloperMessage = (id: string, token: string) =>
  handleMutation('DELETE_DEV_MESSAGE', { id, token }, () => fetcher.delete(`/messages/${id}`, {}, token));

export const apiSendMessage = (chatId: string, content: any, token: string) =>
  handleMutation('SEND_MESSAGE', { chatId, content, token }, () =>
    fetcher.post('/chat/messages', { chatId, content }, token)
  );
export const apiFindOrCreateConversation = (targetUserId: string, token: string) =>
  fetcher.post<Conversation>('/chat/conversations/find-or-create', { targetUserId }, token);
export const apiUpdateConversation = (conversationId: string, updatedData: any, token: string) =>
  Promise.resolve(); // Not exposed in chat router yet
export const apiUpdateLastReadTimestamp = (chatId: string, userId: string, token: string) =>
  fetcher.put<Conversation>(`/users/${userId}/update-read-timestamp`, { chatId }, token);
export const apiMarkMessagesAsRead = (chatId: string, token: string) =>
  fetcher.put<Conversation>('/chat/messages/mark-read', { chatId }, token); // Optimization

// Other
export const apiSubmitVote = (itemId: string, itemType: string, optionIds: string[], token: string) =>
  handleMutation('SUBMIT_VOTE', { itemId, itemType, optionIds, token }, () =>
    fetcher.post('/interactions/vote', { itemId, itemType, optionIds }, token)
  );
export const apiSubmitQuizAnswer = (itemId: string, itemType: string, optionIds: string[], token: string) =>
  handleMutation('SUBMIT_QUIZ_ANSWER', { itemId, itemType, optionIds, token }, () =>
    fetcher.post('/interactions/quiz', { itemId, itemType, optionIds }, token)
  );

export const apiUpdateSettings = (settings: Partial<AppSettings>, token: string) =>
  handleMutation('UPDATE_SETTINGS', { settings, token }, () => fetcher.put('/settings', settings, token));
export const apiUpdateLocations = (locations: any, token: string) =>
  handleMutation('UPDATE_LOCATIONS', { locations, token }, () =>
    fetcher.put('/settings/locations', locations, token)
  );
export const apiUpdateWelcomePageContent = (content: Partial<WelcomePageContent>, token: string) =>
  handleMutation('UPDATE_WELCOME', { content, token }, () =>
    fetcher.put('/settings/welcome', content, token)
  );

export const apiSubmitPasswordResetRequest = (email: string) =>
  fetcher.post<{ success: boolean; message: string }>('/requests/password-reset/submit', { email });
export const apiResolvePasswordResetRequest = (requestId: string, newPassword: string, token: string) =>
  fetcher.post<{ success: boolean; message: string }>(
    '/requests/password-reset/resolve',
    { requestId, newPassword },
    token
  );
export const apiDeletePasswordResetHistory = (id: string, token: string) =>
  fetcher.delete(`/requests/password-reset/${id}`, {}, token);

export const apiResolveNewLocationRequest = (
  requestId: string,
  isApproved: boolean,
  token: string,
  correctedLocation?: any
) => fetcher.post('/requests/location/resolve', { requestId, isApproved, correctedLocation }, token);

export const apiAdminUpdateBonuses = (
  adminId: string,
  targetUserId: string,
  amount: number,
  description: string,
  token: string
) =>
  handleMutation('ADMIN_UPDATE_BONUSES', { adminId, targetUserId, amount, description, token }, () =>
    fetcher.post('/settings/bonuses/admin-update', { targetUserId, amount, description }, token)
  );
export const apiExpireBonuses = () => fetcher.post('/settings/bonuses/expire', {});

// Sync Logic - Syncs offline changes to backend when connection is restored
export const syncOfflineChanges = async (token: string): Promise<void> => {
  const queue = await localDb.getSyncQueue();
  if (queue.length === 0) return;
  console.log(`Syncing ${queue.length} offline changes...`);

  for (const item of queue) {
    try {
      const payload = { ...item.payload, token: item.payload.token || token };

      // Map mutation types to actual API calls
      switch (item.type) {
        case 'UPDATE_USER':
          await fetcher.put<User>(`/users/${payload.userId}`, payload.updatedData, token);
          break;
        case 'DELETE_USER':
          await fetcher.delete(`/users/${payload.userId}`, { method: payload.method }, token);
          break;
        case 'UPDATE_USER_AND_ID':
          await fetcher.post<{ success: boolean }>(
            `/users/update-id/${payload.oldId}`,
            payload.updatedData,
            token
          );
          break;
        case 'ADD_TRAINING':
          await fetcher.post<TrainingSession[]>('/trainings', payload.newTrainingData, token);
          break;
        case 'UPDATE_TRAINING':
          await fetcher.put<TrainingSession[]>(
            `/trainings/${payload.trainingId}`,
            payload.updatedData,
            token
          );
          break;
        case 'DELETE_TRAINING':
          await fetcher.delete(`/trainings/${payload.trainingId}`, {}, token);
          break;
        case 'ADD_ADMIN_ANNOUNCEMENT':
        case 'ADD_USER_ANNOUNCEMENT':
          await fetcher.post<Announcement[]>('/announcements', payload.data, token);
          break;
        case 'UPDATE_ANNOUNCEMENT':
          await fetcher.put<Announcement[]>(`/announcements/${payload.id}`, payload.data, token);
          break;
        case 'MODERATE_ANNOUNCEMENT':
          await fetcher.put<void>(
            `/announcements/${payload.id}`,
            { isModerated: true, status: payload.isApproved ? 'published' : 'trashed' },
            token
          );
          break;
        case 'DELETE_ANNOUNCEMENT':
        case 'PERMANENTLY_DELETE_ANNOUNCEMENT':
          await fetcher.delete(`/announcements/${payload.id}`, {}, token);
          break;
        case 'RESTORE_ANNOUNCEMENT':
          await fetcher.put(`/announcements/${payload.id}`, { status: 'published' }, token);
          break;
        case 'ADD_NEWS_ITEM':
          await fetcher.post<NewsItem[]>('/news', payload.data, token);
          break;
        case 'UPDATE_NEWS_ITEM':
          await fetcher.put<NewsItem[]>(`/news/${payload.id}`, payload.data, token);
          break;
        case 'DELETE_NEWS_ITEM':
          await fetcher.delete(`/news/${payload.id}`, {}, token);
          break;
        case 'ADD_LIBRARY_POST':
          await fetcher.post<LibraryPost[]>('/library', payload.data, token);
          break;
        case 'UPDATE_LIBRARY_POST':
          await fetcher.put<LibraryPost[]>(`/library/${payload.id}`, payload.data, token);
          break;
        case 'DELETE_LIBRARY_POST':
          await fetcher.delete(`/library/${payload.id}`, {}, token);
          break;
        case 'ADD_DEV_MESSAGE':
          await fetcher.post('/messages', { subject: payload.subject, message: payload.message }, token);
          break;
        case 'UPDATE_DEV_MESSAGE':
          await fetcher.put(`/messages/${payload.id}`, payload.data, token);
          break;
        case 'DELETE_DEV_MESSAGE':
          await fetcher.delete(`/messages/${payload.id}`, {}, token);
          break;
        case 'SEND_MESSAGE':
          await fetcher.post('/chat/messages', { chatId: payload.chatId, content: payload.content }, token);
          break;
        case 'SUBMIT_VOTE':
          await fetcher.post(
            '/interactions/vote',
            { itemId: payload.itemId, itemType: payload.itemType, optionIds: payload.optionIds },
            token
          );
          break;
        case 'SUBMIT_QUIZ_ANSWER':
          await fetcher.post(
            '/interactions/quiz',
            { itemId: payload.itemId, itemType: payload.itemType, optionIds: payload.optionIds },
            token
          );
          break;
        case 'UPDATE_SETTINGS':
          await fetcher.put('/settings', payload.settings, token);
          break;
        case 'UPDATE_LOCATIONS':
          await fetcher.put('/settings/locations', payload.locations, token);
          break;
        case 'UPDATE_WELCOME':
          await fetcher.put('/settings/welcome', payload.content, token);
          break;
        case 'ADMIN_UPDATE_BONUSES':
          await fetcher.post(
            '/settings/bonuses/admin-update',
            { targetUserId: payload.targetUserId, amount: payload.amount, description: payload.description },
            token
          );
          break;
        case 'SEND_LINK_REQUEST':
          await fetcher.post<{ success: boolean; message: string }>(
            `/users/${payload.targetUserId}/request-link`,
            {},
            token
          );
          break;
        case 'RESPOND_LINK_REQUEST':
          await fetcher.post<{ success: boolean; message: string }>(
            `/users/${payload.requesterId}/respond-link-request`,
            { accept: payload.accept },
            token
          );
          break;
        default:
          console.warn(`Unknown mutation type: ${item.type}`);
          await localDb.deleteFromSyncQueue(item.id!);
          continue;
      }

      // Remove successfully synced item from queue
      await localDb.deleteFromSyncQueue(item.id!);
      console.log(`Successfully synced ${item.type} (id: ${item.id})`);
    } catch (error) {
      console.error(`Failed to sync item ${item.id} (type: ${item.type}):`, error);
      // Keep item in queue to retry later
    }
  }

  const remainingQueue = await localDb.getSyncQueue();
  if (remainingQueue.length > 0) {
    console.warn(`${remainingQueue.length} items still pending sync`);
  } else {
    console.log('All offline changes synced successfully');
  }
};
