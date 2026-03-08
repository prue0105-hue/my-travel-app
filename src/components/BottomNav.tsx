// src/components/BottomNav.tsx

import { Calendar, Wallet, BookOpen, Users } from 'lucide-react';

export default function BottomNav({ activeTab, setActiveTab }: any) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t-4 border-ac-shadow px-2 py-4 flex justify-around items-center rounded-t-[32px] z-50">
      <button onClick={() => setActiveTab('schedule')} className={`flex flex-col items-center transition-all ${activeTab === 'schedule' ? 'text-ac-green scale-110' : 'text-gray-300'}`}>
        <Calendar size={24} strokeWidth={activeTab === 'schedule' ? 2.5 : 2} />
        <span className="text-[10px] mt-1 font-bold">行程</span>
      </button>
      
      <button onClick={() => setActiveTab('expense')} className={`flex flex-col items-center transition-all ${activeTab === 'expense' ? 'text-ac-green scale-110' : 'text-gray-300'}`}>
        <Wallet size={24} strokeWidth={activeTab === 'expense' ? 2.5 : 2} />
        <span className="text-[10px] mt-1 font-bold">記帳</span>
      </button>
      
      <button onClick={() => setActiveTab('boarding')} className={`flex flex-col items-center transition-all ${activeTab === 'boarding' ? 'text-ac-green scale-110' : 'text-gray-300'}`}>
        <BookOpen size={24} />
        <span className="text-[10px] mt-1 font-bold">登機</span>
      </button>
      
      {/* 🌟 修正：補上 onClick 與 activeTab 變色判斷 */}
      <button onClick={() => setActiveTab('members')} className={`flex flex-col items-center transition-all ${activeTab === 'members' ? 'text-ac-green scale-110' : 'text-gray-300'}`}>
        <Users size={24} strokeWidth={activeTab === 'members' ? 2.5 : 2} />
        <span className="text-[10px] mt-1 font-bold">成員</span>
      </button>
    </nav>
  );
}