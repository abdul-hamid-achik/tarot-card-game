import { TutorialScenario, TutorialContext } from './types';

function hasBenchUnit(ctx: TutorialContext): boolean {
    const benchSlots = Array.from(document.querySelectorAll('[data-tutorial^="bench-"]'));
    return benchSlots.some(el => el.querySelector('[data-card]'));
}

function hasBattlefieldUnit(ctx: TutorialContext): boolean {
    const bfSlots = Array.from(document.querySelectorAll('[data-tutorial^="battlefield-"]'));
    return bfSlots.some(el => el.querySelector('[data-card]'));
}

export const basicsScenario: TutorialScenario = {
    id: 'basics',
    title: 'Basics',
    steps: [
        {
            id: 'step-hand',
            title: 'Your Hand',
            body: 'Click a card in your hand to open its actions.',
            target: 'hand',
            gate: { allowedActions: [{ type: 'playCardFromHand' }] },
            completeWhen: () => !!document.querySelector('[data-action-menu-open="true"]'),
            next: 'step-play-to-bench'
        },
        {
            id: 'step-play-to-bench',
            title: 'Play a Unit',
            body: 'Play a unit from your hand to the back row (bench).',
            target: { zone: 'bench', index: 0 },
            gate: { allowedActions: [{ type: 'playCardFromHand' }] },
            completeWhen: hasBenchUnit,
            next: 'step-to-battlefield'
        },
        {
            id: 'step-to-battlefield',
            title: 'Prepare for Battle',
            body: 'Move a unit from your bench to the battlefield to ready an attack.',
            target: { zone: 'battlefield', index: 0 },
            gate: { allowedActions: [{ type: 'moveFromBenchToBattlefield' }] },
            completeWhen: hasBattlefieldUnit,
            next: 'step-end-turn'
        },
        {
            id: 'step-end-turn',
            title: 'Advance the Round',
            body: 'End your turn to pass priority. Next round you can attack!',
            target: 'endTurnButton',
            gate: { allowedActions: [{ type: 'pressEndTurn' }] },
            completeWhen: () => !!document.querySelector('[data-turn-advanced="true"]'),
        }
    ]
};


