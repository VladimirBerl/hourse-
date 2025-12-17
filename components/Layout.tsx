import React, { useState, useContext, PropsWithChildren } from 'react';
// FIX: Updated react-router-dom imports for v5, removing Outlet.
import { NavLink, useLocation } from 'react-router-dom';
import { AuthContext } from '../App';
import { User, UserRole, AdminPermissions, SubscriptionTier } from '../types';

const iconStyle = "h-6 w-6 mr-3";

const userNavItems = [
    { to: "/dashboard", icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className={iconStyle}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>, label: 'Профиль' },
    { to: "/calendar", icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className={iconStyle}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0h18M12 12.75h.008v.008H12v-.008zm-3.002 0h.008v.008h-.008v-.008zm6.004 0h.008v.008h-.008v-.008zm-3.002 3h.008v.008h-.008v-.008zm-3.002 0h.008v.008h-.008v-.008zm6.004 0h.008v.008h-.008v-.008z" /></svg>, label: 'Тренировки' },
    { to: "/skills", icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className={iconStyle}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V5.75A2.25 2.25 0 0018 3.5H6A2.25 2.25 0 003.75 5.75v12.25A2.25 2.25 0 006 20.25z" /></svg>, label: 'Статистика' },
    { to: "/library", icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className={iconStyle}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>, label: 'Библиотека'},
    { to: "/announcements", icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className={iconStyle}><path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" /></svg>, label: 'Объявления' },
    { to: "/news", icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className={iconStyle}><path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25M16.5 7.5V18a2.25 2.25 0 0 0 2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 0 0 2.25 2.25h13.5M6 7.5h3v3H6v-3Z" /></svg>, label: 'Новости' },
    { to: "/chat", icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className={iconStyle}><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg>, label: 'Чат' },
    { to: "/settings", icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className={iconStyle}><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-1.007 1.11-1.226.55-.22 1.156-.22 1.706 0 .55.22 1.02.684 1.11 1.226l.094.542c.063.372.363.65.743.765.38.115.774.042 1.12-.202l.38-.265c.482-.337 1.08-.285 1.518.125l.4.4c.403.403.455 1.036.125 1.518l-.265.38c-.244.346-.317.74-.202 1.12a1.498 1.498 0 01.765.743l.542.094c.542.09.94.56 1.226 1.11.22.55.22 1.156 0 1.706-.22.55-.684 1.02-1.226 1.11l-.542.094c-.372.063-.65.363-.765.743-.115.38-.042.774.202 1.12l.265.38c.337.482.285 1.08-.125 1.518l-.4.4c-.403.403-1.036.455-1.518.125l-.38-.265c-.346-.244-.74-.317-1.12-.202a1.498 1.498 0 01-.743-.765l-.094-.542c-.09.542-.56.94-1.11 1.226-.55-.22-1.156-.22-1.706 0-.55-.22-1.02-.684-1.11-1.226l-.094-.542a1.498 1.498 0 01-.743-.765c-.38-.115-.774-.042-1.12.202l-.38.265c-.482-.337-1.08.285-1.518-.125l-.4-.4c-.403-.403-.455-1.036-.125-1.518l.265-.38c.244.346.317-.74.202-1.12a1.498 1.498 0 01-.765-.743l-.542-.094c-.542-.09-.94-.56-1.226-1.11-.22-.55-.22-1.156 0-1.706.22.55.684 1.02 1.226 1.11l.542-.094c.372-.063.65-.363.765-.743.115-.38.042.774-.202-1.12l-.265-.38c-.337-.482-.285-1.08.125-1.518l.4.4c.403.403 1.036.455 1.518.125l.38.265c.346.244.74.317 1.12.202.38-.115.68-.392.743-.765l.094-.542z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>, label: 'Настройки' },
];

const trainerExtraItems = [
    { to: "/my-students", icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className={iconStyle}><path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.324l5.584.545a.563.563 0 01.328.959l-4.184 3.548a.563.563 0 00-.154.543l1.236 5.348a.563.563 0 01-.844.62l-4.733-2.735a.563.563 0 00-.536 0l-4.734 2.735a.563.563 0 01-.844-.62l1.236-5.348a.563.563 0 00-.154-.543l-4.184-3.548a.563.563 0 01.328-.959l5.584-.545a.563.563 0 00.475-.324l2.125-5.111z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" /></svg>, label: 'Мои ученики' },
];

const allAdminNavItems = [
    { to: "/admin", icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className={iconStyle}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25A2.25 2.25 0 015.25 3h13.5A2.25 2.25 0 0121 5.25z" /></svg>, label: 'Админ-панель', permission: 'canViewStats' },
    { to: "/admin", icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className={iconStyle}><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m-7.04-2.72a3 3 0 00-4.682 2.72 9.094 9.094 0 003.741.479m7.04-2.72a3 3 0 00-3.742 0m3.742 0a3 3 0 00-3.742 0M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, label: 'Пользователи', permission: 'canManageUsers' },
    { to: "/messages", icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className={iconStyle}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>, label: 'Сообщения', permission: 'canViewMessages' },
    { to: "/library", icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className={iconStyle}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>, label: 'Библиотека', permission: 'canManageLibraryPosts' },
    { to: "/announcements", icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className={iconStyle}><path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" /></svg>, label: 'Объявления', permission: 'canManageAnnouncements' },
    { to: "/news", icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className={iconStyle}><path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25M16.5 7.5V18a2.25 2.25 0 0 0 2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 0 0 2.25 2.25h13.5M6 7.5h3v3H6v-3Z" /></svg>, label: 'Новости', permission: 'canManageNews' },
    { to: "/chat", icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className={iconStyle}><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg>, label: 'Чат', permission: 'canAccessChat' },
    { to: "/requests", icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className={iconStyle}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>, label: 'Запросы', permission: 'canResetUserPasswords' },
    { to: "/settings", icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className={iconStyle}><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-1.007 1.11-1.226.55-.22 1.156-.22 1.706 0 .55.22 1.02.684 1.11 1.226l.094.542c.063.372.363.65.743.765.38.115.774.042 1.12-.202l.38-.265c.482-.337 1.08-.285 1.518.125l.4.4c.403.403.455 1.036.125 1.518l-.265.38c-.244.346-.317.74-.202 1.12a1.498 1.498 0 01.765.743l.542.094c.542.09.94.56 1.226 1.11.22.55.22 1.156 0 1.706-.22.55-.684 1.02-1.226 1.11l-.542.094c-.372.063-.65.363-.765.743-.115.38-.042.774.202 1.12l.265.38c.337.482.285 1.08-.125 1.518l-.4.4c-.403.403-1.036.455-1.518.125l-.38-.265c-.346-.244-.74-.317-1.12-.202a1.498 1.498 0 01-.743-.765l-.094-.542c-.09.542-.56.94-1.11 1.226-.55-.22-1.156-.22-1.706 0-.55-.22-1.02-.684-1.11-1.226l-.094-.542a1.498 1.498 0 01-.743-.765c-.38-.115-.774-.042-1.12.202l-.38.265c-.482-.337-1.08.285-1.518-.125l-.4-.4c-.403-.403-.455-1.036-.125-1.518l.265-.38c.244.346.317-.74.202-1.12a1.498 1.498 0 01-.765-.743l-.542-.094c-.542-.09-.94-.56-1.226-1.11-.22-.55-.22-1.156 0-1.706.22.55.684 1.02 1.226 1.11l.542-.094c.372-.063.65-.363.765-.743.115-.38.042.774-.202-1.12l-.265-.38c-.337-.482-.285-1.08.125-1.518l.4.4c.403.403 1.036.455 1.518.125l.38.265c.346.244.74.317 1.12.202.38-.115.68-.392.743-.765l.094-.542z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>, label: 'Настройки', permission: 'canManageAdmins' },
];


const pageTitles: { [key: string]: string } = {
    '/dashboard': 'Профиль',
    '/calendar': 'Тренировки',
    '/skills': 'Статистика',
    '/my-students': 'Мои ученики',
    '/library': 'Библиотека',
    '/announcements': 'Объявления',
    '/news': 'Новости',
    '/chat': 'Чат',
    '/admin': 'Админ-панель',
    '/messages': 'Сообщения',
    '/requests': 'Запросы',
    '/settings': 'Настройки',
};

const NavItem: React.FC<{ to: string, icon: React.ReactNode, label: string, hasNotification?: boolean }> = ({ to, icon, label, hasNotification }) => (
    <NavLink
      to={to}
      className={({ isActive }) => 
        `flex items-center px-4 py-3 my-1 rounded-lg transition-colors duration-200 ${
            isActive ? 'bg-brand-secondary text-white shadow-md' : 'text-gray-600 hover:bg-brand-light hover:text-brand-primary'
        }`
      }
      onClick={() => {}}
    >
      {icon}
      <span className="font-medium flex-grow">{label}</span>
      {hasNotification && <span className="w-2 h-2 bg-red-500 rounded-full"></span>}
    </NavLink>
  );

// FIX: Changed component to accept children prop for v5 routing.
const Layout: React.FC<PropsWithChildren> = ({ children }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const auth = useContext(AuthContext);
  const location = useLocation();
  const pageTitle = pageTitles[location.pathname] || 'МАНЕЖ.ПРО';
  
    const getNotificationStatus = (path: string): boolean => {
        if (!auth || !auth.user) return false;
        
        const { user, hasUnreadMessages, hasProfileRequest, hasMyStudentsRequest, hasTrainingRequest, hasUnreadAnnouncements, hasUnreadLibraryPosts, hasUnreadNews, hasUnreadChatMessages, pendingAnnouncementCount, hasPendingPasswordResetRequests, hasPendingLocationRequests } = auth;

        if (user.role === UserRole.Admin) {
            if (path === '/messages' && hasUnreadMessages) return true;
            if (path === '/chat' && hasUnreadChatMessages) return true;
            if (path === '/announcements' && pendingAnnouncementCount > 0) return true;
            if (path === '/requests' && (hasPendingPasswordResetRequests || hasPendingLocationRequests)) return true;
            return false; 
        }
        
        // User/Trainer notifications
        if (path === '/dashboard' && hasProfileRequest) return true;
        if (path === '/my-students' && hasMyStudentsRequest) return true;
        if (path === '/calendar' && hasTrainingRequest) return true;
        if (path === '/announcements' && hasUnreadAnnouncements) return true;
        if (path === '/library' && hasUnreadLibraryPosts) return true;
        if (path === '/news' && hasUnreadNews) return true;
        if (path === '/chat' && hasUnreadChatMessages) return true;
        
        return false;
    }

  const navItems = React.useMemo(() => {
    if (!auth?.user) return [];

    if (auth.user.role === UserRole.Admin) {
        const perms = auth.user.permissions || {};
        const visibleItems = allAdminNavItems.filter(item => {
            if (!item.permission) return true; // Always show items without a permission requirement (e.g., Settings)
            // Special case for /admin route which serves two purposes
            if (item.to === '/admin') {
                return perms.canViewStats || perms.canManageUsers;
            }
            return perms[item.permission as keyof AdminPermissions];
        });
        
        // Remove duplicate /admin entries if both permissions are true
        const uniquePaths = new Set();
        return visibleItems.filter(item => {
            if (item.permission === null) { // for settings
                return true;
            }
            const isDuplicate = uniquePaths.has(item.to);
            uniquePaths.add(item.to);
            return !isDuplicate;
        }).map(item => {
            // Adjust label for admin dashboard
            if (item.to === '/admin' && perms.canViewStats) return { ...item, label: 'Админ-панель' };
            if (item.to === '/admin' && !perms.canViewStats && perms.canManageUsers) return { ...item, label: 'Пользователи' };
            return item;
        });
    }
    
    // Logic for non-admin users
    let finalNavItems = [...userNavItems];

    if (auth.user.role === UserRole.Spectator) {
        finalNavItems = finalNavItems.filter(item => 
            !['/calendar', '/skills', '/library'].includes(item.to)
        );
    } else if (auth.user.role === UserRole.Trainer) {
        finalNavItems.splice(3, 0, ...trainerExtraItems);
    }
    
    // Hide Statistics and Library for users with Base subscription
    const userSubscription = auth.user.subscription?.tier;
    if (userSubscription === SubscriptionTier.Base || !userSubscription) {
        finalNavItems = finalNavItems.filter(item => 
            !['/skills', '/library'].includes(item.to)
        );
    }
    
    return finalNavItems;
  }, [auth?.user]);

  const hasAnyNotification = navItems.some(item => getNotificationStatus(item.to));

  const renderNavItems = () => navItems.map(item => 
    <NavItem 
        key={item.to + item.label}
        to={item.to} 
        icon={item.icon} 
        label={item.label} 
        hasNotification={getNotificationStatus(item.to)}
    />
  );

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar for desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white shadow-lg">
        <div className="flex items-center justify-center h-20 border-b">
          <h1 className="text-2xl font-bold text-brand-primary">МАНЕЖ.ПРО</h1>
        </div>
        <nav className="flex-1 px-4 py-4">
          {renderNavItems()}
        </nav>
      </aside>

      {/* Mobile Sidebar */}
      <div className={`fixed inset-0 z-30 bg-black bg-opacity-50 transition-opacity md:hidden ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setSidebarOpen(false)}></div>
      <aside className={`fixed top-0 left-0 z-40 w-64 h-full bg-white shadow-lg transform transition-transform md:hidden ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-center h-20 border-b">
           <h1 className="text-2xl font-bold text-brand-primary">МАНЕЖ.ПРО</h1>
        </div>
        <nav className="flex-1 px-4 py-4" onClick={() => setSidebarOpen(false)}>
          {renderNavItems()}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col overflow-y-auto">
        <header className="sticky top-0 z-20 flex items-center justify-between p-4 bg-white border-b md:justify-center">
            {/* Left element for layout */}
            <div className="md:absolute md:left-4">
                <button type="button" onClick={() => setSidebarOpen(true)} className="md:hidden text-gray-500 focus:outline-none relative">
                    {hasAnyNotification && (
                        <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white"></span>
                    )}
                    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 6H20M4 12H20M4 18H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </button>
            </div>

            {/* Centered Title */}
            <h2 className="text-xl font-semibold text-gray-800">{pageTitle}</h2>
            
            {/* Right element for layout */}
            <div className="md:absolute md:right-4">
                 <button type="button" onClick={auth?.logout} className="text-sm font-medium text-brand-primary hover:underline">Выйти</button>
            </div>
        </header>
        <main className="flex-1 overflow-x-hidden bg-gray-100 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
