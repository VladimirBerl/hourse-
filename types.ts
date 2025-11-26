export const LOCATION_DATA: Record<string, Record<string, string[]>> = {
  Россия: {
    Москва: ['Москва', 'Зеленоград', 'Троицк'],
    'Санкт-Петербург': ['Санкт-Петербург', 'Кронштадт', 'Пушкин', 'Петергоф', 'Колпино', 'Павловск'],
    Севастополь: ['Севастополь', 'Инкерман'],
    'Алтайский край': [
      'Барнаул',
      'Бийск',
      'Рубцовск',
      'Новоалтайск',
      'Заринск',
      'Камень-на-Оби',
      'Славгород',
      'Алейск',
      'Яровое',
    ],
    'Амурская область': ['Благовещенск', 'Белогорск', 'Свободный', 'Тында', 'Зея', 'Шимановск'],
    'Архангельская область': ['Архангельск', 'Северодвинск', 'Котлас', 'Новодвинск', 'Коряжма', 'Мирный'],
    'Астраханская область': ['Астрахань', 'Ахтубинск', 'Знаменск'],
    'Белгородская область': ['Белгород', 'Старый Оскол', 'Губкин', 'Шебекино', 'Алексеевка'],
    'Брянская область': ['Брянск', 'Клинцы', 'Новозыбков', 'Дятьково', 'Унеча'],
    'Владимирская область': ['Владимир', 'Ковров', 'Муром', 'Александров', 'Гусь-Хрустальный'],
    'Волгоградская область': ['Волгоград', 'Волжский', 'Камышин', 'Михайловка', 'Урюпинск'],
    'Вологодская область': ['Вологда', 'Череповец', 'Сокол', 'Великий Устюг'],
    'Воронежская область': ['Воронеж', 'Борисоглебск', 'Россошь', 'Лиски'],
    'Забайкальский край': ['Чита', 'Краснокаменск', 'Борзя'],
    'Ивановская область': ['Иваново', 'Кинешма', 'Шуя'],
    'Иркутская область': ['Иркутск', 'Ангарск', 'Братск', 'Усть-Илимск', 'Усолье-Сибирское'],
    'Калининградская область': ['Калининград', 'Советск', 'Черняховск', 'Балтийск'],
    'Калужская область': ['Калуга', 'Обнинск', 'Людиново', 'Киров'],
    'Камчатский край': ['Петропавловск-Камчатский', 'Елизово', 'Вилючинск'],
    'Кемеровская область': ['Кемерово', 'Новокузнецк', 'Прокопьевск', 'Белово', 'Междуреченск'],
    'Кировская область': ['Киров', 'Кирово-Чепецк', 'Вятские Поляны'],
    'Костромская область': ['Кострома', 'Буй', 'Шарья'],
    'Краснодарский край': ['Краснодар', 'Сочи', 'Новороссийск', 'Армавир', 'Ейск', 'Анапа', 'Геленджик'],
    'Красноярский край': ['Красноярск', 'Норильск', 'Ачинск', 'Канск', 'Железногорск'],
    'Курганская область': ['Курган', 'Шадринск'],
    'Курская область': ['Курск', 'Железногорск', 'Курчатов'],
    'Ленинградская область': [
      'Гатчина',
      'Выборг',
      'Всеволожск',
      'Сосновый Бор',
      'Тихвин',
      'Кириши',
      'Кингисепп',
    ],
    'Липецкая область': ['Липецк', 'Елец'],
    'Магаданская область': ['Магадан'],
    'Московская область': [
      'Балашиха',
      'Подольск',
      'Химки',
      'Мытищи',
      'Королёв',
      'Люберцы',
      'Красногорск',
      'Электросталь',
      'Коломна',
      'Одинцово',
      'Домодедово',
      'Серпухов',
      'Щёлково',
      'Раменское',
      'Долгопрудный',
      'Жуковский',
      'Пушкино',
      'Реутов',
      'Сергиев Посад',
      'Воскресенск',
      'Лобня',
      'Клин',
      'Ивантеевка',
      'Дубна',
      'Егорьевск',
      'Чехов',
      'Дмитров',
      'Видное',
      'Ступино',
      'Павловский Посад',
      'Наро-Фоминск',
      'Фрязино',
      'Лыткарино',
      'Дзержинский',
      'Солнечногорск',
    ],
    'Мурманская область': ['Мурманск', 'Апатиты', 'Североморск', 'Мончегорск'],
    'Нижегородская область': ['Нижний Новгород', 'Дзержинск', 'Арзамас', 'Саров'],
    'Новгородская область': ['Великий Новгород', 'Боровичи', 'Старая Русса'],
    'Новосибирская область': ['Новосибирск', 'Бердск', 'Искитим'],
    'Омская область': ['Омск', 'Тара'],
    'Оренбургская область': ['Оренбург', 'Орск', 'Новотроицк', 'Бузулук'],
    'Орловская область': ['Орёл', 'Ливны', 'Мценск'],
    'Пензенская область': ['Пенза', 'Кузнецк', 'Заречный'],
    'Пермский край': ['Пермь', 'Березники', 'Соликамск'],
    'Приморский край': ['Владивосток', 'Уссурийск', 'Находка', 'Артём'],
    'Псковская область': ['Псков', 'Великие Луки'],
    'Республика Адыгея': ['Майкоп'],
    'Республика Алтай': ['Горно-Алтайск'],
    'Республика Башкортостан': ['Уфа', 'Стерлитамак', 'Салават', 'Нефтекамск', 'Октябрьский'],
    'Республика Бурятия': ['Улан-Удэ', 'Северобайкальск'],
    'Республика Дагестан': ['Махачкала', 'Хасавюрт', 'Дербент', 'Каспийск'],
    'Республика Ингушетия': ['Магас', 'Назрань'],
    'Республика Кабардино-Балкария': ['Нальчик', 'Прохладный'],
    'Республика Калмыкия': ['Элиста'],
    'Республика Карачаево-Черкесия': ['Черкесск'],
    'Республика Карелия': ['Петрозаводск', 'Костомукша'],
    'Республика Коми': ['Сыктывкар', 'Ухта', 'Воркута'],
    'Республика Крым': ['Симферополь', 'Керчь', 'Евпатория', 'Ялта', 'Феодосия'],
    'Республика Марий Эл': ['Йошкар-Ола', 'Волжск'],
    'Республика Мордовия': ['Саранск', 'Рузаевка'],
    'Республика Саха (Якутия)': ['Якутск', 'Нерюнгри', 'Мирный'],
    'Республика Северная Осетия — Алания': ['Владикавказ'],
    'Республика Татарстан': ['Казань', 'Набережные Челны', 'Нижнекамск', 'Альметьевск', 'Зеленодольск'],
    'Республика Тыва': ['Кызыл'],
    'Республика Удмуртия': ['Ижевск', 'Сарапул', 'Воткинск', 'Глазов'],
    'Республика Хакасия': ['Абакан', 'Черногорск'],
    'Республика Чечня': ['Грозный', 'Гудермес'],
    'Республика Чувашия': ['Чебоксары', 'Новочебоксарск'],
    'Ростовская область': ['Ростов-на-Дону', 'Таганрог', 'Шахты', 'Новочеркасск', 'Волгодонск'],
    'Рязанская область': ['Рязань', 'Касимов'],
    'Самарская область': ['Самара', 'Тольятти', 'Сызрань', 'Новокуйбышевск'],
    'Саратовская область': ['Саратов', 'Энгельс', 'Балаково'],
    'Сахалинская область': ['Южно-Сахалинск', 'Корсаков', 'Холмск'],
    'Свердловская область': ['Екатеринбург', 'Нижний Тагил', 'Каменск-Уральский', 'Первоуральск'],
    'Смоленская область': ['Смоленск', 'Вязьма', 'Рославль'],
    'Ставропольский край': ['Ставрополь', 'Пятигоск', 'Кисловодск', 'Невинномысск', 'Ессентуки'],
    'Тамбовская область': ['Тамбов', 'Мичуринск'],
    'Тверская область': ['Тверь', 'Ржев', 'Вышний Волочёк'],
    'Томская область': ['Томск', 'Северск'],
    'Тульская область': ['Тула', 'Новомосковск'],
    'Тюменская область': ['Тюмень', 'Тобольск', 'Ишим'],
    'Ульяновская область': ['Ульяновск', 'Димитровград'],
    'Хабаровский край': ['Хабаровск', 'Комсомольск-на-Амуре'],
    'Ханты-Мансийский АО': ['Ханты-Мансийск', 'Сургут', 'Нижневартовск', 'Нефтеюганск'],
    'Челябинская область': ['Челябинск', 'Магнитогорск', 'Златуст', 'Миасс', 'Копейск'],
    'Чукотский АО': ['Анадырь'],
    'Ямало-Ненецкий АО': ['Салехард', 'Новый Уренгой', 'Ноябрьск'],
    'Ярославская область': ['Ярославль', 'Рыбинск', 'Переславль-Залесский'],
  },
  Беларусь: {
    'Минская область': [
      'Минск',
      'Борисов',
      'Солигорск',
      'Молодечно',
      'Жодино',
      'Слуцк',
      'Дзержинск',
      'Вилейка',
      'Марьина Горка',
    ],
    'Брестская область': ['Брест', 'Барановичи', 'Пинск', 'Кобрин', 'Берёза', 'Лунинец', 'Ивацевичи'],
    'Витебская область': ['Витебск', 'Орша', 'Новополоцк', 'Полоцк', 'Поставы', 'Глубокое', 'Лепель'],
    'Гомельская область': ['Гомель', 'Мозырь', 'Жлобин', 'Светлогорск', 'Речица', 'Калинковичи', 'Рогачёв'],
    'Гродненская область': ['Гродно', 'Лида', 'Слоним', 'Волковыск', 'Сморгонь', 'Новогрудок'],
    'Могилёвская область': ['Могилёв', 'Бобруйск', 'Горки', 'Осиповичи', 'Кричев', 'Шклов'],
  },
  Казахстан: {
    Астана: ['Астана'],
    Алматы: ['Алматы'],
    Шымкент: ['Шымкент'],
    'Акмолинская область': ['Кокшетау', 'Степногорск'],
    'Актюбинская область': ['Актобе', 'Хромтау', 'Кандыагаш'],
    'Алматинская область': ['Конаев', 'Талдыкорган', 'Каскелен', 'Есик'],
    'Атырауская область': ['Атырау', 'Кульсары'],
    'Западно-Казахстанская область': ['Уральск', 'Аксай'],
    'Жамбылская область': ['Тараз', 'Шу', 'Каратау'],
    'Карагандинская область': ['Караганда', 'Темиртау', 'Балхаш', 'Сатпаев', 'Шахтинск'],
    'Костанайская область': ['Костанай', 'Рудный', 'Аркалык', 'Лисаковск'],
    'Кызылординская область': ['Кызылорда', 'Байконур'],
    'Мангистауская область': ['Актау', 'Жанаозен'],
    'Павлодарская область': ['Павлодар', 'Экибастуз', 'Аксу'],
    'Северо-Казахстанская область': ['Петропавловск'],
    'Туркестанская область': ['Туркестан', 'Кентау', 'Арыс'],
    'Восточно-Казахстанская область': ['Усть-Каменогорск', 'Риддер', 'Аягоз'],
    'Область Жетысу': ['Талдыкорган'],
    'Область Улытау': ['Жезказган'],
    'Абайская область': ['Семей', 'Курчатов'],
  },
};

export enum UserRole {
  Student = 'Student',
  Trainer = 'Trainer',
  Admin = 'Admin',
  Spectator = 'Spectator',
}

export enum SubscriptionTier {
  Base = 'Базовая',
  Pro = 'Про',
  Maximum = 'Максимум',
}

export interface AdminPermissions {
  canManageUsers?: boolean;
  canManageAnnouncements?: boolean;
  canManageNews?: boolean;
  canManageLibraryPosts?: boolean;
  canViewStats?: boolean;
  canViewMessages?: boolean;
  canManageAdmins?: boolean;
  canAccessChat?: boolean;
  canResetUserPasswords?: boolean;
  canManageSubscriptions?: boolean;
}

export interface Conversation {
  id: string;
  participantIds: string[];
  name?: string;
  pinnedBy?: string[];
}

export type NotificationSetting = 'push' | 'badge';

export type NotificationType =
  // User/Trainer
  | 'linkRequest'
  | 'trainingConfirmation'
  | 'trainingReminder'
  | 'chatMessage'
  | 'newAnnouncement'
  | 'newNews'
  | 'newLibraryPost'
  // Admin
  | 'adminMessage'
  | 'announcementModeration'
  | 'passwordResetRequest'
  | 'newLocationRequest';

export interface DeletionInfo {
  method: 'self' | 'auto' | 'admin';
  timestamp: string; // ISO string
}

export interface User {
  id: string;
  name: string;
  surname: string;
  country: string;
  region: string;
  city: string;
  role: UserRole;
  email: string;
  passwordHash: string;
  salt: string;
  linkedUsers: string[]; // Array of user IDs
  avatarUrl?: string;
  avatarTimestamp?: string; // ISO string
  registrationDate: string; // ISO string
  pendingStudents?: string[]; // For trainers: array of student IDs they've sent requests to
  pendingTrainerRequestFrom?: string | null; // For students: trainer ID who sent a request
  studentRequests?: string[]; // For trainers: array of student IDs who sent them a request
  trainerRequests?: string[]; // For trainers: array of trainer IDs who sent them a request
  readAnnouncementIds?: string[];
  readNewsIds?: string[];
  readLibraryPostIds?: string[];
  lastReadTimestamps?: { [chatId: string]: string };
  isOnline?: boolean;
  lastLogin?: string; // ISO string
  permissions?: AdminPermissions;
  canReplyToAdmin?: boolean;
  approvedAnnouncementCount?: number;
  discount?: number;
  pushSubscriptionActive?: boolean;
  notificationSettings?: Partial<Record<NotificationType, NotificationSetting>>;
  isDeleted?: boolean;
  deletionInfo?: DeletionInfo;
  bonuses?: number;
  subscription?: {
    tier: SubscriptionTier;
    expiresAt: string | null;
    lastPayment?: {
      date: string;
      amountPaid: number;
      bonusesSpent: number;
      duration: 'month' | 'year';
    };
  };
  referralCount?: number;
  referredBy?: string;
  referralPurchaseCount?: number;
}

export interface BonusTransaction {
  id: string;
  userId: string;
  amount: number; // positive for accrual, negative for spending
  description: string;
  timestamp: string; // ISO string
  adminId?: string; // ID of the admin who made the change
  expiresAt?: string; // ISO string, for accruals only
  remainingAmount?: number; // for accruals only
  source?: 'referral' | 'admin_action' | 'system';
  sourceUserId?: string; // e.g., the ID of the referred user who made a purchase
}

export interface NewLocationRequest {
  id: string;
  userId: string;
  submittedCity: string;
  submittedRegion: string;
  submittedCountry: string;
  status: 'pending' | 'approved' | 'rejected';
  requestTimestamp: string;
  resolvedBy?: string; // Admin ID
  resolvedTimestamp?: string;
}

export interface PasswordResetRequest {
  id: string;
  userId: string;
  requestTimestamp: string;
  status: 'pending' | 'completed';
  resolvedBy?: string; // Admin ID
  resolvedTimestamp?: string;
  // FIX: Added for mock data history tracking. In a real app, this would not be stored.
  newPassword?: string;
}

export interface TrainingSession {
  id: string;
  date: string; // ISO string
  startTime: string; // "HH:MM"
  duration: number; // in minutes
  authorId: string;
  participants: { userId: string; confirmed: boolean; role: UserRole }[];
  type?: string;
  comments?: string;
  photoUrl?: string;
  photoTimestamp?: string; // ISO string
  ratings?: { userId: string; score: number }[];
  goals?: string[];
  status?: 'scheduled' | 'cancelled';
  hiddenBy?: string[];
}

export interface Skill {
  id: string;
  name: string;
  ownerId: string; // User who tracks this skill
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  isAchieved: boolean;
  authorId: string;
  targetUserId: string;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  timestamp: string; // ISO string
  isTrainingComment?: boolean;
  status?: 'sent' | 'delivered' | 'read';
  media?: {
    url: string; // data URL in this mock
    type: string; // MIME type like 'image/jpeg'
    timestamp: string; // ISO string for cleanup
    duration?: number; // duration in seconds for audio/video
  };
  mediaExpired?: boolean;
}

export interface DeveloperMessage {
  id: string;
  subject: string;
  message: string;
  senderId: string;
  timestamp: string; // ISO string
  isRead: boolean;
  status?: 'open' | 'closed';
}

export interface PostImage {
  id: string;
  url: string;
  position: 'aboveTitle' | 'beforeContent' | 'afterContent';
  timestamp?: string; // ISO string
}

export interface PollOption {
  id: string;
  text: string;
}

export interface Poll {
  id: string;
  allowMultipleVotes: boolean;
  options: PollOption[];
  votes: { userId: string; optionIds: string[] }[];
  pollEndsAt?: string;
  isHidden?: boolean;
  isStopped?: boolean;
}

export interface QuizOption {
  id: string;
  text: string;
}

export interface Quiz {
  id: string;
  allowMultipleAnswers: boolean;
  options: QuizOption[];
  correctOptionIds: string[];
  submissions: { userId: string; optionIds: string[] }[];
  isStopped?: boolean;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  authorId: string;
  timestamp: string;
  targetRoles?: UserRole[];
  targetSubscriptionTiers?: SubscriptionTier[];
  targetCountries?: string[];
  targetRegions?: string[];
  targetCities?: string[];
  sentToUserIds?: string[];
  publishTimestamp?: string;
  images?: PostImage[];
  poll?: Poll;
  quiz?: Quiz;
  status: 'published' | 'pending' | 'rejected' | 'trashed';
  submittedById?: string;
  isPinned?: boolean;
  deletionTimestamp?: string;
  trashedTimestamp?: string;
  isModerated?: boolean;
  moderatedPrice?: number;
}

export interface NewsItem {
  id: string;
  title: string;
  content: string;
  authorId: string;
  timestamp: string;
  targetRoles?: UserRole[];
  targetSubscriptionTiers?: SubscriptionTier[];
  targetCountries?: string[];
  targetRegions?: string[];
  targetCities?: string[];
  sentToUserIds?: string[];
  publishTimestamp?: string;
  images?: PostImage[];
  poll?: Poll;
  quiz?: Quiz;
  isPinned?: boolean;
  deletionTimestamp?: string;
}

export interface LibraryPost {
  id: string;
  title: string;
  content: string;
  authorId: string;
  timestamp: string;
  targetRoles?: UserRole[];
  targetSubscriptionTiers?: SubscriptionTier[];
  targetCountries?: string[];
  targetRegions?: string[];
  targetCities?: string[];
  sentToUserIds?: string[];
  publishTimestamp?: string;
  images?: PostImage[];
  poll?: Poll;
  quiz?: Quiz;
  isPinned?: boolean;
  deletionTimestamp?: string;
}

export interface AppSettings {
  // FIX: Added id to satisfy database constraints and fix typing errors.
  id: string;
  announcementBasePrice: number;
  defaultAnnouncementDeletion?: string;
  defaultNewsDeletion?: string;
  defaultLibraryDeletion?: string;
  termsOfService?: string;
  privacyPolicy?: string;
  subscriptionPrices?: {
    [SubscriptionTier.Pro]?: { month: number; year: number };
    [SubscriptionTier.Maximum]?: { month: number; year: number };
  };
  subscriptionPaymentOptions?: {
    [SubscriptionTier.Pro]?: { month: boolean; year: boolean };
    [SubscriptionTier.Maximum]?: { month: boolean; year: boolean };
  };
  trialSettings?: {
    durationDays: number;
    tier: SubscriptionTier;
  };
  bonusPaymentPercentage?: number;
  bonusExpirationMonths?: number;
}

export interface SyncQueueItem {
  id?: number;
  type: string;
  payload: any;
  timestamp: string;
}

export interface WelcomePageFeature {
  title: string;
  description: string;
}

export interface WelcomePageTestimonial {
  id: string;
  quote: string;
  name: string;
  role: string;
}

export interface WelcomePageContent {
  id: 'singleton';
  heroTitle: string;
  heroSubtitle: string;
  heroButtonText: string;
  heroImageUrl: string;
  featuresTitle: string;
  featuresSubtitle: string;
  features: WelcomePageFeature[];
  forWhomTitle: string;
  forWhomSectionBg?: string;
  forTrainersTitle: string;
  forTrainersSubtitle: string;
  forTrainersList: string[];
  forTrainersImageUrl: string;
  forStudentsTitle: string;
  forStudentsSubtitle: string;
  forStudentsList: string[];
  forStudentsImageUrl: string;
  testimonialsTitle: string;
  testimonialsSectionBg?: string;
  testimonials: WelcomePageTestimonial[];
  ctaTitle: string;
  ctaSubtitle: string;
  ctaButtonText: string;
}
