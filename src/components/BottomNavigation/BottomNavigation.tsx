'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ShoppingBag, CheckSquare, User } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';

export const BottomNavigation = () => {
  const pathname = usePathname();
  const { session } = useAppContext();
  const isDedicated =
    session?.app_scope === 'dedicated' && session?.locked_companion_id;
  const homeHref = isDedicated
    ? `/companion/${session.locked_companion_id}`
    : '/dashboard';

  if (isDedicated) {
    return (
      <div className="fixed bottom-5 left-1/2 transform -translate-x-1/2 w-fit max-w-xl bg-muted flex justify-center items-center gap-2 z-10 rounded-2xl py-2 px-4">
        <Link
          href={homeHref}
          className={`flex items-center justify-center text-white p-4 rounded-xl transition-all duration-200 hover:text-white ${
            pathname?.startsWith('/companion/') ? 'bg-gradient-pink-purple text-white shadow-lg' : ''
          }`}
        >
          <Home size={26} />
        </Link>

        {/* Commented out untill feature not for MVP */}
        {/* <Link
          href="/shop"
          className={`flex items-center justify-center text-white p-4 rounded-xl transition-all duration-200 hover:text-white ${
            pathname === '/shop' ? 'bg-gradient-pink-purple text-white shadow-lg' : ''
          }`}
        >
          <ShoppingBag size={26} />
        </Link> */}

        <Link
          id="onboarding-profile"
          href="/profile"
          className={`flex items-center justify-center text-white p-4 rounded-xl transition-all duration-200 hover:text-white ${
            pathname === '/profile' ? 'bg-gradient-pink-purple text-white shadow-lg' : ''
          }`}
        >
          <User size={26} />
        </Link>
      </div>
    );
  }

  return (
    <div className="fixed bottom-5 left-1/2 transform -translate-x-1/2 w-fit max-w-xl bg-muted flex justify-center items-center gap-2 z-10 rounded-2xl py-2 px-4">
      <Link
        href="/dashboard"
        className={`flex items-center justify-center text-white p-4 rounded-xl transition-all duration-200 hover:text-white ${
          pathname === '/dashboard' ? 'bg-gradient-pink-purple text-white shadow-lg' : ''
        }`}
      >
        <Home size={26} />
      </Link>

      {/* Commented out untill feature not for MVP */}
      {/* <Link
        href="/shop"
        className={`flex items-center justify-center text-white p-4 rounded-xl transition-all duration-200 hover:text-white ${
          pathname === '/shop' ? 'bg-gradient-pink-purple text-white shadow-lg' : ''
        }`}
      >
        <ShoppingBag size={26} />
      </Link>

      <Link
        href="/tasks"
        className={`flex items-center justify-center text-white p-4 rounded-xl transition-all duration-200 hover:text-white ${
          pathname === '/tasks' ? 'bg-gradient-pink-purple text-white shadow-lg' : ''
        }`}
      >
        <CheckSquare size={26} />
      </Link> */}

      <Link
        id="onboarding-profile"
        href="/profile"
        className={`flex items-center justify-center text-white p-4 rounded-xl transition-all duration-200 hover:text-white ${
          pathname === '/profile' ? 'bg-gradient-pink-purple text-white shadow-lg' : ''
        }`}
      >
        <User size={26} />
      </Link>
    </div>
  );
};
