



import React, { useContext, useState, useEffect, useMemo } from 'react';
// FIX: Using react-router-dom v5 imports
import { Link, useLocation } from 'react-router-dom';
import { AuthContext, DataContext } from '../App';
import { User, UserRole, LOCATION_DATA } from '../types';

const ForgotPasswordModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  users: User[];
}> = ({ isOpen, onClose, users }) => {
  const auth = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setEmail('');
        setIsSubmitted(false);
        setError('');
        setMessage('');
        setIsSubmitting(false);
      }, 300); 
    }
  }, [isOpen]);
  
  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!email) {
      setError('Пожалуйста, введите email.');
      return;
    }
    
    const userExists = users.some(u => u.email.toLowerCase() === email.toLowerCase());
    if (!userExists) {
        setError('Пользователь с таким email не найден. Запрос не был отправлен.');
        return;
    }

    setIsSubmitting(true);
    if (auth?.submitPasswordResetRequest) {
        const result = await auth.submitPasswordResetRequest(email);
        setMessage(result.message);
    } else {
        // Fallback for context not being ready
        await new Promise(res => setTimeout(res, 1000));
        setMessage('Если аккаунт с таким email существует, администратору будет отправлен запрос на сброс пароля.');
    }
    
    setIsSubmitting(false);
    setIsSubmitted(true);

    setTimeout(() => {
      onClose();
    }, 4000); // Auto-close after 4 seconds
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose} role="dialog" aria-modal="true">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-800">Сброс пароля</h2>
        </div>
        <div className="p-6">
          {isSubmitted ? (
            <div className="text-center">
              <p className="text-gray-700">{message || 'Если аккаунт с таким email существует, на него будет отправлена ссылка для сброса пароля.'}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <p className="text-sm text-gray-600 mb-4">
                Введите ваш email, связанный с аккаунтом. Администратор получит запрос и свяжется с вами через указанную вами почту.
              </p>
              <fieldset disabled={isSubmitting}>
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-secondary focus:outline-none"
                  autoComplete="email"
                  required
                />
                {error && <p className="text-sm text-red-600 text-center mt-2">{error}</p>}
              </fieldset>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 disabled:opacity-50"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-brand-primary text-white px-4 py-2 rounded-md hover:bg-brand-secondary disabled:bg-gray-400"
                >
                  {isSubmitting ? 'Отправка...' : 'Отправить запрос'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};


const LoginPage: React.FC = () => {
  const auth = useContext(AuthContext);
  const data = useContext(DataContext);
  // FIX: Updated `useLocation` to react-router-dom v6 syntax.
  const location = useLocation();
  const locationState = location.state as { showRegister?: boolean } | null;
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotPasswordModalOpen, setIsForgotPasswordModalOpen] = useState(false);
  const [referredBy, setReferredBy] = useState<string | null>(null);

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [cityInput, setCityInput] = useState('');
  const [country, setCountry] = useState('');
  const [region, setRegion] = useState('');
  const [city, setCity] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.Student);
  const [isSpectator, setIsSpectator] = useState(false);
  const [error, setError] = useState('');

  // Location Autocomplete State
  const [manualEntry, setManualEntry] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    // FIX: Updated to use the cast location state.
    if (locationState?.showRegister) {
      setIsLogin(false);
    }
  }, [locationState]);

  useEffect(() => {
      // For HashRouter, query params are in `location.search` which follows the hash part of the URL.
      const params = new URLSearchParams(location.search);
      const refId = params.get('ref');
      if (refId) {
          setReferredBy(refId);
          setIsLogin(false); // Switch to registration form if ref link is used
      }
  }, [location.search]);

  const flatLocations = useMemo(() => {
    const locations = data?.locations || LOCATION_DATA;
    if (!locations || Object.keys(locations).length === 0) {
      return Object.entries(LOCATION_DATA).flatMap(([country, regions]) => 
        Object.entries(regions).flatMap(([region, cities]) => 
          cities.map(city => ({ city, region, country }))
        )
      );
    }
    return Object.entries(locations).flatMap(([country, regions]) => 
        Object.entries(regions).flatMap(([region, cities]) => 
            cities.map(city => ({ city, region, country }))
        )
    );
  }, [data?.locations]);

  const suggestions = useMemo(() => {
      if (!cityInput) return [];
      const search = cityInput.toLowerCase().trim();
      if (!search) return [];
      return flatLocations.filter(loc => {
          const cityLower = loc.city.toLowerCase();
          return cityLower.includes(search);
      }).slice(0, 10);
  }, [cityInput, flatLocations]);

  const handleCityInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setCityInput(value);
      setManualEntry(false); 
      setCity('');
      setRegion('');
      setCountry('');
  };

  const handleSuggestionClick = (location: { city: string, region: string, country: string }) => {
      setCityInput(location.city);
      setCity(location.city);
      setRegion(location.region);
      setCountry(location.country);
      setShowSuggestions(false);
  };
  
  const handleManualEntryClick = () => {
      setManualEntry(true);
      setShowSuggestions(false);
      setCity(cityInput);
      setRegion('');
      setCountry('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Пожалуйста, введите email и пароль.');
      return;
    }
    if (!auth) return;
    
    setIsLoading(true);
    const user = await auth.login(email, password);
    setIsLoading(false);
    
    if (!user) {
      setError('Неверный email или пароль.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name || !surname || !city || !region || !country || !email || !password) {
        setError('Пожалуйста, заполните все поля, включая местоположение.');
        return;
    }
    if (!auth) return;

    // Убрана клиентская проверка - сервер является единственным источником правды
    // Проверка на дубликаты email будет выполнена на сервере

    setIsLoading(true);
    const newUserPartial = { name, surname, country, region, city, email, password, role: isSpectator ? UserRole.Spectator : role, referredBy: referredBy || undefined };
    
    try {
        const registeredUser = await auth.registerAndLogin(newUserPartial);
        if (!registeredUser) {
          setError('Ошибка регистрации. Возможно, email уже занят.');
        }
    } catch (err: any) {
        // Обрабатываем ошибку от сервера
        const errorMessage = err.message || err.response?.data?.message || 'Произошла ошибка регистрации.';
        setError(errorMessage);
    } finally {
        setIsLoading(false);
    }
  };

  const clearForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setSurname('');
    setCityInput('');
    setCountry('');
    setRegion('');
    setCity('');
    setRole(UserRole.Student);
    setIsSpectator(false);
    setError('');
    setManualEntry(false);
    setShowSuggestions(false);
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    clearForm();
  };


  return (
    <div className="min-h-screen bg-brand-primary flex flex-col justify-center items-center p-4">
      <ForgotPasswordModal
        isOpen={isForgotPasswordModalOpen}
        onClose={() => setIsForgotPasswordModalOpen(false)}
        users={auth?.users || []}
      />
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl p-8">
        <h1 className="text-4xl font-bold text-center text-brand-primary mb-2">МАНЕЖ.ПРО</h1>
        <p className="text-center text-gray-500 mb-8">Ваш помощник в конном мире</p>

        {isLogin ? (
          <form onSubmit={handleLogin}>
            <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">Вход в аккаунт</h2>
            <fieldset disabled={isLoading} className="space-y-4">
              <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-secondary focus:outline-none" autoComplete="email" />
              <input type="password" placeholder="Пароль" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-secondary focus:outline-none" autoComplete="current-password" />
              {error && <p className="text-sm text-red-600 text-center">{error}</p>}
              <div className="text-right mt-2">
                <button
                  type="button"
                  onClick={() => setIsForgotPasswordModalOpen(true)}
                  className="text-sm font-medium text-brand-primary hover:underline focus:outline-none">
                  Забыли пароль?
                </button>
              </div>
              <button type="submit" className="w-full bg-brand-primary text-white py-3 rounded-lg font-semibold hover:bg-brand-secondary transition duration-300 shadow-md mt-2 disabled:bg-gray-400">
                {isLoading ? 'Вход...' : 'Войти'}
              </button>
            </fieldset>
          </form>
        ) : (
           <form onSubmit={handleRegister}>
            <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">Регистрация</h2>
            {referredBy && <p className="text-center text-sm bg-green-100 text-green-800 p-2 rounded-lg mb-4">Вы регистрируетесь по приглашению. Добро пожаловать!</p>}
            <fieldset disabled={isLoading} className="space-y-4">
              <input type="text" placeholder="Имя" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-secondary focus:outline-none" autoComplete="given-name"/>
              <input type="text" placeholder="Фамилия" value={surname} onChange={e => setSurname(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-secondary focus:outline-none" autoComplete="family-name"/>
              
              <div className="relative">
                <input type="text" placeholder="Город" value={cityInput} onChange={handleCityInputChange} onFocus={() => setShowSuggestions(true)} onBlur={() => setTimeout(() => setShowSuggestions(false), 1000)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-secondary focus:outline-none" autoComplete="off"/>
                {showSuggestions && cityInput && (
                    <ul className="absolute z-10 w-full bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto mt-1">
                        {suggestions.map((loc, i) => (
                            <li key={`${loc.city}-${i}`} onClick={() => handleSuggestionClick(loc)} className="cursor-pointer p-2 hover:bg-gray-100 text-sm">
                                {loc.city}, {loc.region}, {loc.country}
                            </li>
                        ))}
                         <li onClick={handleManualEntryClick} className="cursor-pointer p-2 text-center text-sm text-brand-primary bg-gray-50 hover:bg-gray-100 font-semibold">
                            Нет моего города
                        </li>
                    </ul>
                )}
              </div>

              <input type="text" placeholder="Край/Область" value={region} onChange={e => setRegion(e.target.value)} disabled={!manualEntry} required={manualEntry} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-secondary focus:outline-none bg-white disabled:bg-gray-200 disabled:cursor-not-allowed"/>
              <input type="text" placeholder="Страна" value={country} onChange={e => setCountry(e.target.value)} disabled={!manualEntry} required={manualEntry} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-secondary focus:outline-none bg-white disabled:bg-gray-200 disabled:cursor-not-allowed"/>

              <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-secondary focus:outline-none" autoComplete="email"/>
              <input type="password" placeholder="Пароль" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-secondary focus:outline-none" autoComplete="new-password"/>
              <div className="pt-2">
                  {!isSpectator && (
                    <div className="flex justify-center space-x-4">
                      <button
                        type="button"
                        onClick={() => setRole(UserRole.Student)}
                        className={`px-6 py-2 rounded-lg font-semibold border-2 transition-colors w-1/2 ${
                          role === UserRole.Student
                            ? 'bg-brand-primary text-white border-brand-primary'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-brand-secondary'
                        }`}
                      >
                        Ученик
                      </button>
                      <button
                        type="button"
                        onClick={() => setRole(UserRole.Trainer)}
                        className={`px-6 py-2 rounded-lg font-semibold border-2 transition-colors w-1/2 ${
                          role === UserRole.Trainer
                            ? 'bg-brand-primary text-white border-brand-primary'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-brand-secondary'
                        }`}
                      >
                       Тренер
                      </button>
                    </div>
                  )}
                  <div className="mt-4">
                    <label htmlFor="isSpectator" className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg cursor-pointer bg-white hover:bg-gray-50 transition-colors">
                        <input
                            type="checkbox"
                            id="isSpectator"
                            checked={isSpectator}
                            onChange={(e) => setIsSpectator(e.target.checked)}
                            className="h-5 w-5 text-brand-primary border-gray-300 rounded focus:ring-brand-primary"
                        />
                        <span className="ml-3 text-base text-gray-700">
                            Не занимаюсь конным спортом
                        </span>
                    </label>
                  </div>
              </div>
              {error && <p className="text-sm text-red-600 text-center">{error}</p>}
              <button type="submit" className="w-full bg-brand-accent text-white py-3 rounded-lg font-semibold hover:bg-green-600 transition duration-300 shadow-md disabled:bg-gray-400">
                {isLoading ? 'Регистрация...' : 'Зарегистрироваться'}
              </button>
              <p className="text-center text-xs text-gray-500 mt-4 px-4">
                Нажимая «Зарегистрироваться», вы принимаете{' '}
                <Link to="/legal" className="underline hover:text-brand-primary">
                  Пользовательское соглашение
                </Link>{' '}
                и{' '}
                <Link to="/legal" className="underline hover:text-brand-primary">
                  Политику конфиденциальности
                </Link>.
              </p>
            </fieldset>
          </form>
        )}

        <p className="text-center text-sm text-gray-600 mt-8">
          {isLogin ? "Нет аккаунта?" : "Уже есть аккаунт?"}
          <button type="button" onClick={toggleMode} className="font-semibold text-brand-primary hover:underline ml-1 disabled:opacity-50" disabled={isLoading}>
            {isLogin ? "Зарегистрируйтесь" : "Войдите"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
