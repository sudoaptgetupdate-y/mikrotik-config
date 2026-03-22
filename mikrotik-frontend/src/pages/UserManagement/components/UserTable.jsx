import React from 'react';
import { Edit, Trash2, ShieldAlert, ShieldCheck, User, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const UserTable = ({ users, loading, onEdit, onDelete, onToggleStatus, onRestore, isArchivedTab }) => {
  const { t } = useTranslation();

  const getRoleBadge = (role) => {
    if (role === 'SUPER_ADMIN') return <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-md text-xs font-bold flex items-center gap-1 w-max"><ShieldAlert size={12}/> {t('users.roles.super_admin')}</span>;
    if (role === 'ADMIN') return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-bold flex items-center gap-1 w-max"><ShieldCheck size={12}/> {t('users.roles.admin')}</span>;
    return <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-bold flex items-center gap-1 w-max"><User size={12}/> {t('users.roles.employee')}</span>;
  };

  if (loading) {
    return <div className="p-10 text-center text-slate-400">{t('users.loading')}</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse min-w-[600px]">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
            <th className="p-4 pl-6 whitespace-nowrap">{t('users.table.user_username')}</th>
            <th className="p-4 whitespace-nowrap">{t('users.table.email')}</th>
            <th className="p-4 whitespace-nowrap">{t('users.table.role')}</th>
            <th className="p-4 whitespace-nowrap text-center">{t('users.table.status')}</th>
            <th className="p-4 whitespace-nowrap">{t('users.table.created_at')}</th>
            <th className="p-4 text-right pr-6 whitespace-nowrap">{t('users.table.actions')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {users.map((user) => (
            <tr key={user.id} className={`hover:bg-slate-50 transition ${user.isArchived ? 'opacity-80' : ''}`}>
              <td className="p-4 pl-6">
                <div className="font-bold text-slate-800 text-sm whitespace-nowrap">{user.firstName} {user.lastName}</div>
                <div className="text-xs text-slate-500 font-mono mt-0.5">@{user.username}</div>
              </td>
              <td className="p-4 text-sm text-slate-600 whitespace-nowrap">{user.email}</td>
              <td className="p-4">{getRoleBadge(user.role)}</td>
              <td className="p-4 text-center">
                {user.isArchived ? (
                   <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-md text-[10px] font-bold">{t('users.status.archived').toUpperCase()}</span>
                ) : (
                  <>
                    <button
                      onClick={() => onToggleStatus(user)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                        user.isActive ? 'bg-green-500' : 'bg-slate-300'
                      }`}
                      title={user.isActive ? t('users.tooltips.deactivate') : t('users.tooltips.activate')}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          user.isActive ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <div className={`text-[10px] mt-1 font-bold ${user.isActive ? 'text-green-600' : 'text-slate-400'}`}>
                      {user.isActive ? t('users.status.active').toUpperCase() : t('users.status.inactive').toUpperCase()}
                    </div>
                  </>
                )}
              </td>
              <td className="p-4 text-sm text-slate-500 whitespace-nowrap">{new Date(user.createdAt).toLocaleDateString()}</td>
              <td className="p-4 text-right pr-6 whitespace-nowrap">
                {isArchivedTab ? (
                  <>
                    <button onClick={() => onRestore(user)} className="p-2 text-slate-400 hover:text-green-600 transition" title={t('users.tooltips.restore')}><RotateCcw size={16} /></button>
                    <button onClick={() => onDelete(user)} className="p-2 text-slate-400 hover:text-red-600 transition" title={t('users.tooltips.delete_permanent')}><Trash2 size={16} /></button>
                  </>
                ) : (
                  <>
                    <button onClick={() => onEdit(user)} className="p-2 text-slate-400 hover:text-blue-600 transition" title={t('users.tooltips.edit')}><Edit size={16} /></button>
                    <button onClick={() => onDelete(user)} className="p-2 text-slate-400 hover:text-red-600 transition" title={t('users.tooltips.delete')}><Trash2 size={16} /></button>
                  </>
                )}
              </td>
            </tr>
          ))}
          {users.length === 0 && (
            <tr><td colSpan="6" className="p-10 text-center text-slate-400">{t('users.empty')}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default UserTable;