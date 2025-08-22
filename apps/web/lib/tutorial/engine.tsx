'use client';

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { TutorialScenario, TutorialStep, TutorialContext, TutorialTarget, TutorialAction } from './types';

interface EngineState {
    active: boolean;
    scenario?: TutorialScenario;
    step?: TutorialStep;
    start: (scenario: TutorialScenario) => void;
    stop: () => void;
    canPerform: (action: TutorialAction) => boolean;
    markTurnAdvanced: () => void;
}

const TutorialCtx = createContext<EngineState | null>(null);

export function TutorialProvider({ children }: { children: React.ReactNode }) {
    const [active, setActive] = useState(false);
    const [scenario, setScenario] = useState<TutorialScenario | undefined>();
    const [step, setStep] = useState<TutorialStep | undefined>();
    const [turnAdvanced, setTurnAdvanced] = useState(false);

    const getElementForTarget = (target: TutorialTarget): HTMLElement | null => {
        if (target === 'hand') return document.querySelector('[data-tutorial="hand"]') as HTMLElement;
        if (target === 'endTurnButton') return document.querySelector('[data-tutorial="endTurnButton"]') as HTMLElement;
        if (typeof target === 'object') {
            const key = `${target.zone}-${target.index}`;
            return document.querySelector(`[data-tutorial="${key}"]`) as HTMLElement;
        }
        return null;
    };

    const ctx: TutorialContext = useMemo(() => ({
        getElementForTarget,
        emit: (event, payload) => {
            if (event === 'turnAdvanced') setTurnAdvanced(true);
        }
    }), []);

    useEffect(() => {
        if (!active || !scenario || !step) return;
        step.onEnter?.(ctx);
        const id = setInterval(() => {
            if (step.completeWhen(ctx)) {
                if (step.next) {
                    const next = scenario.steps.find(s => s.id === step.next);
                    if (next) setStep(next); else setActive(false);
                } else {
                    setActive(false);
                }
            }
        }, 250);
        return () => clearInterval(id);
    }, [active, scenario, step, ctx]);

    const canPerform = (action: TutorialAction): boolean => {
        if (!active || !step?.gate) return true;
        return step.gate.allowedActions.some(a => a.type === action.type);
    };

    const start = (sc: TutorialScenario) => {
        setScenario(sc);
        setStep(sc.steps[0]);
        setActive(true);
        setTurnAdvanced(false);
    };

    const stop = () => {
        setActive(false);
        setScenario(undefined);
        setStep(undefined);
    };

    const value: EngineState = { active, scenario, step, start, stop, canPerform, markTurnAdvanced: () => setTurnAdvanced(true) };
    return <TutorialCtx.Provider value={value}>{children}</TutorialCtx.Provider>;
}

export function useTutorial() {
    const v = useContext(TutorialCtx);
    if (!v) throw new Error('useTutorial must be used within TutorialProvider');
    return v;
}

// Simple overlay spotlighter
export function TutorialOverlay() {
    const { active, step, stop } = useTutorial();
    const ref = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!active || !step?.target) return;
        const el = document.querySelector('[data-tutorial-overlay]') as HTMLElement;
        if (!el) return;
    }, [active, step?.target]);

    if (!active || !step) return null;
    const targetEl = step.target ? (typeof step.target === 'object' ? document.querySelector(`[data-tutorial="${step.target.zone}-${step.target.index}"]`) : document.querySelector(`[data-tutorial="${step.target}"]`)) : null;
    const rect = targetEl?.getBoundingClientRect();

    return (
        <div data-tutorial-overlay className="pointer-events-none fixed inset-0 z-[60]">
            <div className="absolute inset-0 bg-black/60" />
            {rect && (
                <div
                    className="absolute border-2 border-yellow-400 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]"
                    style={{
                        left: rect.left - 8,
                        top: rect.top - 8,
                        width: rect.width + 16,
                        height: rect.height + 16
                    }}
                />
            )}
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-[560px] max-w-[90vw] p-4 bg-black/85 border border-yellow-500/40 rounded-lg text-white pointer-events-auto">
                <div className="font-bold text-yellow-300 mb-1">{step.title}</div>
                <div className="text-sm text-white/90">{step.body}</div>
                <div className="mt-3 flex justify-end gap-2">
                    <button onClick={stop} className="px-3 py-1 rounded bg-white/10 hover:bg-white/20">Skip</button>
                </div>
            </div>
        </div>
    );
}


