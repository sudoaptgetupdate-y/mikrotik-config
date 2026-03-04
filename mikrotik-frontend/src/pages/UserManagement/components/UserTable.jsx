import React from 'react';
import { Edit, Trash2, ShieldAlert, ShieldCheck, User } from 'lucide-react';

const UserTable = ({ users, loading, onEdit, onDelete }) => {
  const getRoleBadge = (role) => {
    if (role === 'SUPER_ADMIN') return <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-md text-xs font-bold flex items-center gap-1 w-max"><ShieldAlert size={12}/> Super Admin</span>;
    if (role === 'ADMIN') return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-bold flex items-center gap-1 w-max"><ShieldCheck size={12}/> Admin</span>;
    return <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-bold flex items-center gap-1 w-max"><User size={12}/> Employee</span>;
  };

  if (loading) {
    return <div className="p-10 text-center text-slate-400">Loading users...</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse min-w-[600px]">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
            <th className="p-4 pl-6 whitespace-nowrap">User / Username</th>
            <th className="p-4 whitespace-nowrap">Email</th>
            <th className="p-4 whitespace-nowrap">Role</th>
            <th className="p-4 whitespace-nowrap">Created Date</th>
            <th className="p-4 text-right pr-6 whitespace-nowrap">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-slate-50 transition">
              <td className="p-4 pl-6">
                <div className="font-bold text-slate-800 text-sm whitespace-nowrap">{user.firstName} {user.lastName}</div>
                <div className="text-xs text-slate-500 font-mono mt-0.5">@{user.username}</div>
              </td>
              <td className="p-4 text-sm text-slate-600 whitespace-nowrap">{user.email}</td>
              <td className="p-4">{getRoleBadge(user.role)}</td>
              <td className="p-4 text-sm text-slate-500 whitespace-nowrap">{new Date(user.createdAt).toLocaleDateString()}</td>
              <td className="p-4 text-right pr-6 whitespace-nowrap">
                <button onClick={() => onEdit(user)} className="p-2 text-slate-400 hover:text-blue-600 transition" title="Edit"><Edit size={16} /></button>
                <button onClick={() => onDelete(user)} className="p-2 text-slate-400 hover:text-red-600 transition" title="Delete"><Trash2 size={16} /></button>
              </td>
            </tr>
          ))}
          {users.length === 0 && (
            <tr><td colSpan="5" className="p-10 text-center text-slate-400">ไม่พบข้อมูลผู้ใช้งาน</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default UserTable;