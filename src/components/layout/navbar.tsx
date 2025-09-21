
"use client";

import Link from "next/link";
import { SiteConfig } from "@/config/site";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth, User } from "@/components/auth-provider";
import React, { useEffect, useState, useCallback } from 'react';
import type { Post, UserProfile, NotificationPreferences, Notification } from "@/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, LayoutDashboard, Settings, Newspaper, Home, UserCircle, Sun, Moon, BookOpen, CalendarClock, BarChart3, FilePlus2, Users, Users as UsersIcon, Bell } from "lucide-react";
import { ThemeToggleButton } from "@/components/theme-toggle-button";
import { getInitials } from "@/components/content/post-item-utils";
import { SimpleRotatingSpinner } from "@/components/ui/loading-spinners";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { NOTIFICATION_STORAGE_KEY } from "@/types";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, signOut } = useAuth();
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | undefined>(undefined);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);

  const calculateUnreadNotifications = useCallback(() => {
    if (typeof window === 'undefined' || !user) {
      setUnreadNotifications(0);
      return;
    }
    
    // Calculate unread notifications
    const allNotificationsStr = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
    const allNotifications: Notification[] = allNotificationsStr ? JSON.parse(allNotificationsStr) : [];
    const userNotifications = allNotifications.filter(n => n.userId === user.uid);
    const unread = userNotifications.filter(n => !n.isRead);
    setUnreadNotifications(unread.length);

  }, [user]);

  const markNotificationsAsRead = () => {
    if (typeof window === 'undefined' || !user || unreadNotifications === 0) return;
    const allNotificationsStr = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
    let allNotifications: Notification[] = allNotificationsStr ? JSON.parse(allNotificationsStr) : [];
    
    allNotifications = allNotifications.map(n => {
        if (n.userId === user.uid && !n.isRead) {
            return { ...n, isRead: true };
        }
        return n;
    });

    localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(allNotifications));
    setUnreadNotifications(0);
  };
  

  useEffect(() => {
    calculateUnreadNotifications();
    if (user && typeof window !== 'undefined') {
      const userProfileStr = localStorage.getItem(`apsconnect_user_${user.uid}`);
      if (userProfileStr) {
        const userProfile = JSON.parse(userProfileStr) as UserProfile;
        setUserAvatarUrl(userProfile.avatarDataUrl);
      } else {
        setUserAvatarUrl(undefined);
      }
    } else {
      setUserAvatarUrl(undefined);
    }

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === NOTIFICATION_STORAGE_KEY || (user && event.key === `apsconnect_seen_post_ids_${user.uid}`)) {
        calculateUnreadNotifications();
      }
      if (user && event.key === `apsconnect_user_${user.uid}`) {
        const updatedProfileStr = localStorage.getItem(`apsconnect_user_${user.uid}`);
        if (updatedProfileStr) {
          const updatedProfile = JSON.parse(updatedProfileStr) as UserProfile;
          setUserAvatarUrl(updatedProfile.avatarDataUrl);
        } else {
           setUserAvatarUrl(undefined);
        }
      }
    };

    const handlePostsSeenEvent = () => {
        calculateUnreadNotifications();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange);
      window.addEventListener('postsSeen', handlePostsSeenEvent);
      // Custom event listener for notifications
      window.addEventListener('notificationsUpdated', calculateUnreadNotifications);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('postsSeen', handlePostsSeenEvent);
        window.removeEventListener('notificationsUpdated', calculateUnreadNotifications);
      }
    };
  }, [user, pathname, calculateUnreadNotifications]);

  const handleLogout = async () => {
    await signOut();
  };

  const getDashboardLink = () => {
    if (!user) return "/";
    switch (user.role) {
      case "admin":
        return "/admin";
      case "faculty":
        return "/faculty";
      case "student":
      case "pending":
      case "alumni":
        return "/student";
      default:
        return "/dashboard";
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center">
        <Link href="/" className="mr-4 md:mr-6 flex items-center space-x-2" aria-label="Go to APSConnect Homepage">
          <Icons.AppLogo className="h-6 w-6 text-primary" />
          <span className="font-bold sm:inline-block">{SiteConfig.name}</span>
        </Link>
        <nav className="hidden md:flex flex-1 items-center space-x-2 sm:space-x-4 md:space-x-6 text-sm font-medium">
          {SiteConfig.mainNav.map((item) => {
            if (isLoading) {
              if (item.title === "Home") { /* Always render Home */ } else { return null; }
            } else {
              if (item.hideWhenLoggedIn && user) return null;
              if (item.protected && !user) return null;
              if (item.adminOnly && (!user || user.role !== 'admin')) return null;
              if (item.facultyOnly && (!user || user.role !== 'faculty')) return null;
              if (item.studentOnly && (!user || !(user.role === 'student' || user.role === 'pending' || user.role === 'alumni'))) return null;
            }
            return (
                <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                    "transition-colors hover:text-primary relative flex items-center",
                    pathname === item.href ? "text-primary" : "text-foreground/60",
                    "text-xs sm:text-sm"
                    )}
                    suppressHydrationWarning
                >
                    {item.icon && <item.icon className="mr-1.5 h-4 w-4" />}
                    {item.title}
                </Link>
            );
          })}
        </nav>

        <div className="flex items-center space-x-1 sm:space-x-2 ml-auto">
          {isLoading ? (
             <SimpleRotatingSpinner className="h-8 w-8 text-primary" />
          ) : user ? (
            <>
            <ThemeToggleButton />
            
            <Sheet open={isNotificationCenterOpen} onOpenChange={(open) => {
              setIsNotificationCenterOpen(open);
              if (open) {
                  markNotificationsAsRead();
              }
            }}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {unreadNotifications > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 w-4">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-destructive text-xs text-white items-center justify-center">
                        {unreadNotifications > 9 ? '9+' : unreadNotifications}
                      </span>
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <NotificationCenter user={user} onClose={() => setIsNotificationCenterOpen(false)} />
            </Sheet>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full" suppressHydrationWarning aria-label="User menu">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={userAvatarUrl || undefined} alt={user.displayName || "User Avatar"} data-ai-hint="person avatar" />
                    <AvatarFallback className="bg-muted text-muted-foreground">
                      {getInitials(user.displayName || user.email || user.usn)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.displayName || "User"}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email || user.usn} ({user.role})
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    <DropdownMenuItem asChild>
                    <Link href={getDashboardLink()} className="flex items-center">
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        <span>Dashboard</span>
                    </Link>
                    </DropdownMenuItem>
                     <DropdownMenuItem asChild>
                        <Link href="/profiles" className="flex items-center">
                          <UsersIcon className="mr-2 h-4 w-4" />
                          <span>Profiles</span>
                        </Link>
                      </DropdownMenuItem>
                     {(user.role === 'admin' || user.role === 'faculty' || user.role === 'student' || user.role === 'alumni') && (
                      <DropdownMenuItem asChild>
                        <Link href="/clubs" className="flex items-center">
                          <UsersIcon className="mr-2 h-4 w-4" />
                          <span>Clubs</span>
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem asChild>
                    <Link href="/profile/settings" className="flex items-center">
                        <UserCircle className="mr-2 h-4 w-4" />
                        <span>Profile Settings</span>
                    </Link>
                    </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="flex items-center cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            </>
          ) : (
            <>
              <Button asChild variant="outline" size="sm" suppressHydrationWarning>
                <Link href="/login" suppressHydrationWarning>Login</Link>
              </Button>
              <Button asChild size="sm" suppressHydrationWarning>
                <Link href="/register" suppressHydrationWarning>Register</Link>
              </Button>
              <ThemeToggleButton />
            </>
          )}
        </div>
      </div>
    </header>
  );
}
