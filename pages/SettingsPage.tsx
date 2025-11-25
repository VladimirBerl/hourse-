


import React, { useContext, useState, useEffect } from 'react';
import { AuthContext, DataContext } from '../App';
import { User, UserRole, AdminPermissions, NotificationType, NotificationSetting, WelcomePageContent } from '../types';
import ConfirmationModal from '../components/ConfirmationModal';
import ColumnToggler, { usePersistentColumns } from '../components/ColumnToggler';
import { AdminSetPasswordModal } from './AdminRequestsPage';
import Tooltip from '../components/Tooltip';

const permissionLabels: { [key in keyof Omit<AdminPermissions, 'canManageAdmins'>]: string } = {
    canManageUsers: 'Управление пользователями',
    canManageAnnouncements: 'Управление объявлениями',
    canManageNews: 'Управление новостями',
    canManageLibraryPosts: 'Управление библиотекой',
    canViewStats: 'Просмотр статистики',
    canViewMessages: 'Просмотр сообщений',
    canAccessChat: 'Доступ к чату',
    canResetUserPasswords: 'Доступ к разделу запросы',
};

interface EditLocationNameModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (newValue: string) => void;
    itemType: 'страну' | 'регион' | 'город';
    initialValue: string;
}

const EditLocationNameModal: React.FC<EditLocationNameModalProps> = ({ isOpen, onClose, onSave, itemType, initialValue }) => {
    const [name, setName] = useState(initialValue);

    useEffect(() => {
        if(isOpen) setName(initialValue);
    }, [initialValue, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            onSave(name.trim());
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b"><h2 className="text-xl font-bold text-gray-800">Редактировать {itemType}</h2></div>
                    <div className="p-6 space-y-4">
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" required />
                    </div>
                    <div className="p-6 border-t flex justify-end space-x-3">
                        <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300">Отмена</button>
                        <button type="submit" className="bg-brand-primary text-white px-4 py-2 rounded-md hover:bg-brand-secondary">Сохранить</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

interface LocationManagerProps {
    users: User[];
    updateUsers: (updatedUsers: User[]) => Promise<void>;
}


const LocationManager: React.FC<LocationManagerProps> = ({ users, updateUsers }) => {
    const data = useContext(DataContext);
    if (!data) return null;

    const { locations, updateLocations } = data;

    const [selectedCountry, setSelectedCountry] = useState<string>('');
    const [selectedRegion, setSelectedRegion] = useState<string>('');
    
    const [newCountryName, setNewCountryName] = useState('');
    const [newRegionName, setNewRegionName] = useState('');
    const [newCityName, setNewCityName] = useState('');
    
    const [editModal, setEditModal] = useState<{isOpen: boolean, type: 'country' | 'region' | 'city', value: string, context?: {country?: string, region?: string}}>({isOpen: false, type: 'country', value: ''});
    const [deleteModal, setDeleteModal] = useState<{isOpen: boolean, type: 'country' | 'region' | 'city', value: string, context?: {country?: string, region?: string}}>({isOpen: false, type: 'country', value: ''});

    const [countrySearch, setCountrySearch] = useState('');
    const [regionSearch, setRegionSearch] = useState('');
    const [citySearch, setCitySearch] = useState('');

    useEffect(() => {
        setSelectedRegion('');
        setRegionSearch('');
        setCitySearch('');
    }, [selectedCountry]);

    const countries = Object.keys(locations)
        .filter(c => c.toLowerCase().includes(countrySearch.toLowerCase()))
        .sort((a, b) => a.localeCompare(b, 'ru'));
    const regions = selectedCountry && locations[selectedCountry] 
        ? Object.keys(locations[selectedCountry])
            .filter(r => r.toLowerCase().includes(regionSearch.toLowerCase()))
            .sort((a, b) => a.localeCompare(b, 'ru'))
        : [];
    const cities = selectedCountry && selectedRegion && locations[selectedCountry]?.[selectedRegion] 
        ? [...locations[selectedCountry][selectedRegion]]
            .filter(c => c.toLowerCase().includes(citySearch.toLowerCase()))
            .sort((a, b) => a.localeCompare(b, 'ru')) 
        : [];

    const handleAddItem = async (type: 'country' | 'region' | 'city', name: string) => {
        const trimmedName = name.trim();
        if (!trimmedName) return;

        const newLocations = JSON.parse(JSON.stringify(locations));
        
        if (type === 'country') {
            if (!newLocations[trimmedName]) {
                newLocations[trimmedName] = {};
            } else { alert('Такая страна уже существует.'); return; }
        } else if (type === 'region' && selectedCountry) {
            if (!newLocations[selectedCountry][trimmedName]) {
                newLocations[selectedCountry][trimmedName] = [];
            } else { alert('Такой регион уже существует в этой стране.'); return; }
        } else if (type === 'city' && selectedCountry && selectedRegion) {
            const cityList = newLocations[selectedCountry][selectedRegion];
            if (!cityList.includes(trimmedName)) {
                cityList.push(trimmedName);
                cityList.sort((a: string, b: string) => a.localeCompare(b, 'ru'));
            } else { alert('Такой город уже существует в этом регионе.'); return; }
        }
        
        await updateLocations(newLocations);
        if (type === 'country') setNewCountryName('');
        else if (type === 'region') setNewRegionName('');
        else if (type === 'city') setNewCityName('');
    };

    const handleSaveEdit = async (newValue: string) => {
        const { type, value: oldValue, context } = editModal;
        if (!newValue || newValue === oldValue) {
            setEditModal({isOpen: false, type: 'country', value: ''});
            return;
        }

        const newLocations = JSON.parse(JSON.stringify(locations));

        if (type === 'country') {
            if (newLocations[newValue]) { alert('Такая страна уже существует.'); return; }
            newLocations[newValue] = newLocations[oldValue];
            delete newLocations[oldValue];
            if (selectedCountry === oldValue) setSelectedCountry(newValue);
        } else if (type === 'region' && context?.country) {
            if (newLocations[context.country][newValue]) { alert('Такой регион уже существует.'); return; }
            newLocations[context.country][newValue] = newLocations[context.country][oldValue];
            delete newLocations[context.country][oldValue];
            if (selectedRegion === oldValue) setSelectedRegion(newValue);
        } else if (type === 'city' && context?.country && context?.region) {
            const cityList = newLocations[context.country][context.region];
            if (cityList.includes(newValue)) { alert('Такой город уже существует.'); return; }
            const cityIndex = cityList.indexOf(oldValue);
            if (cityIndex > -1) {
                 cityList[cityIndex] = newValue;
                 cityList.sort((a: string, b: string) => a.localeCompare(b, 'ru'));
            }
        }

        let updatedUsers = users.map(u => ({...u})); // Deep clone to be safe
        
        if (type === 'country') {
            updatedUsers.forEach(user => {
                if (user.country === oldValue) {
                    user.country = newValue;
                }
            });
        } else if (type === 'region' && context?.country) {
            updatedUsers.forEach(user => {
                if (user.country === context.country && user.region === oldValue) {
                    user.region = newValue;
                }
            });
        } else if (type === 'city' && context?.country && context?.region) {
            updatedUsers.forEach(user => {
                if (user.country === context.country && user.region === context.region && user.city === oldValue) {
                    user.city = newValue;
                }
            });
        }

        await Promise.all([
            updateLocations(newLocations),
            updateUsers(updatedUsers)
        ]);

        setEditModal({isOpen: false, type: 'country', value: ''});
    };

    const handleConfirmDelete = async () => {
        const { type, value, context } = deleteModal;
        const newLocations = JSON.parse(JSON.stringify(locations));

        if (type === 'country') {
            delete newLocations[value];
            if (selectedCountry === value) setSelectedCountry('');
        } else if (type === 'region' && context?.country) {
            delete newLocations[context.country][value];
            if (selectedRegion === value) setSelectedRegion('');
        } else if (type === 'city' && context?.country && context?.region) {
            const cityList = newLocations[context.country][context.region];
            const cityIndex = cityList.indexOf(value);
            if (cityIndex > -1) cityList.splice(cityIndex, 1);
        }
        
        let updatedUsers = users.map(u => ({...u}));
        if (type === 'country') {
            updatedUsers.forEach(user => {
                if (user.country === value) {
                    user.country = '';
                    user.region = '';
                    user.city = '';
                }
            });
        } else if (type === 'region' && context?.country) {
             updatedUsers.forEach(user => {
                if (user.country === context.country && user.region === value) {
                    user.region = '';
                    user.city = '';
                }
            });
        } else if (type === 'city' && context?.country && context?.region) {
             updatedUsers.forEach(user => {
                if (user.country === context.country && user.region === context.region && user.city === value) {
                    user.city = '';
                }
            });
        }

        await Promise.all([
            updateLocations(newLocations),
            updateUsers(updatedUsers)
        ]);
        
        setDeleteModal({isOpen: false, type: 'country', value: ''});
    };

    const ActionButtons: React.FC<{onEdit: () => void, onDelete: () => void}> = ({ onEdit, onDelete }) => (
        <div className="flex-shrink-0 space-x-2">
            <button type="button" onClick={onEdit} className="text-blue-600 hover:text-blue-800" title="Редактировать">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" /></svg>
            </button>
            <button type="button" onClick={onDelete} className="text-red-500 hover:text-red-700" title="Удалить">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
        </div>
    );
    
    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <EditLocationNameModal isOpen={editModal.isOpen} onClose={() => setEditModal({isOpen: false, type:'country', value: ''})} onSave={handleSaveEdit} itemType={editModal.type === 'country' ? 'страну' : editModal.type === 'region' ? 'регион' : 'город'} initialValue={editModal.value} />
            <ConfirmationModal isOpen={deleteModal.isOpen} onClose={() => setDeleteModal({isOpen: false, type: 'country', value: ''})} onConfirm={handleConfirmDelete} title={`Удалить ${deleteModal.type === 'country' ? 'страну' : deleteModal.type === 'region' ? 'регион' : 'город'}`} message={`Вы уверены? Удаление ${deleteModal.type === 'country' ? 'страны приведет к удалению всех ее регионов и городов' : deleteModal.type === 'region' ? 'региона приведет к удалению всех его городов' : ''}. Это действие не может быть отменено.`} />
            
            <h2 className="text-xl font-bold text-gray-800 mb-4">Управление локациями</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Countries Column */}
                <div className="flex flex-col space-y-3 p-3 bg-gray-50 rounded-lg border">
                    <h3 className="font-semibold text-lg">1. Страны</h3>
                    <div className="relative flex-shrink-0">
                        <input type="text" value={countrySearch} onChange={e => setCountrySearch(e.target.value)} placeholder="Поиск страны..." className="w-full px-3 py-1.5 pl-8 border border-gray-300 rounded-md shadow-sm text-sm" />
                        <svg className="h-4 w-4 text-gray-400 absolute top-1/2 left-2.5 -translate-y-1/2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>
                    </div>
                    <div className="flex-grow space-y-2 overflow-y-auto max-h-60 pr-2">
                        {countries.map(c => (
                            <div key={c} onClick={() => setSelectedCountry(c)} className={`flex items-center justify-between p-2 rounded-md cursor-pointer ${selectedCountry === c ? 'bg-brand-secondary text-white' : 'bg-white hover:bg-gray-100'}`}>
                                <span className="flex-grow">{c}</span>
                                <ActionButtons onEdit={() => setEditModal({isOpen: true, type: 'country', value: c})} onDelete={() => setDeleteModal({isOpen: true, type: 'country', value: c})} />
                            </div>
                        ))}
                    </div>
                    <form onSubmit={(e) => { e.preventDefault(); handleAddItem('country', newCountryName); }} className="flex-shrink-0 flex space-x-2 pt-2 border-t">
                        <input type="text" value={newCountryName} onChange={e => setNewCountryName(e.target.value)} placeholder="Новая страна" className="flex-grow w-full px-3 py-1.5 border border-gray-300 rounded-md shadow-sm text-sm" />
                        <button type="submit" className="bg-brand-accent text-white px-3 py-1.5 rounded-md text-sm font-semibold hover:bg-green-600">+</button>
                    </form>
                </div>

                {/* Regions Column */}
                <div className={`flex flex-col space-y-3 p-3 rounded-lg border ${!selectedCountry ? 'bg-gray-100' : 'bg-gray-50'}`}>
                    <h3 className={`font-semibold text-lg ${!selectedCountry ? 'text-gray-400' : ''}`}>2. Регионы</h3>
                    <div className="relative flex-shrink-0">
                        <input type="text" value={regionSearch} onChange={e => setRegionSearch(e.target.value)} placeholder="Поиск региона..." disabled={!selectedCountry} className="w-full px-3 py-1.5 pl-8 border border-gray-300 rounded-md shadow-sm text-sm disabled:bg-gray-200" />
                        <svg className="h-4 w-4 text-gray-400 absolute top-1/2 left-2.5 -translate-y-1/2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>
                    </div>
                    <div className="flex-grow space-y-2 overflow-y-auto max-h-60 pr-2">
                        {selectedCountry ? regions.map(r => (
                             <div key={r} onClick={() => setSelectedRegion(r)} className={`flex items-center justify-between p-2 rounded-md cursor-pointer ${selectedRegion === r ? 'bg-brand-secondary text-white' : 'bg-white hover:bg-gray-100'}`}>
                                <span className="flex-grow">{r}</span>
                                <ActionButtons onEdit={() => setEditModal({isOpen: true, type: 'region', value: r, context: { country: selectedCountry }})} onDelete={() => setDeleteModal({isOpen: true, type: 'region', value: r, context: { country: selectedCountry }})} />
                            </div>
                        )) : <p className="text-center text-sm text-gray-500 pt-10">Выберите страну</p>}
                    </div>
                     <form onSubmit={(e) => { e.preventDefault(); handleAddItem('region', newRegionName); }} className="flex-shrink-0 flex space-x-2 pt-2 border-t">
                        <input type="text" value={newRegionName} onChange={e => setNewRegionName(e.target.value)} placeholder="Новый регион" disabled={!selectedCountry} className="flex-grow w-full px-3 py-1.5 border border-gray-300 rounded-md shadow-sm text-sm disabled:bg-gray-200" />
                        <button type="submit" disabled={!selectedCountry} className="bg-brand-accent text-white px-3 py-1.5 rounded-md text-sm font-semibold hover:bg-green-600 disabled:bg-gray-400">+</button>
                    </form>
                </div>

                {/* Cities Column */}
                <div className={`flex flex-col space-y-3 p-3 rounded-lg border ${!selectedRegion ? 'bg-gray-100' : 'bg-gray-50'}`}>
                    <h3 className={`font-semibold text-lg ${!selectedRegion ? 'text-gray-400' : ''}`}>3. Города</h3>
                     <div className="relative flex-shrink-0">
                        <input type="text" value={citySearch} onChange={e => setCitySearch(e.target.value)} placeholder="Поиск города..." disabled={!selectedRegion} className="w-full px-3 py-1.5 pl-8 border border-gray-300 rounded-md shadow-sm text-sm disabled:bg-gray-200" />
                        <svg className="h-4 w-4 text-gray-400 absolute top-1/2 left-2.5 -translate-y-1/2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>
                    </div>
                     <div className="flex-grow space-y-2 overflow-y-auto max-h-60 pr-2">
                         {selectedRegion ? cities.map(city => (
                            <div key={city} className="flex items-center justify-between p-2 rounded-md bg-white">
                                <span className="flex-grow">{city}</span>
                                <ActionButtons onEdit={() => setEditModal({isOpen: true, type: 'city', value: city, context: { country: selectedCountry, region: selectedRegion }})} onDelete={() => setDeleteModal({isOpen: true, type: 'city', value: city, context: { country: selectedCountry, region: selectedRegion }})} />
                            </div>
                         )) : <p className="text-center text-sm text-gray-500 pt-10">Выберите регион</p>}
                    </div>
                    <form onSubmit={(e) => { e.preventDefault(); handleAddItem('city', newCityName); }} className="flex-shrink-0 flex space-x-2 pt-2 border-t">
                        <input type="text" value={newCityName} onChange={e => setNewCityName(e.target.value)} placeholder="Новый город" disabled={!selectedRegion} className="flex-grow w-full px-3 py-1.5 border border-gray-300 rounded-md shadow-sm text-sm disabled:bg-gray-200" />
                        <button type="submit" disabled={!selectedRegion} className="bg-brand-accent text-white px-3 py-1.5 rounded-md text-sm font-semibold hover:bg-green-600 disabled:bg-gray-400">+</button>
                    </form>
                </div>
            </div>
        </div>
    );
};


// FIX: Corrected the onAdd prop type to include `password` and omit password-related fields from the User type.
const AddAdminModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onAdd: (details: Omit<User, 'id' | 'registrationDate' | 'linkedUsers' | 'role' | 'city' | 'passwordHash' | 'salt'> & { permissions: AdminPermissions, password: string }) => Promise<{ success: boolean, message: string }>;
}> = ({ isOpen, onClose, onAdd }) => {
    const [name, setName] = useState('');
    const [surname, setSurname] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [permissions, setPermissions] = useState<Omit<AdminPermissions, 'canManageAdmins'>>({
        canManageUsers: true,
        canManageAnnouncements: true,
        canManageNews: true,
        canManageLibraryPosts: true,
        canViewStats: true,
        canViewMessages: true,
        canAccessChat: true,
        canResetUserPasswords: true,
    });

    const handlePermissionChange = (perm: keyof typeof permissions) => {
        setPermissions(prev => ({ ...prev, [perm]: !prev[perm] }));
    };

    const resetForm = () => {
        setName(''); setSurname(''); setEmail(''); setPassword(''); setError('');
        setPermissions({
            canManageUsers: true, canManageAnnouncements: true, canManageNews: true,
            canManageLibraryPosts: true, canViewStats: true, canViewMessages: true,
            canAccessChat: true, canResetUserPasswords: true,
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!name || !surname || !email || !password) {
            setError('Все поля обязательны для заполнения.');
            return;
        }
        // FIX: Added country and region to satisfy the type for creating a new admin user.
        const result = await onAdd({ name, surname, email, password, permissions, country: 'N/A', region: 'N/A' });
        if (result.success) {
            resetForm();
            onClose();
        } else {
            setError(result.message);
        }
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b"><h2 className="text-xl font-bold text-gray-800">Добавить администратора</h2></div>
                    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        <input type="text" placeholder="Имя" value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" required/>
                        <input type="text" placeholder="Фамилия" value={surname} onChange={e => setSurname(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" required/>
                        <input type="email" placeholder="Email (логин)" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" required/>
                        <input type="password" placeholder="Пароль" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" required/>
                        
                        <div className="pt-2">
                            <p className="font-medium text-gray-700 mb-2">Разрешения:</p>
                            <div className="space-y-2 p-3 border rounded-md bg-gray-50">
                                {Object.entries(permissionLabels).map(([key, label]) => (
                                    <label key={key} className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={permissions[key as keyof typeof permissions]}
                                            onChange={() => handlePermissionChange(key as keyof typeof permissions)}
                                            className="h-4 w-4 text-brand-primary border-gray-300 rounded focus:ring-brand-primary"
                                        />
                                        <span className="ml-3 text-sm text-gray-600">{label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {error && <p className="text-sm text-red-600">{error}</p>}
                    </div>
                    <div className="p-6 border-t flex justify-end space-x-3">
                        <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300">Отмена</button>
                        <button type="submit" className="bg-brand-primary text-white px-4 py-2 rounded-md hover:bg-brand-secondary">Добавить</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const EditAdminPermissionsModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (userId: string, permissions: Omit<AdminPermissions, 'canManageAdmins'>) => Promise<void>;
    admin: User | null;
}> = ({ isOpen, onClose, onSave, admin }) => {
    const [permissions, setPermissions] = useState<Omit<AdminPermissions, 'canManageAdmins'>>({});

    useEffect(() => {
        if (admin) {
            const { canManageAdmins, ...editablePerms } = admin.permissions || {};
            const allPermKeys = Object.keys(permissionLabels) as (keyof typeof permissionLabels)[];
            const initialPerms: Omit<AdminPermissions, 'canManageAdmins'> = {};
            allPermKeys.forEach(key => {
                initialPerms[key as keyof typeof initialPerms] = !!editablePerms[key as keyof typeof editablePerms];
            });
            setPermissions(initialPerms);
        }
    }, [admin]);

    if (!isOpen || !admin) return null;

    const handlePermissionChange = (perm: keyof typeof permissions) => {
        setPermissions(prev => ({ ...prev, [perm]: !prev[perm] }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSave(admin.id, permissions);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b">
                        <h2 className="text-xl font-bold text-gray-800">Изменить доступы</h2>
                        <p className="text-sm text-gray-500 mt-1">{admin.name} {admin.surname}</p>
                    </div>
                    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        <p className="font-medium text-gray-700 mb-2">Разрешения:</p>
                        <div className="space-y-2 p-3 border rounded-md bg-gray-50">
                             {Object.entries(permissionLabels).map(([key, label]) => (
                                <label key={key} className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={permissions[key as keyof typeof permissions]}
                                        onChange={() => handlePermissionChange(key as keyof typeof permissions)}
                                        className="h-4 w-4 text-brand-primary border-gray-300 rounded focus:ring-brand-primary"
                                    />
                                    <span className="ml-3 text-sm text-gray-600">{label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className="p-6 border-t flex justify-end space-x-3">
                        <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300">Отмена</button>
                        <button type="submit" className="bg-brand-primary text-white px-4 py-2 rounded-md hover:bg-brand-secondary">Сохранить</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const EditAdminNotificationsModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (userId: string, patch: Partial<User>) => Promise<void>;
    admin: User | null;
}> = ({ isOpen, onClose, onSave, admin }) => {
    const adminSettings: { type: NotificationType; label: string, requiredPermission?: keyof AdminPermissions }[] = [
        { type: 'chatMessage', label: 'Сообщения в чате', requiredPermission: 'canAccessChat' },
        { type: 'adminMessage', label: 'Сообщения в техподдержку', requiredPermission: 'canViewMessages' },
        { type: 'announcementModeration', label: 'Объявления на модерацию', requiredPermission: 'canManageAnnouncements' },
        { type: 'passwordResetRequest', label: 'Запросы на сброс пароля', requiredPermission: 'canResetUserPasswords' },
        { type: 'newLocationRequest', label: 'Запросы на проверку локаций', requiredPermission: 'canManageUsers' },
    ];

    const [currentSettings, setCurrentSettings] = useState<Partial<Record<NotificationType, NotificationSetting>>>({});

    useEffect(() => {
        if (admin) {
            setCurrentSettings(admin.notificationSettings || {});
        }
    }, [admin]);

    if (!isOpen || !admin) return null;

    const handleToggle = (type: NotificationType, isChecked: boolean) => {
        const newValue: NotificationSetting = isChecked ? 'push' : 'badge';
        setCurrentSettings(prev => ({ ...prev, [type]: newValue }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSave(admin.id, { notificationSettings: currentSettings });
        onClose();
    };
    
    const availableSettings = adminSettings.filter(s => !s.requiredPermission || admin.permissions?.[s.requiredPermission]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b">
                        <h2 className="text-xl font-bold text-gray-800">Уведомления для администратора</h2>
                        <p className="text-sm text-gray-500 mt-1">{admin.name} {admin.surname}</p>
                    </div>
                    <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                        {availableSettings.length > 0 ? (
                            <div className="divide-y divide-gray-200">
                                {availableSettings.map(s => (
                                    <div key={s.type} className="py-3 flex items-center justify-between">
                                        <span className="text-sm font-medium text-gray-900">{s.label}</span>
                                        <label className="flex items-center space-x-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={currentSettings[s.type] === 'push'}
                                                onChange={e => handleToggle(s.type, e.target.checked)}
                                                className="h-5 w-5 text-brand-primary border-gray-300 rounded focus:ring-brand-primary"
                                            />
                                        </label>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-center text-gray-500 py-4">У этого администратора нет доступов, требующих уведомлений.</p>
                        )}
                    </div>
                    <div className="p-6 border-t flex justify-end space-x-3">
                        <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300">Отмена</button>
                        <button type="submit" className="bg-brand-primary text-white px-4 py-2 rounded-md hover:bg-brand-secondary">Сохранить</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const adminColumnsConfig = {
    registrationDate: 'Дата регистрации',
    status: 'Статус',
    lastLogin: 'Последний вход',
};

const NotificationSettings: React.FC = () => {
    const auth = useContext(AuthContext);
    const [permissionStatus, setPermissionStatus] = useState(Notification.permission);

    if (!auth || !auth.user || !auth.updateUser) return null;
    const { user, updateUser } = auth;
    const { notificationSettings = {}, permissions = {} } = user;
    
    if (user.role === UserRole.Admin && !user.permissions?.canManageAdmins) {
        return (
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Управление уведомлениями</h2>
                <div className="p-4 bg-gray-50 border-l-4 border-gray-400">
                    <p className="text-sm text-gray-800">
                        Вашими настройками push-уведомлений управляет главный администратор.
                    </p>
                </div>
            </div>
        );
    }
    
    const handleRequestPermission = async () => {
        const permission = await Notification.requestPermission();
        setPermissionStatus(permission);
        updateUser({ pushSubscriptionActive: permission === 'granted' });
    };
    
    const handleToggle = (type: NotificationType, isChecked: boolean) => {
        const newSettings = { ...notificationSettings };
        if (isChecked) {
            newSettings[type] = 'push';
        } else {
            delete newSettings[type];
        }
        updateUser({ notificationSettings: newSettings });
    };
    
    const userSettings: { type: NotificationType; label: string }[] = [
        { type: 'linkRequest', label: 'Запросы на привязку' },
        { type: 'trainingConfirmation', label: 'Подтверждение тренировок' },
        { type: 'trainingReminder', label: 'Напоминания о тренировках' },
        { type: 'chatMessage', label: 'Сообщения в чате' },
        { type: 'newAnnouncement', label: 'Новые объявления' },
        { type: 'newNews', label: 'Новые новости' },
        { type: 'newLibraryPost', label: 'Новые статьи в библиотеке' },
    ];
    
    const adminSettings: { type: NotificationType; label: string, requiredPermission?: keyof AdminPermissions }[] = [
        { type: 'chatMessage', label: 'Сообщения в чате', requiredPermission: 'canAccessChat' },
        { type: 'adminMessage', label: 'Сообщения в техподдержку', requiredPermission: 'canViewMessages' },
        { type: 'announcementModeration', label: 'Объявления на модерацию', requiredPermission: 'canManageAnnouncements' },
        { type: 'passwordResetRequest', label: 'Запросы на сброс пароля', requiredPermission: 'canResetUserPasswords' },
        { type: 'newLocationRequest', label: 'Запросы на проверку локаций', requiredPermission: 'canManageUsers' },
    ];

    let displayedUserSettings = userSettings;
    if (user.role === UserRole.Spectator) {
        const spectatorAllowed: NotificationType[] = ['chatMessage', 'newAnnouncement', 'newNews'];
        displayedUserSettings = userSettings.filter(s => spectatorAllowed.includes(s.type));
    }

    const settingsToShow = user.role === UserRole.Admin 
        ? adminSettings.filter(s => !s.requiredPermission || permissions[s.requiredPermission])
        : displayedUserSettings;

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Управление уведомлениями</h2>

            {permissionStatus !== 'granted' && (
                <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400 mb-6">
                    <p className="text-sm text-yellow-800">
                        {permissionStatus === 'denied'
                            ? 'Вы заблокировали уведомления. Чтобы включить их, измените настройки браузера для этого сайта.'
                            : 'Чтобы получать push-уведомления, разрешите их показ в вашем браузере.'}
                    </p>
                    {permissionStatus === 'default' && (
                        <button onClick={handleRequestPermission} className="mt-2 bg-brand-primary text-white px-3 py-1.5 rounded-md text-sm font-semibold hover:bg-brand-secondary transition">
                            Включить уведомления
                        </button>
                    )}
                </div>
            )}
            
            <div className="divide-y divide-gray-200">
                {settingsToShow.map(s => (
                     <div key={s.type} className="py-3 flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">{s.label}</span>
                        <label className="flex items-center space-x-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={!!notificationSettings[s.type]}
                                onChange={(e) => handleToggle(s.type, e.target.checked)}
                                className="h-5 w-5 text-brand-primary border-gray-300 rounded focus:ring-brand-primary"
                            />
                        </label>
                    </div>
                ))}
            </div>
        </div>
    );
};

const WelcomePageEditor: React.FC = () => {
    const data = useContext(DataContext);
    const [formData, setFormData] = useState<WelcomePageContent | null>(data?.welcomePageContent || null);
    const [message, setMessage] = useState('');

    useEffect(() => {
        setFormData(data?.welcomePageContent || null);
    }, [data?.welcomePageContent]);

    if (!formData || !data?.updateWelcomePageContent) {
        return <p>Загрузка редактора...</p>;
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => prev ? { ...prev, [name]: value } : null);
    };

    const handleFileUpload = (fieldName: keyof WelcomePageContent) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = e => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = readResult => {
                    setFormData(prev => prev ? { ...prev, [fieldName]: readResult.target?.result } : null);
                }
                reader.readAsDataURL(file);
            }
        };
        input.click();
    };

    const handleListChange = (e: React.ChangeEvent<HTMLTextAreaElement>, listName: 'forTrainersList' | 'forStudentsList') => {
        const { value } = e.target;
        const list = value.split('\n').filter(item => item.trim() !== '');
        setFormData(prev => prev ? { ...prev, [listName]: list } : null);
    };
    
    const handleFeatureChange = (index: number, field: 'title' | 'description', value: string) => {
        const newFeatures = [...formData.features];
        newFeatures[index] = { ...newFeatures[index], [field]: value };
        setFormData(prev => prev ? { ...prev, features: newFeatures } : null);
    };

    const handleTestimonialChange = (id: string, field: 'quote' | 'name' | 'role', value: string) => {
        const newTestimonials = formData.testimonials.map(t => 
            t.id === id ? { ...t, [field]: value } : t
        );
        setFormData(prev => prev ? { ...prev, testimonials: newTestimonials } : null);
    };

    const addTestimonial = () => {
        const newTestimonial = { id: `t-${Date.now()}`, quote: '', name: '', role: '' };
        setFormData(prev => prev ? { ...prev, testimonials: [...prev.testimonials, newTestimonial] } : null);
    };

    const removeTestimonial = (id: string) => {
        setFormData(prev => prev ? { ...prev, testimonials: prev.testimonials.filter(t => t.id !== id) } : null);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('Сохранение...');
        await data.updateWelcomePageContent(formData);
        setMessage('Сохранено успешно!');
        setTimeout(() => setMessage(''), 3000);
    };
    
    const ImageInput: React.FC<{ name: keyof WelcomePageContent, label: string, tooltipText: string }> = ({ name, label, tooltipText }) => (
        <div>
            <div className="flex items-center">
                <label className="block text-sm font-medium">{label}</label>
                <Tooltip text={tooltipText}>
                    <span className="cursor-pointer text-gray-400 hover:text-gray-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.546-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </span>
                </Tooltip>
            </div>
            <div className="flex items-center space-x-2 mt-1">
                <input type="text" name={name} value={formData[name] as string} onChange={handleChange} className="w-full p-2 border rounded" />
                <button type="button" onClick={() => handleFileUpload(name)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 text-sm whitespace-nowrap">Загрузить</button>
            </div>
        </div>
    );

    return (
        <form onSubmit={handleSave} className="space-y-8">
            <fieldset className="space-y-4 p-4 border rounded-lg">
                <legend className="text-lg font-semibold px-2">Главный экран</legend>
                <div>
                    <label className="block text-sm font-medium">Главный заголовок</label>
                    <input type="text" name="heroTitle" value={formData.heroTitle} onChange={handleChange} className="w-full mt-1 p-2 border rounded" />
                </div>
                <div>
                    <label className="block text-sm font-medium">Подзаголовок</label>
                    <textarea name="heroSubtitle" value={formData.heroSubtitle} onChange={handleChange} rows={2} className="w-full mt-1 p-2 border rounded" />
                </div>
                 <div>
                    <label className="block text-sm font-medium">Текст на кнопке</label>
                    <input type="text" name="heroButtonText" value={formData.heroButtonText} onChange={handleChange} className="w-full mt-1 p-2 border rounded" />
                </div>
                <ImageInput name="heroImageUrl" label="Фоновое изображение" tooltipText="Рекомендуемый размер: 1920x1080px. Формат: JPG, PNG. Изображение будет затемнено для читаемости текста."/>
            </fieldset>

             <fieldset className="space-y-4 p-4 border rounded-lg">
                <legend className="text-lg font-semibold px-2">Основные возможности</legend>
                <div>
                    <label className="block text-sm font-medium">Заголовок секции</label>
                    <input type="text" name="featuresTitle" value={formData.featuresTitle} onChange={handleChange} className="w-full mt-1 p-2 border rounded" />
                </div>
                <div>
                    <label className="block text-sm font-medium">Подзаголовок секции</label>
                    <textarea name="featuresSubtitle" value={formData.featuresSubtitle} onChange={handleChange} rows={2} className="w-full mt-1 p-2 border rounded" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {formData.features.map((feature, index) => (
                        <div key={index} className="p-3 border rounded-md space-y-2">
                             <div>
                                <label className="text-xs font-medium">Заголовок карточки {index + 1}</label>
                                <input type="text" value={feature.title} onChange={e => handleFeatureChange(index, 'title', e.target.value)} className="w-full mt-1 p-2 border rounded" />
                            </div>
                            <div>
                                <label className="text-xs font-medium">Описание карточки {index + 1}</label>
                                <textarea value={feature.description} onChange={e => handleFeatureChange(index, 'description', e.target.value)} rows={3} className="w-full mt-1 p-2 border rounded" />
                            </div>
                        </div>
                    ))}
                </div>
            </fieldset>

             <fieldset className="space-y-4 p-4 border rounded-lg">
                <legend className="text-lg font-semibold px-2">Секция "Для кого"</legend>
                <div>
                    <label className="block text-sm font-medium">Заголовок секции</label>
                    <input type="text" name="forWhomTitle" value={formData.forWhomTitle} onChange={handleChange} className="w-full mt-1 p-2 border rounded" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3 p-3 border rounded-md">
                        <h4 className="font-semibold">Для тренеров</h4>
                        <div><label className="text-xs font-medium">Заголовок</label><input type="text" name="forTrainersTitle" value={formData.forTrainersTitle} onChange={handleChange} className="w-full mt-1 p-2 border rounded" /></div>
                        <div><label className="text-xs font-medium">Подзаголовок</label><textarea name="forTrainersSubtitle" value={formData.forTrainersSubtitle} onChange={handleChange} rows={2} className="w-full mt-1 p-2 border rounded" /></div>
                        <div><label className="text-xs font-medium">Список (каждый с новой строки)</label><textarea value={formData.forTrainersList.join('\n')} onChange={e => handleListChange(e, 'forTrainersList')} rows={4} className="w-full mt-1 p-2 border rounded" /></div>
                        <ImageInput name="forTrainersImageUrl" label="Изображение" tooltipText="Рекомендуемый размер: 800x600px (соотношение 4:3). Формат: JPG, PNG." />
                    </div>
                     <div className="space-y-3 p-3 border rounded-md">
                        <h4 className="font-semibold">Для учеников</h4>
                        <div><label className="text-xs font-medium">Заголовок</label><input type="text" name="forStudentsTitle" value={formData.forStudentsTitle} onChange={handleChange} className="w-full mt-1 p-2 border rounded" /></div>
                        <div><label className="text-xs font-medium">Подзаголовок</label><textarea name="forStudentsSubtitle" value={formData.forStudentsSubtitle} onChange={handleChange} rows={2} className="w-full mt-1 p-2 border rounded" /></div>
                        <div><label className="text-xs font-medium">Список (каждый с новой строки)</label><textarea value={formData.forStudentsList.join('\n')} onChange={e => handleListChange(e, 'forStudentsList')} rows={4} className="w-full mt-1 p-2 border rounded" /></div>
                        <ImageInput name="forStudentsImageUrl" label="Изображение" tooltipText="Рекомендуемый размер: 800x600px (соотношение 4:3). Формат: JPG, PNG." />
                    </div>
                </div>
            </fieldset>
            
             <fieldset className="space-y-4 p-4 border rounded-lg">
                <legend className="text-lg font-semibold px-2">Фоны секций</legend>
                 <div>
                    <div className="flex items-center">
                        <label className="block text-sm font-medium">Фон секции "Для кого" (цвет или URL)</label>
                        <Tooltip text="Можно использовать цвет (например, #f9fafb) или URL изображения. Для изображений рекомендуется высокое разрешение и абстрактный фон.">
                            <span className="cursor-pointer text-gray-400 hover:text-gray-600">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.546-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </span>
                        </Tooltip>
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                        <input type="text" name="forWhomSectionBg" value={formData.forWhomSectionBg || ''} onChange={handleChange} placeholder="Например, #f9fafb или url(...)" className="w-full p-2 border rounded" />
                        <button type="button" onClick={() => handleFileUpload('forWhomSectionBg')} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 text-sm whitespace-nowrap">Загрузить</button>
                    </div>
                </div>
                 <div>
                    <div className="flex items-center">
                        <label className="block text-sm font-medium">Фон секции "Отзывы" (цвет или URL)</label>
                        <Tooltip text="Можно использовать цвет (например, #2c5282) или URL изображения. Для изображений рекомендуется высокое разрешение и абстрактный фон.">
                             <span className="cursor-pointer text-gray-400 hover:text-gray-600">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.546-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </span>
                        </Tooltip>
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                        <input type="text" name="testimonialsSectionBg" value={formData.testimonialsSectionBg || ''} onChange={handleChange} placeholder="Например, #2c5282 или url(...)" className="w-full p-2 border rounded" />
                        <button type="button" onClick={() => handleFileUpload('testimonialsSectionBg')} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 text-sm whitespace-nowrap">Загрузить</button>
                    </div>
                </div>
            </fieldset>

             <fieldset className="space-y-4 p-4 border rounded-lg">
                <legend className="text-lg font-semibold px-2">Секция "Отзывы"</legend>
                <div>
                    <label className="block text-sm font-medium">Заголовок секции</label>
                    <input type="text" name="testimonialsTitle" value={formData.testimonialsTitle} onChange={handleChange} className="w-full mt-1 p-2 border rounded" />
                </div>
                {formData.testimonials.map((testimonial) => (
                    <div key={testimonial.id} className="p-3 border rounded-md space-y-2 relative">
                         <button type="button" onClick={() => removeTestimonial(testimonial.id)} className="absolute top-2 right-2 text-red-500 hover:text-red-700 font-bold">&times;</button>
                        <div>
                            <label className="text-xs font-medium">Цитата</label>
                            <textarea value={testimonial.quote} onChange={e => handleTestimonialChange(testimonial.id, 'quote', e.target.value)} rows={3} className="w-full mt-1 p-2 border rounded" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                             <div>
                                <label className="text-xs font-medium">Имя</label>
                                <input type="text" value={testimonial.name} onChange={e => handleTestimonialChange(testimonial.id, 'name', e.target.value)} className="w-full p-2 border rounded" />
                            </div>
                            <div>
                                <label className="text-xs font-medium">Роль</label>
                                <input type="text" value={testimonial.role} onChange={e => handleTestimonialChange(testimonial.id, 'role', e.target.value)} className="w-full p-2 border rounded" />
                            </div>
                        </div>
                    </div>
                ))}
                <button type="button" onClick={addTestimonial} className="text-sm text-brand-primary hover:underline">+ Добавить отзыв</button>
            </fieldset>
            
            <fieldset className="space-y-4 p-4 border rounded-lg">
                <legend className="text-lg font-semibold px-2">Призыв к действию (CTA)</legend>
                <div>
                    <label className="block text-sm font-medium">Заголовок</label>
                    <input type="text" name="ctaTitle" value={formData.ctaTitle} onChange={handleChange} className="w-full mt-1 p-2 border rounded" />
                </div>
                <div>
                    <label className="block text-sm font-medium">Подзаголовок</label>
                    <textarea name="ctaSubtitle" value={formData.ctaSubtitle} onChange={handleChange} rows={2} className="w-full mt-1 p-2 border rounded" />
                </div>
                 <div>
                    <label className="block text-sm font-medium">Текст на кнопке</label>
                    <input type="text" name="ctaButtonText" value={formData.ctaButtonText} onChange={handleChange} className="w-full mt-1 p-2 border rounded" />
                </div>
            </fieldset>

            <div className="flex justify-end items-center space-x-4 sticky bottom-0 bg-white py-4 px-6 -mx-6 -mb-6 border-t rounded-b-lg">
                {message && <p className="text-green-600 font-semibold">{message}</p>}
                <button type="submit" className="bg-brand-primary text-white font-semibold px-6 py-2 rounded-lg shadow hover:bg-brand-secondary transition-colors">
                    Сохранить изменения
                </button>
            </div>
        </form>
    );
};

const LegalDocumentsEditor: React.FC = () => {
    const data = useContext(DataContext);
    const [terms, setTerms] = useState('');
    const [privacy, setPrivacy] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (data?.settings) {
            setTerms(data.settings.termsOfService || '');
            setPrivacy(data.settings.privacyPolicy || '');
        }
    }, [data?.settings]);

    if (!data || !data.settings) return null;

    const { updateSettings } = data;

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('Сохранение...');
        await updateSettings({ termsOfService: terms, privacyPolicy: privacy });
        setMessage('Сохранено успешно!');
        setTimeout(() => setMessage(''), 3000);
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Редактор правовых документов</h2>
            <form onSubmit={handleSave} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="terms-editor">
                        Пользовательское соглашение
                    </label>
                    <textarea
                        id="terms-editor"
                        value={terms}
                        onChange={e => setTerms(e.target.value)}
                        rows={15}
                        className="mt-1 w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-brand-secondary focus:border-brand-secondary"
                        placeholder="Введите текст пользовательского соглашения..."
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="privacy-editor">
                        Политика конфиденциальности
                    </label>
                    <textarea
                        id="privacy-editor"
                        value={privacy}
                        onChange={e => setPrivacy(e.target.value)}
                        rows={15}
                        className="mt-1 w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-brand-secondary focus:border-brand-secondary"
                        placeholder="Введите текст политики конфиденциальности..."
                    />
                </div>
                <div className="flex justify-end items-center space-x-4">
                    {message && <p className="text-green-600 font-semibold">{message}</p>}
                    <button type="submit" className="bg-brand-primary text-white font-semibold px-6 py-2 rounded-lg shadow hover:bg-brand-secondary transition-colors">
                        Сохранить
                    </button>
                </div>
            </form>
        </div>
    );
};


const AdminSettings: React.FC = () => {
    const auth = useContext(AuthContext);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordMessage, setPasswordMessage] = useState('');
    const [isAddModalOpen, setAddModalOpen] = useState(false);
    const [isDeleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [adminToDelete, setAdminToDelete] = useState<User | null>(null);
    const [visibleColumns, setVisibleColumns] = usePersistentColumns('adminSettingsColumns', adminColumnsConfig);
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [editingAdmin, setEditingAdmin] = useState<User | null>(null);
    const [adminToReset, setAdminToReset] = useState<User | null>(null);
    const [activeTab, setActiveTab] = useState('notifications');
    const [isNotificationsModalOpen, setNotificationsModalOpen] = useState(false);
    const [editingNotificationsAdmin, setEditingNotificationsAdmin] = useState<User | null>(null);

    if (!auth || !auth.user || !auth.user.permissions) {
        return <div className="bg-white p-6 rounded-lg shadow-md">Загрузка...</div>;
    }

    const { user: currentUser, users, createAdminUser, deleteUser, updateUserAndId, adminResetPassword, silentlyUpdateUserInList, updateUsers } = auth;
    
    const MAIN_ADMIN_ID = '000001';
    const BACKUP_ADMIN_ID = '000003';

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordMessage('');

        if (newPassword.length < 6) {
            setPasswordMessage('Пароль должен быть не менее 6 символов.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordMessage('Пароли не совпадают.');
            return;
        }

        // FIX: Changed from `updateUser` to `adminResetPassword` for an admin changing their own password without an old password.
        const result = await adminResetPassword(currentUser.id, newPassword);
        setPasswordMessage(result.message);
        if (result.success) {
            setNewPassword('');
            setConfirmPassword('');
            setTimeout(() => setPasswordMessage(''), 3000);
        }
    };

    // FIX: Corrected the signature to accept a password and match the updated createAdminUser function.
    const handleAddAdmin = async (details: Omit<User, 'id' | 'registrationDate' | 'linkedUsers' | 'role' | 'city' | 'passwordHash' | 'salt'> & { permissions: AdminPermissions, password: string }): Promise<{ success: boolean, message: string }> => {
        const result = await createAdminUser(details);
        if (result) {
            return { success: true, message: 'Администратор добавлен.' };
        }
        return { success: false, message: 'Пользователь с таким email уже существует.' };
    };
    
    const handleEditClick = (admin: User) => {
        setEditingAdmin(admin);
        setEditModalOpen(true);
    };

    const handleSavePermissions = async (userId: string, permissions: Omit<AdminPermissions, 'canManageAdmins'>) => {
        if (!silentlyUpdateUserInList) return;
        
        // When permissions change, we might need to update notification settings
        const admin = users.find(u => u.id === userId);
        if (!admin) return;

        const originalPerms = admin.permissions || {};
        const newPermissions = { ...originalPerms, ...permissions };

        // Ensure notification settings align with new permissions
        const newNotificationSettings = { ...(admin.notificationSettings || {}) };
        const adminNotificationMap: { type: NotificationType, permission: keyof AdminPermissions }[] = [
            { type: 'chatMessage', permission: 'canAccessChat' },
            { type: 'adminMessage', permission: 'canViewMessages' },
            { type: 'announcementModeration', permission: 'canManageAnnouncements' },
            { type: 'passwordResetRequest', permission: 'canResetUserPasswords' },
            { type: 'newLocationRequest', permission: 'canManageUsers' },
        ];
        adminNotificationMap.forEach(({ type, permission }) => {
            if (newPermissions[permission] && newNotificationSettings[type] === undefined) {
                // If a permission is granted and there's no setting, default to 'push'
                newNotificationSettings[type] = 'push';
            }
        });
        
        await silentlyUpdateUserInList(userId, { permissions: newPermissions, notificationSettings: newNotificationSettings });
    };

    const handleDeleteClick = (admin: User) => {
        setAdminToDelete(admin);
        setDeleteConfirmOpen(true);
    };
    
    const confirmDeleteAdmin = async () => {
        if (adminToDelete) {
            await deleteUser(adminToDelete.id);
            setAdminToDelete(null);
            setDeleteConfirmOpen(false);
        }
    };

    const handleEditNotificationsClick = (admin: User) => {
        setEditingNotificationsAdmin(admin);
        setNotificationsModalOpen(true);
    };
    
    const otherAdmins = users.filter(u => u.role === UserRole.Admin && u.id !== currentUser.id && !u.isDeleted && u.id !== BACKUP_ADMIN_ID);

    const ChangePasswordForm = () => (
         <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Сменить мой пароль</h2>
            <form onSubmit={handleChangePassword} className="max-w-md space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700" htmlFor="new-password">Новый пароль</label>
                    <input
                        type="password"
                        id="new-password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-brand-secondary focus:border-brand-secondary"
                    />
                </div>
                    <div>
                    <label className="block text-sm font-medium text-gray-700" htmlFor="confirm-password">Подтвердите пароль</label>
                    <input
                        type="password"
                        id="confirm-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-brand-secondary focus:border-brand-secondary"
                    />
                </div>
                {passwordMessage && <p className={`text-sm ${passwordMessage.includes('успешно') ? 'text-green-600' : 'text-red-600'}`}>{passwordMessage}</p>}
                <button type="submit" className="bg-brand-primary text-white px-4 py-2 rounded-md hover:bg-brand-secondary">Сохранить</button>
            </form>
        </div>
    );
    
    const TabButton: React.FC<{ tabId: string, label: string }> = ({ tabId, label }) => (
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
        <div className="space-y-6">
            <div className="border-b border-gray-200">
                <div className="overflow-x-auto">
                    <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                        <TabButton tabId="notifications" label="Уведомления" />
                        <TabButton tabId="password" label="Мой пароль" />
                        {currentUser.permissions?.canManageAdmins && (
                            <>
                                <TabButton tabId="admins" label="Администраторы" />
                                <TabButton tabId="locations" label="Локации" />
                                <TabButton tabId="welcome" label="Заглавная страница" />
                                <TabButton tabId="legal" label="Документы" />
                            </>
                        )}
                    </nav>
                </div>
            </div>

            <div className="mt-6">
                {activeTab === 'notifications' && <NotificationSettings />}
                {activeTab === 'password' && <ChangePasswordForm />}
                {activeTab === 'admins' && currentUser.permissions?.canManageAdmins && (
                     <div className="bg-white p-6 rounded-lg shadow-md">
                        <AddAdminModal isOpen={isAddModalOpen} onClose={() => setAddModalOpen(false)} onAdd={handleAddAdmin} />
                        <AdminSetPasswordModal isOpen={!!adminToReset} onClose={() => setAdminToReset(null)} user={adminToReset} onSave={adminResetPassword!} title="Сменить пароль для админа" />
                        <EditAdminPermissionsModal
                            isOpen={isEditModalOpen}
                            onClose={() => setEditModalOpen(false)}
                            onSave={handleSavePermissions}
                            admin={editingAdmin}
                        />
                        <EditAdminNotificationsModal
                            isOpen={isNotificationsModalOpen}
                            onClose={() => setNotificationsModalOpen(false)}
                            admin={editingNotificationsAdmin}
                            onSave={silentlyUpdateUserInList!}
                        />
                        <ConfirmationModal 
                            isOpen={isDeleteConfirmOpen}
                            onClose={() => setDeleteConfirmOpen(false)}
                            onConfirm={confirmDeleteAdmin}
                            title="Подтвердить удаление"
                            message={`Вы уверены, что хотите удалить администратора ${adminToDelete?.name} ${adminToDelete?.surname}? Это действие нельзя отменить.`}
                        />
                        <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
                            <h2 className="text-xl font-bold text-gray-800">Управление администраторами</h2>
                             <div className="flex items-center space-x-4">
                                <ColumnToggler columns={adminColumnsConfig} visibleColumns={visibleColumns} setVisibleColumns={setVisibleColumns} />
                                <button onClick={() => setAddModalOpen(true)} className="bg-brand-primary text-white font-semibold px-4 py-2 rounded-lg shadow hover:bg-brand-secondary transition-colors flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" /></svg>
                                    Добавить админа
                                </button>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Администратор</th>
                                        {visibleColumns.includes('registrationDate') && <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Дата регистрации</th>}
                                        {visibleColumns.includes('status') && <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Статус</th>}
                                        {visibleColumns.includes('lastLogin') && <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Последний вход</th>}
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {otherAdmins.map(admin => {
                                        const isMainAdmin = admin.id === MAIN_ADMIN_ID;
                                        const isBackupAdmin = admin.id === BACKUP_ADMIN_ID;
                                        const isSuperAdmin = isMainAdmin || isBackupAdmin;
                                        
                                        const canResetPassword = (currentUser.id === BACKUP_ADMIN_ID && isMainAdmin) || (!isSuperAdmin);
                                        const canDelete = !isSuperAdmin;

                                        return (
                                        <tr key={admin.id}>
                                            <td className="px-6 py-4 whitespace-nowrap"><div className="flex items-center"><div className="text-sm font-medium text-gray-900">{admin.name} {admin.surname}</div></div></td>
                                            {visibleColumns.includes('registrationDate') && <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-500">{new Date(admin.registrationDate).toLocaleDateString('ru-RU')}</div></td>}
                                            {visibleColumns.includes('status') && <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${admin.isOnline ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{admin.isOnline ? 'В сети' : 'Не в сети'}</span></td>}
                                            {visibleColumns.includes('lastLogin') && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{admin.lastLogin ? new Date(admin.lastLogin).toLocaleString('ru-RU') : 'N/A'}</td>}
                                            <td className="px-6 py-4 text-sm font-medium">
                                                <div className="flex flex-wrap gap-x-4 gap-y-2">
                                                    <button onClick={() => handleEditClick(admin)} className="text-indigo-600 hover:text-indigo-900">Доступы</button>
                                                    {canResetPassword ? (
                                                        <button onClick={() => setAdminToReset(admin)} className="text-yellow-600 hover:text-yellow-900">Пароль</button>
                                                    ) : (
                                                        <span className="text-gray-400 cursor-not-allowed" title="Недоступно">Пароль</span>
                                                    )}
                                                    <button onClick={() => handleEditNotificationsClick(admin)} className="text-green-600 hover:text-green-900">Уведомления</button>
                                                    {canDelete ? (
                                                        <button onClick={() => handleDeleteClick(admin)} className="text-red-600 hover:text-red-900">Удалить</button>
                                                    ) : (
                                                        <span className="text-gray-400 cursor-not-allowed" title="Недоступно">Удалить</span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )})}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                 {activeTab === 'locations' && currentUser.permissions?.canManageAdmins && <LocationManager users={users} updateUsers={updateUsers!} />}
                 {activeTab === 'welcome' && currentUser.permissions?.canManageAdmins && (
                     <div className="bg-white p-6 rounded-lg shadow-md">
                         <h2 className="text-xl font-bold text-gray-800 mb-4">Редактор заглавной страницы</h2>
                         <WelcomePageEditor />
                     </div>
                 )}
                 {activeTab === 'legal' && currentUser.permissions?.canManageAdmins && <LegalDocumentsEditor />}
            </div>
        </div>
    );
};

// FIX: Changed to a named export to resolve a possible circular dependency issue.
export const SettingsPage: React.FC = () => {
    const auth = useContext(AuthContext);
    const [password, setPassword] = useState({ old: '', new: '', confirm: '' });
    const [message, setMessage] = useState('');
    const [isConfirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

    if (!auth || !auth.user) return null;
    const { user, changePassword, deleteCurrentUser } = auth;

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('');

        if (password.new.length < 6) {
            setMessage('Новый пароль должен быть не менее 6 символов.');
            return;
        }
        if (password.new !== password.confirm) {
            setMessage('Новые пароли не совпадают.');
            return;
        }

        const result = await changePassword(password.old, password.new);
        setMessage(result.message);
        if (result.success) {
            setPassword({ old: '', new: '', confirm: '' });
        }
    };

    const handleDeleteAccount = async () => {
        if (deleteCurrentUser) {
            await deleteCurrentUser();
        }
        setConfirmDeleteOpen(false);
    };

    if (user.role === UserRole.Admin) {
        return <AdminSettings />;
    }

    return (
        <div className="space-y-6">
            <ConfirmationModal
                isOpen={isConfirmDeleteOpen}
                onClose={() => setConfirmDeleteOpen(false)}
                onConfirm={handleDeleteAccount}
                title="Подтвердить удаление аккаунта"
                message="Вы уверены, что хотите навсегда удалить свой аккаунт? Все ваши данные будут утеряны."
                confirmText="Да, удалить аккаунт"
            />
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Сменить пароль</h2>
                <form onSubmit={handlePasswordChange} className="max-w-md space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700" htmlFor="old-password">Старый пароль</label>
                        <input type="password" id="old-password" value={password.old} onChange={(e) => setPassword(p => ({ ...p, old: e.target.value }))} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700" htmlFor="new-password-user">Новый пароль</label>
                        <input type="password" id="new-password-user" value={password.new} onChange={(e) => setPassword(p => ({ ...p, new: e.target.value }))} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700" htmlFor="confirm-password-user">Подтвердите новый пароль</label>
                        <input type="password" id="confirm-password-user" value={password.confirm} onChange={(e) => setPassword(p => ({ ...p, confirm: e.target.value }))} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                    </div>
                    {message && <p className={`text-sm ${message.includes('успешно') ? 'text-green-600' : 'text-red-600'}`}>{message}</p>}
                    <button type="submit" className="bg-brand-primary text-white px-4 py-2 rounded-md hover:bg-brand-secondary">Сохранить</button>
                </form>
            </div>
            <NotificationSettings />

            <div className="bg-red-50 p-6 rounded-lg shadow-md border border-red-200">
                <h2 className="text-xl font-bold text-red-800 mb-4">Удаление аккаунта</h2>
                <div className="space-y-3 text-sm text-red-700">
                    <p>
                        <strong>Внимание:</strong> Это действие необратимо. При удалении аккаунта все ваши данные, включая историю тренировок, чаты и статистику, будут безвозвратно удалены.
                    </p>
                    <p>
                        Также обращаем ваше внимание, что аккаунты, неактивные более 6 месяцев (без единого входа в приложение), подлежат автоматическому удалению.
                    </p>
                </div>
                <div className="mt-6">
                    <button 
                        onClick={() => setConfirmDeleteOpen(true)}
                        className="bg-brand-danger text-white font-semibold px-4 py-2 rounded-lg shadow hover:bg-red-700 transition-colors"
                    >
                        Удалить мой аккаунт
                    </button>
                </div>
            </div>
        </div>
    );
};