'use client';

import { UserButton } from "@stackframe/stack";
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function UserProfile() {
    return (
        <UserButton />
    );
}

// Keep the old auth buttons for guest users - Stack will handle this automatically
export function AuthButtons() {
    return (
        <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
                <Link href="/handler/sign-in">Sign In</Link>
            </Button>
            <Button size="sm" asChild>
                <Link href="/handler/sign-up">Sign Up</Link>
            </Button>
        </div>
    );
}
