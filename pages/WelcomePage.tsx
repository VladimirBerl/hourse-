import React, { useEffect, useState, useRef, useContext } from 'react';
import { Link } from 'react-router-dom';
import { DataContext } from '../App';
import { WelcomePageContent } from '../types';


// A helper hook for animations on scroll
const useInView = (options: IntersectionObserverInit): [React.Dispatch<React.SetStateAction<HTMLElement | null>>, boolean] => {
    const [ref, setRef] = useState<HTMLElement | null>(null);
    const [isInView, setIsInView] = useState(false);

    useEffect(() => {
        if (!ref) return;

        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setIsInView(true);
                observer.unobserve(entry.target);
            }
        }, options);

        observer.observe(ref);

        return () => {
            if (ref) {
                observer.unobserve(ref);
            }
        };
    }, [ref, options]);

    return [setRef, isInView];
};

// Animated section wrapper
const AnimatedSection: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className }) => {
    const [ref, isInView] = useInView({ threshold: 0.1 });
    
    return (
        <div
            ref={ref}
            className={`${className} transition-all duration-1000 ease-out ${isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
            {children}
        </div>
    );
};

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
    <AnimatedSection>
        <div className="bg-white p-8 rounded-xl shadow-lg text-center border border-gray-100 h-full">
            <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-brand-light mx-auto mb-6">
                {icon}
            </div>
            <h3 className="text-xl font-bold text-brand-primary mb-3">{title}</h3>
            <p className="text-gray-600 leading-relaxed">{description}</p>
        </div>
    </AnimatedSection>
);

const TestimonialCard = ({ quote, name, role }: { quote: string, name: string, role: string }) => (
     <AnimatedSection>
        <div className="bg-white/10 backdrop-blur-md p-8 rounded-xl border border-white/20 h-full flex flex-col">
            <p className="text-gray-200 italic mb-6 flex-grow">"{quote}"</p>
            <div className="text-right">
                <p className="font-bold text-white">{name}</p>
                <p className="text-sm text-gray-300">{role}</p>
            </div>
        </div>
    </AnimatedSection>
);

const CheckIcon = () => (
    <svg className="h-6 w-6 text-brand-accent mr-3 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);


const WelcomePage: React.FC = () => {
    const data = useContext(DataContext);
    
    // Fallback content in case context is not ready
    const defaultContent: WelcomePageContent = {
        id: 'singleton', heroTitle: 'Ваш цифровой помощник в конном мире',
        heroSubtitle: 'Все, что нужно для эффективных тренировок, анализа прогресса и общения с вашим тренером — в одном приложении.',
        heroButtonText: 'Начать бесплатно', heroImageUrl: 'https://images.unsplash.com/photo-1598974357801-927006515f86?q=80&w=2070&auto=format&fit=crop',
        featuresTitle: 'Основные возможности', featuresSubtitle: 'Откройте для себя инструменты, которые помогут вам достичь новых высот в конном спорте.',
        features: [
            { title: 'Календарь тренировок', description: 'Планируйте и отслеживайте свои занятия, получайте обратную связь и анализируйте прошедшие тренировки.' },
            { title: 'Статистика и прогресс', description: 'Визуализируйте свой прогресс с помощью наглядных графиков и достигайте новых спортивных высот.' },
            { title: 'Общение и сообщество', description: 'Оставайтесь на связи с тренером, читайте новости, обменивайтесь мнениями в опросах и объявлениях.' },
            { title: 'Библиотека знаний', description: 'Получайте доступ к полезным статьям и материалам для повышения вашего мастерства и знаний.' }
        ],
        forWhomTitle: 'Для кого это приложение?', forWhomSectionBg: '#f9fafb',
        forTrainersTitle: 'Для Тренеров',
        forTrainersSubtitle: 'Управляйте расписанием, следите за прогрессом учеников и оставайтесь на связи в одном удобном инструменте.',
        forTrainersList: [
            'Эффективное планирование тренировок', 'Анализ статистики по каждому ученику',
            'Удобный чат для быстрой коммуникации', 'Публикация новостей и объявлений для групп'
        ],
        forTrainersImageUrl: 'https://images.unsplash.com/photo-1551823337-331a615a9a18?q=80&w=1974&auto=format&fit=crop',
        forStudentsTitle: 'Для Учеников', forStudentsSubtitle: 'Ведите дневник тренировок, анализируйте свой прогресс и получайте ценную обратную связь от тренера.',
        forStudentsList: [
            'Наглядный календарь занятий', 'Отслеживание прогресса по оценкам',
            'Удобная связь с тренером', 'Доступ к базе знаний и новостям'
        ],
        forStudentsImageUrl: 'https://images.unsplash.com/photo-1534775739923-3c9a6a8b30b4?q=80&w=2070&auto=format&fit=crop',
        testimonialsTitle: 'Что говорят наши пользователи', testimonialsSectionBg: '#2c5282',
        testimonials: [
            { id: 't1', quote: "Это приложение полностью изменило мой подход к тренировкам...", name: "Елена Смирнова", role: "Ученик" },
            { id: 't2', quote: "Как тренер, я в восторге от возможности вести всех своих учеников в одном месте...", name: "Иван Петров", role: "Тренер" },
            { id: 't3', quote: "Наконец-то появилось современное и удобное приложение для конников...", name: "Анна Кузнецова", role: "Ученик" }
        ],
        ctaTitle: 'Готовы присоединиться?', ctaSubtitle: 'Начните свой путь к успеху уже сегодня. Регистрация займет всего минуту.',
        ctaButtonText: 'Зарегистрироваться'
    };

    const content = data?.welcomePageContent || defaultContent;
    
    const iconStyle = "h-8 w-8 text-brand-secondary";

    const featureIcons = [
        <svg xmlns="http://www.w3.org/2000/svg" className={iconStyle} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
        <svg xmlns="http://www.w3.org/2000/svg" className={iconStyle} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
        <svg xmlns="http://www.w3.org/2000/svg" className={iconStyle} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>,
        <svg xmlns="http://www.w3.org/2000/svg" className={iconStyle} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
    ];

    const getBackgroundStyle = (bgValue: string | undefined) => {
        if (!bgValue) return {};
        if (bgValue.startsWith('#') || bgValue.startsWith('rgb')) {
            return { backgroundColor: bgValue };
        }
        return { backgroundImage: `url('${bgValue}')`, backgroundSize: 'cover', backgroundPosition: 'center' };
    };

    return (
        <div className="bg-gray-50 min-h-screen font-sans">
            <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm shadow-sm transition-all">
                <div className="container mx-auto px-6 py-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-brand-primary">МАНЕЖ.ПРО</h1>
                    <Link to="/login" className="px-5 py-2 bg-brand-primary text-white text-sm font-semibold rounded-lg hover:bg-brand-secondary transition duration-300 shadow-md">
                        Войти / Регистрация
                    </Link>
                </div>
            </header>

            <main>
                <section
                    className="relative min-h-screen flex items-center justify-center text-center text-white px-6 pt-20"
                    style={getBackgroundStyle(content.heroImageUrl)}
                >
                    <div className="absolute inset-0 bg-black/50"></div>
                    <div className="relative z-10 max-w-4xl mx-auto">
                        <AnimatedSection>
                          <h2 className="text-4xl md:text-6xl font-extrabold mb-4 leading-tight" style={{textShadow: '0 2px 4px rgba(0,0,0,0.5)'}}>{content.heroTitle}</h2>
                        </AnimatedSection>
                        <AnimatedSection>
                           <p className="text-lg md:text-xl text-gray-200 max-w-3xl mx-auto mb-8" style={{textShadow: '0 1px 3px rgba(0,0,0,0.5)'}}>
                                {content.heroSubtitle}
                            </p>
                        </AnimatedSection>
                         <AnimatedSection>
                           <Link
                                to="/login"
                                className="inline-block bg-brand-accent text-white font-bold text-lg px-8 py-4 rounded-lg shadow-lg hover:bg-green-600 transform hover:-translate-y-1 transition-all duration-300"
                            >
                                {content.heroButtonText}
                            </Link>
                        </AnimatedSection>
                    </div>
                </section>

                <section className="py-20 bg-white">
                    <div className="container mx-auto px-6">
                        <AnimatedSection className="text-center mb-16">
                            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">{content.featuresTitle}</h2>
                            <p className="text-gray-500 max-w-2xl mx-auto">{content.featuresSubtitle}</p>
                        </AnimatedSection>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            {content.features.map((feature, index) => <FeatureCard key={feature.title} icon={featureIcons[index]} {...feature} />)}
                        </div>
                    </div>
                </section>
                
                <section className="py-20" style={getBackgroundStyle(content.forWhomSectionBg)}>
                    <div className="container mx-auto px-6">
                         <AnimatedSection className="text-center mb-16">
                            <h2 className="text-3xl md:text-4xl font-bold text-gray-800">{content.forWhomTitle}</h2>
                         </AnimatedSection>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                            <AnimatedSection>
                                <div className="p-8">
                                    <h3 className="text-3xl font-bold text-brand-primary mb-4">{content.forTrainersTitle}</h3>
                                    <p className="text-gray-600 mb-6">{content.forTrainersSubtitle}</p>
                                    <ul className="space-y-3 text-gray-700">
                                        {content.forTrainersList.map(item => <li key={item} className="flex items-start"><CheckIcon /> <span>{item}</span></li>)}
                                    </ul>
                                </div>
                            </AnimatedSection>
                            <AnimatedSection>
                                <img src={content.forTrainersImageUrl} alt="Тренер с учеником" className="rounded-2xl shadow-2xl w-full h-auto object-cover" />
                            </AnimatedSection>
                            <AnimatedSection className="lg:order-last">
                                <div className="p-8">
                                    <h3 className="text-3xl font-bold text-brand-primary mb-4">{content.forStudentsTitle}</h3>
                                    <p className="text-gray-600 mb-6">{content.forStudentsSubtitle}</p>
                                     <ul className="space-y-3 text-gray-700">
                                        {content.forStudentsList.map(item => <li key={item} className="flex items-start"><CheckIcon /> <span>{item}</span></li>)}
                                    </ul>
                                </div>
                            </AnimatedSection>
                            <AnimatedSection>
                                 <img src={content.forStudentsImageUrl} alt="Всадник на лошади" className="rounded-2xl shadow-2xl w-full h-auto object-cover" />
                            </AnimatedSection>
                        </div>
                    </div>
                </section>

                <section className="py-20" style={getBackgroundStyle(content.testimonialsSectionBg)}>
                    <div className="container mx-auto px-6">
                        <AnimatedSection className="text-center mb-12">
                            <h2 className="text-3xl md:text-4xl font-bold text-white">{content.testimonialsTitle}</h2>
                        </AnimatedSection>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {content.testimonials.map(testimonial => <TestimonialCard key={testimonial.id} {...testimonial} />)}
                        </div>
                    </div>
                </section>
                
                <section className="py-20 text-center px-6 bg-white">
                    <AnimatedSection>
                        <h2 className="text-3xl font-bold text-gray-800 mb-4">{content.ctaTitle}</h2>
                        <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
                            {content.ctaSubtitle}
                        </p>
                        <Link
                            to="/login"
                            className="inline-block bg-brand-accent text-white font-bold text-lg px-8 py-4 rounded-lg shadow-lg hover:bg-green-600 transform hover:-translate-y-1 transition-all duration-300"
                        >
                            {content.ctaButtonText}
                        </Link>
                    </AnimatedSection>
                </section>
            </main>

            <footer className="bg-gray-800 text-gray-300 py-8">
                <div className="container mx-auto px-6 text-center">
                    <p>&copy; {new Date().getFullYear()} МАНЕЖ.ПРО. Все права защищены.</p>
                </div>
            </footer>
        </div>
    );
};

export default WelcomePage;
