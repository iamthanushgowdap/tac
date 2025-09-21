
import type { Post, PostCategory } from '@/types';
import { CalendarDays, Newspaper, Paperclip, BookOpen, FileText } from 'lucide-react';

export const getInitials = (name?: string | null): string => {
  if (!name) return "??";
  const parts = name.split(/[\s@]+/);
  if (parts.length > 1 && parts[0] && parts[parts.length - 1]) {
    const firstInitial = parts[0][0];
    let secondInitial = '';
    const lastPart = parts[parts.length - 1];
    if (lastPart && lastPart.length > 0 && parts.length > 1) {
       secondInitial = lastPart[0];
    } else if (parts[0].length > 1) {
      secondInitial = parts[0][1];
    }
    return `${firstInitial}${secondInitial}`.toUpperCase();
  }
  if (name.length >=2) return name.substring(0, 2).toUpperCase();
  if (name.length === 1) return name.substring(0,1).toUpperCase();
  return "??"; 
};

export const categoryIcons: Partial<Record<PostCategory, React.ElementType>> = {
  event: CalendarDays,
  news: Newspaper,
  link: Paperclip,
  note: BookOpen,
  schedule: CalendarDays,
};

export const getPostIconColor = (category: PostCategory | undefined) => {
  if (!category) return "text-gray-500 dark:text-gray-400";
  switch(category) {
    case 'event': return "text-indigo-500 dark:text-indigo-400";
    case 'news': return "text-green-500 dark:text-green-400";
    case 'link': return "text-yellow-500 dark:text-yellow-400";
    case 'note': return "text-purple-500 dark:text-purple-400";
    case 'schedule': return "text-teal-500 dark:text-teal-400";
    default: return "text-gray-500 dark:text-gray-400";
  }
};
