import { Sequelize, DataTypes, Model, Optional } from 'sequelize';
import * as dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize({
  username: 'gen_user',
  password: 'r)H~0!zxQP-.$@',
  database: 'horse',
  host: '77.232.128.138',
  port: 5432,
  dialect: 'postgres',
  logging: false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

// --- Models ---

// User
export const User = sequelize.define('User', {
  id: {
    type: DataTypes.STRING(6),
    primaryKey: true,
    allowNull: false,
    defaultValue: () => {
      return Math.random().toString(36).substring(2, 8).toUpperCase();
    },
  },
  email: { type: DataTypes.STRING, unique: true, allowNull: false },
  passwordHash: { type: DataTypes.STRING, allowNull: false },
  salt: { type: DataTypes.STRING, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  surname: { type: DataTypes.STRING, allowNull: false },
  country: { type: DataTypes.STRING, allowNull: false },
  region: { type: DataTypes.STRING, allowNull: false },
  city: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.ENUM('Student', 'Trainer', 'Admin', 'Spectator'), allowNull: false },
  avatarUrl: { type: DataTypes.TEXT },
  avatarTimestamp: { type: DataTypes.DATE },
  registrationDate: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  lastLogin: { type: DataTypes.DATE },
  isOnline: { type: DataTypes.BOOLEAN, defaultValue: false },
  permissions: { type: DataTypes.JSON },
  notificationSettings: { type: DataTypes.JSON },
  pushSubscriptionActive: { type: DataTypes.BOOLEAN, defaultValue: false },
  isDeleted: { type: DataTypes.BOOLEAN, defaultValue: false },
  deletionInfo: { type: DataTypes.JSON },
  bonuses: { type: DataTypes.INTEGER, defaultValue: 0 },
  discount: { type: DataTypes.INTEGER },
  subscription: { type: DataTypes.JSON },
  referralCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  referralPurchaseCount: { type: DataTypes.INTEGER, defaultValue: 0 },

  // FIXED
  referredBy: { type: DataTypes.STRING(6) },

  pendingTrainerRequestFrom: { type: DataTypes.STRING },
  readAnnouncementIds: { type: DataTypes.JSON },
  readNewsIds: { type: DataTypes.JSON },
  readLibraryPostIds: { type: DataTypes.JSON },
  lastReadTimestamps: { type: DataTypes.JSON },
  canReplyToAdmin: { type: DataTypes.BOOLEAN, defaultValue: false },
});

// TrainingSession
export const TrainingSession = sequelize.define('TrainingSession', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  date: { type: DataTypes.DATEONLY, allowNull: false }, // Prisma @db.Date
  startTime: { type: DataTypes.STRING, allowNull: false },
  duration: { type: DataTypes.INTEGER, allowNull: false },
  type: { type: DataTypes.STRING },
  comments: { type: DataTypes.TEXT },
  status: { type: DataTypes.STRING },
  photoUrl: { type: DataTypes.TEXT },
  photoTimestamp: { type: DataTypes.DATE },
  authorId: { type: DataTypes.STRING(6), allowNull: false },
  goals: { type: DataTypes.JSON },
  hiddenBy: { type: DataTypes.JSON },
});

// TrainingParticipant
export const TrainingParticipant = sequelize.define('TrainingParticipant', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  sessionId: { type: DataTypes.UUID, allowNull: false },
  userId: { type: DataTypes.STRING(6), allowNull: false },
  confirmed: { type: DataTypes.BOOLEAN, defaultValue: false },
  role: { type: DataTypes.STRING, allowNull: false }, // Enum in prisma, string here for simplicity or ENUM
});

// TrainingRating (Added based on prisma schema usage, though formerly JSON)
export const TrainingRating = sequelize.define('TrainingRating', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  sessionId: { type: DataTypes.UUID, allowNull: false },
  userId: { type: DataTypes.STRING(6), allowNull: false },
  score: { type: DataTypes.INTEGER, allowNull: false },
});

// Skill
export const Skill = sequelize.define('Skill', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  ownerId: { type: DataTypes.STRING(6), allowNull: false },
});

// Announcement
export const Announcement = sequelize.define('Announcement', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: { type: DataTypes.STRING, allowNull: false },
  content: { type: DataTypes.TEXT, allowNull: false },
  timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  publishTimestamp: { type: DataTypes.DATE },
  status: { type: DataTypes.ENUM('published', 'pending', 'rejected', 'trashed'), allowNull: false },
  authorId: { type: DataTypes.STRING(6), allowNull: false },
  submittedById: { type: DataTypes.STRING(6) },
  isPinned: { type: DataTypes.BOOLEAN, defaultValue: false },
  isModerated: { type: DataTypes.BOOLEAN, defaultValue: false },
  moderatedPrice: { type: DataTypes.INTEGER },
  deletionTimestamp: { type: DataTypes.DATE },
  trashedTimestamp: { type: DataTypes.DATE },
  targetRoles: { type: DataTypes.JSON },
  targetSubscriptionTiers: { type: DataTypes.JSON },
  targetCountries: { type: DataTypes.JSON },
  targetRegions: { type: DataTypes.JSON },
  targetCities: { type: DataTypes.JSON },
  sentToUserIds: { type: DataTypes.JSON },
});

// NewsItem
export const NewsItem = sequelize.define('NewsItem', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: { type: DataTypes.STRING, allowNull: false },
  content: { type: DataTypes.TEXT, allowNull: false },
  timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  publishTimestamp: { type: DataTypes.DATE },
  authorId: { type: DataTypes.STRING(6), allowNull: false },
  isPinned: { type: DataTypes.BOOLEAN, defaultValue: false },
  deletionTimestamp: { type: DataTypes.DATE },
  targetRoles: { type: DataTypes.JSON },
  targetSubscriptionTiers: { type: DataTypes.JSON },
  targetCountries: { type: DataTypes.JSON },
  targetRegions: { type: DataTypes.JSON },
  targetCities: { type: DataTypes.JSON },
  sentToUserIds: { type: DataTypes.JSON },
});

// LibraryPost
export const LibraryPost = sequelize.define('LibraryPost', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: { type: DataTypes.STRING, allowNull: false },
  content: { type: DataTypes.TEXT, allowNull: false },
  timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  publishTimestamp: { type: DataTypes.DATE },
  authorId: { type: DataTypes.STRING(6), allowNull: false },
  isPinned: { type: DataTypes.BOOLEAN, defaultValue: false },
  deletionTimestamp: { type: DataTypes.DATE },
  targetRoles: { type: DataTypes.JSON },
  targetSubscriptionTiers: { type: DataTypes.JSON },
  targetCountries: { type: DataTypes.JSON },
  targetRegions: { type: DataTypes.JSON },
  targetCities: { type: DataTypes.JSON },
  sentToUserIds: { type: DataTypes.JSON },
});

// PostImage
export const PostImage = sequelize.define('PostImage', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  url: { type: DataTypes.TEXT, allowNull: false },
  position: { type: DataTypes.STRING, allowNull: false },
  timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  announcementId: { type: DataTypes.UUID },
  newsItemId: { type: DataTypes.UUID },
  libraryPostId: { type: DataTypes.UUID },
});

// Polls & Quizzes
export const Poll = sequelize.define('Poll', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  allowMultipleVotes: { type: DataTypes.BOOLEAN, defaultValue: false },
  pollEndsAt: { type: DataTypes.DATE },
  isHidden: { type: DataTypes.BOOLEAN, defaultValue: false },
  isStopped: { type: DataTypes.BOOLEAN, defaultValue: false },
  announcementId: { type: DataTypes.UUID },
  newsItemId: { type: DataTypes.UUID },
  libraryPostId: { type: DataTypes.UUID },
});

export const PollOption = sequelize.define('PollOption', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  text: { type: DataTypes.STRING, allowNull: false },
  pollId: { type: DataTypes.UUID, allowNull: false },
});

export const PollVote = sequelize.define('PollVote', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  pollId: { type: DataTypes.UUID, allowNull: false },
  userId: { type: DataTypes.STRING(6), allowNull: false },
  optionIds: { type: DataTypes.JSON, allowNull: false },
});

export const Quiz = sequelize.define('Quiz', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  allowMultipleAnswers: { type: DataTypes.BOOLEAN, defaultValue: false },
  isStopped: { type: DataTypes.BOOLEAN, defaultValue: false },
  correctOptionIds: { type: DataTypes.JSON, allowNull: false },
  announcementId: { type: DataTypes.UUID },
  newsItemId: { type: DataTypes.UUID },
  libraryPostId: { type: DataTypes.UUID },
});

export const QuizOption = sequelize.define('QuizOption', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  text: { type: DataTypes.STRING, allowNull: false },
  quizId: { type: DataTypes.UUID, allowNull: false },
});

export const QuizSubmission = sequelize.define('QuizSubmission', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  quizId: { type: DataTypes.UUID, allowNull: false },
  userId: { type: DataTypes.STRING(6), allowNull: false },
  optionIds: { type: DataTypes.JSON, allowNull: false },
});

// Chat
export const Conversation = sequelize.define('Conversation', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  pinnedBy: { type: DataTypes.JSON },
  name: { type: DataTypes.STRING },
});

// Join table for Conversation <-> User
export const ConversationParticipant = sequelize.define('ConversationParticipant', {
  conversationId: { type: DataTypes.UUID, references: { model: Conversation, key: 'id' } },
  userId: { type: DataTypes.STRING(6), references: { model: User, key: 'id' } },
});

export const ChatMessage = sequelize.define('ChatMessage', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  chatId: { type: DataTypes.UUID, allowNull: false },
  senderId: { type: DataTypes.STRING(6), allowNull: false },
  text: { type: DataTypes.TEXT },
  timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  status: { type: DataTypes.STRING, defaultValue: 'sent' },
  isTrainingComment: { type: DataTypes.BOOLEAN, defaultValue: false },
  media: { type: DataTypes.JSON },
  mediaExpired: { type: DataTypes.BOOLEAN, defaultValue: false },
});

export const DeveloperMessage = sequelize.define('DeveloperMessage', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  subject: { type: DataTypes.STRING, allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: false },
  senderId: { type: DataTypes.STRING(6), allowNull: false },
  timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  isRead: { type: DataTypes.BOOLEAN, defaultValue: false },
  status: { type: DataTypes.STRING, defaultValue: 'open' },
});

// Settings & Other
export const AppSettings = sequelize.define('AppSettings', {
  id: { type: DataTypes.STRING, defaultValue: 'default', primaryKey: true },
  announcementBasePrice: { type: DataTypes.INTEGER, allowNull: false },
  defaultAnnouncementDeletion: { type: DataTypes.STRING, defaultValue: 'none' },
  defaultNewsDeletion: { type: DataTypes.STRING, defaultValue: 'none' },
  defaultLibraryDeletion: { type: DataTypes.STRING, defaultValue: 'none' },
  termsOfService: { type: DataTypes.TEXT },
  privacyPolicy: { type: DataTypes.TEXT },
  subscriptionPrices: { type: DataTypes.JSON },
  subscriptionPaymentOptions: { type: DataTypes.JSON },
  trialSettings: { type: DataTypes.JSON },
  bonusPaymentPercentage: { type: DataTypes.INTEGER, defaultValue: 25 },
  bonusExpirationMonths: { type: DataTypes.INTEGER, defaultValue: 6 },
});

export const BonusTransaction = sequelize.define('BonusTransaction', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.STRING(6), allowNull: false },
  amount: { type: DataTypes.INTEGER, allowNull: false },
  description: { type: DataTypes.STRING, allowNull: false },
  timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  adminId: { type: DataTypes.STRING(6) },
  source: { type: DataTypes.STRING },
  sourceUserId: { type: DataTypes.STRING(6) },
  expiresAt: { type: DataTypes.DATE },
  remainingAmount: { type: DataTypes.INTEGER },
});

export const NewLocationRequest = sequelize.define('NewLocationRequest', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.STRING(6), allowNull: false },
  submittedCity: { type: DataTypes.STRING, allowNull: false },
  submittedRegion: { type: DataTypes.STRING, allowNull: false },
  submittedCountry: { type: DataTypes.STRING, allowNull: false },
  status: { type: DataTypes.STRING, allowNull: false },
  requestTimestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  resolvedBy: { type: DataTypes.STRING },
  resolvedTimestamp: { type: DataTypes.DATE },
});

export const PasswordResetRequest = sequelize.define('PasswordResetRequest', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.STRING(6), allowNull: false },
  requestTimestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  status: { type: DataTypes.STRING, allowNull: false },
  resolvedBy: { type: DataTypes.STRING },
  resolvedTimestamp: { type: DataTypes.DATE },
});

// --- Associations ---

// User Relationships (Self Many-to-Many)
User.belongsToMany(User, {
  as: 'linkedUsers',
  through: 'UserLinks',
  foreignKey: 'userId',
  otherKey: 'linkedUserId',
});
User.belongsToMany(User, {
  as: 'pendingStudents',
  through: 'UserPendingStudents',
  foreignKey: 'userId',
  otherKey: 'pendingUserId',
});
User.belongsToMany(User, {
  as: 'studentRequests',
  through: 'UserStudentRequests',
  foreignKey: 'userId',
  otherKey: 'requesterId',
});
User.belongsToMany(User, {
  as: 'trainerRequests',
  through: 'UserTrainerRequests',
  foreignKey: 'userId',
  otherKey: 'requesterId',
});

// User <-> Referrals
User.hasMany(User, { as: 'referrals', foreignKey: 'referredBy' });
User.belongsTo(User, { as: 'referrer', foreignKey: 'referredBy' });

// User <-> Training
User.hasMany(TrainingSession, { foreignKey: 'authorId', as: 'createdTrainings' });
TrainingSession.belongsTo(User, { foreignKey: 'authorId', as: 'author' });

TrainingSession.hasMany(TrainingParticipant, {
  foreignKey: 'sessionId',
  as: 'participants',
  onDelete: 'CASCADE',
});
TrainingParticipant.belongsTo(TrainingSession, { foreignKey: 'sessionId' });
TrainingParticipant.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User <-> Content
User.hasMany(Announcement, { foreignKey: 'authorId' });
Announcement.belongsTo(User, { foreignKey: 'authorId' });

User.hasMany(NewsItem, { foreignKey: 'authorId' });
NewsItem.belongsTo(User, { foreignKey: 'authorId' });

User.hasMany(LibraryPost, { foreignKey: 'authorId' });
LibraryPost.belongsTo(User, { foreignKey: 'authorId' });

// Post Images
Announcement.hasMany(PostImage, { foreignKey: 'announcementId', as: 'images', onDelete: 'CASCADE' });
NewsItem.hasMany(PostImage, { foreignKey: 'newsItemId', as: 'images', onDelete: 'CASCADE' });
LibraryPost.hasMany(PostImage, { foreignKey: 'libraryPostId', as: 'images', onDelete: 'CASCADE' });

// Polls
Announcement.hasOne(Poll, { foreignKey: 'announcementId', as: 'poll', onDelete: 'CASCADE' });
NewsItem.hasOne(Poll, { foreignKey: 'newsItemId', as: 'poll', onDelete: 'CASCADE' });
LibraryPost.hasOne(Poll, { foreignKey: 'libraryPostId', as: 'poll', onDelete: 'CASCADE' });

Poll.hasMany(PollOption, { foreignKey: 'pollId', as: 'options', onDelete: 'CASCADE' });
Poll.hasMany(PollVote, { foreignKey: 'pollId', as: 'votes', onDelete: 'CASCADE' });

// Quizzes
Announcement.hasOne(Quiz, { foreignKey: 'announcementId', as: 'quiz', onDelete: 'CASCADE' });
NewsItem.hasOne(Quiz, { foreignKey: 'newsItemId', as: 'quiz', onDelete: 'CASCADE' });
LibraryPost.hasOne(Quiz, { foreignKey: 'libraryPostId', as: 'quiz', onDelete: 'CASCADE' });

Quiz.hasMany(QuizOption, { foreignKey: 'quizId', as: 'options', onDelete: 'CASCADE' });
Quiz.hasMany(QuizSubmission, { foreignKey: 'quizId', as: 'submissions', onDelete: 'CASCADE' });

// Chat
Conversation.belongsToMany(User, {
  through: ConversationParticipant,
  as: 'participants',
  foreignKey: 'conversationId',
});
User.belongsToMany(Conversation, {
  through: ConversationParticipant,
  as: 'conversations',
  foreignKey: 'userId',
});

Conversation.hasMany(ChatMessage, { foreignKey: 'chatId', as: 'messages', onDelete: 'CASCADE' });
ChatMessage.belongsTo(Conversation, { foreignKey: 'chatId' });
ChatMessage.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

// Dev Messages
User.hasMany(DeveloperMessage, { foreignKey: 'senderId' });
DeveloperMessage.belongsTo(User, { foreignKey: 'senderId' });

// Bonus
User.hasMany(BonusTransaction, { foreignKey: 'userId' });
BonusTransaction.belongsTo(User, { foreignKey: 'userId' });

export default sequelize;
