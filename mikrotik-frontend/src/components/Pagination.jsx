import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Reusable Pagination Component with Ellipsis logic
 * @param {number} currentPage - หน้าปัจจุบัน
 * @param {number} totalPages - จำนวนหน้าทั้งหมด
 * @param {function} setCurrentPage - ฟังก์ชันสำหรับเปลี่ยนหน้า
 * @param {boolean} isSticky - กำหนดให้แสดงผลแบบลอยตัว (Sticky) หรือไม่ (Default: true)
 */
const Pagination = ({ currentPage, totalPages, setCurrentPage, isSticky = true }) => {
  const { t } = useTranslation();
  if (totalPages <= 1) return null;

  // Logic สำหรับแสดงเลขหน้าแบบย่อ (Pagination with ellipsis)
  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  const wrapperClass = isSticky 
    ? "sticky bottom-6 z-30 flex justify-center mt-8 pointer-events-none" 
    : "flex justify-center mt-auto pt-4 mb-2";
  
  const innerClass = isSticky
    ? "flex items-center gap-1 p-1.5 bg-blue-50/80 backdrop-blur-md border border-blue-200/60 rounded-full shadow-[0_8px_30px_rgb(59,130,246,0.15)] pointer-events-auto transition-all hover:bg-blue-50/95"
    : "flex items-center gap-1 p-1.5 bg-blue-50/80 backdrop-blur-md border border-blue-200/60 rounded-full shadow-[0_4px_20px_rgb(59,130,246,0.1)] transition-all hover:bg-blue-50/95";

  return (
    <div className={wrapperClass}>
      <div className={innerClass}>
        
        <button 
          onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
          disabled={currentPage === 1} 
          title={t('common.previous', 'Previous')}
          className="p-2 rounded-full text-blue-500 hover:bg-blue-100 hover:text-blue-700 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-blue-500 transition-all"
        >
          <ChevronLeft size={20} strokeWidth={2.5} />
        </button>
        
        <div className="flex items-center gap-1 px-2">
          {getPageNumbers().map((page, index) => (
            page === '...' ? (
              <span key={`ellipsis-${index}`} className="w-8 text-center text-blue-400 font-bold select-none">
                ...
              </span>
            ) : (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                title={t('common.page_n', { num: page })}
                className={`w-9 h-9 rounded-full text-sm font-bold transition-all ${
                  currentPage === page 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30' 
                    : 'text-blue-600/70 hover:bg-blue-100 hover:text-blue-700'
                }`}
              >
                {page}
              </button>
            )
          ))}
        </div>

        <button 
          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
          disabled={currentPage === totalPages} 
          title={t('common.next', 'Next')}
          className="p-2 rounded-full text-blue-500 hover:bg-blue-100 hover:text-blue-700 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-blue-500 transition-all"
        >
          <ChevronRight size={20} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
};

export default Pagination;