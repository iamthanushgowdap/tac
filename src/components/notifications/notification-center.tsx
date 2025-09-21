
"use client";

import React, { useState, useEffect } from 'react';
import type { Notification } from '@/types';
import { NOTIFICATION_STORAGE_KEY } from '@/types';
import { User } from '@/components/auth-provider';
import {
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { BellRing, Trash2, BookCheck, AlertCircle, FileWarning } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';

interface NotificationCenterProps {
  user: User;
  onClose: () => void;
}

const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
        case 'approval': return <BookCheck className="h-5 w-5 text-green-500" />;
        case 'assignment_deadline': return <FileWarning className="h-5 w-5 text-orange-500" />;
        case 'fee_due': return <AlertCircle className="h-5 w-5 text-red-500" />;
        case 'low_attendance': return <AlertCircle className="h-5 w-5 text-yellow-500" />;
        default: return <BellRing className="h-5 w-5 text-blue-500" />;
    }
};

export function NotificationCenter({ user, onClose }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined' && user) {
      const allNotificationsStr = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
      const allNotifications: Notification[] = allNotificationsStr ? JSON.parse(allNotificationsStr) : [];
      const userNotifications = allNotifications
        .filter(n => n.userId === user.uid)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setNotifications(userNotifications);
    }
  }, [user]);
  
  const clearAllNotifications = () => {
      if (typeof window === 'undefined' || !user) return;
      const allNotificationsStr = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
      let allNotifications: Notification[] = allNotificationsStr ? JSON.parse(allNotificationsStr) : [];
      allNotifications = allNotifications.filter(n => n.userId !== user.uid);
      localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(allNotifications));
      setNotifications([]);
  };

  const handleNotificationClick = (notification: Notification) => {
    if (notification.href) {
        router.push(notification.href);
        onClose();
    }
  };


  return (
    <SheetContent className="flex flex-col">
      <SheetHeader>
        <SheetTitle>Notifications</SheetTitle>
        <SheetDescription>
          Recent alerts and updates.
        </SheetDescription>
      </SheetHeader>
      <ScrollArea className="flex-1 my-4 -mx-6 px-6">
        <div className="space-y-3">
          {notifications.length > 0 ? (
            notifications.map(notification => (
              <div
                key={notification.id}
                className={`flex items-start gap-4 p-3 rounded-lg transition-colors ${notification.href ? 'cursor-pointer hover:bg-muted/50' : 'cursor-default'}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{notification.title}</p>
                  <p className="text-xs text-muted-foreground">{notification.message}</p>
                  <p className="text-xs text-muted-foreground/80 mt-1">
                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-muted-foreground py-10">
              <BellRing className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2">No new notifications.</p>
            </div>
          )}
        </div>
      </ScrollArea>
      <SheetFooter>
        <Button 
            variant="destructive" 
            className="w-full"
            onClick={clearAllNotifications}
            disabled={notifications.length === 0}
        >
          <Trash2 className="mr-2 h-4 w-4" /> Clear All Notifications
        </Button>
      </SheetFooter>
    </SheetContent>
  );
}
