'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ShoppingBag, CheckSquare, User } from 'lucide-react';

export const BottomNavigation = () => {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-2 left-1/2 transform -translate-x-1/2 w-[calc(100%-2rem)] max-w-xl bg-[#272a2f] flex justify-around items-center z-10 rounded-2xl text-xs border border-purple-500 shadow-xl shadow-purple-500/20 py-1 px-2">
      <Link
        href="/dashboard"
        className={`flex flex-col items-center justify-center text-[#85827d] w-1/5 p-2 rounded-xl transition-all duration-200 hover:bg-[#1d2025] hover:text-white ${
          pathname === "/dashboard" ? "bg-[#1d2025] text-purple-400" : ""
        }`}
      >
        <Home size={18} className="mb-0.5" />
        <p className={`text-xs font-medium ${pathname === "/" ? "text-purple-400" : ""}`}>Главная</p>
      </Link>

      <Link
        href="/shop"
        className={`flex flex-col items-center justify-center text-[#85827d] w-1/5 p-2 rounded-xl transition-all duration-200 hover:bg-[#1d2025] hover:text-white ${
          pathname === "/shop" ? "bg-[#1d2025] text-purple-400" : ""
        }`}
      >
        <ShoppingBag size={18} className="mb-0.5" />
        <p className={`text-xs font-medium ${pathname === "/shop" ? "text-purple-400" : ""}`}>Магазин</p>
      </Link>

      <Link
        href="/tasks"
        className={`flex flex-col items-center justify-center text-[#85827d] w-1/5 p-2 rounded-xl transition-all duration-200 hover:bg-[#1d2025] hover:text-white ${
          pathname === "/tasks" ? "bg-[#1d2025] text-purple-400" : ""
        }`}
      >
        <CheckSquare size={18} className="mb-0.5" />
        <p className={`text-xs font-medium ${pathname === "/tasks" ? "text-purple-400" : ""}`}>Задания</p>
      </Link>

      <Link
        href="/profile"
        className={`flex flex-col items-center justify-center text-[#85827d] w-1/5 p-2 rounded-xl transition-all duration-200 hover:bg-[#1d2025] hover:text-white ${
          pathname === "/profile" ? "bg-[#1d2025] text-purple-400" : ""
        }`}
      >
        <User size={18} className="mb-0.5" />
        <p className={`text-xs font-medium ${pathname === "/profile" ? "text-purple-400" : ""}`}>Профиль</p>
      </Link>
    </div>
  );
};
