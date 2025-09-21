"use client";

import React from 'react';
import { Badge } from '@/components/ui/badge';
import type { FeeStatus } from '@/types';

interface FeeStatusBadgeProps {
  status: FeeStatus;
}

export function FeeStatusBadge({ status }: FeeStatusBadgeProps) {
  const getVariant = (): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'paid':
        return 'default'; // Uses primary color, which is black in the theme
      case 'pending':
        return 'secondary';
      case 'overdue':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getClassName = () => {
    switch (status) {
        case 'paid': return 'bg-green-500 hover:bg-green-600 text-white';
        case 'pending': return 'bg-yellow-500 hover:bg-yellow-600 text-white';
        case 'overdue': return 'bg-red-500 hover:bg-red-600 text-white';
        default: return '';
    }
  }

  return (
    <Badge variant={getVariant()} className={`capitalize ${getClassName()}`}>
      {status}
    </Badge>
  );
}
