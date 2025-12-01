"use client";
import type { Users, Session } from "@prisma/client";
import {
  useSignal,
  initDataRaw as _initDataRaw,
} from "@telegram-apps/sdk-react";
import { useRawInitData } from "@tma.js/sdk-react";
import { useContext, createContext, useState, useEffect, useRef } from "react";

interface AppContextType {
  user: Users | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  authenticateUser: () => Promise<void>;
  clearAuth: () => void;
}

const MAX_RETRY_ATTEMPTS = 3;

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Users | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [initData, setInitData] = useState<string | null>(null);

  //const initDataRaw = useSignal(_initDataRaw);
  const isAuthenticated = !!user && !!session;
  const [sessionStatus, setSessionStatus] = useState<"valid" | "invalid">();

  const initDataRaw = useRawInitData();

  useEffect(() => {
    if (!initData && initDataRaw) {
      setInitData(initDataRaw);
    }
  }, [initDataRaw]);

  const initialCheckComplete = useRef(false);
  const authInProgress = useRef(false);
  const retryCount = useRef(0);

  const clearAuth = () => {
    setUser(null);
    setSession(null);
    setSessionStatus(undefined);
    retryCount.current = 0;
  };

  const authenticateUser = async () => {
    retryCount.current += 1;
    if (retryCount.current > MAX_RETRY_ATTEMPTS) {
      console.error("Max retry attempts reached");
      setIsLoading(false);
      authInProgress.current = false;
      clearAuth();
      return;
    }

    try {
      if (!initData) {
        console.error("Telegram raw data is undefined.");
        setIsLoading(false);
        authInProgress.current = false;
        return;
      }

      setIsLoading(true);
      authInProgress.current = true;
      const res = await fetch("/api/auth/authenticate-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ initData: initData }),
      });

      const data = await res.json();
      setUser(data.user);
      setSession(data.session);
      setSessionStatus("valid");
      retryCount.current = 0;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Authentication failed";
      setSessionStatus("invalid");
      console.error(message);
    } finally {
      setIsLoading(false);
      authInProgress.current = false;
    }
  };

  useEffect(() => {
    if (!initialCheckComplete.current) return;

    if (
      initData &&
      sessionStatus === "invalid" &&
      !isLoading &&
      !authInProgress.current
    ) {
      console.log(
        "Session expired and Telegram data available, re-authenticating..."
      );
      authenticateUser();
    }
  }, [initData, sessionStatus, isLoading]);

  useEffect(() => {
    const checkAuthStatus = async () => {
      console.log("Checking auth status---->");
      try {
        setIsLoading(true);

        const res = await fetch("/api/auth/me", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });

        if (res.ok) {
          const data = await res.json();
          if (data.user && data.session) {
            setUser(data.user);
            setSession(data.session);
            setSessionStatus("valid");
            console.log("Existing valid session found");
          } else {
            setSessionStatus("invalid");
            setUser(null);
            setSession(null);
            console.log("No existing session");
          }
        } else {
          setUser(null);
          setSession(null);
          setSessionStatus("invalid");
        }
      } catch (error) {
        console.error("Auth status check failed:", error);
        setSessionStatus("invalid");
      } finally {
        setIsLoading(false);
        initialCheckComplete.current = true;
      }
    };

    checkAuthStatus();
  }, []);

  const value: AppContextType = {
    user,
    session,
    isLoading,
    isAuthenticated,
    authenticateUser,
    clearAuth,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
}
