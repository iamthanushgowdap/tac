
"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { Icons } from '@/components/icons';
import { SiteConfig } from '@/config/site';

const SplashScreen = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background"
  >
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.2, duration: 0.5, ease: 'easeOut' }}
      className="flex flex-col items-center"
    >
      <Icons.AppLogo className="h-16 w-16 text-primary" />
      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="mt-4 text-3xl font-bold tracking-tight text-primary"
      >
        {SiteConfig.name}
      </motion.h1>
      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.5 }}
        className="text-muted-foreground"
      >
        The all-in-one platform for your campus.
      </motion.p>
    </motion.div>
  </motion.div>
);

const DiveInScreen = ({ onDiveIn }: { onDiveIn: () => void }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.8 }}
    className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center"
  >
    <Icons.AppLogo className="h-20 w-20 text-primary" />
    <h1 className="mt-8 text-4xl font-extrabold tracking-tight lg:text-5xl">
      The All-In-One
      <br />
      <span className="text-primary">Campus System</span>
    </h1>
    <p className="mt-4 max-w-md text-lg text-muted-foreground">
      Stay connected, informed, and ahead. Your entire college experience, unified.
    </p>
    <button onClick={onDiveIn} className="mt-8 bg-black dark:bg-white text-white dark:text-black font-medium py-[0.35em] pl-[1.2em] text-[17px] rounded-[0.9em] border-none tracking-[0.05em] flex items-center shadow-[inset_0_0_1.6em_-0.6em_#4a4a4a] dark:shadow-[inset_0_0_1.6em_-0.6em_#e0e0e0] overflow-hidden relative h-[2.8em] pr-[3.3em] cursor-pointer group">
      Dive In
      <div className="icon bg-white dark:bg-black ml-4 absolute flex items-center justify-center h-[2.2em] w-[2.2em] rounded-[0.7em] shadow-[0.1em_0.1em_0.6em_0.2em_#2e2e2e] dark:shadow-[0.1em_0.1em_0.6em_0.2em_#999] right-[0.3em] transition-all duration-300 group-hover:w-[calc(100%-0.6em)]">
        <svg
          height="24"
          width="24"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          className="w-[1.1em] transition-transform duration-300 text-black dark:text-white group-hover:translate-x-1"
        >
          <path d="M0 0h24v24H0z" fill="none"></path>
          <path
            d="M16.172 11l-5.364-5.364 1.414-1.414L20 12l-7.778 7.778-1.414-1.414L16.172 13H4v-2z"
            fill="currentColor"
          ></path>
        </svg>
      </div>
    </button>
  </motion.div>
);

export default function HomePage() {
  const [showSplash, setShowSplash] = useState(true);
  const [showDiveIn, setShowDiveIn] = useState(false);
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const splashTimer = setTimeout(() => {
      setShowSplash(false);
      setShowDiveIn(true);
    }, 2500); // Show splash for 2.5 seconds

    return () => clearTimeout(splashTimer);
  }, []);

  const handleDiveIn = () => {
    if (!isLoading) {
      if (user) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
  };
  
   // This handles the case where the user is already logged in when they hit the page.
   // After the splash, it will redirect immediately without showing the Dive In screen.
  useEffect(() => {
    if (!showSplash && !isLoading && user) {
        router.push('/dashboard');
    }
  }, [showSplash, isLoading, user, router]);


  return (
    <AnimatePresence>
      {showSplash ? (
        <SplashScreen />
      ) : (isLoading || user) ? (
        // While loading or if user exists, show a blank screen or a minimal loader after splash
        // to avoid flashing the DiveIn screen before redirect.
         <div className="fixed inset-0 bg-background" />
      ) : (
        showDiveIn && <DiveInScreen onDiveIn={handleDiveIn} />
      )}
    </AnimatePresence>
  );
}
