"use client";

import React from 'react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Post } from '@/types';
import { User } from '@/components/auth-provider';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { getInitials, categoryIcons, getPostIconColor } from './post-item-utils';
import { Heart, MessageSquare, MoreHorizontal, Edit3, Trash2, MapPin, Users } from 'lucide-react';

interface PostItemProps {
  post: Post;
  currentUser: User | null;
  onLikePost: (postId: string) => void;
  onDeletePost: (postId: string) => void;
  onEditPost?: (postId: string) => void;
}

export function PostItem({ post, currentUser, onLikePost, onDeletePost, onEditPost }: PostItemProps) {
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = React.useState(false);
    const IconComponent = categoryIcons[post.category] || MessageSquare;
    const canEdit = currentUser && (currentUser.role === 'admin' || (currentUser.role === 'faculty' && post.authorId === currentUser.uid));
    const canDelete = currentUser && (currentUser.role === 'admin' || (currentUser.role === 'faculty' && post.authorId === currentUser.uid));

    const confirmDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsDeleteAlertOpen(true);
    };

    const editPost = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onEditPost) onEditPost(post.id);
    };

    return (
        <>
            <div className="py-6 transition-colors duration-200 hover:bg-muted/30">
                <div className="flex items-start space-x-4">
                    <Avatar className="h-11 w-11">
                        <AvatarImage src={post.authorAvatarUrl} alt={post.authorName} data-ai-hint="person avatar" />
                        <AvatarFallback>{getInitials(post.authorName)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                        <div className="flex items-center justify-between">
                            <div>
                                <Link href={`/post/${post.id}`} className="font-semibold text-foreground hover:underline">
                                    {post.authorName}
                                </Link>
                                <span className="text-sm text-muted-foreground ml-2">
                                    &bull; {formatDistanceToNow(parseISO(post.createdAt), { addSuffix: true })}
                                </span>
                            </div>
                            {(canEdit || canDelete) && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                        {canEdit && onEditPost && <DropdownMenuItem onClick={editPost}><Edit3 className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>}
                                        {canDelete && <DropdownMenuItem onClick={confirmDelete} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem>}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>

                        <Link href={`/post/${post.id}`} className="block mt-1">
                            <h2 className="text-lg font-bold tracking-tight text-primary">{post.title}</h2>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                                <Badge variant={post.category === 'event' || post.category === 'schedule' ? 'default' : 'secondary'} className="capitalize flex items-center gap-1">
                                    <IconComponent className={`h-3 w-3 ${getPostIconColor(post.category)}`} />
                                    {post.category}
                                </Badge>
                                {post.targetBranches && post.targetBranches.length > 0 ? (
                                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3"/> For: {post.targetBranches.join(', ')}</span>
                                ) : (
                                     <span className="flex items-center gap-1"><Users className="h-3 w-3"/> For: All Branches</span>
                                )}
                            </div>
                            <p className="mt-2 text-sm text-foreground/90 whitespace-pre-wrap line-clamp-3">
                                {post.content}
                            </p>
                        </Link>

                        <div className="mt-4 flex items-center gap-4">
                            <Button variant="ghost" size="sm" className="flex items-center gap-1.5 text-muted-foreground" onClick={() => onLikePost(post.id)}>
                                <Heart className={`h-4 w-4 ${post.likes?.includes(currentUser?.uid || '') ? 'text-red-500 fill-red-500' : ''}`} />
                                <span className="text-xs">{post.likes?.length || 0}</span>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
             <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure you want to delete this post?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the post titled "{post.title}".
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDeletePost(post.id)} className="bg-destructive hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
