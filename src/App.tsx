import { useState, useEffect } from 'react';
import { 
  Plus, X, Trash2, Edit3, Loader2, Camera, Receipt, Ticket, Copy, Check,
  Trophy, Crown, Utensils, BaggageClaim, CheckSquare, Square, Save, Target
} from 'lucide-react';

// Firebase 核心
import { 
  collection, onSnapshot, query, addDoc, deleteDoc, doc, updateDoc, orderBy, setDoc
} from 'firebase/firestore';
import { auth, googleProvider, db, storage } from './firebase'; 
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';

// 拖曳功能
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, TouchSensor } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

// 🧩 引入你的積木檔案
import BoardingPass from './components/BoardingPass';
import BottomNav from './components/BottomNav';
import SortableItem from './components/SortableItem';

const ALL_TAGS = ["⭐ 必吃", "👍 在地人", "‼️ 要預約", "🔥 網紅店", "🏙️ 景點", "🎒 購物", "🍹 飲料甜點", "🍚 正餐", "🌿 放鬆", "🏠 住宿", "💆 按摩", "🛵 外送ok"];
const EXPENSE_CATEGORIES = ["🍜 飲食", "🚕 交通", "🏠 住宿", "🛍️ 購物", "🎟️ 門票", "💆 按摩", "📦 其他"];
const MEMBERS = ["地瓜陳", "大頭", "鍾", "官"]; 

// 🌟 新增：聰明抓取當前登入者的對應成員
const getMatchedMember = (googleName: string | null) => {
  if (!googleName) return MEMBERS[0];

  // 1. 先試試看直接比對 (如果 Google 名稱剛好有包含暱稱，例如 "大頭 Chen")
  const autoMatch = MEMBERS.find(m => googleName.includes(m) || m.includes(googleName));
  if (autoMatch) return autoMatch;
  
  // 2. 如果名字完全不一樣，就在這個「翻譯字典」手動對應！
  // 👈 💡 請把左邊引號內換成你們真實的 Google 帳號顯示名稱
  const manualMapping: Record<string, string> = {
    "來買地瓜球.": "地瓜陳",   // 舉例：當 Google 名字是 "Chen Y.C."，就自動預設為 "地瓜陳"
    "Datou_N": "大頭",
    "gi.J": "鍾",
    "Kuan Ida": "官"
  };
  
  return manualMapping[googleName] || MEMBERS[0]; // 如果都找不到，就先預設給第一個人
};

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('boarding'); 
  const [selectedDay, setSelectedDay] = useState('D1'); 
  const [schedules, setSchedules] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 行程彈窗狀態
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newEntry, setNewEntry] = useState<any>({ day: 'D1', time: '', title: '', location: '', googleMapsUrl: '', imageUrl: '', tags: [], status: '確定去' });

  // 記帳彈窗狀態
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [newExpense, setNewExpense] = useState<any>({ title: '', amount: '', category: '🍜 飲食', paidBy: MEMBERS[0], paymentMethod: "💵 現金", splitMode: 'equal', splitBetween: MEMBERS, manualShares: {}, receiptUrl: '' });
  const [isUploading, setIsUploading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  // 🌟 成員頁面專用狀態
  const [tasks, setTasks] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [newTask, setNewTask] = useState({ title: '', assignee: MEMBERS[0] });
  const [editingBudget, setEditingBudget] = useState<{member: string, limit: string} | null>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

useEffect(() => {
    if (!user) return;
    const qS = query(collection(db, "schedules"), orderBy("time", "asc"));
    const unsubS = onSnapshot(qS, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, order: 999, ...doc.data() } as any));
      data.sort((a: any, b: any) => (a.order !== b.order ? a.order - b.order : (a.time || "00:00").localeCompare(b.time || "00:00")));
      setSchedules(data);
      setLoading(false);
    });
    
    const qE = query(collection(db, "expenses"), orderBy("createdAt", "desc"));
    const unsubE = onSnapshot(qE, (snapshot) => {
      setExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 🌟 新增：監聽共用任務與個人預算
    const qT = query(collection(db, "tasks"), orderBy("createdAt", "asc"));
    const unsubT = onSnapshot(qT, (snap) => setTasks(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    
    const unsubB = onSnapshot(collection(db, "budgets"), (snap) => {
      const bMap: Record<string, number> = {};
      snap.forEach(doc => { bMap[doc.id] = doc.data().limit; });
      setBudgets(bMap);
    });

    return () => { unsubS(); unsubE(); unsubT(); unsubB(); };
  }, [user]);

  const handleLogin = async () => { try { await signInWithPopup(auth, googleProvider); } catch (e) { console.error(e); } };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      const oldIndex = filteredSchedules.findIndex(i => i.id === active.id);
      const newIndex = filteredSchedules.findIndex(i => i.id === over.id);
      const newDayOrder = arrayMove(filteredSchedules, oldIndex, newIndex);
      setSchedules(prev => {
        const newAll = prev.map(p => {
          const found = newDayOrder.find(n => n.id === p.id);
          return found ? { ...p, order: newDayOrder.indexOf(found) } : p;
        });
        return newAll.sort((a, b) => a.order - b.order);
      });
      newDayOrder.forEach(async (item, index) => await updateDoc(doc(db, "schedules", item.id), { order: index }));
    }
  };

  const filteredSchedules = schedules.filter(s => selectedDay === '預備清單' ? (s.day === '預備清單' || !['D1', 'D2', 'D3', 'D4'].includes(s.day)) : s.day === selectedDay);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const storageRef = ref(storage, `receipts/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);
    uploadTask.on('state_changed', null, null, async () => {
      const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
      setNewExpense((prev: any) => ({ ...prev, receiptUrl: downloadURL }));
      setIsUploading(false);
    });
  };

  const handleRemoveReceipt = async () => {
    if (!newExpense.receiptUrl) return;
    try { await deleteObject(ref(storage, newExpense.receiptUrl)); setNewExpense((prev: any) => ({ ...prev, receiptUrl: '' })); } 
    catch (e) { setNewExpense((prev: any) => ({ ...prev, receiptUrl: '' })); }
  };

  const manualSum = MEMBERS.reduce((acc, m) => acc + (Number(newExpense.manualShares?.[m]) || 0), 0);

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const totalAmount = Number(newExpense.amount);
    if (!newExpense.title || !totalAmount) return alert("資訊不完整！");
    if (newExpense.splitMode === 'manual' && manualSum !== totalAmount) return alert(`分配總額 ($${manualSum}) 與總花費 ($${totalAmount}) 不符！`);
    try {
      const dataToSave = { ...newExpense, amount: totalAmount };
      if (editingExpenseId) await updateDoc(doc(db, "expenses", editingExpenseId), dataToSave);
      else await addDoc(collection(db, "expenses"), { ...dataToSave, createdAt: Date.now() });
      setIsExpenseModalOpen(false);
    } catch (err) { console.error(err); }
  };

  const deleteExpense = async (exp: any) => {
    if (window.confirm(`確定要刪除「${exp.title}」嗎？`)) {
      try {
        if (exp.receiptUrl) await deleteObject(ref(storage, exp.receiptUrl)).catch(() => {});
        await deleteDoc(doc(db, "expenses", exp.id));
      } catch (error) { console.error(error); }
    }
  };

  const calculateTotalShare = (m: string) => expenses.reduce((s, exp) => exp.splitMode === 'manual' ? s + (exp.manualShares?.[m] || 0) : (exp.splitBetween?.includes(m) ? s + (exp.amount / exp.splitBetween.length) : s), 0);
  const calculateTotalPaid = (m: string) => expenses.reduce((s, e) => e.paidBy === m ? s + e.amount : s, 0);
// 🌟 新增 1：計算最終結算方式的演算法 (絕對不影響 Firebase 資料庫)
  const calculateSettlements = () => {
    const balances = MEMBERS.map(m => ({ member: m, balance: calculateTotalPaid(m) - calculateTotalShare(m) }));
    const debtors = balances.filter(b => b.balance < -0.5).sort((a, b) => a.balance - b.balance);
    const creditors = balances.filter(b => b.balance > 0.5).sort((a, b) => b.balance - a.balance);

    const settlements = [];
    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i], creditor = creditors[j];
      const amount = Math.min(-debtor.balance, creditor.balance);
      if (amount > 0.5) settlements.push({ from: debtor.member, to: creditor.member, amount: Math.round(amount) });
      debtor.balance += amount; creditor.balance -= amount;
      if (Math.abs(debtor.balance) < 0.5) i++;
      if (Math.abs(creditor.balance) < 0.5) j++;
    }
    return settlements;
  };
  // 🌟 新增：將結算明細轉換成 LINE 群組好讀的文字並複製
  const handleCopySettlement = () => {
    const settlements = calculateSettlements();
    if (settlements.length === 0) return;

    let text = "✈️ 【旅行結算明細】\n";
    text += "-------------------\n";
    settlements.forEach(s => {
      text += `🔸 ${s.from} 須給 ${s.to} : $${s.amount}\n`;
    });
    text += "-------------------\n";
    text += "感謝大家的參與！💸";

    navigator.clipboard.writeText(text).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000); // 2秒後變回原來的複製按鈕
    }).catch(err => {
      console.error("複製失敗!", err);
      alert("複製失敗，請檢查瀏覽器權限");
    });
  };
  // 🏆 排行榜運算邏輯 (自動計算免手動)
  const getLeaderboard = () => {
    if (expenses.length === 0) return null;
    let maxPaid = { m: '', val: 0 }, maxSpent = { m: '', val: 0 }, maxFood = { m: '', val: 0 };
    MEMBERS.forEach(m => {
      const paid = calculateTotalPaid(m);
      if (paid > maxPaid.val) maxPaid = { m, val: paid };
      const spent = calculateTotalShare(m);
      if (spent > maxSpent.val) maxSpent = { m, val: spent };
      const foodSpent = expenses.filter(e => e.category?.includes('飲食')).reduce((s, exp) => exp.splitMode === 'manual' ? s + (exp.manualShares?.[m] || 0) : (exp.splitBetween?.includes(m) ? s + (exp.amount / exp.splitBetween.length) : s), 0);
      if (foodSpent > maxFood.val) maxFood = { m, val: foodSpent };
    });
    return { maxPaid, maxSpent, maxFood };
  };

  // 📝 儲存與刪除共用清單
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title) return;
    await addDoc(collection(db, "tasks"), { ...newTask, isDone: false, createdAt: Date.now() });
    setNewTask({ title: '', assignee: MEMBERS[0] });
  };
  const toggleTask = async (id: string, current: boolean) => await updateDoc(doc(db, "tasks", id), { isDone: !current });
  const deleteTask = async (id: string) => await deleteDoc(doc(db, "tasks", id));

  // 💰 儲存個人預算設定
  const handleSaveBudget = async () => {
    if (!editingBudget || !editingBudget.limit) return;
    try {
      // 💡 setDoc 的好處：如果沒有這個人的預算，就自動建立；如果已經有了，就覆蓋更新！
      await setDoc(doc(db, "budgets", editingBudget.member), { 
        limit: Number(editingBudget.limit) 
      });
      setEditingBudget(null);
    } catch (error) {
      console.error("儲存預算失敗:", error);
      alert("儲存失敗，請檢查連線！");
    }
  };
  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-ac-beige text-ac-green"><Loader2 className="animate-spin" /></div>;

 if (!user) {
    return (
      <div className="min-h-screen bg-ac-beige flex flex-col items-center justify-center p-6 text-ac-brown relative overflow-hidden">
        {/* 背景裝飾光暈 */}
        <div className="absolute top-10 left-10 w-48 h-48 bg-ac-green/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-64 h-64 bg-ac-brown/5 rounded-full blur-3xl"></div>

        {/* 🎫 主視覺卡片 (登機證風格) */}
        <div className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl border-2 border-ac-shadow relative z-10 flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-8 duration-500">
          
          <div className="w-20 h-20 bg-ac-green/10 text-ac-green rounded-full flex items-center justify-center mb-6 shadow-inner">
            <Ticket size={40} className="rotate-45 drop-shadow-sm" />
          </div>
          
          <h1 className="text-3xl font-black mb-1 uppercase tracking-tighter text-ac-brown">
            Traveler's Note
          </h1>
          <p className="text-xs font-bold text-gray-400 mb-8 tracking-widest uppercase">
            行前規劃 • 分帳 • 記帳
          </p>

          {/* ✂️ 登機證的虛線與缺口設計 */}
          <div className="w-full border-t-2 border-dashed border-gray-200 mb-8 relative">
            <div className="absolute -top-3 -left-11 w-6 h-6 bg-ac-beige rounded-full border-r-2 border-ac-shadow"></div>
            <div className="absolute -top-3 -right-11 w-6 h-6 bg-ac-beige rounded-full border-l-2 border-ac-shadow"></div>
          </div>

          <p className="text-[11px] font-bold text-gray-400 mb-4 uppercase tracking-widest">準備好啟程了嗎？</p>

          {/* 立體按鈕設計 */}
          <button 
            onClick={handleLogin} 
            className="w-full flex items-center justify-center bg-white border-2 border-ac-shadow px-6 py-4 rounded-2xl font-bold shadow-[0_6px_0_#d1d5db] hover:shadow-[0_4px_0_#d1d5db] hover:translate-y-[2px] active:shadow-none active:translate-y-[6px] transition-all text-ac-brown"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5 mr-3" alt="Google Logo" />
            使用 Google 帳號登入
          </button>
        </div>
        
        {/* 底部小字裝飾 */}
        <p className="absolute bottom-8 text-[10px] font-bold text-gray-400 tracking-widest animate-pulse">
          ✈️ YOUR JOURNEY BEGINS HERE
        </p>
      </div>
    );
  }
  return (
    <div className="min-h-screen pb-32 p-6 bg-ac-beige flex flex-col items-center font-['Quicksand',_sans-serif] text-ac-brown overflow-x-hidden">
      
      <header className="mb-6 w-full max-w-md flex flex-col items-center relative">
        <h1 className="text-2xl font-bold tracking-tighter uppercase">TRAVELER'S NOTE</h1>
        <div className="h-1 w-16 bg-ac-green rounded-full mt-1"></div>
        <button onClick={() => signOut(auth)} className="text-[10px] opacity-20 mt-2 hover:opacity-100 transition underline">登出 {user.displayName}</button>
        
        {(activeTab === 'schedule' || activeTab === 'expense') && (
          <button 
            onClick={() => {
              if (activeTab === 'schedule') {
                setEditingId(null);
                setNewEntry({ day: selectedDay, time: '', title: '', location: '', googleMapsUrl: '', imageUrl: '', tags: [], status: '確定去' });
                setIsModalOpen(true);
              } else {
                setEditingExpenseId(null);
                setNewExpense({ title: '', amount: '', category: '🍜 飲食', paidBy:getMatchedMember(user.displayName), paymentMethod: "💵 現金", splitMode: 'equal', splitBetween: MEMBERS, manualShares: {}, receiptUrl: '' });
                setIsExpenseModalOpen(true);
              }
            }} 
            className="absolute right-0 top-0 bg-white p-2 rounded-full shadow-soft-ac border-2 border-ac-shadow text-ac-green"
          >
            <Plus size={20} />
          </button>
        )}
      </header>

      <main className="w-full max-w-md">
        {activeTab === 'boarding' && <BoardingPass />}
        
        {activeTab === 'schedule' && (
          <div className="animate-in fade-in duration-300">
            <div className="flex justify-start sm:justify-center space-x-2 mb-8 overflow-x-auto no-scrollbar py-2">
              {['D1', 'D2', 'D3', 'D4', '預備清單'].map((day) => (
                <button key={day} onClick={() => setSelectedDay(day)} className={`min-w-[75px] px-4 py-2 rounded-full font-bold transition-all border-2 ${selectedDay === day ? 'bg-ac-green text-white border-ac-green shadow-soft-ac scale-105' : 'bg-white text-gray-300 border-ac-shadow'}`}>{day}</button>
              ))}
            </div>
            {loading ? <div className="text-center py-20 text-ac-green"><Loader2 className="animate-spin" /></div> : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={filteredSchedules.map(s => s.id)} strategy={verticalListSortingStrategy}>
                  {filteredSchedules.map((item) => (
                    <SortableItem key={item.id} item={item} onEdit={(i:any) => { setEditingId(i.id); setNewEntry({...i}); setIsModalOpen(true); }} onDelete={(id: string) => deleteDoc(doc(db, "schedules", id))} />
                  ))}
                </SortableContext>
              </DndContext>
            )}
          </div>
        )}

        {activeTab === 'expense' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            
            {/* 1. 頂部輪播圖 */}
            <div onScroll={(e) => setCarouselIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))} className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar scroll-smooth w-full">
              <div className="snap-center shrink-0 w-full px-1">
                <div className="bg-ac-green text-white p-6 rounded-[32px] shadow-soft-ac border-2 border-ac-shadow relative h-40 flex flex-col justify-center">
                  <p className="text-sm font-bold opacity-80 uppercase tracking-wider">Total Expenses</p>
                  <h2 className="text-4xl font-bold mt-1 tracking-tighter">${expenses.reduce((s, e) => s + e.amount, 0).toLocaleString()}</h2>
                </div>
              </div>
              {MEMBERS.map(m => (
                <div key={m} onClick={() => setSelectedMember(m)} className="snap-center shrink-0 w-full px-1 cursor-pointer">
                  <div className="bg-white text-ac-brown p-6 rounded-[32px] shadow-soft-ac border-2 border-ac-shadow h-40 flex flex-col justify-center relative overflow-hidden">
                    <p className="text-sm font-bold opacity-60 uppercase tracking-wider">{m} 應付總額</p>
                    <h2 className="text-4xl font-bold mt-1 tracking-tighter text-ac-green">${Math.round(calculateTotalShare(m)).toLocaleString()}</h2>
                    <div className="bg-ac-beige/50 text-[10px] px-2 py-1 rounded-lg font-bold absolute top-6 right-6">明細</div>
                  </div>
                </div>
              ))}
            </div>

            {/* 2. 輪播點點指示器 */}
            <div className="flex justify-center space-x-1.5 mt-4 mb-4">
              {Array.from({ length: MEMBERS.length + 1 }).map((_, i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${carouselIndex === i ? 'w-4 bg-ac-green' : 'w-1.5 bg-gray-300'}`} />
              ))}
            </div>

            {/* 🌟 3. 新增：最終結算明細區塊 */}
            {expenses.length > 0 && (
              <div className="bg-white p-5 rounded-[24px] shadow-sm border-2 border-ac-shadow mb-6">
               {/* 修改：將標題區塊改成左右兩邊，右邊放複製按鈕 */}
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-bold opacity-80 uppercase tracking-wider flex items-center text-ac-brown">
                    <Receipt size={16} className="mr-2" /> 最終結算清單
                  </h3>
                  {calculateSettlements().length > 0 && (
                    <button 
                      onClick={handleCopySettlement} 
                      className="flex items-center space-x-1 text-[10px] font-bold bg-ac-beige text-ac-brown px-2 py-1.5 rounded-lg border border-ac-shadow hover:bg-ac-green hover:text-white hover:border-ac-green transition-colors active:scale-95"
                    >
                      {isCopied ? <><Check size={12} /><span>已複製</span></> : <><Copy size={12} /><span>複製明細</span></>}
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {calculateSettlements().length > 0 ? (
                    calculateSettlements().map((s, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-ac-beige/30 p-3 rounded-xl border border-gray-100">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-red-400">{s.from}</span>
                          <span className="text-[11px] text-gray-400 font-bold bg-white px-2 py-0.5 rounded-md shadow-sm border border-gray-100">須給</span>
                          <span className="font-bold text-ac-green">{s.to}</span>
                        </div>
                        <span className="font-bold text-ac-brown text-lg">${s.amount}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-xs font-bold text-gray-400 py-2">目前帳目已平衡，無須結算 🎉</div>
                  )}
                </div>
              </div>
            )}

            {/* 4. 消費清單 */}
            {expenses.map(exp => (
              <div key={exp.id} className="bg-white p-4 rounded-[24px] shadow-sm flex justify-between items-center border-2 border-ac-shadow group relative mb-4">
                <div className="flex items-center space-x-3 text-left">
                  <div className="w-10 h-10 bg-ac-beige rounded-full flex items-center justify-center text-lg">{exp.category?.split(' ')[0] || '💰'}</div>
                  <div><p className="font-bold text-ac-brown">{exp.title}</p><p className="text-[10px] text-gray-400 font-bold">{exp.paidBy} 先付 · {exp.splitMode === 'manual' ? '手動' : '均分'}</p></div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-ac-green text-lg">${exp.amount}</div>
                  {exp.receiptUrl && <Receipt size={12} className="text-gray-300 ml-auto mt-1" />}
                </div>
                <div className="absolute -top-2 -right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition">
                  <button onClick={() => { setEditingExpenseId(exp.id); setNewExpense({...exp}); setIsExpenseModalOpen(true); }} className="p-2 bg-ac-beige text-ac-brown rounded-full shadow-sm"><Edit3 size={12}/></button>
                  <button onClick={() => deleteExpense(exp)} className="p-2 bg-red-50 text-red-400 rounded-full shadow-sm"><Trash2 size={12}/></button>
                </div>
              </div>
            ))}
          </div>
        )}
        {activeTab === 'members' && (
          <div className="space-y-6 animate-in fade-in duration-300 pb-10">
            
            {/* 👑 區塊 1：趣味排行榜 */}
            <div className="bg-white p-5 rounded-[24px] shadow-sm border-2 border-ac-shadow relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-100 rounded-full blur-3xl -z-10"></div>
              <h3 className="text-sm font-bold opacity-80 uppercase tracking-wider mb-4 flex items-center text-ac-brown">
                <Trophy size={16} className="mr-2 text-yellow-500" /> 旅伴榮譽榜
              </h3>
              {getLeaderboard() ? (
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-center justify-between bg-yellow-50/50 p-3 rounded-xl border border-yellow-100">
                    <div className="flex items-center space-x-2"><Crown size={16} className="text-yellow-500"/><span className="text-xs font-bold text-gray-500">代墊大富翁</span></div>
                    <div className="text-sm font-bold text-ac-brown">{getLeaderboard()?.maxPaid.m} <span className="text-xs text-ac-green">${Math.round(getLeaderboard()?.maxPaid.val || 0)}</span></div>
                  </div>
                  <div className="flex items-center justify-between bg-red-50/50 p-3 rounded-xl border border-red-100">
                    <div className="flex items-center space-x-2"><Ticket size={16} className="text-red-400"/><span className="text-xs font-bold text-gray-500">撒幣王 (花最多)</span></div>
                    <div className="text-sm font-bold text-ac-brown">{getLeaderboard()?.maxSpent.m} <span className="text-xs text-red-400">${Math.round(getLeaderboard()?.maxSpent.val || 0)}</span></div>
                  </div>
                  <div className="flex items-center justify-between bg-orange-50/50 p-3 rounded-xl border border-orange-100">
                    <div className="flex items-center space-x-2"><Utensils size={16} className="text-orange-400"/><span className="text-xs font-bold text-gray-500">吃貨擔當</span></div>
                    <div className="text-sm font-bold text-ac-brown">{getLeaderboard()?.maxFood.m} <span className="text-xs text-orange-400">${Math.round(getLeaderboard()?.maxFood.val || 0)}</span></div>
                  </div>
                </div>
              ) : <p className="text-xs text-gray-400 text-center py-2 font-bold">還沒有任何消費紀錄喔！</p>}
            </div>

            {/* 🎯 區塊 2：個人預算防護網 */}
            <div className="bg-white p-5 rounded-[24px] shadow-sm border-2 border-ac-shadow">
              <h3 className="text-sm font-bold opacity-80 uppercase tracking-wider mb-4 flex items-center text-ac-brown">
                <Target size={16} className="mr-2 text-ac-green" /> 預算防護網
              </h3>
              <div className="space-y-4">
                {MEMBERS.map(m => {
                  const spent = calculateTotalShare(m);
                  const limit = budgets[m] || 0;
                  const progress = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
                  const isOver = spent > limit && limit > 0;

                  return (
                    <div key={m} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="flex items-center">{m} {isOver && <span className="ml-1 text-[10px] text-red-400 animate-pulse">⚠️ 超支</span>}</span>
                        {editingBudget?.member === m ? (
                          <div className="flex space-x-1">
                            <input type="number" autoFocus value={editingBudget.limit} onChange={e => setEditingBudget({...editingBudget, limit: e.target.value})} className="w-16 p-1 border border-ac-green rounded text-right outline-none" placeholder="金額"/>
                            <button onClick={handleSaveBudget} className="bg-ac-green text-white p-1 rounded"><Save size={12}/></button>
                            <button onClick={() => setEditingBudget(null)} className="bg-gray-100 text-gray-400 p-1 rounded"><X size={12}/></button>
                          </div>
                        ) : (
                          <span className="text-gray-400 cursor-pointer hover:text-ac-green" onClick={() => setEditingBudget({member: m, limit: limit.toString()})}>
                            <span className={isOver ? 'text-red-400' : 'text-ac-brown'}>${Math.round(spent)}</span> / ${limit === 0 ? '未設' : limit} <Edit3 size={10} className="inline ml-1 mb-0.5 opacity-50"/>
                          </span>
                        )}
                      </div>
                      <div className="w-full h-2.5 bg-ac-beige rounded-full overflow-hidden">
                        <div className={`h-full transition-all duration-500 ${isOver ? 'bg-red-400' : progress > 80 ? 'bg-orange-400' : 'bg-ac-green'}`} style={{ width: `${limit === 0 ? 0 : progress}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 🎒 區塊 3：共用行李與任務 */}
            <div className="bg-white p-5 rounded-[24px] shadow-sm border-2 border-ac-shadow">
              <h3 className="text-sm font-bold opacity-80 uppercase tracking-wider mb-4 flex items-center text-ac-brown">
                <BaggageClaim size={16} className="mr-2 text-blue-400" /> 行前分工與共用物品
              </h3>
              
              <form onSubmit={handleAddTask} className="flex space-x-2 mb-4">
                <input type="text" placeholder="新增項目..." className="flex-1 p-2.5 text-xs font-bold rounded-xl border-2 border-ac-shadow bg-ac-beige outline-none focus:border-ac-green" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} />
                <select className="p-2.5 text-xs font-bold rounded-xl border-2 border-ac-shadow bg-white outline-none" value={newTask.assignee} onChange={e => setNewTask({...newTask, assignee: e.target.value})}>
                  {MEMBERS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <button type="submit" className="bg-ac-brown text-white p-2.5 rounded-xl shadow-sm"><Plus size={16}/></button>
              </form>

              <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar pr-1">
                {tasks.map(t => (
                  <div key={t.id} className={`flex items-center justify-between p-3 rounded-xl border ${t.isDone ? 'bg-gray-50 border-transparent opacity-60' : 'bg-white border-ac-shadow'}`}>
                    <div className="flex items-center space-x-3 cursor-pointer" onClick={() => toggleTask(t.id, t.isDone)}>
                      {t.isDone ? <CheckSquare size={16} className="text-ac-green" /> : <Square size={16} className="text-gray-300" />}
                      <span className={`text-sm font-bold ${t.isDone ? 'line-through text-gray-400' : 'text-ac-brown'}`}>{t.title}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-bold bg-ac-beige px-2 py-1 rounded-md text-ac-brown">{t.assignee}</span>
                      <button onClick={() => deleteTask(t.id)} className="text-red-300 hover:text-red-500"><Trash2 size={12}/></button>
                    </div>
                  </div>
                ))}
                {tasks.length === 0 && <p className="text-center text-xs text-gray-400 font-bold py-2">目前沒有待辦事項 ✨</p>}
              </div>
            </div>

          </div>
        )}
      </main>

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* 🗓️ 行程 Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-end justify-center p-4">
          <div className="bg-ac-beige w-full max-w-sm rounded-[32px] p-8 border-t-8 border-ac-green shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-ac-brown">{editingId ? '編輯行程' : '規劃新行程'}</h3>
              <button onClick={() => setIsModalOpen(false)}><X className="text-gray-400" /></button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const dataToSave = { ...newEntry, googleMapsUrl: newEntry.googleMapsUrl?.trim() || '', imageUrl: newEntry.imageUrl?.trim() || '' };
              if (editingId) await updateDoc(doc(db, "schedules", editingId), dataToSave);
              else await addDoc(collection(db, "schedules"), { ...dataToSave, order: 999 });
              setIsModalOpen(false);
            }} className="space-y-4 text-left">
              
            
              {/* 🌟 新增：日期選擇區塊 */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-widest pl-1">選擇天數</p>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                  {['D1', 'D2', 'D3', 'D4', '預備清單'].map(d => (
                    <button 
                      key={d} 
                      type="button" 
                      onClick={() => setNewEntry({...newEntry, day: d})} 
                      className={`min-w-[55px] flex-1 py-2.5 rounded-xl border-2 text-xs font-bold transition-all ${newEntry.day === d ? 'bg-ac-green text-white border-ac-green' : 'bg-white text-gray-400 border-ac-shadow'}`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <input type="text" placeholder="標題" className="w-full p-4 rounded-2xl border-2 border-ac-shadow font-bold" value={newEntry.title} onChange={e => setNewEntry({...newEntry, title: e.target.value})} />
              <input type="text" placeholder="時間 (如 10:30)" className="w-full p-4 rounded-2xl border-2 border-ac-shadow font-bold" value={newEntry.time} onChange={e => setNewEntry({...newEntry, time: e.target.value})} />
              <input type="text" placeholder="圖片網址" className="w-full p-4 rounded-2xl border-2 border-ac-shadow text-sm" value={newEntry.imageUrl} onChange={e => setNewEntry({...newEntry, imageUrl: e.target.value})} />
              
              <div className="flex space-x-2">
                {['確定去', '考慮中'].map(s => (
                  <button key={s} type="button" onClick={() => setNewEntry({...newEntry, status: s})} className={`flex-1 py-3 rounded-xl border-2 font-bold ${newEntry.status === s ? 'bg-ac-green text-white border-ac-green' : 'bg-white text-gray-300'}`}>{s}</button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {ALL_TAGS.map(t => (
                  <button key={t} type="button" onClick={() => {
                    const tags = newEntry.tags || [];
                    setNewEntry({...newEntry, tags: tags.includes(t) ? tags.filter((x:any)=>x!==t) : [...tags, t]});
                  }} className={`text-[10px] py-2 rounded-lg border-2 font-bold ${newEntry.tags?.includes(t) ? 'bg-ac-green text-white border-ac-green' : 'bg-white text-gray-400'}`}>{t}</button>
                ))}
              </div>
              <button type="submit" className="w-full bg-ac-green text-white font-bold py-5 rounded-2xl shadow-soft-ac mt-4 active:scale-95 transition">確認儲存</button>
            </form>
          </div>
        </div>
      )}

      {/* 💰 記帳 Modal (🌟 這次絕對有消費分類按鈕！) */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-end justify-center p-4 text-ac-brown">
          <div className="bg-ac-beige w-full max-w-sm rounded-[32px] p-8 border-t-8 border-ac-green shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold">記一筆花費 💸</h3><button onClick={() => setIsExpenseModalOpen(false)}><X /></button></div>
            <form onSubmit={handleSaveExpense} className="space-y-4 text-left">
              <input type="text" placeholder="品項名稱" required className="w-full p-4 rounded-2xl border-2 border-ac-shadow font-bold" value={newExpense.title} onChange={e => setNewExpense({...newExpense, title: e.target.value})} />
              <input type="number" placeholder="金額 (泰銖)" required className="w-full p-4 rounded-2xl border-2 border-ac-shadow font-bold text-ac-green text-lg" value={newExpense.amount} onChange={e => setNewExpense({...newExpense, amount: e.target.value})} />
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-ac-green ml-1 uppercase tracking-widest">類別</label>
                <div className="flex flex-wrap gap-2">
                  {EXPENSE_CATEGORIES.map(cat => (
                    <button key={cat} type="button" onClick={() => setNewExpense({...newExpense, category: cat})} className={`py-1.5 px-3 rounded-xl border-2 text-[11px] font-bold transition-all ${newExpense.category === cat ? 'bg-ac-green text-white border-ac-green' : 'bg-white text-gray-400 border-ac-shadow'}`}>{cat}</button>
                  ))}
                </div>
              </div>

              <div className="relative flex items-center w-full p-1 rounded-2xl border-2 border-ac-shadow bg-white">
                <label className="flex items-center bg-ac-beige px-4 py-3 rounded-xl font-bold cursor-pointer hover:bg-ac-green hover:text-white transition">
                  {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
                  <span className="ml-2 text-xs">上傳收據</span>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
                <div className="flex-1 px-3 text-[10px] font-bold">
                  {newExpense.receiptUrl ? <div className="flex items-center justify-between text-ac-green">✅ 已上傳 <button type="button" onClick={handleRemoveReceipt} className="text-red-400"><X size={14}/></button></div> : <span className="text-gray-400">尚未上傳</span>}
                </div>
              </div>

              <div className="bg-white p-4 rounded-[24px] border-2 border-ac-shadow space-y-4 shadow-inner">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-widest pl-1">誰先墊的？</p>
                  <div className="flex gap-2">{MEMBERS.map(m => (
                    <button key={m} type="button" onClick={() => setNewExpense({...newExpense, paidBy: m})} className={`flex-1 py-2 rounded-xl border-2 text-xs font-bold transition-all ${newExpense.paidBy === m ? 'bg-ac-brown text-white border-ac-brown' : 'bg-white'}`}>{m}</button>
                  ))}</div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2"><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">分帳方式</p>
                    <div className="bg-gray-100 p-1 rounded-lg flex gap-1">
                      <button type="button" onClick={() => setNewExpense({...newExpense, splitMode: 'equal'})} className={`px-3 py-1 text-[10px] font-bold rounded-md ${newExpense.splitMode !== 'manual' ? 'bg-white shadow-sm text-ac-brown' : 'text-gray-400'}`}>均分</button>
                      <button type="button" onClick={() => setNewExpense({...newExpense, splitMode: 'manual'})} className={`px-3 py-1 text-[10px] font-bold rounded-md ${newExpense.splitMode === 'manual' ? 'bg-white shadow-sm text-ac-brown' : 'text-gray-400'}`}>手動</button>
                    </div>
                  </div>
                  {newExpense.splitMode === 'manual' ? (
                    <div className="space-y-2 animate-in fade-in duration-200">{MEMBERS.map(m => (
                      <div key={m} className="flex items-center justify-between bg-gray-50 p-2 rounded-xl border border-gray-100">
                        <span className="text-xs font-bold pl-2">{m}</span>
                        <input type="number" placeholder="0" className="w-24 p-2 text-right text-sm font-bold rounded-lg border border-gray-200 outline-none focus:border-ac-green" value={newExpense.manualShares?.[m] || ''} onChange={e => setNewExpense({...newExpense, manualShares: {...newExpense.manualShares, [m]: Number(e.target.value)}})} />
                      </div>
                    ))}
                    <div className="text-right text-[10px] font-bold">目前總和: <span className={manualSum === Number(newExpense.amount) ? 'text-ac-green' : 'text-red-400'}>${manualSum}</span></div>
                    </div>
                  ) : (
                    <div className="flex gap-2 animate-in fade-in duration-200">{MEMBERS.map(m => (
                      <button key={m} type="button" onClick={() => {
                        const s = newExpense.splitBetween || [];
                        setNewExpense({...newExpense, splitBetween: s.includes(m) ? s.filter((x:any)=>x!==m) : [...s, m]});
                      }} className={`flex-1 py-2 rounded-xl border-2 text-xs font-bold ${newExpense.splitBetween?.includes(m) ? 'bg-ac-green/20 text-ac-green border-ac-green' : 'bg-gray-50 text-gray-300 border-transparent'}`}>{m}</button>
                    ))}</div>
                  )}
                </div>
              </div>
              <button type="submit" className="w-full bg-ac-green text-white font-bold py-5 rounded-2xl shadow-soft-ac mt-4 active:scale-95 transition">確認儲存</button>
            </form>
          </div>
        </div>
      )}

      {/* 👤 成員明細彈窗 */}
      {selectedMember && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[110] flex items-end justify-center p-4 text-ac-brown animate-in slide-in-from-bottom">
          <div className="bg-ac-beige w-full max-w-sm rounded-[32px] p-8 border-t-8 border-ac-green shadow-2xl max-h-[85vh] overflow-y-auto no-scrollbar">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">{selectedMember} 的帳務儀表板</h3>
              <button onClick={() => setSelectedMember(null)}><X className="text-gray-400" /></button>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6 text-center">
              <div className="bg-white p-4 rounded-2xl border-2 border-ac-shadow"><p className="text-[10px] font-bold text-gray-400 mb-1">總代墊</p><p className="text-xl font-bold">${Math.round(calculateTotalPaid(selectedMember))}</p></div>
              <div className="bg-white p-4 rounded-2xl border-2 border-ac-shadow"><p className="text-[10px] font-bold text-gray-400 mb-1">應攤銷</p><p className="text-xl font-bold text-ac-green">${Math.round(calculateTotalShare(selectedMember))}</p></div>
            </div>
            {/* 🌟 新增 3：個人專屬結算提示，只顯示跟該成員有關的帳 */}
            {calculateSettlements().filter(s => s.from === selectedMember || s.to === selectedMember).length > 0 && (
              <div className="mb-6 bg-ac-green/10 p-4 rounded-2xl border border-ac-green/20">
                <p className="text-xs font-bold text-ac-green mb-2 uppercase tracking-widest flex items-center"><Receipt size={14} className="mr-1"/> 結算動作</p>
                <div className="space-y-2">
                  {calculateSettlements().filter(s => s.from === selectedMember || s.to === selectedMember).map((s, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm font-bold bg-white p-2 rounded-lg shadow-sm border border-ac-green/10">
                      {s.from === selectedMember ? (
                        <><span className="text-red-400">需給 {s.to}</span><span className="text-ac-brown">${s.amount}</span></>
                      ) : (
                        <><span className="text-ac-green">向 {s.from} 收取</span><span className="text-ac-brown">${s.amount}</span></>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <p className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-widest">相關紀錄</p>
            <div className="space-y-2">
              {expenses.filter(e => e.paidBy === selectedMember || (e.splitMode === 'manual' ? e.manualShares?.[selectedMember] > 0 : e.splitBetween?.includes(selectedMember))).map(e => (
                <div key={e.id} className="bg-white p-3 rounded-xl border border-ac-shadow flex justify-between items-center">
                  <span className="text-sm font-bold">{e.title}</span>
                  <span className="text-xs font-bold text-ac-green">{e.paidBy === selectedMember ? `代墊 $${e.amount}` : `攤 $${Math.round(e.splitMode === 'manual' ? e.manualShares?.[selectedMember] : e.amount/e.splitBetween.length)}`}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}