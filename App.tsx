import React, { useState, useMemo, useContext, useEffect } from 'react';
// FIX: Updated react-router-dom imports to v6 syntax (Routes, Navigate instead of Switch, Redirect).
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import * as api from './services/api';
import * as localDb from './services/localDb';
import LoginPage from './pages/LoginPage';
import WelcomePage from './pages/WelcomePage';
// FIX: Changed DashboardPage to a named import to resolve a module resolution error, likely caused by a circular dependency.
import { DashboardPage } from './pages/DashboardPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
// FIX: Using named import for CalendarPage to fix circular dependency issue.
import { CalendarPage } from './pages/CalendarPage';
// FIX: Changed SkillsPage to a named import to resolve a circular dependency, which was causing type inference issues.
import { SkillsPage } from './pages/SkillsPage';
import AnnouncementsPage from './pages/GoalsPage'; // Formerly GoalsPage
import ChatPage from './pages/ProfilePage'; // Formerly ProfilePage
import NewsPage from './pages/ChatPage'; // Formerly ChatPage
import LibraryPage from './pages/LibraryPage';
import MyStudentsPage from './pages/MyStudentsPage';
// FIX: Changed to a named import to resolve a possible circular dependency issue.
import { SettingsPage } from './pages/SettingsPage';
// FIX: Changed AdminMessagesPage to a named import to resolve a circular dependency issue.
import { AdminMessagesPage } from './pages/AdminMessagesPage';
// FIX: Changed AdminRequestsPage to a named import to resolve a circular dependency issue.
import { AdminRequestsPage } from './pages/AdminRequestsPage';
import Layout from './components/Layout';
import {
  User,
  UserRole,
  TrainingSession,
  SubscriptionTier,
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
  LOCATION_DATA,
  WelcomePageContent,
  BonusTransaction,
} from './types';
import LegalPage from './pages/LegalPage';

interface Toast {
  id: string;
  message: string;
}

export const AuthContext = React.createContext<{
  user: User | null;
  users: User[];
  passwordResetRequests: PasswordResetRequest[];
  newLocationRequests: NewLocationRequest[];
  login: (email: string, password?: string) => Promise<User | null>;
  logout: () => Promise<void>;
  updateUser: (updatedUser: Partial<User>) => Promise<void>;
  updateUserSilently: (updatedUser: Partial<User>) => Promise<void>;
  silentlyUpdateUserInList: (userId: string, patchData: Partial<User>) => Promise<void>;
  updateUsers: (updatedUsers: User[]) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  deleteCurrentUser: () => Promise<void>;
  updateUserAndId: (oldId: string, updatedData: Partial<User>) => Promise<boolean>;
  registerAndLogin: (
    newUser: Omit<User, 'id' | 'registrationDate' | 'linkedUsers' | 'passwordHash' | 'salt'> & {
      password: string;
      referredBy?: string;
    }
  ) => Promise<User | null>;
  createAdminUser: (
    newAdmin: Omit<User, 'id' | 'registrationDate' | 'linkedUsers' | 'role' | 'passwordHash' | 'salt'> & {
      permissions: AdminPermissions;
      password: string;
    }
  ) => Promise<User | null>;
  changePassword: (
    oldPassword: string,
    newPassword: string
  ) => Promise<{ success: boolean; message: string }>;
  adminResetPassword: (
    targetUserId: string,
    newPassword: string
  ) => Promise<{ success: boolean; message: string }>;
  submitPasswordResetRequest: (email: string) => Promise<{ success: boolean; message: string }>;
  resolvePasswordResetRequest: (
    requestId: string,
    newPassword: string
  ) => Promise<{ success: boolean; message: string }>;
  deletePasswordResetHistory: (requestId: string) => Promise<void>;
  resolveNewLocationRequest: (
    requestId: string,
    isApproved: boolean,
    correctedLocation?: { city: string; region: string; country: string }
  ) => Promise<void>;
  adminUpdateBonuses: (targetUserId: string, amount: number, description: string) => Promise<void>;
  hasProfileRequest: boolean;
  hasMyStudentsRequest: boolean;
  hasTrainingRequest: boolean;
  hasUnreadAnnouncements: boolean;
  hasUnreadNews: boolean;
  hasUnreadLibraryPosts: boolean;
  hasUnreadMessages: boolean;
  hasUnreadChatMessages: boolean;
  pendingAnnouncementCount: number;
  hasPendingPasswordResetRequests?: boolean;
  hasPendingLocationRequests?: boolean;
} | null>(null);

export const DataContext = React.createContext<{
  trainings: TrainingSession[];
  skills: Skill[];
  announcements: Announcement[];
  news: NewsItem[];
  libraryPosts: LibraryPost[];
  developerMessages: DeveloperMessage[];
  conversations: Conversation[];
  chatMessages: ChatMessage[];
  bonusTransactions: BonusTransaction[];
  settings: AppSettings;
  locations: Record<string, Record<string, string[]>>;
  welcomePageContent: WelcomePageContent | null;
  addTraining: (
    newTrainingData: Omit<TrainingSession, 'id' | 'authorId' | 'participants' | 'status'> & {
      partnerId?: string | null;
      creatorRoleForSession?: UserRole | null;
    }
  ) => Promise<void>;
  updateTraining: (trainingId: string, updatedData: Partial<TrainingSession>) => Promise<void>;
  deleteTraining: (trainingId: string) => Promise<void>;
  addAdminAnnouncement: (
    newAnnouncement: Omit<Announcement, 'id' | 'authorId' | 'timestamp' | 'status'>
  ) => Promise<void>;
  addUserAnnouncement: (
    newAnnouncement: Omit<Announcement, 'id' | 'authorId' | 'timestamp' | 'status' | 'submittedById'>
  ) => Promise<void>;
  moderateAnnouncement: (announcementId: string, isApproved: boolean) => Promise<void>;
  updateAnnouncement: (
    announcementId: string,
    updatedData: Partial<Omit<Announcement, 'id' | 'authorId' | 'timestamp'>>
  ) => Promise<void>;
  updateAnnouncementSilently: (
    announcementId: string,
    updatedData: Partial<Omit<Announcement, 'id' | 'authorId' | 'timestamp'>>
  ) => Promise<void>;
  deleteAnnouncement: (announcementId: string) => Promise<void>;
  restoreAnnouncement: (announcementId: string) => Promise<void>;
  permanentlyDeleteAnnouncement: (announcementId: string) => Promise<void>;
  addNewsItem: (newNewsItem: Omit<NewsItem, 'id' | 'authorId' | 'timestamp'>) => Promise<void>;
  updateNewsItem: (
    newsItemId: string,
    updatedData: Partial<Omit<NewsItem, 'id' | 'authorId' | 'timestamp'>>
  ) => Promise<void>;
  deleteNewsItem: (newsItemId: string) => Promise<void>;
  addLibraryPost: (newLibraryPost: Omit<LibraryPost, 'id' | 'authorId' | 'timestamp'>) => Promise<void>;
  updateLibraryPost: (
    postId: string,
    updatedData: Partial<Omit<LibraryPost, 'id' | 'authorId' | 'timestamp'>>
  ) => Promise<void>;
  deleteLibraryPost: (postId: string) => Promise<void>;
  addDeveloperMessage: (subject: string, message: string) => Promise<void>;
  updateDeveloperMessage: (messageId: string, updatedData: Partial<DeveloperMessage>) => Promise<void>;
  deleteDeveloperMessage: (messageId: string) => Promise<void>;
  submitVote: (
    itemId: string,
    itemType: 'announcement' | 'news' | 'library',
    optionIds: string[]
  ) => Promise<void>;
  submitQuizAnswer: (
    itemId: string,
    itemType: 'announcement' | 'news' | 'library',
    optionIds: string[]
  ) => Promise<void>;
  // FIX: Added optional `duration` property to support sending audio/video message duration.
  sendMessage: (
    chatId: string,
    content: { text?: string; media?: { url: string; type: string; duration?: number } }
  ) => Promise<void>;
  findOrCreateConversation: (targetUserId: string) => Promise<Conversation | null>;
  updateConversation: (conversationId: string, updatedData: Partial<Conversation>) => Promise<void>;
  updateLastReadTimestamp: (chatId: string) => Promise<void>;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  updateLocations: (newLocations: Record<string, Record<string, string[]>>) => Promise<void>;
  updateWelcomePageContent: (newContent: Partial<WelcomePageContent>) => Promise<void>;
} | null>(null);

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [token, setToken] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [trainings, setTrainings] = useState<TrainingSession[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [libraryPosts, setLibraryPosts] = useState<LibraryPost[]>([]);
  const [developerMessages, setDeveloperMessages] = useState<DeveloperMessage[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [bonusTransactions, setBonusTransactions] = useState<BonusTransaction[]>([]);
  const [passwordResetRequests, setPasswordResetRequests] = useState<PasswordResetRequest[]>([]);
  const [newLocationRequests, setNewLocationRequests] = useState<NewLocationRequest[]>([]);
  const [locations, setLocations] = useState<Record<string, Record<string, string[]>>>(LOCATION_DATA);
  const [welcomePageContent, setWelcomePageContent] = useState<WelcomePageContent | null>(null);
  // FIX: Added id to initial settings state to match the AppSettings type.
  const [settings, setSettings] = useState<AppSettings>({
    id: 'default',
    announcementBasePrice: 500,
    defaultAnnouncementDeletion: 'none',
    defaultNewsDeletion: 'none',
    defaultLibraryDeletion: 'none',
    termsOfService: '',
    privacyPolicy: '',
  });

  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tick, setTick] = useState(0);

  // Notification state
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [shownNotifications, setShownNotifications] = useState(new Set<string>());

  const handleApiError = async (error: any) => {
    if (
      error instanceof Error &&
      (error.message.includes('Access Denied') || error.message.includes('token'))
    ) {
      console.warn('Token error detected, logging out.');
      await logout();
    } else {
      console.error('An API error occurred:', error);
    }
  };

  useEffect(() => {
    const checkForInactiveUsers = async () => {
      if (!token || !currentUser || currentUser.role !== UserRole.Admin) return;

      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const usersToDelete = allUsers.filter(
        (u) =>
          u.role !== UserRole.Admin && !u.isDeleted && u.lastLogin && new Date(u.lastLogin) < sixMonthsAgo
      );

      if (usersToDelete.length > 0) {
        console.log(`Auto-deleting ${usersToDelete.length} inactive user(s).`);
        const userIdsToDelete = usersToDelete.map((u) => u.id);
        try {
          const deletePromises = userIdsToDelete.map((id) => api.apiDeleteUser(id, token, 'auto'));
          await Promise.all(deletePromises);
          await fetchAllData(currentUser);
          console.log('Inactive users deleted and data refreshed.');
        } catch (err) {
          console.error('An error occurred during automatic user deletion:', err);
        }
      }
    };

    const timer = setInterval(() => {
      setTick((prev) => prev + 1);
      checkForInactiveUsers();
    }, 60000); // Check every minute

    return () => clearInterval(timer);
  }, [currentUser, allUsers, token]);

  useEffect(() => {
    const checkExpiredBonuses = async () => {
      if (!token) return;
      try {
        await api.apiExpireBonuses();
        if (currentUser) {
          const freshUser = await api.apiGetUserById(currentUser.id);
          // only update if bonus amount changed to avoid re-renders
          if (freshUser && freshUser.bonuses !== currentUser.bonuses) {
            setCurrentUser(freshUser);
          }
          const freshTransactions = await api.apiGetAllBonusTransactions();
          setBonusTransactions(freshTransactions);
        }
      } catch (err) {
        console.warn('Bonus expiration check failed (likely offline).', err);
      }
    };

    // Run once on load, and then every 5 minutes
    checkExpiredBonuses();
    const bonusTimer = setInterval(checkExpiredBonuses, 5 * 60 * 1000);

    return () => clearInterval(bonusTimer);
  }, [token, currentUser?.id]);

  useEffect(() => {
    const cleanupMedia = async () => {
      if (!token) return;
      try {
        const changed = await api.apiCleanupOldMedia();
        if (changed) {
          console.log('Old media cleaned up, refreshing data.');
          if (currentUser) await fetchAllData(currentUser);
        }
      } catch (err) {
        console.warn('Media cleanup check failed (likely offline).', err);
      }
    };
    cleanupMedia();
    const mediaTimer = setInterval(cleanupMedia, 24 * 60 * 60 * 1000); // Run once a day
    return () => clearInterval(mediaTimer);
  }, [token, currentUser?.id]);

  useEffect(() => {
    const cleanupChatMedia = async () => {
      if (!token) return;
      try {
        const changed = await api.apiCleanupOldChatMedia();
        if (changed) {
          console.log('Old chat media cleaned up, refreshing data.');
          const freshChatMessages = await api.apiGetAllChatMessages();
          setChatMessages(freshChatMessages);
        }
      } catch (err) {
        console.warn('Chat media cleanup check failed (likely offline).', err);
      }
    };
    cleanupChatMedia();
    const chatMediaTimer = setInterval(cleanupChatMedia, 24 * 60 * 60 * 1000); // Run once a day
    return () => clearInterval(chatMediaTimer);
  }, [token]);

  useEffect(() => {
    const cleanupAvatars = async () => {
      if (!token) return;
      try {
        const changed = await api.apiCleanupDeletedUserAvatars();
        if (changed) {
          console.log('Old avatars of deleted users cleaned up, refreshing user list.');
          const freshUsers = await api.apiGetAllUsers();
          setAllUsers(freshUsers);
        }
      } catch (err) {
        console.warn('Deleted user avatar cleanup check failed (likely offline).', err);
      }
    };
    cleanupAvatars();
    const avatarTimer = setInterval(cleanupAvatars, 24 * 60 * 60 * 1000); // Run once a day
    return () => clearInterval(avatarTimer);
  }, [token]);

  // Offline mode: Sync on becoming online
  useEffect(() => {
    localDb.initDB();

    const handleOnline = async () => {
      console.log('App is back online. Syncing changes...');
      const currentToken = token || sessionStorage.getItem('authToken');
      if (currentToken) {
        await api.syncOfflineChanges(currentToken);
        if (currentUser) {
          await fetchAllData(currentUser);
        }
      }
    };

    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [currentUser, token]);

  // Auto-refresh chat data
  useEffect(() => {
    if (!currentUser || !token) return;

    const refreshChatData = async () => {
      try {
        const [freshConversations, freshChatMessages] = await Promise.all([
          api.apiGetConversations(currentUser.id),
          api.apiGetAllChatMessages(),
        ]);
        setConversations(freshConversations);
        setChatMessages(freshChatMessages);
      } catch (err) {
        console.warn('Chat data refresh failed (likely offline).', err);
      }
    };

    // Check if user is on chat page
    const isInChat = () => {
      const hash = window.location.hash;
      return hash === '#/chat' || hash.startsWith('#/chat/');
    };

    // Initial refresh
    refreshChatData();

    let lastRefreshTime = Date.now();
    const checkAndRefresh = () => {
      const inChat = isInChat();
      const now = Date.now();
      const timeSinceLastRefresh = now - lastRefreshTime;

      if (inChat) {
        // In chat: refresh every 5 seconds
        if (timeSinceLastRefresh >= 5000) {
          refreshChatData();
          lastRefreshTime = now;
        }
      } else {
        // Not in chat: refresh every 1 minute
        if (timeSinceLastRefresh >= 60000) {
          refreshChatData();
          lastRefreshTime = now;
        }
      }
    };

    // Check every second to handle location changes
    const chatTimer = setInterval(checkAndRefresh, 1000);

    return () => clearInterval(chatTimer);
  }, [currentUser?.id, token]);

  const fetchAllData = async (user: User) => {
    setIsLoading(true);
    setCurrentUser(user);
    const isAdmin = user.role === UserRole.Admin;

    try {
      // Base requests for all users
      const baseRequests = [
        api.apiGetAllUsers(),
        api.apiGetAllTrainings(),
        api.apiGetAllSkills(),
        api.apiGetAllAnnouncements(),
        api.apiGetAllNews(),
        api.apiGetAllLibraryPosts(),
        api.apiGetConversations(user.id),
        api.apiGetAllChatMessages(),
        api.apiGetSettings(),
        api.apiGetLocations(),
        api.apiGetWelcomePageContent(),
      ];

      // Admin-only requests
      const adminRequests = isAdmin
        ? [
            api.apiGetAllDeveloperMessages().catch(() => []), // Return empty array on 403
            api.apiGetAllPasswordResetRequests().catch(() => []), // Return empty array on 403
            api.apiGetAllNewLocationRequests().catch(() => []), // Return empty array on 403
            api.apiGetAllBonusTransactions().catch(() => []), // Return empty array on error
          ]
        : [
            Promise.resolve([]), // developerMessages
            Promise.resolve([]), // passwordResetRequests
            Promise.resolve([]), // newLocationRequests
            Promise.resolve([]), // bonusTransactions
          ];

      const allRequests = [...baseRequests, ...adminRequests];
      const results = await Promise.all(allRequests);

      // Destructure results in the correct order
      const [
        users,
        fetchedTrainings,
        fetchedSkills,
        fetchedAnnouncements,
        fetchedNews,
        fetchedLibraryPosts,
        fetchedConversations,
        fetchedChatMessages,
        fetchedSettings,
        fetchedLocations,
        fetchedWelcomeContent,
        fetchedMessages,
        fetchedResetRequests,
        fetchedLocationRequests,
        fetchedBonusTransactions,
      ] = results as [
        User[],
        TrainingSession[],
        Skill[],
        Announcement[],
        NewsItem[],
        LibraryPost[],
        Conversation[],
        ChatMessage[],
        AppSettings | null,
        Record<string, Record<string, string[]>> | null,
        WelcomePageContent | null,
        DeveloperMessage[],
        PasswordResetRequest[],
        NewLocationRequest[],
        BonusTransaction[]
      ];

      setAllUsers(users);
      setTrainings(fetchedTrainings);
      setSkills(fetchedSkills);
      setAnnouncements(fetchedAnnouncements);
      setNews(fetchedNews);
      setLibraryPosts(fetchedLibraryPosts);
      setDeveloperMessages(fetchedMessages);
      setConversations(fetchedConversations);
      setChatMessages(fetchedChatMessages);
      if (fetchedSettings) setSettings(fetchedSettings);
      setPasswordResetRequests(fetchedResetRequests);
      setNewLocationRequests(fetchedLocationRequests);
      if (fetchedLocations) setLocations(fetchedLocations);
      if (fetchedWelcomeContent) setWelcomePageContent(fetchedWelcomeContent);
      setBonusTransactions(fetchedBonusTransactions);
    } catch (error) {
      console.error('Failed to fetch data (might be offline), loading from cache', error);
      // Try to load data from cache if network request failed
      try {
        const [
          cachedUsers,
          cachedTrainings,
          cachedSkills,
          cachedAnnouncements,
          cachedNews,
          cachedLibraryPosts,
          cachedMessages,
          cachedConversations,
          cachedChatMessages,
          cachedSettings,
          cachedResetRequests,
          cachedLocationRequests,
          cachedLocations,
          cachedWelcomeContent,
          cachedBonusTransactions,
        ] = await Promise.all([
          localDb.getData<User>('users'),
          localDb.getData<TrainingSession>('trainings'),
          localDb.getData<Skill>('skills'),
          localDb.getData<Announcement>('announcements'),
          localDb.getData<NewsItem>('news'),
          localDb.getData<LibraryPost>('libraryPosts'),
          localDb.getData<DeveloperMessage>('developerMessages'),
          localDb.getData<Conversation>('conversations'),
          localDb.getData<ChatMessage>('chatMessages'),
          localDb.getData<AppSettings>('settings'),
          localDb.getData<PasswordResetRequest>('passwordResetRequests'),
          localDb.getData<NewLocationRequest>('newLocationRequests'),
          localDb.getData<{ id: string; data: Record<string, Record<string, string[]>> }>('locations'),
          localDb.getData<WelcomePageContent>('welcomePageContent'),
          localDb.getData<BonusTransaction>('bonusTransactions'),
        ]);

        if (cachedUsers.length > 0) setAllUsers(cachedUsers);
        if (cachedTrainings.length > 0) setTrainings(cachedTrainings);
        if (cachedSkills.length > 0) setSkills(cachedSkills);
        if (cachedAnnouncements.length > 0) setAnnouncements(cachedAnnouncements);
        if (cachedNews.length > 0) setNews(cachedNews);
        if (cachedLibraryPosts.length > 0) setLibraryPosts(cachedLibraryPosts);
        if (cachedMessages.length > 0) setDeveloperMessages(cachedMessages);
        if (cachedConversations.length > 0) setConversations(cachedConversations);
        if (cachedChatMessages.length > 0) setChatMessages(cachedChatMessages);
        if (cachedSettings.length > 0) setSettings(cachedSettings[0]);
        if (cachedResetRequests.length > 0) setPasswordResetRequests(cachedResetRequests);
        if (cachedLocationRequests.length > 0) setNewLocationRequests(cachedLocationRequests);
        if (cachedLocations.length > 0 && cachedLocations[0]?.data) setLocations(cachedLocations[0].data);
        if (cachedWelcomeContent.length > 0) {
          // WelcomePageContent already has id in its type definition
          setWelcomePageContent(cachedWelcomeContent[0] as WelcomePageContent);
        }
        if (cachedBonusTransactions.length > 0) setBonusTransactions(cachedBonusTransactions);
      } catch (cacheError) {
        console.error('Failed to load data from cache', cacheError);
      }

      // Only call handleApiError if it's a token/auth error, not a network error
      if (
        error instanceof Error &&
        (error.message.includes('Access Denied') || error.message.includes('token'))
      ) {
        await handleApiError(error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const checkSession = async () => {
      const sessionToken = sessionStorage.getItem('authToken');
      if (sessionToken) {
        try {
          const user = await api.apiVerifyToken(sessionToken);
          if (user) {
            setToken(sessionToken);
            await fetchAllData(user);
          } else {
            await logout();
          }
        } catch (error) {
          console.warn('Could not check session (likely offline or invalid token).', error);
          // Try to load user data from cache before logging out
          try {
            const cachedUsers = await localDb.getData<User>('users');
            if (cachedUsers.length > 0) {
              // Try to find the user by token or use the first admin user
              const cachedUser = cachedUsers.find((u) => u.role === UserRole.Admin) || cachedUsers[0];
              if (cachedUser) {
                setToken(sessionToken);
                setCurrentUser(cachedUser);
                await fetchAllData(cachedUser);
              } else {
                await logout();
              }
            } else {
              await logout();
            }
          } catch (cacheError) {
            console.error('Failed to load from cache', cacheError);
            await logout();
          }
        }
      } else {
        try {
          setAllUsers(await api.apiGetAllUsers());
          setWelcomePageContent(await api.apiGetWelcomePageContent());
        } catch {
          // FIX: Add generic type arguments to localDb.getData to ensure correct type inference and fix 'unknown' type error.
          setAllUsers(await localDb.getData<User>('users'));
          setWelcomePageContent((await localDb.getData<WelcomePageContent>('welcomePageContent'))[0] || null);
        }
      }
      setIsInitialized(true);
    };
    checkSession();
  }, []);

  const login = async (email: string, password?: string) => {
    setIsLoading(true);
    try {
      const result = await api.apiLogin(email, password);
      if (result) {
        sessionStorage.setItem('authToken', result.token);
        setToken(result.token);
        await fetchAllData(result.user);
        setIsLoading(false);
        return result.user;
      }
    } catch (err) {
      await handleApiError(err);
    }
    setIsLoading(false);
    return null;
  };

  const logout = async () => {
    const currentToken = token;
    if (currentToken) {
      api.apiLogout(currentToken).catch(console.warn);
    }
    sessionStorage.removeItem('authToken');
    setCurrentUser(null);
    setToken(null);

    if ('setAppBadge' in navigator) {
      (navigator as any).setAppBadge(0).catch(console.error);
    }

    try {
      const users = await api.apiGetAllUsers();
      setAllUsers(users);
      const welcomeContent = await api.apiGetWelcomePageContent();
      setWelcomePageContent(welcomeContent);
    } catch (error) {
      console.error('Failed to fetch users after logout', error);
      setAllUsers([]);
      setWelcomePageContent(null);
    }

    setTrainings([]);
    setSkills([]);
    setAnnouncements([]);
    setNews([]);
    setLibraryPosts([]);
    setDeveloperMessages([]);
    setConversations([]);
    setChatMessages([]);
    setBonusTransactions([]);
    setPasswordResetRequests([]);
    setNewLocationRequests([]);
    setShownNotifications(new Set<string>());
  };

  const registerAndLogin = async (
    newUserPartial: Omit<User, 'id' | 'registrationDate' | 'linkedUsers' | 'passwordHash' | 'salt'> & {
      password: string;
      referredBy?: string;
    }
  ): Promise<User | null> => {
    setIsLoading(true);
    try {
      const result = await api.apiRegister(newUserPartial);
      if (result) {
        sessionStorage.setItem('authToken', result.token);
        setToken(result.token);
        await fetchAllData(result.user);
        return result.user;
      }
      return null;
    } catch (err) {
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const createAdminUser = async (
    newAdminPartial: Omit<
      User,
      'id' | 'registrationDate' | 'linkedUsers' | 'role' | 'passwordHash' | 'salt'
    > & { permissions: AdminPermissions; password: string }
  ): Promise<User | null> => {
    if (!token) return null;
    setIsLoading(true);
    try {
      const newAdmin = await api.apiCreateAdminUser(newAdminPartial, token);
      if (newAdmin) {
        const users = await api.apiGetAllUsers();
        setAllUsers(users);
      }
      return newAdmin;
    } catch (err) {
      await handleApiError(err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const updateUser = async (updatedUserInfo: Partial<User>) => {
    if (!currentUser || !token) return;
    setIsLoading(true);
    try {
      const updatedUser = await api.apiUpdateUser(currentUser.id, updatedUserInfo, token);
      const [freshUsers, freshBonusTransactions] = await Promise.all([
        api.apiGetAllUsers(),
        api.apiGetAllBonusTransactions(),
      ]);
      setCurrentUser(updatedUser);
      setAllUsers(freshUsers);
      setBonusTransactions(freshBonusTransactions);
    } catch (err) {
      await handleApiError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserSilently = async (updatedUserInfo: Partial<User>) => {
    if (!currentUser || !token) return;
    try {
      const updatedUser = await api.apiUpdateUser(currentUser.id, updatedUserInfo, token);
      const freshUsers = await api.apiGetAllUsers();
      setCurrentUser(updatedUser);
      setAllUsers(freshUsers);
    } catch (err) {
      await handleApiError(err);
    }
  };

  const silentlyUpdateUserInList = async (userId: string, patchData: Partial<User>) => {
    if (!currentUser || !token) return;
    try {
      const updatedUser = await api.apiUpdateUser(userId, patchData, token);
      setAllUsers((prevUsers) => prevUsers.map((u) => (u.id === userId ? updatedUser : u)));
      if (currentUser?.id === userId) {
        setCurrentUser(updatedUser);
      }
    } catch (err) {
      await handleApiError(err);
    }
  };

  const changePassword = async (
    oldPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> => {
    if (!token) return { success: false, message: 'Пользователь не авторизован.' };
    setIsLoading(true);
    try {
      return await api.apiChangePassword(oldPassword, newPassword, token);
    } catch (err) {
      await handleApiError(err);
      return { success: false, message: 'Произошла ошибка.' };
    } finally {
      setIsLoading(false);
    }
  };

  const adminResetPassword = async (
    targetUserId: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> => {
    if (!token) return { success: false, message: 'Пользователь не авторизован.' };
    setIsLoading(true);
    try {
      return await api.apiAdminResetPassword(targetUserId, newPassword, token);
    } catch (err) {
      await handleApiError(err);
      return { success: false, message: 'Произошла ошибка.' };
    } finally {
      setIsLoading(false);
    }
  };

  const submitPasswordResetRequest = async (
    email: string
  ): Promise<{ success: boolean; message: string }> => {
    const result = await api.apiSubmitPasswordResetRequest(email);
    return result;
  };

  const resolvePasswordResetRequest = async (
    requestId: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> => {
    if (!token) {
      return { success: false, message: 'Нет прав для выполнения этого действия.' };
    }
    setIsLoading(true);
    try {
      const result = await api.apiResolvePasswordResetRequest(requestId, newPassword, token);
      if (result.success) {
        const [freshUsers, freshRequests] = await Promise.all([
          api.apiGetAllUsers(),
          api.apiGetAllPasswordResetRequests(),
        ]);
        setAllUsers(freshUsers);
        setPasswordResetRequests(freshRequests);
      }
      return result;
    } catch (err) {
      await handleApiError(err);
      return { success: false, message: 'Произошла ошибка.' };
    } finally {
      setIsLoading(false);
    }
  };

  const deletePasswordResetHistory = async (requestId: string): Promise<void> => {
    if (!token) return;
    setIsLoading(true);
    try {
      await api.apiDeletePasswordResetHistory(requestId, token);
      setPasswordResetRequests(await api.apiGetAllPasswordResetRequests());
    } catch (err) {
      await handleApiError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const resolveNewLocationRequest = async (
    requestId: string,
    isApproved: boolean,
    correctedLocation?: { city: string; region: string; country: string }
  ) => {
    if (!token) return;
    setIsLoading(true);
    try {
      await api.apiResolveNewLocationRequest(requestId, isApproved, token, correctedLocation);
      const [freshUsers, freshRequests, freshLocations] = await Promise.all([
        api.apiGetAllUsers(),
        api.apiGetAllNewLocationRequests(),
        api.apiGetLocations(),
      ]);
      setAllUsers(freshUsers);
      setNewLocationRequests(freshRequests);
      if (freshLocations) setLocations(freshLocations);
    } catch (err) {
      await handleApiError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateUsers = async (updatedUsersList: User[]) => {
    if (!token) return;
    setIsLoading(true);
    try {
      await api.apiUpdateAllUsers(updatedUsersList, token);
      const freshUsers = await api.apiGetAllUsers();
      setAllUsers(freshUsers);
      if (currentUser) {
        const freshCurrentUser = freshUsers.find((u) => u.id === currentUser.id);
        setCurrentUser(freshCurrentUser || null);
      }
    } catch (err) {
      await handleApiError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteUser = async (userIdToDelete: string) => {
    if (!token) return;
    setIsLoading(true);
    try {
      await api.apiDeleteUser(userIdToDelete, token, 'admin');
      const [
        freshUsers,
        freshTrainings,
        freshAnnouncements,
        freshPasswordResetRequests,
        freshNews,
        freshLibraryPosts,
        freshConversations,
        freshChatMessages,
        freshDevMessages,
      ] = await Promise.all([
        api.apiGetAllUsers(),
        api.apiGetAllTrainings(),
        api.apiGetAllAnnouncements(),
        api.apiGetAllPasswordResetRequests(),
        api.apiGetAllNews(),
        api.apiGetAllLibraryPosts(),
        api.apiGetConversations(currentUser!.id),
        api.apiGetAllChatMessages(),
        api.apiGetAllDeveloperMessages(),
      ]);
      setAllUsers(freshUsers);
      setTrainings(freshTrainings);
      setAnnouncements(freshAnnouncements);
      setPasswordResetRequests(freshPasswordResetRequests);
      setNews(freshNews);
      setLibraryPosts(freshLibraryPosts);
      setConversations(freshConversations);
      setChatMessages(freshChatMessages);
      setDeveloperMessages(freshDevMessages);
    } catch (err) {
      await handleApiError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteCurrentUser = async () => {
    if (!currentUser || !token) return;
    setIsLoading(true);
    try {
      await api.apiDeleteUser(currentUser.id, token, 'self');
      await logout();
    } catch (err) {
      await handleApiError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserAndId = async (oldId: string, updatedUserData: Partial<User>): Promise<boolean> => {
    if (!token) return false;
    setIsLoading(true);
    try {
      const result = await api.apiUpdateUserAndId(oldId, updatedUserData, token);
      if (result.success) {
        const [freshUsers, freshTrainings] = await Promise.all([
          api.apiGetAllUsers(),
          api.apiGetAllTrainings(),
        ]);
        setAllUsers(freshUsers);
        setTrainings(freshTrainings);
        if (currentUser?.id === oldId) {
          const freshCurrentUser = freshUsers.find((u) => u.id === (updatedUserData.id || oldId));
          setCurrentUser(freshCurrentUser || null);
        }
      }
      return result.success;
    } catch (err) {
      await handleApiError(err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const adminUpdateBonuses = async (targetUserId: string, amount: number, description: string) => {
    if (!currentUser || !token || currentUser.role !== UserRole.Admin) return;
    setIsLoading(true);
    try {
      await api.apiAdminUpdateBonuses(currentUser.id, targetUserId, amount, description, token);
      const [freshUsers, freshTransactions] = await Promise.all([
        api.apiGetAllUsers(),
        api.apiGetAllBonusTransactions(),
      ]);
      setAllUsers(freshUsers);
      setBonusTransactions(freshTransactions);
    } catch (err) {
      await handleApiError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const addTraining = async (
    newTrainingData: Omit<TrainingSession, 'id' | 'authorId' | 'participants' | 'status'> & {
      partnerId?: string | null;
      creatorRoleForSession?: UserRole | null;
    }
  ) => {
    if (!currentUser || !token) return;
    setIsLoading(true);
    try {
      const freshTrainings = await api.apiAddTraining(newTrainingData, currentUser, token);
      setTrainings(freshTrainings);
    } catch (err) {
      await handleApiError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateTraining = async (trainingId: string, updatedData: Partial<TrainingSession>) => {
    if (!token) return;
    setIsLoading(true);
    try {
      await api.apiUpdateTraining(trainingId, updatedData, token);
      const freshTrainings = await api.apiGetAllTrainings();
      setTrainings(freshTrainings);
    } catch (err) {
      await handleApiError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteTraining = async (trainingId: string) => {
    if (!token) return;
    setIsLoading(true);
    try {
      await api.apiDeleteTraining(trainingId, token);
      const freshTrainings = await api.apiGetAllTrainings();
      setTrainings(freshTrainings);
    } catch (err) {
      await handleApiError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const addAdminAnnouncement = async (
    newAnnouncementData: Omit<Announcement, 'id' | 'authorId' | 'timestamp' | 'status'>
  ) => {
    if (!token) return;
    setIsLoading(true);
    try {
      await api.apiAddAdminAnnouncement(newAnnouncementData, token);
      const freshAnnouncements = await api.apiGetAllAnnouncements();
      setAnnouncements(freshAnnouncements);
    } catch (err) {
      await handleApiError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const addUserAnnouncement = async (
    newAnnouncementData: Omit<Announcement, 'id' | 'authorId' | 'timestamp' | 'status' | 'submittedById'>
  ) => {
    if (!currentUser || !token) return;
    setIsLoading(true);
    try {
      await api.apiAddUserAnnouncement(newAnnouncementData, currentUser, token);
      const freshAnnouncements = await api.apiGetAllAnnouncements();
      setAnnouncements(freshAnnouncements);
    } catch (err) {
      await handleApiError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const moderateAnnouncement = async (announcementId: string, isApproved: boolean) => {
    if (!token) return;
    setIsLoading(true);
    try {
      await api.apiModerateAnnouncement(announcementId, isApproved, token);
      const [freshAnnouncements, freshUsers] = await Promise.all([
        api.apiGetAllAnnouncements(),
        api.apiGetAllUsers(),
      ]);
      setAnnouncements(freshAnnouncements);
      setAllUsers(freshUsers);
    } catch (err) {
      await handleApiError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateAnnouncement = async (
    announcementId: string,
    updatedData: Partial<Omit<Announcement, 'id' | 'authorId' | 'timestamp'>>
  ) => {
    if (!token) return;
    setIsLoading(true);
    try {
      const freshAnnouncements = await api.apiUpdateAnnouncement(announcementId, updatedData, token);
      setAnnouncements(freshAnnouncements);
    } catch (err) {
      await handleApiError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateAnnouncementSilently = async (
    announcementId: string,
    updatedData: Partial<Omit<Announcement, 'id' | 'authorId' | 'timestamp'>>
  ) => {
    if (!token) return;
    try {
      const freshAnnouncements = await api.apiUpdateAnnouncement(announcementId, updatedData, token);
      setAnnouncements(freshAnnouncements);
    } catch (err) {
      await handleApiError(err);
    }
  };

  const deleteAnnouncement = async (announcementId: string) => {
    if (!token) return;
    setIsLoading(true);
    try {
      await api.apiDeleteAnnouncement(announcementId, token);
      const freshAnnouncements = await api.apiGetAllAnnouncements();
      setAnnouncements(freshAnnouncements);
    } catch (err) {
      await handleApiError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const restoreAnnouncement = async (announcementId: string) => {
    if (!token) return;
    setIsLoading(true);
    try {
      await api.apiRestoreAnnouncement(announcementId, token);
      const freshAnnouncements = await api.apiGetAllAnnouncements();
      setAnnouncements(freshAnnouncements);
    } catch (err) {
      await handleApiError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const permanentlyDeleteAnnouncement = async (announcementId: string) => {
    if (!token) return;
    setIsLoading(true);
    try {
      await api.apiPermanentlyDeleteAnnouncement(announcementId, token);
      const freshAnnouncements = await api.apiGetAllAnnouncements();
      setAnnouncements(freshAnnouncements);
    } catch (err) {
      await handleApiError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const addNewsItem = async (newNewsItemData: Omit<NewsItem, 'id' | 'authorId' | 'timestamp'>) => {
    if (!token) return;
    setIsLoading(true);
    try {
      await api.apiAddNewsItem(newNewsItemData, token);
      const freshNews = await api.apiGetAllNews();
      setNews(freshNews);
    } catch (err) {
      await handleApiError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateNewsItem = async (
    newsItemId: string,
    updatedData: Partial<Omit<NewsItem, 'id' | 'authorId' | 'timestamp'>>
  ) => {
    if (!token) return;
    setIsLoading(true);
    try {
      await api.apiUpdateNewsItem(newsItemId, updatedData, token);
      const freshNews = await api.apiGetAllNews();
      setNews(freshNews);
    } catch (err) {
      await handleApiError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteNewsItem = async (newsItemId: string) => {
    if (!token) return;
    setIsLoading(true);
    try {
      await api.apiDeleteNewsItem(newsItemId, token);
      const freshNews = await api.apiGetAllNews();
      setNews(freshNews);
    } catch (err) {
      await handleApiError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const addLibraryPost = async (newLibraryPostData: Omit<LibraryPost, 'id' | 'authorId' | 'timestamp'>) => {
    if (!token) return;
    setIsLoading(true);
    try {
      await api.apiAddLibraryPost(newLibraryPostData, token);
      const freshLibraryPosts = await api.apiGetAllLibraryPosts();
      setLibraryPosts(freshLibraryPosts);
    } catch (err) {
      await handleApiError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateLibraryPost = async (
    postId: string,
    updatedData: Partial<Omit<LibraryPost, 'id' | 'authorId' | 'timestamp'>>
  ) => {
    if (!token) return;
    setIsLoading(true);
    try {
      await api.apiUpdateLibraryPost(postId, updatedData, token);
      const freshLibraryPosts = await api.apiGetAllLibraryPosts();
      setLibraryPosts(freshLibraryPosts);
    } catch (err) {
      await handleApiError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteLibraryPost = async (postId: string) => {
    if (!token) return;
    setIsLoading(true);
    try {
      await api.apiDeleteLibraryPost(postId, token);
      const freshLibraryPosts = await api.apiGetAllLibraryPosts();
      setLibraryPosts(freshLibraryPosts);
    } catch (err) {
      await handleApiError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const addDeveloperMessage = async (subject: string, message: string) => {
    if (!token) return;
    setIsLoading(true);
    try {
      await api.apiAddDeveloperMessage(subject, message, token);
      const freshMessages = await api.apiGetAllDeveloperMessages();
      setDeveloperMessages(freshMessages);
    } catch (err) {
      await handleApiError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateDeveloperMessage = async (messageId: string, updatedData: Partial<DeveloperMessage>) => {
    if (!token) return;
    setIsLoading(true);
    try {
      await api.apiUpdateDeveloperMessage(messageId, updatedData, token);
      const freshMessages = await api.apiGetAllDeveloperMessages();
      setDeveloperMessages(freshMessages);
    } catch (err) {
      await handleApiError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteDeveloperMessage = async (messageId: string) => {
    if (!token) return;
    setIsLoading(true);
    try {
      await api.apiDeleteDeveloperMessage(messageId, token);
      const freshMessages = await api.apiGetAllDeveloperMessages();
      setDeveloperMessages(freshMessages);
    } catch (err) {
      await handleApiError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const submitVote = async (
    itemId: string,
    itemType: 'announcement' | 'news' | 'library',
    optionIds: string[]
  ) => {
    if (!token) return;
    setIsLoading(true);
    try {
      await api.apiSubmitVote(itemId, itemType, optionIds, token);
      const [freshAnnouncements, freshNews, freshLibraryPosts] = await Promise.all([
        api.apiGetAllAnnouncements(),
        api.apiGetAllNews(),
        api.apiGetAllLibraryPosts(),
      ]);
      setAnnouncements(freshAnnouncements);
      setNews(freshNews);
      setLibraryPosts(freshLibraryPosts);
    } catch (err) {
      await handleApiError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const submitQuizAnswer = async (
    itemId: string,
    itemType: 'announcement' | 'news' | 'library',
    optionIds: string[]
  ) => {
    if (!token) return;
    try {
      await api.apiSubmitQuizAnswer(itemId, itemType, optionIds, token);
      switch (itemType) {
        case 'announcement':
          setAnnouncements(await api.apiGetAllAnnouncements());
          break;
        case 'news':
          setNews(await api.apiGetAllNews());
          break;
        case 'library':
          setLibraryPosts(await api.apiGetAllLibraryPosts());
          break;
      }
    } catch (err) {
      await handleApiError(err);
    }
  };

  const sendMessage = async (
    chatId: string,
    content: { text?: string; media?: { url: string; type: string; duration?: number } }
  ) => {
    if (!token) return;
    try {
      await api.apiSendMessage(chatId, content, token);
      const freshMessages = await api.apiGetAllChatMessages();
      setChatMessages(freshMessages);
    } catch (err) {
      await handleApiError(err);
    }
  };

  const findOrCreateConversation = async (targetUserId: string) => {
    if (!currentUser || !token) return null;
    setIsLoading(true);
    try {
      const conversation = await api.apiFindOrCreateConversation(targetUserId, token);
      if (conversation) {
        const freshConversations = await api.apiGetConversations(currentUser.id);
        setConversations(freshConversations);
      }
      return conversation;
    } catch (err) {
      await handleApiError(err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const updateConversation = async (conversationId: string, updatedData: Partial<Conversation>) => {
    if (!currentUser || !token) return;
    try {
      await api.apiUpdateConversation(conversationId, updatedData, token);
      const freshConversations = await api.apiGetConversations(currentUser.id);
      setConversations(freshConversations);
    } catch (err) {
      await handleApiError(err);
    }
  };

  const updateLastReadTimestamp = async (chatId: string) => {
    if (!currentUser || !token) return;

    try {
      const lastMessage = chatMessages
        .filter((m) => m.chatId === chatId)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
      if (!lastMessage || lastMessage.senderId === currentUser.id) return;
      const lastRead = currentUser.lastReadTimestamps?.[chatId];
      const isUnread = !lastRead || new Date(lastMessage.timestamp) > new Date(lastRead);

      if (isUnread) {
        console.log('work');
        const updatedUserPromise = api.apiUpdateLastReadTimestamp(chatId, currentUser.id, token);
        const markAsReadPromise = api.apiMarkMessagesAsRead(chatId, token);
        await Promise.all([updatedUserPromise, markAsReadPromise]);
        const [updatedUser, freshMessages] = await Promise.all([
          api.apiGetUserById(currentUser.id),
          api.apiGetAllChatMessages(),
        ]);
        setChatMessages(freshMessages);
        if (updatedUser) setCurrentUser(updatedUser);
      }
    } catch (err) {
      await handleApiError(err);
    }
  };

  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    if (!token) return;
    setIsLoading(true);
    try {
      await api.apiUpdateSettings(newSettings, token);
      const freshSettings = await api.apiGetSettings();
      if (freshSettings) setSettings(freshSettings);
    } catch (err) {
      await handleApiError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateLocations = async (newLocations: Record<string, Record<string, string[]>>) => {
    if (!token) return;
    setIsLoading(true);
    try {
      await api.apiUpdateLocations(newLocations, token);
      const freshLocations = await api.apiGetLocations();
      if (freshLocations) setLocations(freshLocations);
    } catch (err) {
      await handleApiError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateWelcomePageContent = async (newContent: Partial<WelcomePageContent>) => {
    if (!token) return;
    setIsLoading(true);
    try {
      await api.apiUpdateWelcomePageContent(newContent, token);
      const freshContent = await api.apiGetWelcomePageContent();
      if (freshContent) setWelcomePageContent(freshContent);
    } catch (err) {
      await handleApiError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const authContextValue = useMemo(() => {
    const hasProfileRequest =
      (currentUser?.role === UserRole.Student && !!currentUser.pendingTrainerRequestFrom) ||
      (currentUser?.role === UserRole.Trainer && (currentUser.trainerRequests?.length ?? 0) > 0);
    const hasMyStudentsRequest =
      currentUser?.role === UserRole.Trainer && (currentUser.studentRequests?.length ?? 0) > 0;
    // Check for training notifications: unconfirmed future trainings and unrated past trainings
    const hasTrainingRequest = (() => {
      if (!currentUser) return false;
      
      const now = new Date();
      
      // Helper to get training datetime
      const getTrainingDateTime = (t: TrainingSession) => {
        const datePart = t.date.split('T')[0];
        return new Date(`${datePart}T${t.startTime}`);
      };
      
      // Check for unconfirmed future trainings
      const hasUnconfirmedFuture = trainings.some((t) => {
        const trainingDateTime = getTrainingDateTime(t);
        return trainingDateTime >= now && 
               t.status !== 'cancelled' &&
               t.participants.some((p) => p.userId === currentUser.id && !p.confirmed);
      });
      
      // Check for unrated past trainings
      const hasUnratedPast = trainings.some((t) => {
        const trainingDateTime = getTrainingDateTime(t);
        if (trainingDateTime >= now || t.status === 'cancelled') return false;
        
        const userRating = t.ratings?.find(r => r.userId === currentUser.id);
        if (userRating) return false; // Already rated
        
        const isParticipant = t.participants.some(p => p.userId === currentUser.id);
        if (!isParticipant) return false; // Not a participant
        
        const isSoloTraining = t.participants.length === 1;
        const isFullyConfirmed = t.participants.every(p => p.confirmed);
        
        return isSoloTraining || isFullyConfirmed;
      });
      
      return hasUnconfirmedFuture || hasUnratedPast;
    })();

    const now = new Date();

    const isPostVisibleToUser = (post: Announcement | NewsItem | LibraryPost, user: User) => {
      const now = new Date();
      
      // Deletion timestamp check - don't show posts that should be deleted
      if (post.deletionTimestamp && new Date(post.deletionTimestamp) <= now) {
        return false;
      }

      // Subscription check
      if (post.targetSubscriptionTiers && post.targetSubscriptionTiers.length > 0) {
        if (!user.subscription || !post.targetSubscriptionTiers.includes(user.subscription.tier)) {
          return false;
        }
      }

      // Role check
      const roleMatch =
        !post.targetRoles || post.targetRoles.length === 0 || post.targetRoles.includes(user.role);
      if (!roleMatch) return false;

      // Location check
      const hasLocationTarget =
        (post.targetCountries && post.targetCountries.length > 0) ||
        (post.targetRegions && post.targetRegions.length > 0) ||
        (post.targetCities && post.targetCities.length > 0);

      if (!hasLocationTarget) {
        return true; // Global post, location matches
      }

      const countryMatch = post.targetCountries && post.targetCountries.includes(user.country);
      const regionMatch = post.targetRegions && post.targetRegions.includes(user.region);
      const cityMatch = post.targetCities && post.targetCities.includes(user.city);

      return !!(countryMatch || regionMatch || cityMatch);
    };

    const relevantAnnouncements = announcements.filter((a) => {
      if (!currentUser) return false;
      if (a.status !== 'published') return false;
      if (a.publishTimestamp && new Date(a.publishTimestamp) > now) return false;
      return isPostVisibleToUser(a, currentUser);
    });
    const hasUnreadAnnouncements = relevantAnnouncements.some(
      (a) => !currentUser?.readAnnouncementIds?.includes(a.id)
    );

    const relevantNews = news.filter((n) => {
      if (!currentUser) return false;
      if (n.publishTimestamp && new Date(n.publishTimestamp) > now) return false;
      return isPostVisibleToUser(n, currentUser);
    });
    const hasUnreadNews = relevantNews.some((n) => !currentUser?.readNewsIds?.includes(n.id));

    const relevantLibraryPosts = libraryPosts.filter((p) => {
      if (!currentUser) return false;
      if (p.publishTimestamp && new Date(p.publishTimestamp) > now) return false;
      return isPostVisibleToUser(p, currentUser);
    });
    const hasUnreadLibraryPosts = relevantLibraryPosts.some(
      (p) => !currentUser?.readLibraryPostIds?.includes(p.id)
    );

    const perms = currentUser?.permissions || {};

    const hasUnreadMessages =
      currentUser?.role === UserRole.Admin && perms.canViewMessages
        ? developerMessages.some((m) => !m.isRead && m.status !== 'closed')
        : false;

    const hasUnreadChatMessages =
      (currentUser?.role !== UserRole.Admin ||
        (currentUser?.role === UserRole.Admin && perms.canAccessChat)) &&
      conversations.some((convo) => {
        const lastMessage = chatMessages
          .filter((m) => m.chatId === convo.id)
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
        if (!lastMessage || !currentUser) return false;
        if (lastMessage.senderId === currentUser.id) return false;

        if (currentUser.role === UserRole.Admin) {
          // Don't trigger notifications for messages created before the admin was registered.
          if (new Date(lastMessage.timestamp) < new Date(currentUser.registrationDate)) {
            return false;
          }
          // Also, don't trigger notifications for admin-to-user system messages (like welcome messages) in service chats.
          if (convo.id.startsWith('service-chat-')) {
            const sender = allUsers.find((u) => u.id === lastMessage.senderId);
            if (sender && sender.role === UserRole.Admin) {
              return false;
            }
          }
        }

        const lastRead = currentUser.lastReadTimestamps?.[convo.id];
        if (!lastRead) return true;
        return new Date(lastMessage.timestamp) > new Date(lastRead);
      });

    const pendingAnnouncementCount =
      currentUser?.role === UserRole.Admin && perms.canManageAnnouncements
        ? announcements.filter((a) => a.status === 'pending').length
        : 0;

    const hasPendingPasswordResetRequests =
      currentUser?.role === UserRole.Admin && perms.canResetUserPasswords
        ? passwordResetRequests.filter((req) => req.status === 'pending').length > 0
        : false;

    const hasPendingLocationRequests =
      currentUser?.role === UserRole.Admin && perms.canManageUsers
        ? newLocationRequests.filter((req) => req.status === 'pending').length > 0
        : false;

    return {
      user: currentUser,
      users: allUsers,
      passwordResetRequests,
      newLocationRequests,
      login,
      logout,
      updateUser,
      updateUserSilently,
      silentlyUpdateUserInList,
      updateUsers,
      deleteUser,
      deleteCurrentUser,
      updateUserAndId,
      registerAndLogin,
      createAdminUser,
      changePassword,
      adminResetPassword,
      submitPasswordResetRequest,
      resolvePasswordResetRequest,
      deletePasswordResetHistory,
      resolveNewLocationRequest,
      adminUpdateBonuses,
      hasProfileRequest: hasProfileRequest || false,
      hasMyStudentsRequest: hasMyStudentsRequest || false,
      hasTrainingRequest,
      hasUnreadAnnouncements,
      hasUnreadNews,
      hasUnreadLibraryPosts,
      hasUnreadMessages,
      hasUnreadChatMessages,
      pendingAnnouncementCount,
      hasPendingPasswordResetRequests,
      hasPendingLocationRequests,
    };
  }, [
    currentUser,
    allUsers,
    trainings,
    announcements,
    news,
    libraryPosts,
    developerMessages,
    conversations,
    chatMessages,
    passwordResetRequests,
    newLocationRequests,
    tick,
    token,
  ]);

  const dataContextValue = useMemo(
    () => ({
      trainings,
      skills,
      announcements,
      news,
      libraryPosts,
      developerMessages,
      conversations,
      chatMessages,
      bonusTransactions,
      settings,
      locations,
      welcomePageContent,
      addTraining,
      updateTraining,
      deleteTraining,
      addAdminAnnouncement,
      addUserAnnouncement,
      moderateAnnouncement,
      updateAnnouncement,
      updateAnnouncementSilently,
      deleteAnnouncement,
      restoreAnnouncement,
      permanentlyDeleteAnnouncement,
      addNewsItem,
      updateNewsItem,
      deleteNewsItem,
      addLibraryPost,
      updateLibraryPost,
      deleteLibraryPost,
      addDeveloperMessage,
      updateDeveloperMessage,
      deleteDeveloperMessage,
      submitVote,
      submitQuizAnswer,
      sendMessage,
      findOrCreateConversation,
      updateConversation,
      updateLastReadTimestamp,
      updateSettings,
      updateLocations,
      updateWelcomePageContent,
    }),
    [
      trainings,
      skills,
      announcements,
      news,
      libraryPosts,
      developerMessages,
      conversations,
      chatMessages,
      bonusTransactions,
      settings,
      locations,
      welcomePageContent,
      token,
    ]
  );

  const removeToast = (id: string) =>
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));

  useEffect(() => {
    if (!currentUser || !currentUser.notificationSettings || !authContextValue || !dataContextValue) return;
    let badgeCount = 0;
    const newToasts: Toast[] = [];
    const showToast = (id: string, message: string) => {
      if (!shownNotifications.has(id)) {
        newToasts.push({ id, message });
      }
    };
    const settings = currentUser.notificationSettings;

    if (currentUser.role !== UserRole.Admin) {
      if (authContextValue.hasProfileRequest || authContextValue.hasMyStudentsRequest) {
        if (settings.linkRequest === 'push' || settings.linkRequest === 'badge') badgeCount++;
        if (settings.linkRequest === 'push') showToast('link_request', 'У вас новый запрос на привязку!');
      }
      if (authContextValue.hasTrainingRequest) {
        if (settings.trainingConfirmation === 'push' || settings.trainingConfirmation === 'badge')
          badgeCount++;
        if (settings.trainingConfirmation === 'push')
          showToast('training_request', 'Вам назначена новая тренировка!');
      }
      if (authContextValue.hasUnreadAnnouncements) {
        if (settings.newAnnouncement === 'push' || settings.newAnnouncement === 'badge') badgeCount++;
        if (settings.newAnnouncement === 'push') showToast('new_announcement', 'Новое объявление!');
      }
      if (authContextValue.hasUnreadNews) {
        if (settings.newNews === 'push' || settings.newNews === 'badge') badgeCount++;
        if (settings.newNews === 'push') showToast('new_news', 'Новая запись в новостях!');
      }
      if (authContextValue.hasUnreadLibraryPosts) {
        if (settings.newLibraryPost === 'push' || settings.newLibraryPost === 'badge') badgeCount++;
        if (settings.newLibraryPost === 'push') showToast('new_library', 'Новая статья в библиотеке!');
      }
    } else {
      // Unread Support Messages
      const unreadMessages = dataContextValue.developerMessages.filter((m) => !m.isRead);
      if (settings.adminMessage === 'push') {
        unreadMessages.forEach((msg) => showToast(`dev_msg_${msg.id}`, `Новое сообщение: ${msg.subject}`));
      }
      if (settings.adminMessage === 'push' || settings.adminMessage === 'badge') {
        badgeCount += unreadMessages.length;
      }

      // Announcements for Moderation
      const pendingAnnouncements = dataContextValue.announcements.filter((a) => a.status === 'pending');
      if (settings.announcementModeration === 'push') {
        pendingAnnouncements.forEach((ann) => showToast(`ann_mod_${ann.id}`, `На модерацию: ${ann.title}`));
      }
      if (settings.announcementModeration === 'push' || settings.announcementModeration === 'badge') {
        badgeCount += pendingAnnouncements.length;
      }

      // Password Reset Requests
      const pendingResets = authContextValue.passwordResetRequests.filter((req) => req.status === 'pending');
      if (settings.passwordResetRequest === 'push') {
        pendingResets.forEach((req) => {
          const user = authContextValue.users.find((u) => u.id === req.userId);
          showToast(`pwd_reset_${req.id}`, `Сброс пароля для ${user?.name || 'пользователя'}`);
        });
      }
      if (settings.passwordResetRequest === 'push' || settings.passwordResetRequest === 'badge') {
        badgeCount += pendingResets.length;
      }

      // New Location Requests
      const pendingLocations = authContextValue.newLocationRequests.filter((req) => req.status === 'pending');
      if (settings.newLocationRequest === 'push') {
        pendingLocations.forEach((req) => {
          const user = authContextValue.users.find((u) => u.id === req.userId);
          showToast(
            `loc_req_${req.id}`,
            `Новая локация от ${user?.name || 'пользователя'}: ${req.submittedCity}`
          );
        });
      }
      if (settings.newLocationRequest === 'push' || settings.newLocationRequest === 'badge') {
        badgeCount += pendingLocations.length;
      }
    }
    if (authContextValue.hasUnreadChatMessages) {
      if (settings.chatMessage === 'push' || settings.chatMessage === 'badge') badgeCount++;
      if (settings.chatMessage === 'push') showToast('unread_chat', 'У вас новые сообщения в чате!');
    }

    const now = new Date();
    const reminderWindowEnd = new Date(now.getTime() + 30.5 * 60 * 1000);
    const reminderWindowStart = new Date(now.getTime() + 29.5 * 60 * 1000);
    trainings.forEach((t) => {
      const trainingTime = new Date(`${t.date.split('T')[0]}T${t.startTime}`);
      if (
        trainingTime > reminderWindowStart &&
        trainingTime <= reminderWindowEnd &&
        t.status === 'scheduled'
      ) {
        const userParticipant = t.participants.find((p) => p.userId === currentUser.id && p.confirmed);
        if (userParticipant) {
          const setting = currentUser.notificationSettings?.trainingReminder;
          const notifId = `training_reminder_${t.id}`;
          if (setting === 'push' && !shownNotifications.has(notifId)) {
            newToasts.push({ id: notifId, message: `Напоминание: Тренировка в ${t.startTime}!` });
          }
        }
      }
    });

    if ('setAppBadge' in navigator) {
      (navigator as any).setAppBadge(badgeCount).catch(console.error);
    }
    if (newToasts.length > 0) {
      setToasts((prev) => [...prev, ...newToasts]);
      newToasts.forEach((toast) => {
        setTimeout(() => {
          removeToast(toast.id);
        }, 3000);
      });
      const newShown = new Set(shownNotifications);
      newToasts.forEach((t) => newShown.add(t.id));
      setShownNotifications(newShown);
    }
  }, [tick, currentUser, authContextValue, dataContextValue, trainings]);

  if (!isInitialized) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-brand-light">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-brand-primary mb-2">МАНЕЖ.ПРО</h1>
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-primary mx-auto mt-4"></div>
          <p className="text-gray-500 mt-4">Загрузка приложения...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {isLoading && (
        <div
          className="fixed inset-0 bg-black bg-opacity-20 z-[100] flex items-center justify-center"
          role="status"
          aria-live="polite"
        >
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white"></div>
          <span className="sr-only">Загрузка...</span>
        </div>
      )}
      <div className="fixed bottom-4 right-4 z-[110] space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="bg-brand-primary text-white p-4 rounded-lg shadow-lg flex items-center animate-fade-in-up"
          >
            <p>{toast.message}</p>
            <button onClick={() => removeToast(toast.id)} className="ml-4 text-white font-bold">
              &times;
            </button>
          </div>
        ))}
      </div>
      <AuthContext.Provider value={authContextValue}>
        <DataContext.Provider value={dataContextValue}>
          <HashRouter>
            {currentUser ? (
              <Layout>
                <Routes>
                  {currentUser.role === UserRole.Admin ? (
                    (() => {
                      const perms = currentUser.permissions || {};
                      const adminDefaultRedirect = perms.canViewStats
                        ? '/admin'
                        : perms.canManageUsers
                        ? '/admin'
                        : perms.canAccessChat
                        ? '/chat'
                        : perms.canViewMessages
                        ? '/messages'
                        : perms.canManageAnnouncements
                        ? '/announcements'
                        : perms.canManageNews
                        ? '/news'
                        : perms.canManageLibraryPosts
                        ? '/library'
                        : perms.canResetUserPasswords
                        ? '/requests'
                        : perms.canManageAdmins
                        ? '/settings'
                        : '/admin';
                      return (
                        <>
                          {(perms.canViewStats || perms.canManageUsers) && (
                            <Route path="/admin" element={<AdminDashboardPage />} />
                          )}
                          {perms.canViewMessages && (
                            <Route path="/messages" element={<AdminMessagesPage />} />
                          )}
                          {perms.canAccessChat && <Route path="/chat" element={<ChatPage />} />}
                          {perms.canResetUserPasswords && (
                            <Route path="/requests" element={<AdminRequestsPage />} />
                          )}
                          {<Route path="/settings" element={<SettingsPage />} />}
                          {perms.canManageAnnouncements && (
                            <Route path="/announcements" element={<AnnouncementsPage />} />
                          )}
                          {perms.canManageNews && <Route path="/news" element={<NewsPage />} />}
                          {perms.canManageLibraryPosts && <Route path="/library" element={<LibraryPage />} />}
                          <Route path="/dashboard" element={<Navigate to={adminDefaultRedirect} />} />
                          <Route
                            path="/profile"
                            element={<Navigate to={perms.canAccessChat ? '/chat' : adminDefaultRedirect} />}
                          />
                          <Route path="/goals" element={<Navigate to="/announcements" />} />
                          <Route path="/" element={<Navigate to={adminDefaultRedirect} />} />
                        </>
                      );
                    })()
                  ) : (
                    <>
                      <Route path="/dashboard" element={<DashboardPage />} />
                      <Route path="/calendar" element={<CalendarPage />} />
                      <Route path="/skills" element={
                        currentUser.subscription?.tier === SubscriptionTier.Base || !currentUser.subscription?.tier 
                          ? <Navigate to="/dashboard" replace /> 
                          : <SkillsPage />
                      } />
                      <Route path="/library" element={
                        currentUser.subscription?.tier === SubscriptionTier.Base || !currentUser.subscription?.tier 
                          ? <Navigate to="/dashboard" replace /> 
                          : <LibraryPage />
                      } />
                      <Route path="/announcements" element={<AnnouncementsPage />} />
                      <Route path="/news" element={<NewsPage />} />
                      <Route path="/chat" element={<ChatPage />} />
                      <Route path="/settings" element={<SettingsPage />} />
                      {currentUser.role === UserRole.Trainer && (
                        <Route path="/my-students" element={<MyStudentsPage />} />
                      )}
                      <Route path="/profile" element={<Navigate to="/chat" />} />
                      <Route path="/goals" element={<Navigate to="/announcements" />} />
                      <Route path="/" element={<Navigate to="/dashboard" />} />
                    </>
                  )}
                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              </Layout>
            ) : (
              <Routes>
                <Route path="/" element={<WelcomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/legal" element={<LegalPage />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            )}
          </HashRouter>
        </DataContext.Provider>
      </AuthContext.Provider>
    </>
  );
};

export default App;
