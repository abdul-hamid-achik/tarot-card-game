export type TutorialTarget =
    | 'hand'
    | { zone: 'hand'; index: number }
    | { zone: 'bench'; index: number }
    | { zone: 'battlefield'; index: number }
    | 'endTurnButton'
    | 'attackToken'
    | 'opponentBoard'
    | 'manaPanel';

export type TutorialAction =
    | { type: 'playCardFromHand'; handIndex?: number }
    | { type: 'moveFromBenchToBattlefield'; benchIndex?: number }
    | { type: 'pressEndTurn' }
    | { type: 'startCombat' };

export interface TutorialContext {
    // Expose anything needed to validate steps
    getElementForTarget: (target: TutorialTarget) => HTMLElement | null;
    emit?: (event: string, payload?: any) => void;
}

export interface TutorialStep {
    id: string;
    title: string;
    body: string;
    target?: TutorialTarget;
    gate?: { allowedActions: TutorialAction[] };
    onEnter?: (ctx: TutorialContext) => void;
    completeWhen: (ctx: TutorialContext) => boolean;
    next?: string;
}

export interface TutorialScenario {
    id: string;
    title: string;
    steps: TutorialStep[];
}


