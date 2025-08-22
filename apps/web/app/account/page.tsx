"use client";

import { AccountSettings } from "@stackframe/stack";

export default function AccountPage() {
    // Full-page account settings using Neon Auth component, themed via Providers
    return (
        <div className="min-h-[calc(100vh-4rem)] w-full bg-slate-950 text-slate-100">
            <div className="mx-auto max-w-3xl px-4 py-10">
                <h1 className="text-2xl font-bold mb-6">Account</h1>
                <div className="rounded-md border border-slate-800 bg-slate-900/60 p-4 shadow">
                    <AccountSettings />
                </div>
            </div>
        </div>
    );
}


