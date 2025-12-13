import React, { useContext, useState } from 'react';
import { AuthContext } from '../App';
import { User, UserRole } from '../types';
import ConfirmationModal from '../components/ConfirmationModal';
import * as api from '../services/api';

const AddStudentModal: React.FC<{ isOpen: boolean; onClose: () => void; onAdd: (studentId: string) => Promise<void>; }> = ({ isOpen, onClose, onAdd }) => {
    const [studentId, setStudentId] = useState('');
    if (!isOpen) return null;
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onAdd(studentId);
        setStudentId('');
    };
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-gray-800 mb-4">Добавить ученика</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="studentId" className="block text-sm font-medium text-gray-700">6-значный ID ученика</label>
                        <input id="studentId" type="text" value={studentId} onChange={e => setStudentId(e.target.value)} placeholder="Введите ID" className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-secondary focus:outline-none" maxLength={6}/>
                    </div>
                    <div className="mt-6 flex justify-end space-x-3">
                        <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300">Отмена</button>
                        <button type="submit" className="bg-brand-primary text-white px-6 py-2 rounded-lg font-semibold hover:bg-brand-secondary transition duration-300 shadow-md">Отправить запрос</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const MyStudentsPage: React.FC = () => {
    const auth = useContext(AuthContext);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isAddModalOpen, setAddModalOpen] = useState(false);
    const [confirmUnlinkModalOpen, setConfirmUnlinkModalOpen] = useState(false);
    const [studentToUnlink, setStudentToUnlink] = useState<User | null>(null);


    if (!auth || !auth.user || auth.user.role !== UserRole.Trainer) {
        return <div className="bg-white p-6 rounded-lg shadow-md">Доступ запрещен. Эта страница только для тренеров.</div>;
    }

    const { user, users, updateUsers } = auth;

    const activeUsers = users.filter(u => !u.isDeleted);

    const linkedStudents = activeUsers.filter(u => user.linkedUsers.includes(u.id) && u.role === UserRole.Student);
    const pendingStudents = activeUsers.filter(u => user.pendingStudents?.includes(u.id) && u.role === UserRole.Student);
    const studentRequests = activeUsers.filter(u => user.studentRequests?.includes(u.id) && u.role === UserRole.Student);


    const handleAddStudent = async (studentId: string) => {
        setError('');
        setMessage('');

        if (!/^\d{6}$/.test(studentId)) {
            setError('ID должен состоять из 6 цифр.');
            return;
        }
        if (user.linkedUsers.includes(studentId) || user.pendingStudents?.includes(studentId)) {
            setError('Этот ученик уже в вашем списке или ожидает подтверждения.');
            return;
        }
        
        const student = activeUsers.find(u => u.id === studentId && u.role === UserRole.Student);
        if (!student) {
            setError('Ученик с таким ID не найден.');
            return;
        }

        try {
            const token = sessionStorage.getItem('authToken');
            if (!token) {
                setError('Необходима авторизация.');
                return;
            }
            
            const result = await api.apiSendLinkRequest(studentId, token);
            if (result.success) {
                // Refresh users list to get updated state
                const freshUsers = await api.apiGetAllUsers();
                await updateUsers(freshUsers);
                setMessage(`Запрос на добавление ученика ${student.name} ${student.surname} успешно отправлен.`);
                setAddModalOpen(false);
            } else {
                setError(result.message || 'Ошибка при отправке запроса.');
            }
        } catch (error: any) {
            console.error('Error sending link request:', error);
            setError(error.message || 'Ошибка при отправке запроса.');
        }
    };

    const handleStudentRequestResponse = async (studentId: string, accept: boolean) => {
         const student = activeUsers.find(u => u.id === studentId);
         if (!student) return;

         try {
            const token = sessionStorage.getItem('authToken');
            if (!token) {
                setError('Необходима авторизация.');
                return;
            }
            
            const result = await api.apiRespondToLinkRequest(studentId, accept, token);
            if (result.success) {
                // Refresh users list to get updated state
                const freshUsers = await api.apiGetAllUsers();
                await updateUsers(freshUsers);
                setMessage(accept ? `Ученик ${student.name} добавлен.` : `Запрос от ${student.name} отклонен.`);
            } else {
                setError(result.message || 'Ошибка при обработке запроса.');
            }
         } catch (error: any) {
            console.error('Error responding to link request:', error);
            setError(error.message || 'Ошибка при обработке запроса.');
         }
    };
    
    const handleUnlinkClick = (student: User) => {
        setStudentToUnlink(student);
        setConfirmUnlinkModalOpen(true);
    };

    const confirmUnlinkStudent = async () => {
        if (!studentToUnlink) return;
        
        const updatedUsers = users.map(u => {
            if (u.id === user.id) {
                return { ...u, linkedUsers: u.linkedUsers.filter(id => id !== studentToUnlink.id) };
            }
            if (u.id === studentToUnlink.id) {
                 return { ...u, linkedUsers: u.linkedUsers.filter(id => id !== user.id) };
            }
            return u;
        });
        await updateUsers(updatedUsers);
        setMessage(`Ученик ${studentToUnlink.name} был откреплен.`);
        setStudentToUnlink(null);
        setConfirmUnlinkModalOpen(false);
        setTimeout(() => setMessage(''), 3000);
    };

    const StudentRow: React.FC<{ student: User, status: 'confirmed' | 'pending' }> = ({ student, status }) => (
        <li className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center">
                <img src={student.avatarUrl || `https://ui-avatars.com/api/?name=${student.name}+${student.surname}&background=2a69ac&color=fff`} alt="avatar" className="w-10 h-10 rounded-full mr-4" />
                <div>
                    <p className="font-semibold text-gray-800">{student.name} {student.surname}</p>
                    <p className="text-sm text-gray-500">{student.city}</p>
                </div>
            </div>
            <div className="w-full sm:w-auto flex justify-end">
                {status === 'confirmed' ? (
                    <button type="button" onClick={() => handleUnlinkClick(student)} className="bg-brand-danger text-white px-3 py-1 rounded-md text-sm font-semibold hover:bg-red-700 transition-colors">Открепить</button>
                ) : (
                    <span className="text-xs font-bold text-yellow-600 bg-yellow-100 px-2 py-1 rounded-full">ОЖИДАЕТ ПОДТВЕРЖДЕНИЯ</span>
                )}
            </div>
        </li>
    );

    return (
        <div className="space-y-6">
            <AddStudentModal isOpen={isAddModalOpen} onClose={() => setAddModalOpen(false)} onAdd={handleAddStudent} />
            <ConfirmationModal 
                isOpen={confirmUnlinkModalOpen}
                onClose={() => setConfirmUnlinkModalOpen(false)}
                onConfirm={confirmUnlinkStudent}
                title="Подтвердить открепление"
                message={`Вы уверены, что хотите открепить ученика ${studentToUnlink?.name} ${studentToUnlink?.surname}? Это действие не может быть отменено.`}
            />
             <div className="flex justify-end items-center"><button type="button" onClick={() => setAddModalOpen(true)} className="bg-brand-primary text-white font-semibold px-4 py-2 rounded-lg shadow hover:bg-brand-secondary transition-colors flex items-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>Добавить ученика</button></div>
             {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
             {message && <p className="text-sm text-green-600 mt-2">{message}</p>}

            {studentRequests.length > 0 && (
                <div className="bg-white p-6 rounded-lg shadow-md">
                     <h2 className="text-xl font-semibold text-gray-700 mb-4">Запросы от учеников</h2>
                     <ul className="space-y-3">
                        {studentRequests.map(student => (
                            <li key={student.id} className="p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-lg flex items-center justify-between">
                                 <p className="text-sm text-yellow-800"><span className="font-semibold">{student.name} {student.surname}</span> хочет добавить вас как тренера.</p>
                                 <div className="space-x-3 flex-shrink-0 ml-4"><button type="button" onClick={() => handleStudentRequestResponse(student.id, true)} className="bg-brand-accent text-white px-3 py-1 rounded-md text-sm font-semibold hover:bg-green-600 transition">Принять</button><button type="button" onClick={() => handleStudentRequestResponse(student.id, false)} className="bg-gray-300 text-gray-800 px-3 py-1 rounded-md text-sm font-semibold hover:bg-gray-400 transition">Отклонить</button></div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            
            <div className="bg-white p-6 rounded-lg shadow-md">
                 <h2 className="text-xl font-semibold text-gray-700 mb-4">Список учеников</h2>
                {(linkedStudents.length > 0 || pendingStudents.length > 0) ? (<ul className="space-y-3">{linkedStudents.map(student => <StudentRow key={student.id} student={student} status="confirmed" />)}{pendingStudents.map(student => <StudentRow key={student.id} student={student} status="pending" />)}</ul>) : (<p className="text-gray-500">У вас пока нет привязанных учеников.</p>)}
            </div>
        </div>
    );
};

export default MyStudentsPage;