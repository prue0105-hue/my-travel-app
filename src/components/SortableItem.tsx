// src/components/SortableItem.tsx

import { MapPin, Trash2, Edit3, GripHorizontal } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export default function SortableItem({ item, onEdit, onDelete }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const rawMapUrl = item.googleMapsUrl || item.place || (item.location?.startsWith('http') ? item.location : null);
  const mapUrl = typeof rawMapUrl === 'string' ? rawMapUrl.trim() : null;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 1,
    opacity: isDragging ? 0.8 : (item.status === '考慮中' ? 0.6 : 1),
  };

  return (
    <div ref={setNodeRef} style={style} className="bg-white rounded-[24px] shadow-soft-ac border-2 border-ac-shadow overflow-hidden flex flex-col mb-3">
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none relative">
        {item.imageUrl ? (
          <div className="w-full h-32 overflow-hidden border-b-2 border-ac-shadow">
            <img src={item.imageUrl} alt="" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
          </div>
        ) : (
          <div className="w-full h-8 bg-ac-beige/40 border-b-2 border-ac-shadow flex items-center justify-center text-gray-400 hover:bg-ac-beige transition-colors">
            <GripHorizontal size={16} className="opacity-60" />
          </div>
        )}
      </div>

      <div className="p-3.5 flex items-start">
        <div className="w-12 text-xs font-bold text-ac-green flex flex-col items-center">
          <span>{item.time || "00:00"}</span>
          <div className="w-0.5 h-6 bg-ac-shadow mt-1.5 rounded-full opacity-30"></div>
        </div>
        
        <div className="ml-2 flex-1">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <span className="font-bold text-[15px] leading-tight block">{item.title}</span>
              <p className="text-[9px] text-gray-400 mt-1 flex items-center">
                <MapPin size={9} className="mr-1" /> {item.location && !item.location.startsWith('http') ? item.location : '查看地圖'}
              </p>
            </div>
            
            <div className="flex space-x-1.5 ml-2">
              {mapUrl && (
                <a href={mapUrl} target="_blank" rel="noreferrer" className="p-1.5 bg-ac-green text-white rounded-full shadow-md active:scale-90 transition">
                  <MapPin size={14} strokeWidth={3} />
                </a>
              )}
              <button onClick={() => onEdit(item)} className="p-1.5 bg-ac-beige rounded-full text-ac-brown transition"><Edit3 size={14} /></button>
              <button onClick={() => onDelete(item.id)} className="p-1.5 bg-red-50 rounded-full text-red-400 transition"><Trash2 size={14} /></button>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-1 mt-2">
            {item.tags?.map((tag: string) => (
              <span key={tag} className="text-[9px] px-2 py-0.5 bg-ac-shadow text-ac-green rounded-full font-bold">{tag}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}