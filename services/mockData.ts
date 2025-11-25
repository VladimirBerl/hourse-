




import { User, UserRole, TrainingSession, Skill, Goal, ChatMessage, Announcement, NewsItem, DeveloperMessage, LibraryPost, Conversation, AppSettings, PasswordResetRequest, AdminPermissions, NotificationType, NotificationSetting, LOCATION_DATA, NewLocationRequest, WelcomePageContent, DeletionInfo, BonusTransaction, SubscriptionTier, PostImage } from '../types';

// Simulate a database by using 'let' to make the data mutable.
// This file should ONLY be imported by `api.ts`.
const clone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));
const simulateDelay = () => new Promise(res => setTimeout(res, 100));

// --- JWT Simulation ---
// In a real app, this would be a secure, secret key stored in environment variables.
const JWT_SECRET = 'your-super-secret-key-for-mock-jwt';

// Simulates generating a JWT. It's just a Base64 encoded JSON object for this demo.
const generateToken = (userId: string): string => {
    const payload = {
        userId,
        exp: Date.now() + 24 * 60 * 60 * 1000, // Token expires in 24 hours
        // In a real JWT, you'd also have 'iat' (issued at) and other claims.
    };
    // This is NOT a real JWT signature. It's a simple simulation.
    // A real implementation would use a library like 'jsonwebtoken' and HMAC-SHA256.
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const encodedPayload = btoa(JSON.stringify(payload));
    const signature = btoa(`${header}.${encodedPayload}.${JWT_SECRET}`); // Mock signature
    return `${header}.${encodedPayload}.${signature}`;
};

// Simulates verifying a JWT.
const verifyToken = (token: string): { userId: string } => {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) throw new Error('Invalid token format');
        
        const [header, encodedPayload, signature] = parts;
        const expectedSignature = btoa(`${header}.${encodedPayload}.${JWT_SECRET}`);

        if (signature !== expectedSignature) {
            throw new Error('Invalid signature');
        }

        const payload = JSON.parse(atob(encodedPayload));
        if (payload.exp < Date.now()) {
            throw new Error('Token expired');
        }
        if (!payload.userId) {
            throw new Error('Invalid payload');
        }
        return { userId: payload.userId };
    } catch (e) {
        console.error("Token verification failed", e);
        throw new Error('Access Denied');
    }
};


// Sanitize function to prevent XSS.
const sanitize = <T>(data: T, ignoreKeys: string[] = []): T => {
    if (typeof data === 'string') {
        // For data URLs, we don't want to sanitize them.
        if (data.startsWith('data:')) return data as unknown as T;
        return data
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;') as unknown as T;
    }
    if (Array.isArray(data)) {
        return data.map(item => sanitize(item, ignoreKeys)) as unknown as T;
    }
    if (data && typeof data === 'object') {
        const sanitizedObj: { [key: string]: any } = {};
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                if (ignoreKeys.includes(key) || (key === 'url' && (data as any)[key].startsWith('data:'))) {
                    sanitizedObj[key] = (data as any)[key]; // Keep original value for ignored keys or data URLs
                } else {
                    sanitizedObj[key] = sanitize((data as any)[key], ignoreKeys); // Recurse
                }
            }
        }
        return sanitizedObj as T;
    }
    return data;
};

// A simple, insecure hashing for demonstration purposes.
// In a real app, use a library like bcrypt or Argon2 on the server.
const createSalt = () => Math.random().toString(36).substring(2, 15);
const hashPassword = (password: string, salt: string) => {
  // This is NOT a secure hash. For demonstration only.
  // It simulates a real hash by not storing the password in plaintext.
  return btoa(`${salt}${password}${salt}`);
};
const verifyPassword = (password: string, hash: string, salt: string) => {
    return hash === hashPassword(password, salt);
}

// --- USER GENERATION SCRIPT ---
const MALE_NAMES = ['Александр', 'Дмитрий', 'Максим', 'Сергей', 'Андрей', 'Алексей', 'Артём', 'Илья', 'Кирилл', 'Михаил', 'Никита', 'Егор', 'Роман', 'Павел', 'Владимир'];
const FEMALE_NAMES = ['Анастасия', 'Мария', 'Анна', 'Дарья', 'Екатерина', 'Елизавета', 'Полина', 'София', 'Виктория', 'Ксения', 'Александра', 'Вероника', 'Алиса', 'Ольга', 'Юлия'];
const SURNAMES = ['Иванов', 'Смирнов', 'Кузнецов', 'Попов', 'Васильев', 'Петров', 'Соколов', 'Михайлов', 'Новиков', 'Фёдоров', 'Морозов', 'Волков', 'Алексеев', 'Лебедев', 'Семёнов', 'Егоров', 'Павлов', 'Козлов', 'Степанов', 'Николаев'];

const flatLocations = Object.entries(LOCATION_DATA).flatMap(([country, regions]) =>
    Object.entries(regions).flatMap(([region, cities]) =>
        cities.map(city => ({ city, region, country }))
    )
);

const ROLES = [UserRole.Student, UserRole.Trainer, UserRole.Spectator];
const ROLE_DISTRIBUTION = [0.6, 0.25, 0.15]; // Student, Trainer, Spectator

function getRandomItem<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomRole(): UserRole {
    const rand = Math.random();
    let cumulative = 0;
    for (let i = 0; i < ROLE_DISTRIBUTION.length; i++) {
        cumulative += ROLE_DISTRIBUTION[i];
        if (rand < cumulative) {
            return ROLES[i];
        }
    }
    return ROLES[0]; // Fallback
}

const generatedUsers: User[] = [];
for (let i = 0; i < 100; i++) {
    const isMale = Math.random() > 0.5;
    const name = isMale ? getRandomItem(MALE_NAMES) : getRandomItem(FEMALE_NAMES);
    let surname = getRandomItem(SURNAMES);
    if (!isMale) {
        if (surname.endsWith('ов') || surname.endsWith('ев') || surname.endsWith('ин')) {
            surname += 'а';
        }
    }

    const location = getRandomItem(flatLocations);
    const role = getRandomRole();
    const id = (200000 + i).toString();
    const email = `user${id}@example.com`;
    const registrationDate = new Date(Date.now() - Math.floor(Math.random() * 2 * 365 * 24 * 60 * 60 * 1000)).toISOString();
    
    const salt = createSalt();
    const passwordHash = hashPassword('password123', salt);

    const newUser: User = {
        id, name, surname,
        country: location.country,
        region: location.region,
        city: location.city,
        role, email, salt, passwordHash,
        linkedUsers: [], registrationDate,
        pendingStudents: [], pendingTrainerRequestFrom: null,
        studentRequests: [], trainerRequests: [],
        readAnnouncementIds: [], readNewsIds: [], readLibraryPostIds: [],
        lastReadTimestamps: {}, isOnline: Math.random() > 0.8,
        lastLogin: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)).toISOString(),
        canReplyToAdmin: false, approvedAnnouncementCount: Math.floor(Math.random() * 25),
        discount: undefined, pushSubscriptionActive: false,
        notificationSettings: {
            linkRequest: 'push', trainingConfirmation: 'badge',
            trainingReminder: 'push', chatMessage: 'push',
            newAnnouncement: 'badge', newNews: 'badge', newLibraryPost: 'badge'
        },
        bonuses: Math.floor(Math.random() * 500),
        referralCount: 0,
    };
    generatedUsers.push(newUser);
}
// --- END USER GENERATION SCRIPT ---

// FIX: Create strongly-typed helper objects for notification settings to ensure correct type inference.
const userNotificationSettings: Partial<Record<NotificationType, NotificationSetting>> = {
    linkRequest: 'push',
    trainingConfirmation: 'badge',
    trainingReminder: 'push',
    chatMessage: 'push',
    newAnnouncement: 'badge',
    newNews: 'badge',
    newLibraryPost: 'badge'
};

const fullAdminNotificationSettings: Partial<Record<NotificationType, NotificationSetting>> = {
    chatMessage: 'push',
    adminMessage: 'push',
    announcementModeration: 'push',
    passwordResetRequest: 'push',
    newLocationRequest: 'push'
};

const partialAdminNotificationSettings: Partial<Record<NotificationType, NotificationSetting>> = {
    chatMessage: 'push',
    adminMessage: 'badge',
    announcementModeration: 'push',
    passwordResetRequest: 'badge'
};

export let MOCK_SETTINGS: AppSettings = {
    id: 'default',
    announcementBasePrice: 500,
    defaultAnnouncementDeletion: 'none',
    defaultNewsDeletion: 'none',
    defaultLibraryDeletion: 'none',
    termsOfService: `<h2>1. Общие положения</h2><p>1.1. Настоящее Пользовательское соглашение (далее – Соглашение) регулирует отношения между... </p><p>Пожалуйста, заполните этот раздел в настройках администратора.</p>`,
    privacyPolicy: `<h2>1. Сбор информации</h2><p>1.1. Мы собираем информацию, которую вы предоставляете при регистрации, включая ваше имя, email и город...</p><p>Пожалуйста, заполните этот раздел в настройках администратора.</p>`,
    subscriptionPrices: {
        [SubscriptionTier.Pro]: { month: 499, year: 4990 },
        [SubscriptionTier.Maximum]: { month: 999, year: 9990 },
    },
    subscriptionPaymentOptions: {
        [SubscriptionTier.Pro]: { month: true, year: true },
        [SubscriptionTier.Maximum]: { month: true, year: true },
    },
    trialSettings: {
        durationDays: 30,
        tier: SubscriptionTier.Pro,
    },
    bonusPaymentPercentage: 50,
    bonusExpirationMonths: 6,
};

export let MOCK_LOCATIONS: Record<string, Record<string, string[]>> = JSON.parse(JSON.stringify(LOCATION_DATA));
export let MOCK_IP_REGISTRATIONS: { ip: string; date: string }[] = [];

export let MOCK_WELCOME_PAGE_CONTENT: WelcomePageContent = {
    id: 'singleton',
    heroTitle: 'Ваш цифровой помощник в конном мире',
    heroSubtitle: 'Все, что нужно для эффективных тренировок, анализа прогресса и общения с вашим тренером — в одном приложении.',
    heroButtonText: 'Начать бесплатно',
    heroImageUrl: 'https://images.unsplash.com/photo-1598974357801-927006515f86?q=80&w=2070&auto=format&fit=crop',
    featuresTitle: 'Основные возможности',
    featuresSubtitle: 'Откройте для себя инструменты, которые помогут вам достичь новых высот в конном спорте.',
    features: [
        { title: 'Календарь тренировок', description: 'Планируйте и отслеживайте свои занятия, получайте обратную связь и анализируйте прошедшие тренировки.' },
        { title: 'Статистика и прогресс', description: 'Визуализируйте свой прогресс с помощью наглядных графиков и достигайте новых спортивных высот.' },
        { title: 'Общение и сообщество', description: 'Оставайтесь на связи с тренером, читайте новости, обменивайтесь мнениями в опросах и объявлениях.' },
        { title: 'Библиотека знаний', description: 'Получайте доступ к полезным статьям и материалам для повышения вашего мастерства и знаний.' }
    ],
    forWhomTitle: 'Для кого это приложение?',
    forWhomSectionBg: '#f9fafb', // light gray
    forTrainersTitle: 'Для Тренеров',
    forTrainersSubtitle: 'Управляйте расписанием, следите за прогрессом учеников и оставайтесь на связи в одном удобном инструменте.',
    forTrainersList: [
        'Эффективное планирование тренировок',
        'Анализ статистики по каждому ученику',
        'Удобный чат для быстрой коммуникации',
        'Публикация новостей и объявлений для групп'
    ],
    forTrainersImageUrl: 'https://images.unsplash.com/photo-1551823337-331a615a9a18?q=80&w=1974&auto=format&fit=crop',
    forStudentsTitle: 'Для Учеников',
    forStudentsSubtitle: 'Ведите дневник тренировок, анализируйте свой прогресс и получайте ценную обратную связь от тренера.',
    forStudentsList: [
        'Наглядный календарь занятий',
        'Отслеживание прогресса по оценкам',
        'Удобная связь с тренером',
        'Доступ к базе знаний и новостям'
    ],
    forStudentsImageUrl: 'https://images.unsplash.com/photo-1534775739923-3c9a6a8b30b4?q=80&w=2070&auto=format&fit=crop',
    testimonialsTitle: 'Что говорят наши пользователи',
    testimonialsSectionBg: '#2c5282', // brand-primary
    testimonials: [
        { id: 't1', quote: "Это приложение полностью изменило мой подход к тренировкам. Аналитика помогает видеть прогресс, а календарь не дает пропустить ни одного занятия!", name: "Елена Смирнова", role: "Ученик" },
        { id: 't2', quote: "Как тренер, я в восторге от возможности вести всех своих учеников в одном месте. Обратная связь стала намного проще и эффективнее.", name: "Иван Петров", role: "Тренер" },
        { id: 't3', quote: "Наконец-то появилось современное и удобное приложение для конников. Особенно нравится раздел с библиотекой, очень много полезного материала.", name: "Анна Кузнецова", role: "Ученик" }
    ],
    ctaTitle: 'Готовы присоединиться?',
    ctaSubtitle: 'Начните свой путь к успеху уже сегодня. Регистрация займет всего минуту.',
    ctaButtonText: 'Зарегистрироваться'
};

const initialUsersWithHashedPasswords = [
    { id: '112233', name: 'Елена', surname: 'Смирнова', country: 'Россия', region: 'Москва', city: 'Москва', role: UserRole.Student, email: 'student@example.com', password: 'password123', linkedUsers: ['445566'], registrationDate: '2023-09-01T10:00:00.000Z', pendingTrainerRequestFrom: null, readAnnouncementIds: ['ann1'], readNewsIds: [], readLibraryPostIds: [], lastReadTimestamps: { 'chat1': new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString() }, canReplyToAdmin: false, approvedAnnouncementCount: 12, discount: 5, pushSubscriptionActive: false, notificationSettings: userNotificationSettings, bonuses: 50, referralCount: 0 },
    { id: '445566', name: 'Иван', surname: 'Петров', country: 'Россия', region: 'Москва', city: 'Москва', role: UserRole.Trainer, email: 'trainer@example.com', password: 'password123', linkedUsers: ['112233', '998877'], avatarUrl: 'https://picsum.photos/seed/user2/200', registrationDate: '2023-08-15T12:00:00.000Z', pendingStudents: [], studentRequests: [], trainerRequests: [], readAnnouncementIds: [], readNewsIds: ['news1'], readLibraryPostIds: ['lib1'], lastReadTimestamps: { 'chat1': new Date().toISOString() }, canReplyToAdmin: false, approvedAnnouncementCount: 3, discount: 0, pushSubscriptionActive: false, notificationSettings: userNotificationSettings, bonuses: 200, referralCount: 0 },
    { id: '778899', name: 'Анна', surname: 'Кузнецова', country: 'Россия', region: 'Санкт-Петербург', city: 'Санкт-Петербург', role: UserRole.Student, email: 'student2@example.com', password: 'password123', linkedUsers: [], avatarUrl: 'https://picsum.photos/seed/user3/200', registrationDate: '2024-01-20T18:30:00.000Z', pendingTrainerRequestFrom: '998877', canReplyToAdmin: false, approvedAnnouncementCount: 0, discount: 0, pushSubscriptionActive: false, notificationSettings: userNotificationSettings, bonuses: 0, referralCount: 0 },
    { id: '998877', name: 'Сергей', surname: 'Волков', country: 'Россия', region: 'Санкт-Петербург', city: 'Санкт-Петербург', role: UserRole.Trainer, email: 'trainer2@example.com', password: 'password123', linkedUsers: ['445566'], registrationDate: '2022-11-11T11:00:00.000Z', pendingStudents: ['778899'], studentRequests: [], trainerRequests: [], canReplyToAdmin: false, approvedAnnouncementCount: 21, discount: 10, pushSubscriptionActive: false, notificationSettings: userNotificationSettings, bonuses: 150, referralCount: 0 },
    { id: '000001', name: 'Admin', surname: 'One', country: 'N/A', region: 'N/A', city: 'Control Panel', role: UserRole.Admin, email: 'start@maneg.pro', password: '1', linkedUsers: [], registrationDate: '2022-01-01T00:00:00.000Z', isOnline: true, lastLogin: new Date(Date.now() - 5 * 60 * 1000).toISOString(), permissions: { canManageUsers: true, canManageAnnouncements: true, canManageNews: true, canManageLibraryPosts: true, canViewStats: true, canViewMessages: true, canManageAdmins: true, canAccessChat: true, canResetUserPasswords: true, canManageSubscriptions: true }, pushSubscriptionActive: false, notificationSettings: fullAdminNotificationSettings, bonuses: 0, referralCount: 0 },
    { id: '000002', name: 'Admin', surname: 'Two', country: 'N/A', region: 'N/A', city: 'Control Panel', role: UserRole.Admin, email: 'admin2@example.com', password: 'admin', linkedUsers: [], registrationDate: '2023-01-01T00:00:00.000Z', isOnline: false, lastLogin: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), permissions: { canManageUsers: false, canManageAnnouncements: true, canManageNews: true, canManageLibraryPosts: false, canViewStats: false, canViewMessages: false, canManageAdmins: false, canAccessChat: true, canResetUserPasswords: false }, pushSubscriptionActive: false, notificationSettings: partialAdminNotificationSettings, bonuses: 0, referralCount: 0 },
    { id: '000003', name: 'Backup', surname: 'Admin', country: 'N/A', region: 'N/A', city: 'Control Panel', role: UserRole.Admin, email: 'a1@gmail.com', password: 'BackupAdminPass2024!', linkedUsers: [], registrationDate: '2022-01-01T00:00:00.000Z', isOnline: true, lastLogin: new Date().toISOString(), permissions: { canManageUsers: true, canManageAnnouncements: true, canManageNews: true, canManageLibraryPosts: true, canViewStats: true, canViewMessages: true, canManageAdmins: true, canAccessChat: true, canResetUserPasswords: true }, pushSubscriptionActive: false, notificationSettings: fullAdminNotificationSettings, bonuses: 0, referralCount: 0 },
]
.map(({password, ...user}) => {
    const salt = createSalt();
    const passwordHash = hashPassword(password, salt);
    return { ...user, salt, passwordHash };
});

// FIX: Add a type assertion to User[] to correct TypeScript's type inference.
// Without it, `user` in the map function is a wide union type, causing an error
// when accessing the optional `subscription` property.
export let MOCK_USERS: User[] = ([
    ...initialUsersWithHashedPasswords,
    ...generatedUsers
] as User[]).map(user => {
    if (user.role !== UserRole.Admin && !user.subscription) {
        return { ...user, subscription: { tier: SubscriptionTier.Base, expiresAt: null } };
    }
    return user;
});

const generateUniqueUserId = (): string => {
    let attempts = 0;
    while (attempts < 1000) { // Safety break after 1000 tries
        // Generate a number between 1 and 999999
        const randomId = Math.floor(Math.random() * 999999) + 1; 
        const formattedId = String(randomId).padStart(6, '0');
        
        const isTaken = MOCK_USERS.some(user => user.id === formattedId);
        if (!isTaken) {
            return formattedId;
        }
        attempts++;
    }
    // Fallback for the very unlikely case of not finding an ID.
    // In a real app, this should be handled more gracefully.
    return `fallback-${Date.now()}`; 
};

export let MOCK_NEW_LOCATION_REQUESTS: NewLocationRequest[] = [
    { id: 'loc-req-1', userId: '778899', submittedCity: 'Новый город', submittedRegion: 'Новая область', submittedCountry: 'Новая страна', status: 'pending', requestTimestamp: new Date().toISOString() }
];

export let MOCK_PASSWORD_RESET_REQUESTS: PasswordResetRequest[] = [
    { id: 'req1', userId: '778899', requestTimestamp: new Date(Date.now() - 60000 * 30).toISOString(), status: 'pending' },
    { id: 'req2', userId: '112233', requestTimestamp: new Date(Date.now() - 60000 * 60 * 25).toISOString(), status: 'completed', resolvedBy: '000001', resolvedTimestamp: new Date(Date.now() - 60000 * 60 * 24).toISOString(), newPassword: 'newPassword123' },
    { id: 'req3', userId: '445566', requestTimestamp: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(), status: 'completed', resolvedBy: '000002', resolvedTimestamp: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(), newPassword: 'trainerPassword' }
];

export let MOCK_CONVERSATIONS: Conversation[] = [
    { id: 'chat1', participantIds: ['112233', '445566'], pinnedBy: [] },
    { id: 'chat2', participantIds: ['445566', '998877'], pinnedBy: [] },
    { id: 'service-chat-112233', participantIds: ['112233', '000001', '000002', '000003'], pinnedBy: [] },
    { id: 'service-chat-445566', participantIds: ['445566', '000001', '000002', '000003'], pinnedBy: [] },
    { id: 'service-chat-778899', participantIds: ['778899', '000001', '000002', '000003'], pinnedBy: [] },
    { id: 'service-chat-998877', participantIds: ['998877', '000001', '000002', '000003'], pinnedBy: [] },
];

export let MOCK_ANNOUNCEMENTS: Announcement[] = [
    {
        id: 'ann_pending_1',
        title: 'Продам седло',
        content: 'Почти новое, конкурное. Размер 17.5. Недорого. Пишите в личку.',
        authorId: '112233', // temp author
        submittedById: '112233',
        timestamp: new Date().toISOString(),
        publishTimestamp: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending',
        isModerated: false,
    },
    {
        id: 'ann1',
        title: 'Плановое техническое обслуживание',
        content: 'Уважаемые пользователи! 25 июля с 02:00 до 04:00 по московскому времени будут проводиться плановые технические работы. Приложение может быть временно недоступно. Приносим извинения за неудобства.',
        authorId: '000001',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        sentToUserIds: ['112233', '445566', '778899', '998877'], // All non-admin users
        status: 'published'
    },
    {
        id: 'ann5_poll',
        title: 'Опрос: Какой тип контента вам наиболее интересен?',
        content: 'Мы хотим делать приложение лучше для вас. Пожалуйста, поделитесь своим мнением, выбрав один или несколько вариантов.',
        authorId: '000001',
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
        sentToUserIds: ['112233', '445566', '778899', '998877'],
        status: 'published',
        images: [{
            id: 'img1',
            url: 'https://picsum.photos/seed/poll/800/200',
            position: 'beforeContent',
            timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        }],
        poll: {
            id: 'poll1',
            allowMultipleVotes: true,
            options: [
                { id: 'opt1', text: 'Советы по тренировкам' },
                { id: 'opt2', text: 'Аналитика и статистика' },
                { id: 'opt3', text: 'Новости из мира конного спорта' },
                { id: 'opt4', text: 'Интервью с профессионалами' },
            ],
            votes: [
                { userId: '445566', optionIds: ['opt2', 'opt4'] }
            ]
        }
    },
    {
        id: 'ann2',
        title: 'Семинар по выездке в Москве',
        content: 'Приглашаем всех тренеров и учеников из Москвы на открытый семинар по основам выездки, который состоится 5 августа в КСК "Битца". Ведущий семинара - мастер спорта международного класса. Запись открыта!',
        authorId: '000001',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        targetCities: ['Москва'],
        sentToUserIds: ['112233', '445566'], // Only users from Moscow
        status: 'published'
    },
    {
        id: 'ann3',
        title: 'Обновление для тренеров',
        content: 'В разделе "Мои ученики" добавлена возможность просмотра статистики по каждому ученику. Мы работаем над дальнейшим расширением функционала для вашего удобства.',
        authorId: '000001',
        timestamp: new Date().toISOString(),
        targetRoles: [UserRole.Trainer],
        sentToUserIds: ['445566', '998877'], // Only trainers
        status: 'published'
    },
    {
        id: 'ann4',
        title: 'Запланированное объявление',
        content: 'Это объявление появится для всех пользователей в будущем.',
        authorId: '000001',
        timestamp: new Date().toISOString(),
        publishTimestamp: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
        sentToUserIds: ['112233', '445566', '778899', '998877'],
        status: 'published'
    }
];

export let MOCK_NEWS: NewsItem[] = [
    {
        id: 'news1',
        title: 'Новый рекорд в конкуре',
        content: 'На прошедших выходных был установлен новый мировой рекорд по прыжкам в высоту. Всадник из Германии преодолел планку в 2.47 метра, побив предыдущее достижение.',
        authorId: '000001',
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        sentToUserIds: ['112233', '445566', '778899', '998877'] // All non-admin users
    },
    {
        id: 'news2',
        title: 'Совет недели: Работа над переходами',
        content: 'Качественные переходы - залог хорошего баланса и импульса. Посвятите 10 минут каждой тренировки отработке переходов между аллюрами. Начните с шага-рыси и постепенно усложняйте задачу, добавляя остановки и переходы внутри аллюра (например, собранная рысь - средняя рысь).',
        authorId: '000001',
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        sentToUserIds: ['112233', '445566', '778899', '998877'] // All non-admin users
    }
];

export let MOCK_LIBRARY_POSTS: LibraryPost[] = [
    {
        id: 'lib1',
        title: 'Основы ухода за лошадью',
        content: 'Правильный уход - залог здоровья вашей лошади. Ежедневная чистка, проверка копыт, правильное кормление и поение - вот основы, которые должен знать каждый конник. Не забывайте о регулярных визитах ветеринара и коваля.',
        authorId: '000001',
        timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        sentToUserIds: ['112233', '445566', '778899', '998877']
    },
    {
        id: 'lib2',
        title: 'Виды конного спорта',
        content: 'Существует множество дисциплин в конном спорте. Самые популярные - это конкур, выездка и троеборье. Но есть и другие, не менее увлекательные: драйвинг, вольтижировка, скачки и пробеги. Каждый может найти что-то по душе!',
        authorId: '000001',
        timestamp: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        targetRoles: [UserRole.Student, UserRole.Spectator],
        sentToUserIds: ['112233', '778899']
    }
];


export let MOCK_DEV_MESSAGES: DeveloperMessage[] = [];


export let MOCK_SKILLS: Skill[] = [
  { id: 'skill1', name: 'Посадка', ownerId: '112233' },
  { id: 'skill2', name: 'Работа на шагу', ownerId: '112233' },
  { id: 'skill3', name: 'Собранность', ownerId: '112233' },
  { id: 'skill4', name: 'Работа на рыси', ownerId: '112233' },
];

export let MOCK_TRAININGS: TrainingSession[] = [
  {
    id: 'tr2',
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    startTime: '10:00',
    duration: 60,
    authorId: '445566',
    participants: [
        { userId: '112233', confirmed: true, role: UserRole.Student }, 
        { userId: '445566', confirmed: true, role: UserRole.Trainer }
    ],
    type: 'Выездка',
    comments: 'Отлично поработали над боковыми сгибаниями. Лошадь была отзывчивой.',
    photoUrl: 'https://picsum.photos/seed/horse1/400/300',
    photoTimestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    ratings: [{ userId: '112233', score: 8 }, { userId: '445566', score: 7 }],
    status: 'scheduled',
  },
  {
    id: 'tr3',
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    startTime: '12:00',
    duration: 45,
    authorId: '112233',
    participants: [
        { userId: '112233', confirmed: true, role: UserRole.Student }, 
        { userId: '445566', confirmed: true, role: UserRole.Trainer }
    ],
    type: 'Конкур',
    comments: 'Прыгали небольшие связки, нужно больше работать над ритмом.',
    photoUrl: 'https://picsum.photos/seed/horse2/400/300',
    photoTimestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    ratings: [{ userId: '112233', score: 6 }],
    status: 'scheduled',
  },
  {
    id: 'tr5',
    date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    startTime: '09:00',
    duration: 60,
    authorId: '112233',
    participants: [
        { userId: '112233', confirmed: true, role: UserRole.Student }, 
        { userId: '445566', confirmed: false, role: UserRole.Trainer }
    ],
    type: 'Выездка',
    status: 'scheduled',
  },
  {
    id: 'tr4',
    date: new Date().toISOString(),
    startTime: '15:00',
    duration: 60,
    authorId: '445566',
    participants: [
        { userId: '112233', confirmed: true, role: UserRole.Student }, 
        { userId: '445566', confirmed: true, role: UserRole.Trainer }
    ],
    type: 'Работа в руках',
    comments: 'Сегодня фокусировались на доверии и контакте. Лошадь была немного напряжена вначале.',
    ratings: [{ userId: '445566', score: 9 }, { userId: '112233', score: 8 }],
    status: 'scheduled',
  },
  {
    id: 'tr1',
    date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    startTime: '18:00',
    duration: 75,
    authorId: '998877',
    participants: [
        { userId: '998877', confirmed: true, role: UserRole.Student }, // Волков - ученик
        { userId: '445566', confirmed: true, role: UserRole.Trainer }  // Петров - тренер
    ],
    type: 'Манежная езда',
    comments: 'Тренировка между тренерами. Сергей в роли ученика.',
    ratings: [{ userId: '998877', score: 8 }, { userId: '445566', score: 9 }],
    status: 'scheduled',
  },
];

export let MOCK_GOALS: Goal[] = [
  { id: 'goal1', title: 'Оценка по посадке ≥ 8', description: 'Достичь стабильной оценки 8 или выше по навыку "Посадка" в течение месяца.', isAchieved: false, authorId: '445566', targetUserId: '112233' },
  { id: 'goal2', title: '3 тренировки в неделю', description: 'Проводить не менее трех тренировок каждую неделю.', isAchieved: true, authorId: '112233', targetUserId: '112233' },
  { id: 'goal3', title: 'Участие в соревнованиях', description: 'Подготовиться и принять участие в клубных соревнованиях в следующем квартале.', isAchieved: false, authorId: '112233', targetUserId: '112233' },
];

export let MOCK_CHAT_MESSAGES: ChatMessage[] = [
    { id: 'msg1', chatId: 'chat1', senderId: '445566', text: 'Елена, как прошла вчерашняя самостоятельная работа?', timestamp: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), status: 'read' },
    { id: 'msg2', chatId: 'chat1', senderId: '112233', text: 'Иван, здравствуйте! В целом неплохо, но были сложности с вольтами направо.', timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), status: 'read' },
    { id: 'msg3', chatId: 'chat1', senderId: '445566', text: 'Понял, на следующей тренировке уделим этому внимание.', timestamp: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(), status: 'read' },
    { id: 'msg4', chatId: 'chat1', senderId: '445566', text: 'Кстати, не забудьте посмотреть новое объявление о семинаре.', timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(), status: 'delivered' },

    { id: 'msg5', chatId: 'service-chat-112233', senderId: '000001', text: 'Добро пожаловать в МАНЕЖ.ПРО! Здесь будут появляться важные сервисные уведомления.', timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
    { id: 'msg6', chatId: 'service-chat-445566', senderId: '000001', text: 'Добро пожаловать в МАНЕЖ.ПРО! Здесь будут появляться важные сервисные уведомления.', timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
    { id: 'msg7', chatId: 'service-chat-112233', senderId: '000001', text: 'Напоминаем о плановом техническом обслуживании завтра ночью.', timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
];

export let MOCK_BONUS_TRANSACTIONS: BonusTransaction[] = [
    { id: 'bt1', userId: '112233', amount: 100, description: 'Приветственный бонус', timestamp: '2023-09-01T10:05:00.000Z', adminId: '000001', source: 'system' },
    { id: 'bt2', userId: '112233', amount: -50, description: 'Скидка на услугу', timestamp: '2023-10-15T14:00:00.000Z' },
    { id: 'bt3', userId: '445566', amount: 200, description: 'Начисление за активность', timestamp: '2023-11-01T11:30:00.000Z', adminId: '000001', source: 'admin_action'},
    { id: 'bt4', userId: '998877', amount: 150, description: 'Начисление сервиса', timestamp: '2023-12-01T11:30:00.000Z', adminId: '000001', source: 'admin_action'},
];

// Manually add referral data for demonstration
const referrer_trainer1 = MOCK_USERS.find(u => u.id === '445566'); // trainer@example.com
if (referrer_trainer1) referrer_trainer1.referralCount = 3;

const referrer_student1 = MOCK_USERS.find(u => u.id === '112233'); // student@example.com
if (referrer_student1) referrer_student1.referralCount = 2;

const referrer_trainer2 = MOCK_USERS.find(u => u.id === '998877'); // trainer2@example.com
if (referrer_trainer2) referrer_trainer2.referralCount = 1;


const referred_by_trainer1_user1 = MOCK_USERS.find(u => u.id === '200000');
if (referred_by_trainer1_user1) referred_by_trainer1_user1.referredBy = '445566';

const referred_by_trainer1_user2 = MOCK_USERS.find(u => u.id === '200001');
if (referred_by_trainer1_user2) referred_by_trainer1_user2.referredBy = '445566';

const referred_by_trainer1_user3 = MOCK_USERS.find(u => u.id === '200002');
if (referred_by_trainer1_user3) referred_by_trainer1_user3.referredBy = '445566';

const referred_by_student1_user1 = MOCK_USERS.find(u => u.id === '200003');
if (referred_by_student1_user1) referred_by_student1_user1.referredBy = '112233';

const referred_by_student1_user2 = MOCK_USERS.find(u => u.id === '200004');
if (referred_by_student1_user2) referred_by_student1_user2.referredBy = '112233';

const referred_by_trainer2_user1 = MOCK_USERS.find(u => u.id === '200005');
if (referred_by_trainer2_user1) referred_by_trainer2_user1.referredBy = '998877';


// Add bonus transactions for referral purchases to make the modal view more informative
if (referrer_trainer1 && referred_by_trainer1_user1) {
    const bonusAmount = 100; // e.g. 20% of a 500 rub purchase
    referrer_trainer1.bonuses = (referrer_trainer1.bonuses || 0) + bonusAmount;
    MOCK_BONUS_TRANSACTIONS.push({
        id: 'bt-ref-mock-1',
        userId: referrer_trainer1.id,
        amount: bonusAmount,
        description: `Бонус за покупку от ${referred_by_trainer1_user1.name} ${referred_by_trainer1_user1.surname}`,
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        source: 'referral',
        sourceUserId: referred_by_trainer1_user1.id,
    });
}

if (referrer_trainer1 && referred_by_trainer1_user2) {
    const bonusAmount = 200; // e.g. 20% of a 1000 rub purchase
    referrer_trainer1.bonuses = (referrer_trainer1.bonuses || 0) + bonusAmount;
    MOCK_BONUS_TRANSACTIONS.push({
        id: 'bt-ref-mock-2',
        userId: referrer_trainer1.id,
        amount: bonusAmount,
        description: `Бонус за покупку от ${referred_by_trainer1_user2.name} ${referred_by_trainer1_user2.surname}`,
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        source: 'referral',
        sourceUserId: referred_by_trainer1_user2.id,
    });
}
// Note: referred_by_trainer1_user3 has no purchases, so no bonus for referrer_trainer1 from them.

if (referrer_student1 && referred_by_student1_user1) {
    const bonusAmount = 150; // e.g. 20% of a 750 rub purchase
    referrer_student1.bonuses = (referrer_student1.bonuses || 0) + bonusAmount;
    MOCK_BONUS_TRANSACTIONS.push({
        id: 'bt-ref-mock-3',
        userId: referrer_student1.id,
        amount: bonusAmount,
        description: `Бонус за покупку от ${referred_by_student1_user1.name} ${referred_by_student1_user1.surname}`,
        timestamp: new Date().toISOString(),
        source: 'referral',
        sourceUserId: referred_by_student1_user1.id,
    });
}

const checkPermission = (token: string, checkFn: (user: User) => boolean) => {
    const { userId } = verifyToken(token);
    const currentUser = MOCK_USERS.find(u => u.id === userId);
    if (!currentUser || !checkFn(currentUser)) {
        throw new Error('Access Denied');
    }
    return currentUser;
}

const isAdminWithPerm = (permission: keyof AdminPermissions) => (user: User) => {
    return user.role === UserRole.Admin && !!user.permissions?.[permission];
}

// --- BONUSES ---
export const apiGetAllBonusTransactions = async (): Promise<BonusTransaction[]> => {
    await simulateDelay();
    return clone(MOCK_BONUS_TRANSACTIONS);
};

export const apiAdminUpdateBonuses = async (adminId: string, targetUserId: string, amount: number, description: string, token: string): Promise<void> => {
    await simulateDelay();
    checkPermission(token, isAdminWithPerm('canManageUsers'));

    const userIndex = MOCK_USERS.findIndex(u => u.id === targetUserId);
    if (userIndex === -1) throw new Error('User not found');

    const newTransaction: BonusTransaction = {
        id: `bt-${Date.now()}`,
        userId: targetUserId,
        amount,
        description: description || (amount > 0 ? 'Начисление сервиса' : 'Списание сервиса'),
        timestamp: new Date().toISOString(),
        adminId,
        source: 'admin_action',
    };

    if (amount > 0) {
        const expirationMonths = MOCK_SETTINGS.bonusExpirationMonths || 6;
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + expirationMonths);
        newTransaction.expiresAt = expiresAt.toISOString();
        newTransaction.remainingAmount = amount;
    }
    MOCK_BONUS_TRANSACTIONS.push(newTransaction);
    
    if (MOCK_USERS[userIndex].bonuses === undefined) {
        MOCK_USERS[userIndex].bonuses = 0;
    }
    MOCK_USERS[userIndex].bonuses! += amount;
};

export const apiExpireBonuses = async (): Promise<void> => {
    await simulateDelay();
    const now = new Date();
    const transactionsToExpire = MOCK_BONUS_TRANSACTIONS.filter(t => 
        t.amount > 0 && // It's an accrual
        t.expiresAt && // It has an expiration date
        new Date(t.expiresAt) < now && // It has expired
        (t.remainingAmount === undefined || t.remainingAmount > 0) // And there's something left to expire
    );

    if (transactionsToExpire.length === 0) {
        return;
    }

    transactionsToExpire.forEach(transaction => {
        // If remainingAmount is not used in the system, we assume the full amount expires if it hasn't been explicitly spent.
        // This is a simplification. A real system would track remaining amounts meticulously.
        const amountToExpire = transaction.remainingAmount ?? transaction.amount;
        if (amountToExpire <= 0) {
            // This transaction has already been fully used or expired. Mark it just in case.
            transaction.remainingAmount = 0;
            return;
        };

        const userIndex = MOCK_USERS.findIndex(u => u.id === transaction.userId);
        if (userIndex > -1) {
            const user = MOCK_USERS[userIndex];
            if (user.bonuses !== undefined) {
                user.bonuses = Math.max(0, user.bonuses - amountToExpire);
            }

            // Create expiration transaction for history
            const expirationTransaction: BonusTransaction = {
                id: `bt-exp-${Date.now()}-${transaction.id}`,
                userId: user.id,
                amount: -amountToExpire,
                description: `Истечение срока действия бонусов от ${new Date(transaction.timestamp).toLocaleDateString()}`,
                timestamp: now.toISOString(),
            };
            MOCK_BONUS_TRANSACTIONS.push(expirationTransaction);

            // Mark original transaction as fully used/expired
            transaction.remainingAmount = 0;
        } else {
            // User not found, just mark transaction as expired
            transaction.remainingAmount = 0;
        }
    });
};


// --- LOCATIONS ---
export const apiGetLocations = async (): Promise<Record<string, Record<string, string[]>>> => {
    await simulateDelay();
    return clone(MOCK_LOCATIONS);
};
export const apiUpdateLocations = async (newLocations: Record<string, Record<string, string[]>>, token: string): Promise<void> => {
    await simulateDelay();
    checkPermission(token, isAdminWithPerm('canManageAdmins'));
    MOCK_LOCATIONS = sanitize(newLocations);
};

// --- AUTH ---
export const apiLogin = async (email: string, password?: string): Promise<{ user: User; token: string } | null> => {
    await simulateDelay();
    const user = MOCK_USERS.find(u => u.email.toLowerCase() === email.toLowerCase() && !u.isDeleted);
    if (user && password && verifyPassword(password, user.passwordHash, user.salt)) {
        user.isOnline = true;
        user.lastLogin = new Date().toISOString();
        const token = generateToken(user.id);
        return { user: clone(user), token };
    }
    return null;
};
export const apiLogout = async (token: string): Promise<void> => {
    await simulateDelay();
    try {
        const { userId } = verifyToken(token);
        const user = MOCK_USERS.find(u => u.id === userId);
        if (user) {
            user.isOnline = false;
        }
    } catch (e) {
        // Token might be invalid, but we proceed with logout anyway
        console.warn("Logout with invalid token.");
    }
};
export const apiVerifyToken = async (token: string): Promise<User | null> => {
    await simulateDelay();
    try {
        const { userId } = verifyToken(token);
        const user = MOCK_USERS.find(u => u.id === userId && !u.isDeleted);
        return user ? clone(user) : null;
    } catch (e) {
        return null;
    }
};
export const apiRegister = async (newUserPartial: Omit<User, 'id' | 'registrationDate' | 'linkedUsers' | 'passwordHash' | 'salt'> & { password: string; referredBy?: string; }): Promise<{ user: User, token: string } | null> => {
    await simulateDelay();

    const SIMULATED_IP = '127.0.0.1';
    const today = new Date().toISOString().split('T')[0];

    const hasRegisteredToday = MOCK_IP_REGISTRATIONS.some(
        reg => reg.ip === SIMULATED_IP && reg.date === today
    );

    if (hasRegisteredToday) {
        throw new Error('С этого IP-адреса уже была регистрация сегодня.');
    }

    const sanitizedEmail = sanitize(newUserPartial.email);
    if (MOCK_USERS.some(u => u.email.toLowerCase() === sanitizedEmail.toLowerCase())) return null;
    
    const { password, referredBy, ...restOfData } = newUserPartial;
    const sanitizedRest = sanitize(restOfData);

    const newId = generateUniqueUserId();
    const salt = createSalt();
    const passwordHash = hashPassword(password, salt);

    const trialSettings = MOCK_SETTINGS.trialSettings;
    let subscription: User['subscription'] = undefined;
    if (trialSettings && sanitizedRest.role !== UserRole.Admin) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + trialSettings.durationDays);
        subscription = {
            tier: trialSettings.tier,
            expiresAt: expiresAt.toISOString(),
        };
    }

    const newUser: User = { 
        ...sanitizedRest, 
        id: newId, 
        registrationDate: new Date().toISOString(), 
        linkedUsers: [], 
        salt, 
        passwordHash, 
        isOnline: true, 
        lastLogin: new Date().toISOString(), 
        canReplyToAdmin: false, 
        bonuses: 0, 
        referralCount: 0,
        subscription,
        referredBy,
        referralPurchaseCount: 0,
    };
    
    if (referredBy) {
        const referrerIndex = MOCK_USERS.findIndex(u => u.id === referredBy);
        if (referrerIndex > -1) {
            MOCK_USERS[referrerIndex].referralCount = (MOCK_USERS[referrerIndex].referralCount || 0) + 1;
        }
    }

    MOCK_USERS.push(newUser);
    
    MOCK_IP_REGISTRATIONS.push({ ip: SIMULATED_IP, date: today });

    const { country, region, city } = sanitizedRest;
    const countryData = MOCK_LOCATIONS[country];
    const regionData = countryData ? countryData[region] : undefined;
    const cityExists = regionData ? regionData.includes(city) : false;

    if (!cityExists) {
        const newLocationRequest: NewLocationRequest = {
            id: `loc-req-${Date.now()}`,
            userId: newId,
            submittedCity: city,
            submittedRegion: region,
            submittedCountry: country,
            status: 'pending',
            requestTimestamp: new Date().toISOString(),
        };
        MOCK_NEW_LOCATION_REQUESTS.push(newLocationRequest);
    }

    const adminsWithChatAccess = MOCK_USERS.filter(u => u.role === UserRole.Admin && u.permissions?.canAccessChat);
    if (adminsWithChatAccess.length > 0) {
        const participantIds = [newId, ...adminsWithChatAccess.map(admin => admin.id)];
        const serviceChatId = `service-chat-${newId}`;
        MOCK_CONVERSATIONS.push({ id: serviceChatId, participantIds, pinnedBy: [] });

        const mainAdmin = MOCK_USERS.find(u => u.id === '000001');
        if (mainAdmin) {
            MOCK_CHAT_MESSAGES.push({
                id: `msg-${Date.now()}`,
                chatId: serviceChatId,
                senderId: mainAdmin.id,
                text: 'Добро пожаловать в МАНЕЖ.ПРО! Ознакомьтесь с нашими правилами в разделе Новости и если у вас возникнут вопросы, вы можете написать нам через специальную форму в разделе профиль.',
                timestamp: new Date().toISOString(),
                status: 'sent'
            });
        }
    }
    const token = generateToken(newUser.id);
    return { user: clone(newUser), token };
};
export const apiCreateAdminUser = async (newAdminPartial: Omit<User, 'id' | 'registrationDate' | 'linkedUsers' | 'role' | 'city' | 'passwordHash' | 'salt'> & { permissions: AdminPermissions, password: string }, token: string): Promise<User | null> => {
    await simulateDelay();
    checkPermission(token, isAdminWithPerm('canManageAdmins'));

    const sanitizedEmail = sanitize(newAdminPartial.email);
    if (MOCK_USERS.some(u => u.email.toLowerCase() === sanitizedEmail.toLowerCase())) return null;

    const { password, ...restAdmin } = newAdminPartial;
    const sanitizedRestAdmin = sanitize(restAdmin);

    const defaultNotificationSettings: Partial<Record<NotificationType, NotificationSetting>> = {};
    const adminNotificationMap: { type: NotificationType, permission: keyof AdminPermissions }[] = [
        { type: 'chatMessage', permission: 'canAccessChat' },
        { type: 'adminMessage', permission: 'canViewMessages' },
        { type: 'announcementModeration', permission: 'canManageAnnouncements' },
        { type: 'passwordResetRequest', permission: 'canResetUserPasswords' },
    ];
    
    adminNotificationMap.forEach(({ type, permission }) => {
        if (sanitizedRestAdmin.permissions[permission]) {
            defaultNotificationSettings[type] = 'push';
        }
    });

    const newId = generateUniqueUserId();
    const salt = createSalt();
    const passwordHash = hashPassword(password, salt);
    const newAdmin: User = { 
        ...sanitizedRestAdmin, 
        id: newId, 
        role: UserRole.Admin, 
        country: 'N/A',
        region: 'N/A',
        city: 'Control Panel', 
        registrationDate: new Date().toISOString(), 
        linkedUsers: [],
        salt, passwordHash,
        notificationSettings: defaultNotificationSettings,
        bonuses: 0,
        referralCount: 0,
    };
    MOCK_USERS.push(newAdmin);
    
    if (newAdmin.permissions?.canAccessChat) {
        MOCK_CONVERSATIONS.forEach(convo => {
            if (convo.id.startsWith('service-chat-')) {
                if (!convo.participantIds.includes(newAdmin.id)) {
                    convo.participantIds.push(newAdmin.id);
                }
            }
        });
    }

    return clone(newAdmin);
};
export const apiChangePassword = async (oldPass: string, newPass: string, token: string): Promise<{ success: boolean; message: string; }> => {
    await simulateDelay();
    const { userId } = verifyToken(token);
    const user = MOCK_USERS.find(u => u.id === userId);
    if (!user) return { success: false, message: 'Пользователь не найден.' };
    if (!verifyPassword(oldPass, user.passwordHash, user.salt)) return { success: false, message: 'Старый пароль неверен.' };
    user.passwordHash = hashPassword(newPass, user.salt);
    return { success: true, message: 'Пароль успешно изменен.' };
};
export const apiAdminResetPassword = async (targetUserId: string, newPassword: string, token: string): Promise<{ success: boolean; message: string; }> => {
    await simulateDelay();
    const { userId: currentUserId } = verifyToken(token);
    checkPermission(token, (u) => u.id === targetUserId || isAdminWithPerm('canResetUserPasswords')(u));
    const user = MOCK_USERS.find(u => u.id === targetUserId);
    if (!user) return { success: false, message: 'Пользователь не найден.' };
    user.passwordHash = hashPassword(newPassword, user.salt);
    return { success: true, message: 'Пароль для пользователя успешно сброшен.' };
};
export const apiSubmitPasswordResetRequest = async (email: string): Promise<{ success: boolean; message: string; }> => {
    await simulateDelay();
    const sanitizedEmail = sanitize(email);
    const user = MOCK_USERS.find(u => u.email.toLowerCase() === sanitizedEmail.toLowerCase());
    if (user) {
        const existingRequest = MOCK_PASSWORD_RESET_REQUESTS.find(r => r.userId === user.id && r.status === 'pending');
        if (!existingRequest) {
            MOCK_PASSWORD_RESET_REQUESTS.push({ id: `req-${Date.now()}`, userId: user.id, requestTimestamp: new Date().toISOString(), status: 'pending' });
        }
    }
    return { success: true, message: 'Запрос на сброс пароля отправлен администратору.' };
};
export const apiResolvePasswordResetRequest = async (requestId: string, newPassword: string, token: string): Promise<{ success: boolean; message: string; }> => {
    await simulateDelay();
    const { userId: adminId } = verifyToken(token);
    checkPermission(token, isAdminWithPerm('canResetUserPasswords'));
    const requestIndex = MOCK_PASSWORD_RESET_REQUESTS.findIndex(r => r.id === requestId);
    if (requestIndex === -1) return { success: false, message: 'Запрос не найден.' };
    const request = MOCK_PASSWORD_RESET_REQUESTS[requestIndex];
    const user = MOCK_USERS.find(u => u.id === request.userId);
    if (user) user.passwordHash = hashPassword(newPassword, user.salt);
    MOCK_PASSWORD_RESET_REQUESTS[requestIndex] = { ...request, status: 'completed', resolvedBy: adminId, resolvedTimestamp: new Date().toISOString(), newPassword };
    return { success: true, message: 'Пароль сброшен.' };
};
export const apiDeletePasswordResetHistory = async (requestId: string, token: string): Promise<void> => {
    await simulateDelay();
    checkPermission(token, isAdminWithPerm('canResetUserPasswords'));
    MOCK_PASSWORD_RESET_REQUESTS = MOCK_PASSWORD_RESET_REQUESTS.filter(r => r.id !== requestId);
};

// --- LOCATION REQUESTS ---
export const apiGetAllNewLocationRequests = async (): Promise<NewLocationRequest[]> => {
    await simulateDelay();
    return clone(MOCK_NEW_LOCATION_REQUESTS);
};

export const apiResolveNewLocationRequest = async (
    requestId: string,
    isApproved: boolean,
    token: string,
    correctedLocation?: { city: string, region: string, country: string }
): Promise<void> => {
    await simulateDelay();
    const { userId: adminId } = verifyToken(token);
    checkPermission(token, isAdminWithPerm('canManageUsers'));
    const requestIndex = MOCK_NEW_LOCATION_REQUESTS.findIndex(r => r.id === requestId);
    if (requestIndex === -1) return;

    const request = MOCK_NEW_LOCATION_REQUESTS[requestIndex];
    
    if (isApproved) {
        const locationToSave = correctedLocation ? sanitize(correctedLocation) : {
            city: request.submittedCity,
            region: request.submittedRegion,
            country: request.submittedCountry
        };

        const userIndex = MOCK_USERS.findIndex(u => u.id === request.userId);
        if (userIndex !== -1) {
            MOCK_USERS[userIndex].city = locationToSave.city;
            MOCK_USERS[userIndex].region = locationToSave.region;
            MOCK_USERS[userIndex].country = locationToSave.country;
        }

        const { country, region, city } = locationToSave;
        if (!MOCK_LOCATIONS[country]) {
            MOCK_LOCATIONS[country] = {};
        }
        if (!MOCK_LOCATIONS[country][region]) {
            MOCK_LOCATIONS[country][region] = [];
        }
        if (!MOCK_LOCATIONS[country][region].includes(city)) {
            MOCK_LOCATIONS[country][region].push(city);
        }
        
        MOCK_NEW_LOCATION_REQUESTS[requestIndex] = {
            ...request,
            status: 'approved',
            resolvedBy: adminId,
            resolvedTimestamp: new Date().toISOString()
        };
    } else { // Rejected
        MOCK_NEW_LOCATION_REQUESTS[requestIndex] = {
            ...request,
            status: 'rejected',
            resolvedBy: adminId,
            resolvedTimestamp: new Date().toISOString()
        };
    }
};


// --- USER ---
export const apiUpdateUser = async (userId: string, updatedData: Partial<User>, token: string): Promise<User> => {
    await simulateDelay();
    const { userId: currentUserId } = verifyToken(token);
    checkPermission(token, user => user.id === userId || isAdminWithPerm('canManageUsers')(user));

    const sanitizedData = sanitize(updatedData);

    const userIndex = MOCK_USERS.findIndex(u => u.id === userId);
    if (userIndex === -1) throw new Error('User not found');
    
    const oldUser = clone(MOCK_USERS[userIndex]); // Get user before update

    // Check for new subscription payment for referral bonus
    const newPayment = sanitizedData.subscription?.lastPayment;
    const isNewRealMoneyPayment = newPayment && 
                                 newPayment.amountPaid > 0 &&
                                 newPayment.date !== oldUser.subscription?.lastPayment?.date;

    if (isNewRealMoneyPayment && oldUser.referredBy) {
        const referrerIndex = MOCK_USERS.findIndex(u => u.id === oldUser.referredBy);
        if (referrerIndex > -1) {
            const currentUserPurchaseCount = oldUser.referralPurchaseCount || 0;
            if (currentUserPurchaseCount < 5) {
                const referrer = MOCK_USERS[referrerIndex];
                const bonusAmount = Math.round(newPayment.amountPaid * 0.20);
                
                if (bonusAmount > 0) {
                    referrer.bonuses = (referrer.bonuses || 0) + bonusAmount;
                    
                    const newTransaction: BonusTransaction = {
                        id: `bt-ref-${Date.now()}`,
                        userId: referrer.id,
                        amount: bonusAmount,
                        description: `Бонус за покупку от ${oldUser.name} ${oldUser.surname}`,
                        timestamp: new Date().toISOString(),
                        source: 'referral',
                        sourceUserId: oldUser.id,
                    };
                    
                    const expirationMonths = MOCK_SETTINGS.bonusExpirationMonths || 6;
                    const expiresAt = new Date();
                    expiresAt.setMonth(expiresAt.getMonth() + expirationMonths);
                    newTransaction.expiresAt = expiresAt.toISOString();
                    newTransaction.remainingAmount = bonusAmount;

                    MOCK_BONUS_TRANSACTIONS.push(newTransaction);
                }
                
                // This property will be merged into the user object later.
                sanitizedData.referralPurchaseCount = currentUserPurchaseCount + 1;
            }
        }
    }


    // Check for subscription payment with bonuses
    if (
        sanitizedData.subscription && 
        sanitizedData.bonuses !== undefined && 
        oldUser.bonuses !== undefined
    ) {
        const bonusesSpent = oldUser.bonuses - sanitizedData.bonuses;
        if (bonusesSpent > 0) {
            // FIFO logic
            let amountToSpend = bonusesSpent;
            const accrualTransactions = MOCK_BONUS_TRANSACTIONS
                .filter(t => t.userId === userId && t.amount > 0 && (t.remainingAmount ?? 0) > 0)
                .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

            for (const transaction of accrualTransactions) {
                if (amountToSpend <= 0) break;
                
                const canSpendFromThis = transaction.remainingAmount ?? 0;
                const spend = Math.min(amountToSpend, canSpendFromThis);

                if (transaction.remainingAmount !== undefined) {
                    transaction.remainingAmount -= spend;
                }
                amountToSpend -= spend;
            }

            const duration = sanitizedData.subscription.lastPayment?.duration;
            const durationText = duration === 'year' ? 'на год' : 'на месяц';
            const newTransaction: BonusTransaction = {
                id: `bt-sub-${Date.now()}`,
                userId: userId,
                amount: -bonusesSpent,
                description: `Оплата подписки "${sanitizedData.subscription.tier}" ${durationText}`,
                timestamp: new Date().toISOString(),
            };
            MOCK_BONUS_TRANSACTIONS.push(newTransaction);
        }
    }

    MOCK_USERS[userIndex] = { ...MOCK_USERS[userIndex], ...sanitizedData };
    return clone(MOCK_USERS[userIndex]);
};
export const apiUpdateAllUsers = async (users: User[], token: string): Promise<void> => {
    await simulateDelay();
    verifyToken(token); // Just verify token is valid before proceeding
    MOCK_USERS = sanitize(clone(users));
};

export const apiDeleteUser = async (userIdToDelete: string, token: string, method: DeletionInfo['method']): Promise<void> => {
    await simulateDelay();
    
    const { userId: currentUserId } = verifyToken(token);
    const currentUser = MOCK_USERS.find(u => u.id === currentUserId);

    const isSelfDelete = currentUserId === userIdToDelete;
    // Admins with canManageUsers can delete, or if it's an auto-delete call (token is still valid admin token)
    const isAdminDelete = currentUser?.role === UserRole.Admin && (method === 'auto' || currentUser.permissions?.canManageUsers);

    if (!isSelfDelete && !isAdminDelete) {
        throw new Error('Access Denied');
    }

    const userIndex = MOCK_USERS.findIndex(u => u.id === userIdToDelete);
    if (userIndex === -1) return;

    const userToDelete = MOCK_USERS[userIndex];

    const updatedUser: User = {
        ...userToDelete,
        email: `deleted-${userIdToDelete}@example.com`,
        passwordHash: `deleted-${Date.now()}`,
        salt: '',
        linkedUsers: [],
        pendingStudents: [],
        pendingTrainerRequestFrom: null,
        studentRequests: [],
        trainerRequests: [],
        isDeleted: true,
        isOnline: false,
        deletionInfo: {
            method: method,
            timestamp: new Date().toISOString(),
        }
    };
    MOCK_USERS[userIndex] = updatedUser;

    MOCK_USERS.forEach(user => {
        if (user.id === userIdToDelete) return;
        user.linkedUsers = user.linkedUsers.filter(id => id !== userIdToDelete);
        if (user.pendingStudents) user.pendingStudents = user.pendingStudents.filter(id => id !== userIdToDelete);
        if (user.studentRequests) user.studentRequests = user.studentRequests.filter(id => id !== userIdToDelete);
        if (user.trainerRequests) user.trainerRequests = user.trainerRequests.filter(id => id !== userIdToDelete);
        if (user.pendingTrainerRequestFrom === userIdToDelete) user.pendingTrainerRequestFrom = null;
    });

    const now = new Date();
    MOCK_TRAININGS = MOCK_TRAININGS.filter(t => {
        const trainingDate = new Date(`${t.date.split('T')[0]}T${t.startTime}`);
        const isFutureTraining = trainingDate >= now;
        const isParticipant = t.participants.some(p => p.userId === userIdToDelete);
        return !(isFutureTraining && isParticipant);
    });

    MOCK_ANNOUNCEMENTS = MOCK_ANNOUNCEMENTS.filter(ann => !(ann.submittedById === userIdToDelete && ann.status === 'pending'));
    MOCK_PASSWORD_RESET_REQUESTS = MOCK_PASSWORD_RESET_REQUESTS.filter(req => !(req.userId === userIdToDelete && req.status === 'pending'));
};


export const apiUpdateUserAndId = async (oldId: string, updatedData: Partial<User>, token: string): Promise<{ success: boolean }> => {
    await simulateDelay();
    checkPermission(token, isAdminWithPerm('canManageUsers'));
    
    const sanitizedData = sanitize(updatedData);
    const newId = sanitizedData.id;

    if (newId && newId !== oldId && MOCK_USERS.some(u => u.id === newId)) return { success: false };
    MOCK_USERS = MOCK_USERS.map(u => u.id === oldId ? { ...u, ...sanitizedData, id: newId || oldId } : u);
    return { success: true };
};

// --- TRAINING ---
export const apiAddTraining = async (newTrainingData: any, author: User, token: string): Promise<TrainingSession[]> => {
    await simulateDelay();
    verifyToken(token);
    const sanitizedData = sanitize(newTrainingData);
    const newTraining: TrainingSession = {
        id: `tr-${Date.now()}`,
        authorId: author.id,
        participants: [],
        status: 'scheduled',
        ...sanitizedData,
    };

    const authorRoleInSession = sanitizedData.creatorRoleForSession || author.role;
    newTraining.participants.push({ userId: author.id, confirmed: true, role: authorRoleInSession });

    if (sanitizedData.partnerId) {
        const partner = MOCK_USERS.find(u => u.id === sanitizedData.partnerId)!;
        let partnerRoleInSession = partner.role;

        // Handle trainer-trainer session role assignment
        if (author.role === UserRole.Trainer && partner.role === UserRole.Trainer && sanitizedData.creatorRoleForSession) {
            partnerRoleInSession = (authorRoleInSession === UserRole.Trainer) ? UserRole.Student : UserRole.Trainer;
        }
        
        newTraining.participants.push({ userId: sanitizedData.partnerId, confirmed: false, role: partnerRoleInSession });
    }

    MOCK_TRAININGS.push(newTraining);
    return clone(MOCK_TRAININGS);
};
export const apiUpdateTraining = async (trainingId: string, updatedData: Partial<TrainingSession>, token: string): Promise<void> => {
    await simulateDelay();
    const index = MOCK_TRAININGS.findIndex(t => t.id === trainingId);
    if (index === -1) return;

    const training = MOCK_TRAININGS[index];
    checkPermission(token, user => {
        const isParticipant = training.participants.some(p => p.userId === user.id);
        const isAdmin = user.role === UserRole.Admin;
        return isParticipant || isAdmin;
    });

    const sanitizedData = sanitize(updatedData);
    MOCK_TRAININGS[index] = { ...MOCK_TRAININGS[index], ...sanitizedData };
};
export const apiDeleteTraining = async (trainingId: string, token: string): Promise<void> => {
    await simulateDelay();
    const training = MOCK_TRAININGS.find(t => t.id === trainingId);
    if (!training) return;

    checkPermission(token, user => {
        const isParticipant = training.participants.some(p => p.userId === user.id);
        const isAdmin = user.role === UserRole.Admin;
        return isParticipant || isAdmin;
    });

    MOCK_TRAININGS = MOCK_TRAININGS.filter(t => t.id !== trainingId);
};

// --- POSTS (ANNOUNCEMENT, NEWS, LIBRARY) ---
export const apiAddAdminAnnouncement = async (data: Omit<Announcement, 'id' | 'authorId' | 'timestamp' | 'status'>, token: string): Promise<Announcement[]> => {
    await simulateDelay();
    const { userId: currentUserId } = verifyToken(token);
    checkPermission(token, isAdminWithPerm('canManageAnnouncements'));

    const sanitizedData = sanitize(data, ['content']);
    const newAnn: Announcement = { ...sanitizedData, id: `ann-${Date.now()}`, authorId: currentUserId, timestamp: new Date().toISOString(), status: 'published' };
    MOCK_ANNOUNCEMENTS.unshift(newAnn);
    return clone(MOCK_ANNOUNCEMENTS);
};
export const apiAddUserAnnouncement = async (data: Omit<Announcement, 'id' | 'authorId' | 'timestamp' | 'status' | 'submittedById'>, user: User, token: string): Promise<Announcement[]> => {
    await simulateDelay();
    verifyToken(token);
    const sanitizedData = sanitize(data, ['content']);
    const newAnn: Announcement = { ...sanitizedData, id: `ann-${Date.now()}`, authorId: user.id, timestamp: new Date().toISOString(), status: 'pending', submittedById: user.id };
    MOCK_ANNOUNCEMENTS.unshift(newAnn);
    return clone(MOCK_ANNOUNCEMENTS);
};
export const apiUpdateAnnouncement = async (id: string, data: Partial<Announcement>, token: string): Promise<Announcement[]> => {
    await simulateDelay();
    const announcement = MOCK_ANNOUNCEMENTS.find(a => a.id === id);
    checkPermission(token, user => announcement?.authorId === user.id || isAdminWithPerm('canManageAnnouncements')(user));
    
    const sanitizedData = sanitize(data, ['content']);
    MOCK_ANNOUNCEMENTS = MOCK_ANNOUNCEMENTS.map(a => a.id === id ? { ...a, ...sanitizedData } : a);
    return clone(MOCK_ANNOUNCEMENTS);
};
export const apiModerateAnnouncement = async (id: string, isApproved: boolean, token: string): Promise<void> => {
    await simulateDelay();
    const { userId: modId } = verifyToken(token);
    checkPermission(token, isAdminWithPerm('canManageAnnouncements'));

    const annIndex = MOCK_ANNOUNCEMENTS.findIndex(a => a.id === id);
    if (annIndex !== -1) {
        if (isApproved) {
            MOCK_ANNOUNCEMENTS[annIndex].status = 'published';
        } else {
            MOCK_ANNOUNCEMENTS[annIndex].status = 'trashed';
            MOCK_ANNOUNCEMENTS[annIndex].trashedTimestamp = new Date().toISOString();
        }
        MOCK_ANNOUNCEMENTS[annIndex].authorId = modId;
    }
};
export const apiDeleteAnnouncement = async (id: string, token: string): Promise<void> => {
    await simulateDelay();
    const announcement = MOCK_ANNOUNCEMENTS.find(a => a.id === id);
    checkPermission(token, user => announcement?.authorId === user.id || isAdminWithPerm('canManageAnnouncements')(user));

    const index = MOCK_ANNOUNCEMENTS.findIndex(a => a.id === id);
    if (index > -1) { MOCK_ANNOUNCEMENTS[index].status = 'trashed'; MOCK_ANNOUNCEMENTS[index].trashedTimestamp = new Date().toISOString(); }
};
export const apiRestoreAnnouncement = async (id: string, token: string): Promise<void> => {
    await simulateDelay();
    checkPermission(token, isAdminWithPerm('canManageAnnouncements'));

    const index = MOCK_ANNOUNCEMENTS.findIndex(a => a.id === id);
    if (index > -1) { MOCK_ANNOUNCEMENTS[index].status = 'published'; }
};
export const apiPermanentlyDeleteAnnouncement = async (id: string, token: string): Promise<void> => {
    await simulateDelay();
    checkPermission(token, isAdminWithPerm('canManageAdmins'));
    MOCK_ANNOUNCEMENTS = MOCK_ANNOUNCEMENTS.filter(a => a.id !== id);
};
export const apiAddNewsItem = async (data: any, token: string): Promise<NewsItem[]> => {
    await simulateDelay();
    const { userId: currentUserId } = verifyToken(token);
    checkPermission(token, isAdminWithPerm('canManageNews'));
    const sanitizedData = sanitize(data, ['content']);
    const newItem: NewsItem = { ...sanitizedData, id: `news-${Date.now()}`, authorId: currentUserId, timestamp: new Date().toISOString() };
    MOCK_NEWS.unshift(newItem);
    return clone(MOCK_NEWS);
};
export const apiUpdateNewsItem = async (id: string, data: Partial<NewsItem>, token: string): Promise<NewsItem[]> => {
    await simulateDelay();
    const item = MOCK_NEWS.find(n => n.id === id);
    checkPermission(token, user => item?.authorId === user.id || isAdminWithPerm('canManageNews')(user));
    const sanitizedData = sanitize(data, ['content']);
    MOCK_NEWS = MOCK_NEWS.map(n => n.id === id ? { ...n, ...sanitizedData } : n);
    return clone(MOCK_NEWS);
};
export const apiDeleteNewsItem = async (id: string, token: string): Promise<void> => {
    await simulateDelay();
    const item = MOCK_NEWS.find(n => n.id === id);
    checkPermission(token, user => item?.authorId === user.id || isAdminWithPerm('canManageNews')(user));
    MOCK_NEWS = MOCK_NEWS.filter(n => n.id !== id);
};
export const apiAddLibraryPost = async (data: any, token: string): Promise<LibraryPost[]> => {
    await simulateDelay();
    const { userId: currentUserId } = verifyToken(token);
    checkPermission(token, isAdminWithPerm('canManageLibraryPosts'));
    const sanitizedData = sanitize(data, ['content']);
    const newItem: LibraryPost = { ...sanitizedData, id: `lib-${Date.now()}`, authorId: currentUserId, timestamp: new Date().toISOString() };
    MOCK_LIBRARY_POSTS.unshift(newItem);
    return clone(MOCK_LIBRARY_POSTS);
};
export const apiUpdateLibraryPost = async (id: string, data: Partial<LibraryPost>, token: string): Promise<LibraryPost[]> => {
    await simulateDelay();
    const item = MOCK_LIBRARY_POSTS.find(p => p.id === id);
    checkPermission(token, user => item?.authorId === user.id || isAdminWithPerm('canManageLibraryPosts')(user));
    const sanitizedData = sanitize(data, ['content']);
    MOCK_LIBRARY_POSTS = MOCK_LIBRARY_POSTS.map(p => p.id === id ? { ...p, ...sanitizedData } : p);
    return clone(MOCK_LIBRARY_POSTS);
};
export const apiDeleteLibraryPost = async (id: string, token: string): Promise<void> => {
    await simulateDelay();
    const item = MOCK_LIBRARY_POSTS.find(p => p.id === id);
    checkPermission(token, user => item?.authorId === user.id || isAdminWithPerm('canManageLibraryPosts')(user));
    MOCK_LIBRARY_POSTS = MOCK_LIBRARY_POSTS.filter(p => p.id !== id);
};

// --- MESSAGES ---
export const apiAddDeveloperMessage = async (subject: string, message: string, token: string): Promise<void> => {
    await simulateDelay();
    const { userId: senderId } = verifyToken(token);
    const sanitizedSubject = sanitize(subject);
    const sanitizedMessage = sanitize(message);
    const newMessage: DeveloperMessage = { 
        id: `dev-msg-${Date.now()}`, 
        subject: sanitizedSubject, 
        message: sanitizedMessage, 
        senderId, 
        timestamp: new Date().toISOString(), 
        isRead: false,
        status: 'open' 
    };
    MOCK_DEV_MESSAGES.push(newMessage);
};
export const apiUpdateDeveloperMessage = async (id: string, data: Partial<DeveloperMessage>, token: string): Promise<void> => {
    await simulateDelay();
    checkPermission(token, isAdminWithPerm('canViewMessages'));
    const sanitizedData = sanitize(data);
    const index = MOCK_DEV_MESSAGES.findIndex(m => m.id === id);
    if (index !== -1) MOCK_DEV_MESSAGES[index] = { ...MOCK_DEV_MESSAGES[index], ...sanitizedData };
};
export const apiDeleteDeveloperMessage = async (id: string, token: string): Promise<void> => {
    await simulateDelay();
    checkPermission(token, isAdminWithPerm('canViewMessages'));
    MOCK_DEV_MESSAGES = MOCK_DEV_MESSAGES.filter(m => m.id !== id);
};
export const apiSendMessage = async (chatId: string, content: { text?: string; media?: { url: string; type: string, duration?: number } }, token: string): Promise<void> => {
    await simulateDelay();
    const { userId: senderId } = verifyToken(token);
    
    const sanitizedText = content.text ? sanitize(content.text) : '';
    
    const newMessage: ChatMessage = { 
        id: `msg-${Date.now()}`, 
        chatId, 
        senderId, 
        text: sanitizedText, 
        timestamp: new Date().toISOString(), 
        status: 'sent' 
    };

    if (content.media) {
        // We trust the data URL from FileReader and don't sanitize it.
        newMessage.media = {
            url: content.media.url,
            type: content.media.type,
            timestamp: new Date().toISOString(),
            duration: content.media.duration,
        };
    }

    MOCK_CHAT_MESSAGES.push(newMessage);
};
export const apiFindOrCreateConversation = async (targetUserId: string, token: string): Promise<Conversation | null> => {
    await simulateDelay();
    const { userId } = verifyToken(token);
    const existing = MOCK_CONVERSATIONS.find(c => c.participantIds.includes(userId) && c.participantIds.includes(targetUserId));
    if (existing) return existing;
    const newConvo: Conversation = { id: `chat-${Date.now()}`, participantIds: [userId, targetUserId], pinnedBy: [] };
    MOCK_CONVERSATIONS.push(newConvo);
    return newConvo;
};
export const apiUpdateLastReadTimestamp = async (chatId: string, token: string): Promise<void> => {
    await simulateDelay();
    const { userId } = verifyToken(token);
    const user = MOCK_USERS.find(u => u.id === userId);
    if (user) {
        if (!user.lastReadTimestamps) user.lastReadTimestamps = {};
        user.lastReadTimestamps[chatId] = new Date().toISOString();
    }
};
export const apiMarkMessagesAsRead = async (chatId: string, token: string): Promise<void> => {
    await simulateDelay();
    const { userId } = verifyToken(token);
    MOCK_CHAT_MESSAGES.forEach(msg => {
        if (msg.chatId === chatId && msg.senderId !== userId && msg.status !== 'read') msg.status = 'read';
    });
};
export const apiUpdateConversation = async (conversationId: string, updatedData: Partial<Conversation>, token: string): Promise<void> => {
    await simulateDelay();
    verifyToken(token);
    const convoIndex = MOCK_CONVERSATIONS.findIndex(c => c.id === conversationId);
    if (convoIndex === -1) return;
    MOCK_CONVERSATIONS[convoIndex] = { ...MOCK_CONVERSATIONS[convoIndex], ...updatedData };
};

// --- OTHER ---
export const apiSubmitVote = async (itemId: string, itemType: string, optionIds: string[], token: string): Promise<void> => {
    await simulateDelay();
    const { userId } = verifyToken(token);
    let item: Announcement | NewsItem | LibraryPost | undefined;
    if (itemType === 'announcement') item = MOCK_ANNOUNCEMENTS.find(i => i.id === itemId);
    else if (itemType === 'news') item = MOCK_NEWS.find(i => i.id === itemId);
    else if (itemType === 'library') item = MOCK_LIBRARY_POSTS.find(i => i.id === itemId);
    if (item?.poll) {
        item.poll.votes = item.poll.votes.filter(v => v.userId !== userId);
        item.poll.votes.push({ userId, optionIds });
    }
};
export const apiSubmitQuizAnswer = async (itemId: string, itemType: string, optionIds: string[], token: string): Promise<void> => {
    await simulateDelay();
    const { userId } = verifyToken(token);
    let item: Announcement | NewsItem | LibraryPost | undefined;
    if (itemType === 'announcement') item = MOCK_ANNOUNCEMENTS.find(i => i.id === itemId);
    else if (itemType === 'news') item = MOCK_NEWS.find(i => i.id === itemId);
    else if (itemType === 'library') item = MOCK_LIBRARY_POSTS.find(i => i.id === itemId);
    if (item?.quiz) {
        item.quiz.submissions = item.quiz.submissions.filter(s => s.userId !== userId);
        item.quiz.submissions.push({ userId, optionIds });
    }
};
export const apiUpdateSettings = async (settings: Partial<AppSettings>, token: string): Promise<void> => {
    await simulateDelay();
    checkPermission(token, isAdminWithPerm('canManageAdmins'));
    // Ignore legal documents from sanitization as they are expected to contain HTML
    const sanitizedSettings = sanitize(settings, ['termsOfService', 'privacyPolicy']);
    MOCK_SETTINGS = { ...MOCK_SETTINGS, ...sanitizedSettings };
};
export const apiGetWelcomePageContent = async (): Promise<WelcomePageContent> => {
    await simulateDelay();
    return clone(MOCK_WELCOME_PAGE_CONTENT);
};
export const apiUpdateWelcomePageContent = async (newContent: Partial<WelcomePageContent>, token: string): Promise<void> => {
    await simulateDelay();
    checkPermission(token, isAdminWithPerm('canManageAdmins'));
    // Ignore image URLs and background properties from sanitization
    const IGNORED_KEYS = ['heroImageUrl', 'forTrainersImageUrl', 'forStudentsImageUrl', 'forWhomSectionBg', 'testimonialsSectionBg'];
    const sanitizedContent = sanitize(newContent, IGNORED_KEYS);
    MOCK_WELCOME_PAGE_CONTENT = { ...MOCK_WELCOME_PAGE_CONTENT, ...sanitizedContent };
};

export const apiCleanupOldMedia = async (): Promise<boolean> => {
    let changed = false;
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    MOCK_TRAININGS.forEach(training => {
        if (training.photoUrl && training.photoTimestamp && new Date(training.photoTimestamp) < threeMonthsAgo) {
            training.photoUrl = undefined;
            training.photoTimestamp = undefined;
            changed = true;
        }
    });

    const cleanupPostImages = (posts: (Announcement | NewsItem | LibraryPost)[]): void => {
        posts.forEach(post => {
            if (post.images) {
                const oldLength = post.images.length;
                post.images = post.images.filter(img => img.timestamp && new Date(img.timestamp) >= threeMonthsAgo);
                if (post.images.length < oldLength) {
                    changed = true;
                }
            }
        });
    };

    cleanupPostImages(MOCK_ANNOUNCEMENTS);
    cleanupPostImages(MOCK_NEWS);
    cleanupPostImages(MOCK_LIBRARY_POSTS);

    return changed;
};

export const apiCleanupOldChatMedia = async (): Promise<boolean> => {
    await simulateDelay();
    let changed = false;
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    MOCK_CHAT_MESSAGES.forEach(msg => {
        if (!msg.mediaExpired && msg.media && new Date(msg.media.timestamp) < threeMonthsAgo) {
            delete msg.media;
            msg.mediaExpired = true;
            changed = true;
        }
    });

    return changed;
};

export const apiCleanupDeletedUserAvatars = async (): Promise<boolean> => {
    await simulateDelay();
    let changed = false;
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    MOCK_USERS.forEach(user => {
        if (
            user.isDeleted &&
            user.deletionInfo &&
            new Date(user.deletionInfo.timestamp) < threeMonthsAgo &&
            (user.avatarUrl || user.avatarTimestamp)
        ) {
            user.avatarUrl = undefined;
            user.avatarTimestamp = undefined;
            changed = true;
        }
    });

    return changed;
};
