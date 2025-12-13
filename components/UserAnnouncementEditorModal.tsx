import React, { useState, useEffect, useMemo } from 'react';
import { PostImage, User, UserRole, LOCATION_DATA } from '../types';

interface UserAnnouncementEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
    locations: Record<string, Record<string, string[]>>;
}

const UserAnnouncementEditorModal: React.FC<UserAnnouncementEditorModalProps> = ({ isOpen, onClose, onSave, locations }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [images, setImages] = useState<PostImage[]>([]);
    const [publishDate, setPublishDate] = useState('');
    const [publishTime, setPublishTime] = useState('');
    const [targetRoles, setTargetRoles] = useState<UserRole[]>([]);
    const [targetCountries, setTargetCountries] = useState<string[]>([]);
    const [targetRegions, setTargetRegions] = useState<string[]>([]);
    const [targetCities, setTargetCities] = useState<string[]>([]);
    const [selectAllLocations, setSelectAllLocations] = useState(false);
    const [locationSearch, setLocationSearch] = useState('');

    const [titleError, setTitleError] = useState('');
    const [contentError, setContentError] = useState('');
    const [dateError, setDateError] = useState('');
    const [rolesError, setRolesError] = useState('');
    const [locationError, setLocationError] = useState('');
    const [imageError, setImageError] = useState('');

    // Flat locations list for autocomplete
    const flatLocations = useMemo(() => {
        const locs = (locations && Object.keys(locations).length > 0) ? locations : LOCATION_DATA;
        return Object.entries(locs).flatMap(([country, regions]) => 
            Object.entries(regions || {}).flatMap(([region, cities]) => 
                (cities || []).map(city => ({ city, region, country }))
            )
        );
    }, [locations]);

    // Autocomplete suggestions
    const locationSuggestions = useMemo(() => {
        if (!locationSearch.trim()) return [];
        const search = locationSearch.toLowerCase().trim();
        return flatLocations.filter(loc => 
            loc.city.toLowerCase().includes(search) ||
            loc.region.toLowerCase().includes(search) ||
            loc.country.toLowerCase().includes(search)
        ).slice(0, 10);
    }, [locationSearch, flatLocations]);

    const filteredLocations = useMemo(() => {
        const locs = (locations && Object.keys(locations).length > 0) ? locations : LOCATION_DATA;
        const normalizedSearch = locationSearch.toLowerCase().trim();
        if (!normalizedSearch) {
            return locs;
        }
    
        const result: Record<string, Record<string, string[]>> = {};
    
        for (const country in locs) {
            if (country.toLowerCase().includes(normalizedSearch)) {
                result[country] = locs[country];
                continue;
            }
    
            const matchingRegions: Record<string, string[]> = {};
            let countryHasMatch = false;
    
            for (const region in locs[country] || {}) {
                if (region.toLowerCase().includes(normalizedSearch)) {
                    matchingRegions[region] = locs[country][region];
                    countryHasMatch = true;
                    continue;
                }
    
                const matchingCities = (locs[country][region] || []).filter(city =>
                    city.toLowerCase().includes(normalizedSearch)
                );
    
                if (matchingCities.length > 0) {
                    matchingRegions[region] = matchingCities;
                    countryHasMatch = true;
                }
            }
    
            if (countryHasMatch) {
                result[country] = matchingRegions;
            }
        }
        return result;
    }, [locations, locationSearch]);

    const getMinDate = () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
    };

    const resetState = () => {
        setTitle('');
        setContent('');
        setImages([]);
        setPublishDate(getMinDate());
        setPublishTime('12:00');
        setTitleError('');
        setContentError('');
        setDateError('');
        setRolesError('');
        setLocationError('');
        setImageError('');
        setTargetRoles([]);
        setTargetCountries([]);
        setTargetRegions([]);
        setTargetCities([]);
        setSelectAllLocations(false);
        setLocationSearch('');
    };
    
    useEffect(() => {
        if (isOpen) {
            resetState();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const validate = (): boolean => {
        let isValid = true;
        setTitleError('');
        setContentError('');
        setDateError('');
        setRolesError('');
        setLocationError('');
        
        if (title.length > 100) {
            setTitleError('Заголовок не может быть длиннее 100 символов.');
            isValid = false;
        }
        if (content.length > 1000) {
            setContentError('Содержание не может быть длиннее 1000 символов.');
            isValid = false;
        }

        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);
        tomorrow.setHours(0,0,0,0);
        
        const selectedDateTime = new Date(`${publishDate}T${publishTime}`);

        if (!publishDate || !publishTime || selectedDateTime < tomorrow) {
            setDateError('Дата публикации должна быть не раньше, чем через 24 часа от текущего момента.');
            isValid = false;
        }

        if (targetRoles.length === 0) {
            setRolesError('Пожалуйста, выберите хотя бы одну роль.');
            isValid = false;
        }

        if (!selectAllLocations && targetCountries.length === 0 && targetRegions.length === 0 && targetCities.length === 0) {
            setLocationError('Пожалуйста, выберите хотя бы одну локацию или отметьте "Для всех".');
            isValid = false;
        }

        return isValid;
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        const finalData = {
            title,
            content,
            images: images.map(img => ({ ...img, position: 'afterContent' })),
            publishTimestamp: new Date(`${publishDate}T${publishTime}`).toISOString(),
            targetRoles: targetRoles.length > 0 ? targetRoles : undefined,
            targetCountries: selectAllLocations ? undefined : (targetCountries.length > 0 ? targetCountries : undefined),
            targetRegions: selectAllLocations ? undefined : (targetRegions.length > 0 ? targetRegions : undefined),
            targetCities: selectAllLocations ? undefined : (targetCities.length > 0 ? targetCities : undefined),
        };
        await onSave(finalData);
        onClose();
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        setImageError('');
        if (e.target.files && images.length < 3) {
            const file = e.target.files[0];

            if (file.size > 10 * 1024 * 1024) { // 10 MB limit
                setImageError('Размер файла не должен превышать 10 МБ.');
                e.target.value = ''; // Clear the input
                setTimeout(() => setImageError(''), 5000);
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                const newImage: PostImage = {
                    id: `img-${Date.now()}`,
                    url: reader.result as string,
                    position: 'afterContent',
                };
                setImages(prev => [...prev, newImage]);
            };
            reader.readAsDataURL(file);
            e.target.value = ''; // Clear to allow re-uploading the same file name
        }
    };
    
    const removeImage = (id: string) => setImages(prev => prev.filter(img => img.id !== id));
    
    const handleRoleChange = (role: UserRole, isChecked: boolean) => setTargetRoles(prev => isChecked ? [...prev, role] : prev.filter(r => r !== role));
    
    const handleLocationSuggestionClick = (location: { city: string, region: string, country: string }) => {
        setLocationSearch('');
        setShowLocationSuggestions(false);
        // Disable "select all locations" when manually selecting
        setSelectAllLocations(false);
        // Automatically select the location
        handleLocationChange('city', location.city, true, { country: location.country, region: location.region });
    };

    const handleLocationChange = (type: 'country' | 'region' | 'city', value: string, isChecked: boolean, context?: { country?: string; region?: string }) => {
        // Disable "select all locations" when manually selecting
        if (isChecked) {
            setSelectAllLocations(false);
        }
        
        // Use locations from props or fallback to LOCATION_DATA
        const locs = (locations && Object.keys(locations).length > 0) ? locations : LOCATION_DATA;
        
        let nextCountries = new Set(targetCountries);
        let nextRegions = new Set(targetRegions);
        let nextCities = new Set(targetCities);
    
        if (type === 'country') {
            const regionsInCountry = Object.keys(locs[value] || {});
            const citiesInCountry = regionsInCountry.flatMap(region => locs[value][region] || []);
            if (isChecked) {
                nextCountries.add(value);
                regionsInCountry.forEach(region => nextRegions.add(region));
                citiesInCountry.forEach(city => nextCities.add(city));
            } else {
                nextCountries.delete(value);
                regionsInCountry.forEach(region => nextRegions.delete(region));
                citiesInCountry.forEach(city => nextCities.delete(city));
            }
        } else if (type === 'region') {
            const country = context?.country;
            if (!country) return;
            const citiesInRegion = locs[country]?.[value] || [];
    
            if (isChecked) {
                nextRegions.add(value);
                citiesInRegion.forEach(city => nextCities.add(city));
            } else {
                nextRegions.delete(value);
                citiesInRegion.forEach(city => nextCities.delete(city));
            }
    
            const allRegionsInCountry = Object.keys(locs[country] || {});
            if (allRegionsInCountry.every(r => nextRegions.has(r))) {
                nextCountries.add(country);
            } else {
                nextCountries.delete(country);
            }
    
        } else if (type === 'city') {
            const region = context?.region;
            const country = context?.country;
            if (!region || !country) {
                console.error('Missing region or country context for city selection:', { region, country, city: value });
                return;
            }
    
            // Ensure the location exists in the locations data
            if (!locs[country] || !locs[country][region] || !locs[country][region].includes(value)) {
                console.error('City not found in locations data:', { country, region, city: value, availableCountries: Object.keys(locs), availableRegions: locs[country] ? Object.keys(locs[country]) : [] });
                return;
            }
    
            if (isChecked) {
                nextCities.add(value);
            } else {
                nextCities.delete(value);
            }
            
            const allCitiesInRegion = locs[country][region] || [];
            if (allCitiesInRegion.every(c => nextCities.has(c))) {
                nextRegions.add(region);
            } else {
                nextRegions.delete(region);
            }
    
            const allRegionsInCountry = Object.keys(locs[country] || {});
            if (allRegionsInCountry.every(r => nextRegions.has(r))) {
                nextCountries.add(country);
            } else {
                nextCountries.delete(country);
            }
        }
    
        setTargetCountries(Array.from(nextCountries));
        setTargetRegions(Array.from(nextRegions));
        setTargetCities(Array.from(nextCities));
    };
    const handleSelectAllLocations = (isChecked: boolean) => {
        setSelectAllLocations(isChecked);
        if (isChecked) {
            setTargetCountries([]);
            setTargetRegions([]);
            setTargetCities([]);
        }
    };

    const handleRemoveRegion = (regionToRemove: string) => {
        const locs = (locations && Object.keys(locations).length > 0) ? locations : LOCATION_DATA;
        const parentCountry = Object.keys(locs).find(c => locs[c] && locs[c][regionToRemove]);
        if (parentCountry) {
            handleLocationChange('region', regionToRemove, false, { country: parentCountry });
        }
    };

    const handleRemoveCity = (cityToRemove: string) => {
        const locs = (locations && Object.keys(locations).length > 0) ? locations : LOCATION_DATA;
        for (const country of Object.keys(locs)) {
            for (const region of Object.keys(locs[country] || {})) {
                if (locs[country][region].includes(cityToRemove)) {
                    handleLocationChange('city', cityToRemove, false, { country, region });
                    return; // Found and handled
                }
            }
        }
    };

    const renderSelectedLocations = () => {
        const locs = (locations && Object.keys(locations).length > 0) ? locations : LOCATION_DATA;
        const displayableRegions = targetRegions.filter(region => {
            const parentCountry = Object.keys(locs).find(c => locs[c] && Object.keys(locs[c]).includes(region));
            return !parentCountry || !targetCountries.includes(parentCountry);
        });
    
        const displayableCities = targetCities.filter(city => {
            let parentRegionName: string | undefined;
            for (const country in locs) {
                const region = Object.keys(locs[country] || {}).find(r => locs[country][r].includes(city));
                if (region) {
                    parentRegionName = region;
                    break;
                }
            }
            return !parentRegionName || !targetRegions.includes(parentRegionName);
        });
    
        if (targetCountries.length === 0 && displayableRegions.length === 0 && displayableCities.length === 0) {
            return <p className="text-sm text-gray-500">Ничего не выбрано</p>;
        }
    
        return (
            <div className="flex flex-wrap gap-2">
                {targetCountries.map(name => (
                     <span key={`country-${name}`} className={`flex items-center bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full`}>
                        {name}
                        <button type="button" onClick={() => handleLocationChange('country', name, false)} className={`ml-1.5 -mr-1 p-0.5 rounded-full hover:bg-blue-200 focus:outline-none`}>&times;</button>
                    </span>
                ))}
                {displayableRegions.map(name => (
                     <span key={`region-${name}`} className={`flex items-center bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded-full`}>
                        {name}
                        <button type="button" onClick={() => handleRemoveRegion(name)} className={`ml-1.5 -mr-1 p-0.5 rounded-full hover:bg-green-200 focus:outline-none`}>&times;</button>
                    </span>
                ))}
                {displayableCities.map(name => (
                     <span key={`city-${name}`} className={`flex items-center bg-gray-200 text-gray-800 text-xs font-semibold px-2.5 py-0.5 rounded-full`}>
                        {name}
                        <button type="button" onClick={() => handleRemoveCity(name)} className={`ml-1.5 -mr-1 p-0.5 rounded-full hover:bg-gray-300 focus:outline-none`}>&times;</button>
                    </span>
                ))}
            </div>
        );
    };


    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b"><h2 className="text-2xl font-bold text-gray-800">Подать объявление</h2></div>
                    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        <div>
                            <label htmlFor="title" className="flex justify-between text-sm font-medium text-gray-700">
                                <span>Заголовок</span>
                                <span className={title.length > 100 ? 'text-red-500' : 'text-gray-400'}>{title.length}/100</span>
                            </label>
                            <input type="text" name="title" id="title" required value={title} onChange={e => setTitle(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-brand-secondary focus:border-brand-secondary" />
                            {titleError && <p className="text-sm text-red-500 mt-1">{titleError}</p>}
                        </div>
                        <div>
                            <label htmlFor="content" className="flex justify-between text-sm font-medium text-gray-700">
                                <span>Содержание</span>
                                <span className={content.length > 1000 ? 'text-red-500' : 'text-gray-400'}>{content.length}/1000</span>
                            </label>
                            <textarea name="content" id="content" required rows={8} value={content} onChange={e => setContent(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-brand-secondary focus:border-brand-secondary"></textarea>
                            {contentError && <p className="text-sm text-red-500 mt-1">{contentError}</p>}
                        </div>
                        
                        <div className="p-3 border rounded-md space-y-2">
                            <p className="block text-sm font-medium text-gray-700">Для кого <span className="text-red-500">*</span></p>
                            <div className="flex space-x-4">
                                <label className="flex items-center"><input type="checkbox" checked={targetRoles.includes(UserRole.Student)} onChange={e => handleRoleChange(UserRole.Student, e.target.checked)} className="h-4 w-4 text-brand-primary border-gray-300 rounded" /> <span className="ml-2 text-gray-700 text-sm">{UserRole.Student}</span></label>
                                <label className="flex items-center"><input type="checkbox" checked={targetRoles.includes(UserRole.Trainer)} onChange={e => handleRoleChange(UserRole.Trainer, e.target.checked)} className="h-4 w-4 text-brand-primary border-gray-300 rounded" /> <span className="ml-2 text-gray-700 text-sm">{UserRole.Trainer}</span></label>
                                <label className="flex items-center"><input type="checkbox" checked={targetRoles.includes(UserRole.Spectator)} onChange={e => handleRoleChange(UserRole.Spectator, e.target.checked)} className="h-4 w-4 text-brand-primary border-gray-300 rounded" /> <span className="ml-2 text-gray-700 text-sm">{UserRole.Spectator}</span></label>
                            </div>
                            {rolesError && <p className="text-sm text-red-500 mt-1">{rolesError}</p>}
                        </div>

                        <div className="p-3 border rounded-md">
                            <div className="flex justify-between items-center pb-2 mb-2">
                                <p className="block text-sm font-medium text-gray-700">Локация <span className="text-red-500">*</span></p>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Введите город для автодополнения..."
                                        value={locationSearch}
                                        onChange={e => {
                                            setLocationSearch(e.target.value);
                                            setShowLocationSuggestions(true);
                                        }}
                                        onFocus={() => setShowLocationSuggestions(true)}
                                        onBlur={() => setTimeout(() => setShowLocationSuggestions(false), 200)}
                                        className="w-64 px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-brand-secondary focus:border-brand-secondary"
                                        onClick={e => e.stopPropagation()}
                                    />
                                    {showLocationSuggestions && locationSearch.trim() && (
                                        <ul className="absolute z-50 w-full bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto mt-1 top-full left-0">
                                            {locationSuggestions.length > 0 ? (
                                                locationSuggestions.map((loc, i) => (
                                                    <li 
                                                        key={`${loc.city}-${i}`} 
                                                        onMouseDown={(e) => {
                                                            e.preventDefault();
                                                            handleLocationSuggestionClick(loc);
                                                        }}
                                                        className="cursor-pointer p-2 hover:bg-gray-100 text-sm"
                                                    >
                                                        {loc.city}, {loc.region}, {loc.country}
                                                    </li>
                                                ))
                                            ) : (
                                                <li className="p-2 text-sm text-gray-500">Ничего не найдено</li>
                                            )}
                                        </ul>
                                    )}
                                </div>
                            </div>
                            <div className="mt-2">
                                <label className="flex items-center pb-2 border-b mb-2"><input type="checkbox" checked={selectAllLocations} onChange={e => handleSelectAllLocations(e.target.checked)} className="h-4 w-4 text-brand-primary border-gray-300 rounded" /> <span className="ml-2 font-semibold text-gray-700 text-sm">Для всех</span></label>
                                {!selectAllLocations && (
                                    <>
                                        <div className="max-h-48 overflow-y-auto text-sm space-y-1 mt-2">
                                            {Object.entries(filteredLocations).map(([country, regionsData]) => {
                                                const locs = (locations && Object.keys(locations).length > 0) ? locations : LOCATION_DATA;
                                                const regionsInCountry = Object.keys(regionsData || {});
                                                const citiesInCountry = regionsInCountry.flatMap(region => locs[country]?.[region] || []);
                                                const checkedCitiesInCountry = citiesInCountry.filter(c => targetCities.includes(c));
                                                const checkedRegionsInCountry = regionsInCountry.filter(r => targetRegions.includes(r));
                                                const countryIsIndeterminate = !targetCountries.includes(country) && (checkedRegionsInCountry.length > 0 || checkedCitiesInCountry.length > 0);

                                                return (
                                                    <details key={country} open={!!locationSearch.trim()} className="space-y-1">
                                                        <summary className="cursor-pointer">
                                                            <label className="inline-flex items-center" onClick={e => e.stopPropagation()}>
                                                                <input type="checkbox"
                                                                    ref={el => { if (el) { el.indeterminate = countryIsIndeterminate; } }}
                                                                    checked={targetCountries.includes(country)}
                                                                    onChange={e => handleLocationChange('country', country, e.target.checked)} className="h-4 w-4" />
                                                                <span className="ml-2 font-semibold">{country}</span>
                                                            </label>
                                                        </summary>
                                                        <div className="pl-5 space-y-1">
                                                            {Object.entries(regionsData).map(([region, cities]) => {
                                                                const citiesInRegion = cities || [];
                                                                const checkedCitiesInRegion = citiesInRegion.filter(c => targetCities.includes(c));
                                                                const regionIsIndeterminate = !targetRegions.includes(region) && checkedCitiesInRegion.length > 0;

                                                                return (
                                                                <details key={region} open={!!locationSearch.trim()}>
                                                                    <summary className="cursor-pointer">
                                                                        <label className="inline-flex items-center" onClick={e => e.stopPropagation()}>
                                                                            <input type="checkbox"
                                                                                ref={el => { if (el) { el.indeterminate = regionIsIndeterminate; } }}
                                                                                checked={targetRegions.includes(region)}
                                                                                onChange={e => handleLocationChange('region', region, e.target.checked, { country })} className="h-4 w-4" />
                                                                            <span className="ml-2">{region}</span>
                                                                        </label>
                                                                    </summary>
                                                                    <div className="pl-5">
                                                                        {cities.map(city => (
                                                                            <div key={city}>
                                                                                <label className="inline-flex items-center">
                                                                                    <input type="checkbox"
                                                                                        checked={targetCities.includes(city)}
                                                                                        onChange={e => handleLocationChange('city', city, e.target.checked, { country, region })} className="h-4 w-4" />
                                                                                    <span className="ml-2">{city}</span>
                                                                                </label>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </details>
                                                                )
                                                            })}
                                                        </div>
                                                    </details>
                                                )
                                            })}
                                        </div>
                                        <div className="mt-4 p-3 border-t">
                                            <h4 className="text-sm font-semibold text-gray-800 mb-2">Выбранные локации:</h4>
                                            {renderSelectedLocations()}
                                        </div>
                                    </>
                                )}
                                {locationError && <p className="text-sm text-red-500 mt-2">{locationError}</p>}
                            </div>
                        </div>

                        <div className="p-3 border rounded-md space-y-3">
                             <p className="block text-sm font-medium text-gray-700">Изображения (до 3, будут показаны после текста)</p>
                             {images.map(img => (
                                 <div key={img.id} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                                     <img src={img.url} alt="preview" className="w-16 h-16 object-cover rounded"/>
                                     <p className="text-sm text-gray-500 flex-grow">Изображение загружено</p>
                                     <button type="button" onClick={() => removeImage(img.id)} className="p-2 text-red-500 hover:text-red-700 font-bold text-xl">&times;</button>
                                 </div>
                             ))}
                             {images.length < 3 && <input type="file" accept="image/*" onChange={handleImageUpload} className="text-sm w-full"/>}
                             {imageError && <p className="text-sm text-red-500 mt-1">{imageError}</p>}
                        </div>
                        
                        <div className="p-3 border rounded-md space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Дата и время публикации (не ранее чем через сутки)</label>
                            <div className="grid grid-cols-2 gap-2">
                                <input type="date" value={publishDate} onChange={e => setPublishDate(e.target.value)} min={getMinDate()} required className="w-full px-2 py-1 border border-gray-300 rounded-md" />
                                <input type="time" value={publishTime} onChange={e => setPublishTime(e.target.value)} required className="w-full px-2 py-1 border border-gray-300 rounded-md" />
                            </div>
                             {dateError && <p className="text-sm text-red-500 mt-1">{dateError}</p>}
                        </div>
                    </div>
                    <div className="p-6 border-t flex justify-end space-x-3">
                        <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300">Отмена</button>
                        <button type="submit" className="bg-brand-primary text-white px-4 py-2 rounded-md hover:bg-brand-secondary">Отправить на модерацию</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UserAnnouncementEditorModal;