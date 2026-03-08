// src/components/BoardingPass.tsx

import { CloudSun, Timer, Plane } from 'lucide-react';

export default function BoardingPass() {
  // 🌟 自動計算旅程倒數 (目標日：2026-04-16)
  const calculateDaysLeft = () => {
    const targetDate = new Date('2026-04-16T00:00:00').getTime();
    const today = new Date().getTime();
    const diff = targetDate - today;
    return diff > 0 ? Math.ceil(diff / (1000 * 3600 * 24)) : 0;
  };
  const daysLeft = calculateDaysLeft();

  return (
    <div className="w-full max-w-md space-y-5 animate-in fade-in duration-300">
      
      {/* 天氣與倒數面板 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-blue-400 to-blue-300 text-white p-4 rounded-3xl shadow-soft-ac flex flex-col justify-between h-28 border border-white/20">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold opacity-80 uppercase tracking-widest">Weather</span>
            <CloudSun size={20} />
          </div>
          <div>
            <h2 className="text-3xl font-bold tracking-tighter">34°C</h2>
            <p className="text-[10px] font-bold opacity-90">曼谷 Bangkok · 晴時多雲</p>
          </div>
        </div>

        <div className="bg-ac-green text-white p-4 rounded-3xl shadow-soft-ac flex flex-col justify-between h-28 relative overflow-hidden">
          <div className="relative z-10 flex justify-between items-start">
            <span className="text-xs font-bold opacity-80 uppercase tracking-widest">Countdown</span>
            <Timer size={20} />
          </div>
          <div className="relative z-10">
            <h2 className="text-3xl font-bold tracking-tighter">{daysLeft} <span className="text-sm">Days</span></h2>
            <p className="text-[10px] font-bold opacity-90">準備好去度假了嗎！</p>
          </div>
          <Timer size={80} className="absolute -right-4 -bottom-4 opacity-10" />
        </div>
      </div>

      {/* ✈️ 去程機票 (請在這裡換上你的真實資訊！) */}
      <div className="bg-white rounded-[32px] overflow-hidden shadow-soft-ac border-2 border-ac-shadow">
        <div className="p-5 bg-ac-brown text-white relative">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-bold tracking-widest opacity-60">OUTBOUND FLIGHT</span>
            <Plane size={14} className="opacity-60" />
          </div>
          <div className="flex justify-between items-end">
            <div className="text-center">
              <h2 className="text-4xl font-bold tracking-tighter">TPE</h2>
              <p className="text-[10px] font-bold opacity-70 mt-1">台北 桃園</p>
            </div>
            <div className="flex flex-col items-center px-4 pb-2 w-full">
              <span className="text-[10px] font-bold mb-1">3h 45m</span> {/* 飛行時間 */}
              <div className="w-full border-t-2 border-dashed border-white/30 relative flex items-center justify-center">
                <Plane size={16} className="absolute text-white bg-ac-brown px-0.5" />
              </div>
            </div>
            <div className="text-center">
              <h2 className="text-4xl font-bold tracking-tighter">BKK</h2>
              <p className="text-[10px] font-bold opacity-70 mt-1">曼谷 蘇凡納布</p>
            </div>
          </div>
        </div>
        
        <div className="border-t-2 border-dashed border-gray-200 relative bg-white">
          <div className="absolute -top-3 -left-4 w-6 h-6 bg-ac-beige rounded-full border-r-2 border-ac-shadow"></div>
          <div className="absolute -top-3 -right-4 w-6 h-6 bg-ac-beige rounded-full border-l-2 border-ac-shadow"></div>
          
          <div className="p-6 grid grid-cols-3 gap-4">
            <div>
              <p className="text-[10px] text-gray-400 font-bold mb-0.5">Date</p>
              <p className="font-bold text-sm">04 / 16</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-bold mb-0.5">Boarding</p>
              <p className="font-bold text-sm text-red-400">08:20</p> {/* 登機時間 */}
            </div>
            <div className="text-right">
              <p className="text-[10px] text-gray-400 font-bold mb-0.5">Takeoff</p>
              <p className="font-bold text-sm">10:20</p> {/* 起飛時間 */}
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-bold mb-0.5">Flight</p>
              <p className="font-bold text-sm">BR 201</p> {/* 航班編號 */}
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-bold mb-0.5">Gate</p>
              <p className="font-bold text-sm">A4</p> {/* 登機門 */}
            </div>
            <div className="text-right">
              <p className="text-[10px] text-gray-400 font-bold mb-0.5">Seat</p>
              <p className="font-bold text-sm">24A</p> {/* 你的座位 */}
            </div>
          </div>
        </div>
      </div>

      {/* ✈️ 回程機票 (請在這裡換上你的真實資訊！) */}
      <div className="bg-white rounded-[32px] overflow-hidden shadow-soft-ac border-2 border-ac-shadow">
        <div className="p-5 bg-gray-100 relative">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-bold tracking-widest text-gray-400">RETURN FLIGHT</span>
            <Plane size={14} className="text-gray-400 transform rotate-180" />
          </div>
          <div className="flex justify-between items-end">
            <div className="text-center">
              <h2 className="text-4xl font-bold tracking-tighter text-ac-brown">BKK</h2>
              <p className="text-[10px] font-bold text-gray-500 mt-1">曼谷 蘇凡納布</p>
            </div>
            <div className="flex flex-col items-center px-4 pb-2 w-full text-gray-400">
              <span className="text-[10px] font-bold mb-1">3h 50m</span> {/* 飛行時間 */}
              <div className="w-full border-t-2 border-dashed border-gray-300 relative flex items-center justify-center">
                <Plane size={16} className="absolute bg-gray-100 px-0.5" />
              </div>
            </div>
            <div className="text-center">
              <h2 className="text-4xl font-bold tracking-tighter text-ac-brown">TPE</h2>
              <p className="text-[10px] font-bold text-gray-500 mt-1">台北 桃園</p>
            </div>
          </div>
        </div>
        
        <div className="border-t-2 border-dashed border-gray-200 relative bg-white">
          <div className="absolute -top-3 -left-4 w-6 h-6 bg-ac-beige rounded-full border-r-2 border-ac-shadow"></div>
          <div className="absolute -top-3 -right-4 w-6 h-6 bg-ac-beige rounded-full border-l-2 border-ac-shadow"></div>
          
          <div className="p-6 grid grid-cols-3 gap-4">
            <div>
              <p className="text-[10px] text-gray-400 font-bold mb-0.5">Date</p>
              <p className="font-bold text-sm text-ac-brown">04 / 19</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-bold mb-0.5">Boarding</p>
              <p className="font-bold text-sm text-red-400">13:20</p> {/* 登機時間 */}
            </div>
            <div className="text-right">
              <p className="text-[10px] text-gray-400 font-bold mb-0.5">Takeoff</p>
              <p className="font-bold text-sm text-ac-brown">20:10</p> {/* 起飛時間 */}
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-bold mb-0.5">Flight</p>
              <p className="font-bold text-sm text-ac-brown">BR 76</p> {/* 航班編號 */}
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-bold mb-0.5">Gate</p>
              <p className="font-bold text-sm text-ac-brown">TBD</p> {/* 登機門 */}
            </div>
            <div className="text-right">
              <p className="text-[10px] text-gray-400 font-bold mb-0.5">Seat</p>
              <p className="font-bold text-sm text-ac-brown">24B</p> {/* 你的座位 */}
            </div>
          </div>
        </div>
      </div>
      
    </div>
  );
}