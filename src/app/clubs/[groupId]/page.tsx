
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth, User } from '@/components/auth-provider';
import type { Group, GroupMessage, UserProfile } from '@/types';
import { getGroupById, getGroupMembers } from '@/lib/groups-utils';
import { GROUP_MESSAGES_STORAGE_KEY } from '@/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ShieldCheck, ArrowLeft, Send, Users, Info, Shield, MessageSquare } from 'lucide-react';
import { SimpleRotatingSpinner } from '@/components/ui/loading-spinners';
import { getInitials } from '@/components/content/post-item-utils';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export default function GroupChatPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  const groupId = params.groupId as string;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const canPost = user && group && (group.type === 'student' || user.role === 'admin' || user.role === 'faculty');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const loadMessages = useCallback(() => {
    const allMessagesStr = localStorage.getItem(GROUP_MESSAGES_STORAGE_KEY);
    const allMessages: GroupMessage[] = allMessagesStr ? JSON.parse(allMessagesStr) : [];
    const groupMessages = allMessages.filter(m => m.groupId === groupId).sort((a,b) => parseISO(a.timestamp).getTime() - parseISO(b.timestamp).getTime());
    setMessages(groupMessages);
  }, [groupId]);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
        return;
      }
      
      const foundGroup = getGroupById(groupId);
      if (foundGroup) {
        const groupMembers = getGroupMembers(groupId);
        const isMember = groupMembers.some(m => m.uid === user.uid);
        
        // Admins can access any group, especially official ones.
        const isAdmin = user.role === 'admin';

        if (isMember || isAdmin) {
          setGroup(foundGroup);
          setMembers(groupMembers);
          loadMessages();
        } else {
          // Not a member, redirect
           toast({ title: "Access Denied", description: "You are not a member of this group.", variant: "destructive" });
           router.push('/clubs');
        }
      } else {
         toast({ title: "Group Not Found", variant: "destructive" });
         router.push('/clubs');
      }
      setPageLoading(false);
    }
  }, [groupId, user, authLoading, router, toast, loadMessages]);
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !user || !group) return;
    setIsSending(true);

    const message: GroupMessage = {
      id: crypto.randomUUID(),
      groupId: group.id,
      authorUid: user.uid,
      authorName: user.displayName || 'Unknown User',
      authorAvatarUrl: user.avatarDataUrl,
      content: newMessage.trim(),
      timestamp: new Date().toISOString(),
    };

    const allMessagesStr = localStorage.getItem(GROUP_MESSAGES_STORAGE_KEY);
    const allMessages: GroupMessage[] = allMessagesStr ? JSON.parse(allMessagesStr) : [];
    allMessages.push(message);
    localStorage.setItem(GROUP_MESSAGES_STORAGE_KEY, JSON.stringify(allMessages));
    
    setMessages(prev => [...prev, message]);
    setNewMessage('');
    setIsSending(false);
    setTimeout(scrollToBottom, 100);
  };
  
  if (pageLoading || authLoading) {
    return <div className="container mx-auto p-4 flex justify-center items-center min-h-[calc(100vh-10rem)]"><SimpleRotatingSpinner className="h-12 w-12 text-primary" /></div>;
  }
  
  if (!group) {
    return <div className="container mx-auto p-4 text-center text-muted-foreground">Group not found or you don't have access.</div>;
  }

  return (
    <div className="container mx-auto h-[calc(100vh-8rem)] flex flex-col p-0 sm:p-4">
      <Card className="flex-1 flex flex-col shadow-lg w-full h-full">
        <CardHeader className="flex flex-row items-center justify-between border-b p-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" /></Button>
            <div>
              <CardTitle className="text-lg font-semibold">{group.name}</CardTitle>
              <CardDescription className="text-xs">{group.description}</CardDescription>
            </div>
          </div>
          <Sheet>
            <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4"/> {members.length} Member{members.length > 1 ? 's' : ''}
                </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Group Members</SheetTitle>
                <SheetDescription>{group.name}</SheetDescription>
              </SheetHeader>
              <div className="py-4 space-y-3 max-h-[80vh] overflow-y-auto">
                {members.sort((a,b) => (a.displayName || a.email).localeCompare(b.displayName || b.email)).map(member => (
                  <div key={member.uid} className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={member.avatarDataUrl} />
                      <AvatarFallback>{getInitials(member.displayName || member.email)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{member.displayName}</p>
                      <p className="text-xs text-muted-foreground">{member.role === 'student' ? member.usn : member.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground pt-10">No messages yet. Be the first to start the conversation!</div>
          )}
          {messages.map(msg => (
            <div key={msg.id} className={`flex items-start gap-3 ${msg.authorUid === user?.uid ? 'justify-end' : ''}`}>
               {msg.authorUid !== user?.uid && (
                <Avatar className="h-8 w-8">
                    <AvatarImage src={msg.authorAvatarUrl} />
                    <AvatarFallback>{getInitials(msg.authorName)}</AvatarFallback>
                </Avatar>
               )}
               <div className={`flex flex-col ${msg.authorUid === user?.uid ? 'items-end' : 'items-start'}`}>
                <div className={`p-3 rounded-lg max-w-xs md:max-w-md ${msg.authorUid === user?.uid ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  {msg.authorUid !== user?.uid && <p className="text-xs font-semibold mb-1">{msg.authorName}</p>}
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{formatDistanceToNow(parseISO(msg.timestamp), { addSuffix: true })}</p>
               </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </CardContent>
        <CardFooter className="p-4 border-t">
          {canPost ? (
            <div className="w-full flex items-center gap-2">
              <Textarea
                placeholder="Type a message..."
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={e => {if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }}}
                rows={1}
                className="min-h-0 h-10 resize-none"
              />
              <Button onClick={handleSendMessage} disabled={isSending || !newMessage.trim()}>
                {isSending ? <SimpleRotatingSpinner className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                <span className="sr-only">Send</span>
              </Button>
            </div>
          ) : (
            <div className="w-full text-center text-sm text-muted-foreground p-2 bg-muted rounded-md flex items-center justify-center gap-2">
                <Shield className="h-4 w-4" /> Only faculty and admins can post in this group.
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
