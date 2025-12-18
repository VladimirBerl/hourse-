import React, { useState, useEffect, useMemo } from 'react';
import { UserRole, Announcement, NewsItem, LibraryPost, User, PostImage, Poll, PollOption, Quiz, QuizOption, SubscriptionTier, LOCATION_DATA } from '../types';

interface PublicationEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
    editingItem: Announcement | NewsItem | LibraryPost | null;
    itemType: 'announcement' | 'news' | 'library';
    allUsers: User[];
    locations: Record<string, Record<string, string[]>>;
    defaultAutoDeleteOption?: string;
}

const PublicationEditorModal: React.FC<PublicationEditorModalProps> = ({ isOpen, onClose, onSave, editingItem, itemType, allUsers, locations, defaultAutoDeleteOption }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [targetRoles, setTargetRoles] = useState<UserRole[]>([]);
    const [isScheduled, setIsScheduled] = useState(false);
    const [publishDate, setPublishDate] = useState('');
    const [publishTime, setPublishTime] = useState('');
    const [isPinned, setIsPinned] = useState(false);
    
    const [targetCountries, setTargetCountries] = useState<string[]>([]);
    const [targetRegions, setTargetRegions] = useState<string[]>([]);
    const [targetCities, setTargetCities] = useState<string[]>([]);
    const [selectAllLocations, setSelectAllLocations] = useState(true);
    const [locationSearch, setLocationSearch] = useState('');
    const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
    const [targetMaximumOnly, setTargetMaximumOnly] = useState(false);

    // Auto-delete state
    const [autoDeleteOption, setAutoDeleteOption] = useState('none');
    const [manualDeleteDate, setManualDeleteDate] = useState('');
    const [manualDeleteTime, setManualDeleteTime] = useState('');

    // Images state
    const [images, setImages] = useState<PostImage[]>([]);

    // Poll state
    const [hasPoll, setHasPoll] = useState(false);
    const [pollOptions, setPollOptions] = useState<PollOption[]>([{ id: `opt-${Date.now()}`, text: '' }]);
    const [allowMultipleVotes, setAllowMultipleVotes] = useState(false);
    const [pollEnds, setPollEnds] = useState(false);
    const [pollEndDate, setPollEndDate] = useState('');
    const [pollEndTime, setPollEndTime] = useState('');
    const [isHiddenPoll, setIsHiddenPoll] = useState(false);

    // Quiz state
    const [hasQuiz, setHasQuiz] = useState(false);
    const [quizOptions, setQuizOptions] = useState<QuizOption[]>([{ id: `q-opt-${Date.now()}`, text: '' }]);
    const [correctOptionIds, setCorrectOptionIds] = useState<string[]>([]);
    const [allowMultipleAnswers, setAllowMultipleAnswers] = useState(false);

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

    const resetState = () => {
        setTitle('');
        setContent('');
        setTargetRoles([]);
        setIsScheduled(false);
        setPublishDate('');
        setPublishTime('');
        setImages([]);
        setIsPinned(false);
        setTargetCountries([]);
        setTargetRegions([]);
        setTargetCities([]);
        setSelectAllLocations(true);
        setLocationSearch('');
        setTargetMaximumOnly(false);
        setAutoDeleteOption(defaultAutoDeleteOption || 'none');
        setManualDeleteDate('');
        setManualDeleteTime('');
        // Poll reset
        setHasPoll(false);
        setPollOptions([{ id: `opt-${Date.now()}`, text: '' }]);
        setAllowMultipleVotes(false);
        setPollEnds(false);
        setPollEndDate('');
        setPollEndTime('');
        setIsHiddenPoll(false);
        // Quiz reset
        setHasQuiz(false);
        setQuizOptions([{ id: `q-opt-${Date.now()}`, text: '' }]);
        setCorrectOptionIds([]);
        setAllowMultipleAnswers(false);
    };

    useEffect(() => {
        if (isOpen) {
            if (editingItem) {
                setTitle(editingItem.title);
                setContent(editingItem.content);
                setTargetRoles(editingItem.targetRoles || []);
                setIsPinned(!!editingItem.isPinned);
                setTargetMaximumOnly(!!editingItem.targetSubscriptionTiers?.includes(SubscriptionTier.Maximum));

                const hasLocationTarget = (editingItem.targetCountries && editingItem.targetCountries.length > 0) ||
                                          (editingItem.targetRegions && editingItem.targetRegions.length > 0) ||
                                          (editingItem.targetCities && editingItem.targetCities.length > 0);
                setSelectAllLocations(!hasLocationTarget);
                setTargetCountries(editingItem.targetCountries || []);
                setTargetRegions(editingItem.targetRegions || []);
                setTargetCities(editingItem.targetCities || []);
                
                if (editingItem.publishTimestamp) {
                    const d = new Date(editingItem.publishTimestamp);
                    setIsScheduled(true);
                    setPublishDate(d.toISOString().split('T')[0]);
                    setPublishTime(d.toTimeString().substring(0, 5));
                } else {
                    setIsScheduled(false);
                    setPublishDate('');
                    setPublishTime('');
                }

                if (editingItem.deletionTimestamp) {
                    const deletionD = new Date(editingItem.deletionTimestamp);
                    const baseD = new Date(editingItem.publishTimestamp || editingItem.timestamp);
                    
                    const diffTime = deletionD.getTime() - baseD.getTime();
                    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                    
                    let matchedOption = 'manual';
                    if (diffDays === 7) matchedOption = '1w';
                    else if (diffDays === 14) matchedOption = '2w';
                    else if (diffDays === 21) matchedOption = '3w';
                    else if (diffDays === 28) matchedOption = '4w';

                    setAutoDeleteOption(matchedOption);
                    
                    setManualDeleteDate(deletionD.toISOString().split('T')[0]);
                    setManualDeleteTime(deletionD.toTimeString().substring(0, 5));
                    
                } else {
                    setAutoDeleteOption('none');
                    setManualDeleteDate('');
                    setManualDeleteTime('');
                }

                setImages(editingItem.images || []);
                // Poll state
                setHasPoll(!!editingItem.poll);
                setPollOptions(editingItem.poll?.options || [{ id: `opt-${Date.now()}`, text: '' }]);
                setAllowMultipleVotes(editingItem.poll?.allowMultipleVotes || false);
                setIsHiddenPoll(editingItem.poll?.isHidden || false);
                if (editingItem.poll?.pollEndsAt) {
                    const d = new Date(editingItem.poll.pollEndsAt);
                    setPollEnds(true);
                    setPollEndDate(d.toISOString().split('T')[0]);
                    setPollEndTime(d.toTimeString().substring(0, 5));
                } else {
                    setPollEnds(false); setPollEndDate(''); setPollEndTime('');
                }
                
                // Quiz state
                setHasQuiz(!!editingItem.quiz);
                setQuizOptions(editingItem.quiz?.options || [{ id: `q-opt-${Date.now()}`, text: '' }]);
                setCorrectOptionIds(editingItem.quiz?.correctOptionIds || []);
                setAllowMultipleAnswers(editingItem.quiz?.allowMultipleAnswers || false);

            } else {
                resetState();
            }
        }
    }, [isOpen, editingItem, defaultAutoDeleteOption]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        let publishTimestamp: string | undefined = undefined;
        if (isScheduled) {
            if (!publishDate || !publishTime) {
                alert('Пожалуйста, укажите полную дату и время для отложенной публикации.');
                return;
            }
            publishTimestamp = new Date(`${publishDate}T${publishTime}`).toISOString();
        }

        let deletionTimestamp: string | undefined = undefined;
        if (autoDeleteOption !== 'none') {
            if (autoDeleteOption === 'manual') {
                if (!manualDeleteDate || !manualDeleteTime) {
                    alert('Пожалуйста, укажите полную дату и время для ручного удаления.');
                    return;
                }
                deletionTimestamp = new Date(`${manualDeleteDate}T${manualDeleteTime}`).toISOString();
            } else {
                const baseDate = publishTimestamp ? new Date(publishTimestamp) : new Date();
                const deletionDate = new Date(baseDate);
                switch (autoDeleteOption) {
                    case '1w': deletionDate.setDate(deletionDate.getDate() + 7); break;
                    case '2w': deletionDate.setDate(deletionDate.getDate() + 14); break;
                    case '3w': deletionDate.setDate(deletionDate.getDate() + 21); break;
                    case '4w': deletionDate.setDate(deletionDate.getDate() + 28); break;
                }
                deletionTimestamp = deletionDate.toISOString();
            }
        }

        let poll: Poll | undefined = undefined;
        if (hasPoll) {
            const validOptions = pollOptions.filter(opt => opt.text.trim() !== '');
            if (validOptions.length < 2) {
                alert('Опрос должен содержать как минимум 2 варианта ответа.');
                return;
            }

            let pollEndsAt: string | undefined = undefined;
            if (pollEnds) {
                if (!pollEndDate || !pollEndTime) {
                    alert('Пожалуйста, укажите полную дату и время для окончания опроса.');
                    return;
                }
                pollEndsAt = new Date(`${pollEndDate}T${pollEndTime}`).toISOString();
            }

            poll = {
                id: editingItem?.poll?.id || `poll-${Date.now()}`,
                allowMultipleVotes,
                isHidden: isHiddenPoll,
                options: validOptions,
                votes: editingItem?.poll?.votes || [],
                pollEndsAt,
            };
        }
        
        let quiz: Quiz | undefined = undefined;
        if (hasQuiz) {
            const validOptions = quizOptions.filter(opt => opt.text.trim() !== '');
            if (validOptions.length < 2) {
                alert('Викторина должна содержать как минимум 2 варианта ответа.');
                return;
            }
            if (correctOptionIds.length === 0) {
                 alert('Пожалуйста, отметьте хотя бы один правильный ответ в викторине.');
                 return;
            }
            
            quiz = {
                id: editingItem?.quiz?.id || `quiz-${Date.now()}`,
                allowMultipleAnswers,
                options: validOptions,
                correctOptionIds,
                submissions: editingItem?.quiz?.submissions || [],
            };
        }

        const finalData = {
            title,
            content,
            targetSubscriptionTiers: targetMaximumOnly ? [SubscriptionTier.Maximum] : [],
            targetCountries: selectAllLocations ? undefined : (targetCountries.length > 0 ? targetCountries : undefined),
            targetRegions: selectAllLocations ? undefined : (targetRegions.length > 0 ? targetRegions : undefined),
            targetCities: selectAllLocations ? undefined : (targetCities.length > 0 ? targetCities : undefined),
            targetRoles: targetRoles.length > 0 ? targetRoles : undefined,
            publishTimestamp: isScheduled ? publishTimestamp : null,
            images: images.length > 0 ? images : undefined,
            poll: hasPoll ? poll : undefined,
            quiz: hasQuiz ? quiz : undefined,
            isPinned,
            deletionTimestamp,
        };
        await onSave(finalData);
        onClose();
    };

    // Image Handlers
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && images.length < 3) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                const newImage: PostImage = {
                    id: `img-${Date.now()}`,
                    url: reader.result as string,
                    position: 'beforeContent',
                };
                setImages(prev => [...prev, newImage]);
            };
            reader.readAsDataURL(file);
        }
    };
    const removeImage = (id: string) => setImages(prev => prev.filter(img => img.id !== id));
    const updateImagePosition = (id: string, position: PostImage['position']) => {
        setImages(prev => prev.map(img => img.id === id ? { ...img, position } : img));
    };

    // Poll Handlers
    const handlePollOptionChange = (id: string, text: string) => {
        setPollOptions(prev => prev.map(opt => opt.id === id ? { ...opt, text } : opt));
    };
    const addPollOption = () => {
        if (pollOptions.length < 10) {
            setPollOptions(prev => [...prev, { id: `opt-${Date.now()}`, text: '' }]);
        }
    };
    const removePollOption = (id: string) => {
         if (pollOptions.length > 1) {
            setPollOptions(prev => prev.filter(opt => opt.id !== id));
        }
    };
    
    // Quiz Handlers
    const handleQuizOptionChange = (id: string, text: string) => {
        setQuizOptions(prev => prev.map(opt => opt.id === id ? { ...opt, text } : opt));
    };
    const addQuizOption = () => {
        if (quizOptions.length < 10) {
            setQuizOptions(prev => [...prev, { id: `q-opt-${Date.now()}`, text: '' }]);
        }
    };
    const removeQuizOption = (id: string) => {
        if (quizOptions.length > 1) {
            setQuizOptions(prev => prev.filter(opt => opt.id !== id));
            setCorrectOptionIds(prev => prev.filter(correctId => correctId !== id)); // Also remove if it was correct
        }
    };
    const handleCorrectOptionToggle = (optionId: string, isChecked: boolean) => {
        if (allowMultipleAnswers) {
            setCorrectOptionIds(prev => isChecked ? [...prev, optionId] : prev.filter(id => id !== optionId));
        } else {
            setCorrectOptionIds(isChecked ? [optionId] : []);
        }
    };
    
    // Target Audience Handlers
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
        
        // Фильтруем регионы: не показываем регионы, если их родительская страна выбрана
        const displayableRegions = targetRegions.filter(region => {
            // Находим родительскую страну для региона
            for (const country in locs) {
                if (locs[country] && Object.keys(locs[country] || {}).includes(region)) {
                    // Если родительская страна выбрана, не показываем регион
                    return !targetCountries.includes(country);
                }
            }
            return true;
        });
    
        // Фильтруем города: не показываем города, если их родительский регион или страна выбраны
        const displayableCities = targetCities.filter(city => {
            let parentCountryName: string | undefined;
            let parentRegionName: string | undefined;
            
            // Находим родительскую страну и регион для города
            for (const country in locs) {
                for (const region in locs[country] || {}) {
                    if (locs[country][region]?.includes(city)) {
                        parentCountryName = country;
                        parentRegionName = region;
                        break;
                    }
                }
                if (parentCountryName && parentRegionName) break;
            }
            
            // Не показываем город, если выбрана его родительская страна или регион
            if (parentCountryName && targetCountries.includes(parentCountryName)) {
                return false;
            }
            if (parentRegionName && targetRegions.includes(parentRegionName)) {
                return false;
            }
            return true;
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

    const getModalTitle = () => {
        const action = editingItem ? 'Редактировать' : 'Создать';
        let typeName = '';
        switch (itemType) {
            case 'announcement': typeName = 'объявление'; break;
            case 'news': typeName = 'новость'; break;
            case 'library': typeName = 'статью в библиотеку'; break;
        }
        return `${action} ${typeName}`;
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b"><h2 className="text-2xl font-bold text-gray-800">{getModalTitle()}</h2></div>
                    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        <div className="p-3 border rounded-md bg-yellow-50 border-yellow-200">
                            <label className="flex items-center">
                                <input type="checkbox" checked={targetMaximumOnly} onChange={e => setTargetMaximumOnly(e.target.checked)} className="h-4 w-4 text-brand-primary border-gray-300 rounded" />
                                <span className="ml-2 font-medium text-yellow-800">Только для подписки 'Максимум'</span>
                            </label>
                        </div>
                        <div><label htmlFor="title" className="block text-sm font-medium text-gray-700">Заголовок</label><input type="text" name="title" id="title" required value={title} onChange={e => setTitle(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-brand-secondary focus:border-brand-secondary" /></div>
                        <div><label htmlFor="content" className="block text-sm font-medium text-gray-700">Содержание</label><textarea name="content" id="content" required rows={8} value={content} onChange={e => setContent(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-brand-secondary focus:border-brand-secondary"></textarea></div>
                        
                        {/* Image Uploader */}
                        <div className="p-3 border rounded-md space-y-3">
                             <p className="block text-sm font-medium text-gray-700">Изображения (до 3)</p>
                             {images.map(img => (
                                 <div key={img.id} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                                     <img src={img.url} alt="preview" className="w-16 h-16 object-cover rounded"/>
                                     <select value={img.position} onChange={e => updateImagePosition(img.id, e.target.value as PostImage['position'])} className="w-full p-2 border rounded-md bg-white text-sm">
                                         <option value="beforeContent">Перед текстом</option>
                                         <option value="afterContent">После текста</option>
                                     </select>
                                     <button type="button" onClick={() => removeImage(img.id)} className="p-1 text-red-500 hover:text-red-700">&times;</button>
                                 </div>
                             ))}
                             {images.length < 3 && <input type="file" accept="image/*" onChange={handleImageUpload} className="text-sm"/>}
                        </div>
                        
                        {/* Poll Creator */}
                        <div className="p-3 border rounded-md space-y-3">
                            <label className="flex items-center"><input type="checkbox" checked={hasPoll} disabled={hasQuiz} onChange={e => setHasPoll(e.target.checked)} className="h-4 w-4 text-brand-primary border-gray-300 rounded disabled:opacity-50" /> <span className={`ml-2 font-medium ${hasQuiz ? 'text-gray-400' : 'text-gray-700'}`}>Добавить опрос</span></label>
                            {hasPoll && (
                                <div className="space-y-2 pl-2 border-l-2">
                                    <label className="flex items-center"><input type="checkbox" checked={allowMultipleVotes} onChange={e => setAllowMultipleVotes(e.target.checked)} className="h-4 w-4 text-brand-primary border-gray-300 rounded" /> <span className="ml-2 text-sm text-gray-600">Разрешить несколько ответов</span></label>
                                    <label className="flex items-center mt-2">
                                        <input type="checkbox" checked={isHiddenPoll} onChange={e => setIsHiddenPoll(e.target.checked)} className="h-4 w-4 text-brand-primary border-gray-300 rounded" />
                                        <span className="ml-2 text-sm text-gray-600">Скрытый опрос (результаты видны после остановки)</span>
                                    </label>
                                    <p className="text-sm font-medium text-gray-700 mt-2">Варианты ответа (до 10):</p>
                                    {pollOptions.map((opt, index) => (
                                        <div key={opt.id} className="flex items-center space-x-2">
                                            <input type="text" value={opt.text} onChange={e => handlePollOptionChange(opt.id, e.target.value)} placeholder={`Вариант ${index + 1}`} className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm" />
                                            <button type="button" onClick={() => removePollOption(opt.id)} disabled={pollOptions.length <= 1} className="text-red-500 hover:text-red-700 disabled:opacity-50">&times;</button>
                                        </div>
                                    ))}
                                    {pollOptions.length < 10 && <button type="button" onClick={addPollOption} className="text-sm text-brand-primary hover:underline">+ Добавить вариант</button>}

                                    <div className="pt-2">
                                        <label className="flex items-center"><input type="checkbox" checked={pollEnds} onChange={e => setPollEnds(e.target.checked)} className="h-4 w-4 text-brand-primary border-gray-300 rounded focus:ring-brand-primary" /> <span className="ml-2 text-sm text-gray-600">Установить время окончания голосования</span></label>
                                        {pollEnds && (<div className="grid grid-cols-2 gap-2 mt-2"><input type="date" value={pollEndDate} onChange={e => setPollEndDate(e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded-md" /><input type="time" value={pollEndTime} onChange={e => setPollEndTime(e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded-md" /></div>)}
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        {/* Quiz Creator */}
                        <div className="p-3 border rounded-md space-y-3">
                            <label className="flex items-center"><input type="checkbox" checked={hasQuiz} disabled={hasPoll} onChange={e => setHasQuiz(e.target.checked)} className="h-4 w-4 text-brand-primary border-gray-300 rounded disabled:opacity-50" /> <span className={`ml-2 font-medium ${hasPoll ? 'text-gray-400' : 'text-gray-700'}`}>Добавить викторину</span></label>
                            {hasQuiz && (
                                <div className="space-y-2 pl-2 border-l-2">
                                    <label className="flex items-center"><input type="checkbox" checked={allowMultipleAnswers} onChange={e => { setAllowMultipleAnswers(e.target.checked); setCorrectOptionIds([]); }} className="h-4 w-4 text-brand-primary border-gray-300 rounded" /> <span className="ml-2 text-sm text-gray-600">Разрешить несколько правильных ответов</span></label>
                                    <p className="text-sm font-medium text-gray-700 mt-2">Варианты ответа (отметьте правильные):</p>
                                    {quizOptions.map((opt, index) => (
                                        <div key={opt.id} className="flex items-center space-x-2">
                                            <input type="checkbox" checked={correctOptionIds.includes(opt.id)} onChange={e => handleCorrectOptionToggle(opt.id, e.target.checked)} className="h-4 w-4 text-brand-accent border-gray-300 rounded" />
                                            <input type="text" value={opt.text} onChange={e => handleQuizOptionChange(opt.id, e.target.value)} placeholder={`Вариант ${index + 1}`} className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm" />
                                            <button type="button" onClick={() => removeQuizOption(opt.id)} disabled={quizOptions.length <= 1} className="text-red-500 hover:text-red-700 disabled:opacity-50">&times;</button>
                                        </div>
                                    ))}
                                    {quizOptions.length < 10 && <button type="button" onClick={addQuizOption} className="text-sm text-brand-primary hover:underline">+ Добавить вариант</button>}
                                </div>
                            )}
                        </div>

                        {/* Auto-deletion Section */}
                        <div className="p-3 border rounded-md space-y-3">
                            <p className="block text-sm font-medium text-gray-700">Удаление поста</p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 text-sm">
                                {[
                                    { value: 'none', label: 'Без ограничений' },
                                    { value: '1w', label: '1 неделя' },
                                    { value: '2w', label: '2 недели' },
                                    { value: '3w', label: '3 недели' },
                                    { value: '4w', label: '4 недели' },
                                    { value: 'manual', label: 'Указать вручную' },
                                ].map(opt => (
                                    <label key={opt.value} className="flex items-center">
                                        <input
                                            type="radio"
                                            name="autoDelete"
                                            value={opt.value}
                                            checked={autoDeleteOption === opt.value}
                                            onChange={(e) => setAutoDeleteOption(e.target.value)}
                                            className="h-4 w-4 text-brand-primary border-gray-300 focus:ring-brand-primary"
                                        />
                                        <span className="ml-2 text-gray-700">{opt.label}</span>
                                    </label>
                                ))}
                            </div>
                            {autoDeleteOption === 'manual' && (
                                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t">
                                    <input type="date" value={manualDeleteDate} onChange={e => setManualDeleteDate(e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded-md" />
                                    <input type="time" value={manualDeleteTime} onChange={e => setManualDeleteTime(e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded-md" />
                                </div>
                            )}
                        </div>

                        {/* Scheduling & Targeting */}
                        <div className="p-3 border rounded-md space-y-2">
                            <label className="flex items-center"><input type="checkbox" checked={isScheduled} onChange={e => setIsScheduled(e.target.checked)} className="h-4 w-4 text-brand-primary border-gray-300 rounded focus:ring-brand-primary" /> <span className="ml-2 text-gray-700 font-medium">Отложенная публикация</span></label>
                            {isScheduled && (<div className="grid grid-cols-2 gap-2"><input type="date" value={publishDate} onChange={e => setPublishDate(e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded-md" /><input type="time" value={publishTime} onChange={e => setPublishTime(e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded-md" /></div>)}
                        </div>
                        <div className="p-3 border rounded-md space-y-2">
                            <p className="block text-sm font-medium text-gray-700">Для кого (необязательно)</p>
                            <div className="flex space-x-4"><label className="flex items-center"><input type="checkbox" checked={targetRoles.includes(UserRole.Student)} onChange={e => handleRoleChange(UserRole.Student, e.target.checked)} className="h-4 w-4 text-brand-primary border-gray-300 rounded" /> <span className="ml-2 text-gray-700 text-sm">{UserRole.Student}</span></label><label className="flex items-center"><input type="checkbox" checked={targetRoles.includes(UserRole.Trainer)} onChange={e => handleRoleChange(UserRole.Trainer, e.target.checked)} className="h-4 w-4 text-brand-primary border-gray-300 rounded" /> <span className="ml-2 text-gray-700 text-sm">{UserRole.Trainer}</span></label><label className="flex items-center"><input type="checkbox" checked={targetRoles.includes(UserRole.Spectator)} onChange={e => handleRoleChange(UserRole.Spectator, e.target.checked)} className="h-4 w-4 text-brand-primary border-gray-300 rounded" /> <span className="ml-2 text-gray-700 text-sm">{UserRole.Spectator}</span></label></div>
                        </div>

                        <div className="p-3 border rounded-md">
                            <div className="flex justify-between items-center pb-2 mb-2">
                                <p className="block text-sm font-medium text-gray-700">Локация (необязательно)</p>
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
                                <label className="flex items-center pb-2 border-b mb-2"><input type="checkbox" checked={selectAllLocations} onChange={e => handleSelectAllLocations(e.target.checked)} className="h-4 w-4 text-brand-primary border-gray-300 rounded" /> <span className="ml-2 font-semibold text-gray-700 text-sm">Все локации</span></label>
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
                            </div>
                        </div>
                        <div className="p-3 border rounded-md">
                            <label className="flex items-center">
                                <input type="checkbox" checked={isPinned} onChange={e => setIsPinned(e.target.checked)} className="h-4 w-4 text-brand-primary border-gray-300 rounded focus:ring-brand-primary" />
                                <span className="ml-2 font-medium text-gray-700">Закрепить публикацию</span>
                                <span className="ml-2 text-xs text-gray-500">(будет всегда вверху списка)</span>
                            </label>
                        </div>
                    </div>
                    <div className="p-6 border-t flex justify-end space-x-3"><button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300">Отмена</button><button type="submit" className="bg-brand-primary text-white px-4 py-2 rounded-md hover:bg-brand-secondary">Сохранить</button></div>
                </form>
            </div>
        </div>
    );
};

export default PublicationEditorModal;