'use client';

import { UserButton, useUser } from "@stackframe/stack";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { User, LogIn } from 'lucide-react';

export function UserProfile() {
    const user = useUser();

    // If user is not signed in, show sign in/up buttons with icons
    if (!user) {
        return (
            <div className="flex gap-2 items-center">
                <Button variant="outline" size="sm" asChild className="bg-slate-800 border-slate-600 hover:bg-slate-700 text-white">
                    <Link href="/handler/sign-in" className="flex items-center gap-2">
                        <LogIn className="w-4 h-4" />
                        Sign In
                    </Link>
                </Button>
                <Button size="sm" asChild className="bg-purple-600 hover:bg-purple-700">
                    <Link href="/handler/sign-up" className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Sign Up
                    </Link>
                </Button>
            </div>
        );
    }

    // If user is signed in, show the UserButton (which has built-in styling)
    return <UserButton />;
}

// Additional component for displaying user status in game
export function UserStatus() {
    const user = useUser();

    if (!user) {
        return (
            <div className="text-sm text-slate-400 flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                Playing as Guest
            </div>
        );
    }

    return (
        <div className="text-sm text-green-400 flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            {user.displayName || user.primaryEmail || 'Authenticated'}
        </div>
    );
}
