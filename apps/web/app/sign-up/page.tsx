"use client";

import { SignUp } from "@stackframe/stack";
import Link from "next/link";

export default function SignUpPage() {
    return (
        <div className="min-h-[calc(100vh-4rem)] w-full bg-slate-950 text-slate-100 flex items-center justify-center px-4 py-10">
            <div className="w-full max-w-md">
                <div className="mb-6 text-center">
                    <h1 className="text-2xl font-bold">Create your account</h1>
                    <p className="text-sm text-slate-400">Join and start playing</p>
                </div>
                <div className="rounded-md border border-slate-800 bg-slate-900/60 p-4 shadow-card-glow">
                    <SignUp />
                </div>
                <p className="mt-4 text-center text-sm text-slate-400">
                    Already have an account? <Link href="/sign-in" className="text-purple-400 hover:underline">Sign in</Link>
                </p>
            </div>
        </div>
    );
}


