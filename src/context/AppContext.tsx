'use client';
import type { Users, Session} from "@prisma/client";
import { useSignal,   
    initDataRaw as _initDataRaw,
    initDataState as _initDataState, 
} from "@telegram-apps/sdk-react";
import { useContext, createContext, useState, useEffect, useRef } from "react";
interface AppContextType {
    user: Users | null;
    session: Session | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    authenticateUser: () => Promise<void>;
    handleAuthError: () => Promise<void>;
    clearAuth: () => void;
}


const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<Users | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const initDataRaw = useSignal(_initDataRaw);
    const initDataState = useSignal(_initDataState);
    const isAuthenticated = !!user && !!session;
    const [sessionStatus, setSessionStatus] = useState<'valid' | 'expired' | 'none'>('none');

    // Prevent multiple simultaneous auth attempts
    const initialCheckComplete = useRef(false);
    const authInProgress = useRef(false);
    const retryCount = useRef(0);
    const MAX_RETRY_ATTEMPTS = 3;


    const clearAuth = () => {
        setUser(null);
        setSession(null);
        setSessionStatus('none');
        retryCount.current = 0;
    };

    const authenticateUser = async () => {
        if (authInProgress.current) {
            return;
        }
        try {

            if (!initDataState || !initDataRaw) {
                console.error('Telegram raw data is undefined.');
                return;
            }

            setIsLoading(true);
            authInProgress.current = true;
            const res = await fetch('/api/auth/authenticate-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ initData: initDataRaw }),
              });
            
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Login failed');
            }
            
            const data = await res.json();
            setUser(data.user);
            setSession(data.session);
            setSessionStatus('valid');
            retryCount.current = 0; 
        }catch (error) {
            const message = error instanceof Error ? error.message : 'Authentication failed';
            setSessionStatus('expired');
            console.error(message);
        }finally {
            setIsLoading(false);
            authInProgress.current = false;
        }
    }

    const handleAuthError = async () => {
        // Check if we've exceeded retry attempts
        if (retryCount.current >= MAX_RETRY_ATTEMPTS) {
            console.error('Max retry attempts reached');
            clearAuth();
            return;
        }

        retryCount.current += 1;
        
        try {
            // First, try to check current auth status
            const res = await fetch('/api/auth/me', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
            });
            
            if (res.ok) {
                const data = await res.json();
                if (data.user && data.session) {
                    setUser(data.user);
                    setSession(data.session);
                    retryCount.current = 0;
                    setSessionStatus('valid');
                    console.log('Auth recovered via session check');
                    return;
                }
            }

            setSessionStatus('expired');
            
            // If that fails and we have Telegram data, try to re-authenticate
            if (initDataRaw) {
                await authenticateUser();
            } else {
                clearAuth();
            }
            
        } catch (error) {            
            // Exponential backoff for retries
            if (retryCount.current < MAX_RETRY_ATTEMPTS) {
                const delay = Math.min(1000 * Math.pow(2, retryCount.current), 10000);
                setTimeout(() => {
                    handleAuthError();
                }, delay);
            } else {
                clearAuth();
            }
        }
    };




        // Check auth status on mount ONLY - no dependencies to avoid infinite loops
    // Check auth status on mount
    useEffect(() => {
        const checkAuthStatus = async () => {
            try {
                setIsLoading(true);
                
                const res = await fetch('/api/auth/me', {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                });
                
                if (res.ok) {
                    const data = await res.json();
                    if (data.user && data.session) {
                        setUser(data.user);
                        setSession(data.session);
                        setSessionStatus('valid');
                        console.log('Existing valid session found');
                    } else {
                        setSessionStatus('none');
                        console.log('No existing session');
                    }
                } else if (res.status === 401) {
                    // Session is expired or doesn't exist
                    setSessionStatus('expired');
                    console.log('Session expired or not found');
                } else {
                    setSessionStatus('none');
                }
            } catch (error) {
                console.error('Auth status check failed:', error);
                setSessionStatus('none');
            } finally {
                setIsLoading(false);
                initialCheckComplete.current = true;
            }
        };

        checkAuthStatus();
    }, []);


       // ONLY auto-authenticate when session is expired AND Telegram data is available
       useEffect(() => {
        // Wait for initial check to complete
        if (!initialCheckComplete.current) return;
        
        // Only authenticate if:
        // 1. We have Telegram data
        // 2. Session is explicitly expired (not 'none' for new users)
        // 3. Not currently loading or authenticating
        if (
            initDataRaw && 
            (sessionStatus === 'expired' || sessionStatus === 'none') && 
            !isLoading && 
            !authInProgress.current
        ) {
            console.log('Session expired and Telegram data available, re-authenticating...');
            authenticateUser();
        }
    }, [initDataRaw, sessionStatus, isLoading]);





    const value: AppContextType = {
        user,
        session,
        isLoading,
        isAuthenticated,
        authenticateUser,
        handleAuthError,
        clearAuth,
      };

    return (
        <AppContext.Provider value={value}>
          {children}
        </AppContext.Provider>
      );
}


export function useAppContext() {
    const context = useContext(AppContext);
    if (context === undefined) {
      throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
  }