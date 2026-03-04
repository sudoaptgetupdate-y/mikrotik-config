import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Router, Database, Users, ArrowRight } from 'lucide-react';

const QuickActions = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-3 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-1.5 h-5 bg-indigo-500 rounded-full"></div>
        <h3 className="text-base font-black text-slate-800">Quick Actions</h3>
      </div>
      
      <div className="grid gap-3">
        {/* 1. Add New Device */}
        <button onClick={() => navigate('/add-device')} className="flex items-center justify-between w-full p-4 bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md rounded-2xl transition-all group text-left">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors"><Plus size={20} /></div>
            <div>
              <h4 className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition">Add New Device</h4>
              <p className="text-[11px] text-slate-500 font-medium">Create a new router config</p>
            </div>
          </div>
          <ArrowRight size={18} className="text-slate-300 group-hover:text-blue-500 transition-transform group-hover:translate-x-1" />
        </button>

        {/* 2. Manage Devices */}
        <button onClick={() => navigate('/devices')} className="flex items-center justify-between w-full p-4 bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md rounded-2xl transition-all group text-left">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors"><Router size={20} /></div>
            <div>
              <h4 className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition">Manage Devices</h4>
              <p className="text-[11px] text-slate-500 font-medium">View and edit inventory</p>
            </div>
          </div>
          <ArrowRight size={18} className="text-slate-300 group-hover:text-indigo-500 transition-transform group-hover:translate-x-1" />
        </button>

        {/* 3. Manage Groups (เพิ่มใหม่) */}
        <button onClick={() => navigate('/groups')} className="flex items-center justify-between w-full p-4 bg-white border border-slate-200 hover:border-teal-300 hover:shadow-md rounded-2xl transition-all group text-left">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-50 text-teal-600 rounded-xl group-hover:bg-teal-600 group-hover:text-white transition-colors"><Users size={20} /></div>
            <div>
              <h4 className="text-sm font-bold text-slate-800 group-hover:text-teal-600 transition">Manage Groups</h4>
              <p className="text-[11px] text-slate-500 font-medium">Organize devices & alerts</p>
            </div>
          </div>
          <ArrowRight size={18} className="text-slate-300 group-hover:text-teal-500 transition-transform group-hover:translate-x-1" />
        </button>

        {/* 4. Hardware Models */}
        <button onClick={() => navigate('/models')} className="flex items-center justify-between w-full p-4 bg-white border border-slate-200 hover:border-slate-400 hover:shadow-md rounded-2xl transition-all group text-left">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-100 text-slate-600 rounded-xl group-hover:bg-slate-800 group-hover:text-white transition-colors"><Database size={20} /></div>
            <div>
              <h4 className="text-sm font-bold text-slate-800 group-hover:text-slate-900 transition">Hardware Models</h4>
              <p className="text-[11px] text-slate-500 font-medium">Manage port templates</p>
            </div>
          </div>
          <ArrowRight size={18} className="text-slate-300 group-hover:text-slate-800 transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </div>
  );
};

export default QuickActions;