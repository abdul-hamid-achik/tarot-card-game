'use client';

import { useState } from 'react';

export function PixelDemo() {
    const [health, setHealth] = useState(75);
    const [showModal, setShowModal] = useState(false);

    return (
        <div className="min-h-screen p-8 bg-pixel-gray-1 crt-screen">
            {/* Header */}
            <div className="pixel-card pixel-corner-decoration mb-8">
                <div className="p-px-16 bg-pixel-gray-4 border-b-2 border-pixel-gray-10">
                    <h1 className="text-2xl font-bold text-pixel-white neon-yellow animate-pulse">
                        🎮 PIXEL ART THEME DEMO
                    </h1>
                </div>
                <div className="p-px-16 bg-pixel-gray-2">
                    <p className="text-pixel-gray-12 text-px-12">
                        Using pixel-perfect utilities from Tailwind config!
                    </p>
                </div>
            </div>

            {/* Color Palette */}
            <div className="mb-8">
                <h2 className="text-xl font-bold text-pixel-white mb-4 neon-green">
                    8-BIT COLOR PALETTE
                </h2>
                <div className="grid grid-cols-4 gap-px-4 mb-4">
                    {Object.entries({
                        'Red': 'bg-pixel-red',
                        'Green': 'bg-pixel-green',
                        'Blue': 'bg-pixel-blue',
                        'Yellow': 'bg-pixel-yellow',
                    }).map(([name, className]) => (
                        <div key={name} className="pixel-card">
                            <div className={`${className} h-px-16 rounded-px-1 mb-px-4`}></div>
                            <div className="text-px-10 text-center text-pixel-white">{name}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Interactive Demo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-px-8">
                {/* Left Column */}
                <div className="space-y-px-8">
                    <div className="pixel-card">
                        <div className="p-px-12 bg-pixel-gray-4 border-b-2 border-pixel-gray-10">
                            <h3 className="text-px-14 text-pixel-white neon-blue">PIXEL BUTTONS</h3>
                        </div>
                        <div className="p-px-12 bg-pixel-gray-2">
                            <div className="grid grid-cols-2 gap-px-4">
                                <button className="px-px-8 py-px-6 bg-pixel-gray-8 border-2 border-pixel-gray-12 text-pixel-white text-px-12 uppercase hover:bg-pixel-gray-10 shadow-pixel-2">
                                    DEFAULT
                                </button>
                                <button className="px-px-8 py-px-6 bg-pixel-blue border-2 border-pixel-blue-bright text-pixel-white text-px-12 uppercase hover:bg-pixel-blue-bright shadow-pixel-glow-blue animate-pixel-pulse">
                                    PRIMARY
                                </button>
                                <button className="px-px-8 py-px-6 bg-pixel-gray-6 border-2 border-pixel-gray-10 text-pixel-white text-px-12 uppercase hover:bg-pixel-gray-8 shadow-pixel-2">
                                    SECONDARY
                                </button>
                                <button className="px-px-8 py-px-6 bg-pixel-red border-2 border-pixel-red-bright text-pixel-white text-px-12 uppercase hover:bg-pixel-red-bright shadow-pixel-glow-red animate-pixel-flicker">
                                    DANGER
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="pixel-card">
                        <div className="p-px-12 bg-pixel-gray-4 border-b-2 border-pixel-gray-10">
                            <h3 className="text-px-14 text-pixel-white neon-yellow">HEALTH BAR</h3>
                        </div>
                        <div className="p-px-12 bg-pixel-gray-2">
                            <div className="space-y-px-4">
                                <div className="flex justify-between text-px-12 text-pixel-white">
                                    <span>Health</span>
                                    <span>{health}/100</span>
                                </div>
                                <div className="bg-pixel-gray-4 border-2 border-pixel-gray-12 shadow-pixel-inset h-px-16 overflow-hidden">
                                    <div
                                        className="bg-pixel-green h-full transition-all duration-300 shadow-pixel-glow-green"
                                        style={{ width: `${health}%` }}
                                    ></div>
                                </div>
                                <div className="flex gap-px-4">
                                    <button
                                        className="px-px-6 py-px-4 bg-pixel-red border-2 border-pixel-red-bright text-pixel-white text-px-10 uppercase hover:bg-pixel-red-bright shadow-pixel-2"
                                        onClick={() => setHealth(Math.max(0, health - 10))}
                                    >
                                        -10
                                    </button>
                                    <button
                                        className="px-px-6 py-px-4 bg-pixel-green border-2 border-pixel-green-bright text-pixel-white text-px-10 uppercase hover:bg-pixel-green-bright shadow-pixel-2"
                                        onClick={() => setHealth(Math.min(100, health + 10))}
                                    >
                                        +10
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="space-y-px-8">
                    <div className="pixel-card">
                        <div className="p-px-12 bg-pixel-gray-4 border-b-2 border-pixel-gray-10">
                            <h3 className="text-px-14 text-pixel-white neon-purple">ANIMATIONS</h3>
                        </div>
                        <div className="p-px-12 bg-pixel-gray-2">
                            <div className="grid grid-cols-2 gap-px-8 text-center">
                                <div>
                                    <div className="text-2xl mb-px-4 animate-pixel-bounce">🎯</div>
                                    <div className="text-px-10 text-pixel-white">BOUNCE</div>
                                </div>
                                <div>
                                    <div className="text-2xl mb-px-4 animate-pixel-rotate">⭐</div>
                                    <div className="text-px-10 text-pixel-white">ROTATE</div>
                                </div>
                                <div>
                                    <div className="text-2xl mb-px-4 animate-pixel-scale">💎</div>
                                    <div className="text-px-10 text-pixel-white">SCALE</div>
                                </div>
                                <div>
                                    <div className="text-2xl mb-px-4 animate-pixel-shake">⚡</div>
                                    <div className="text-px-10 text-pixel-white">SHAKE</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pixel-card">
                        <div className="p-px-12 bg-pixel-gray-4 border-b-2 border-pixel-gray-10">
                            <h3 className="text-px-14 text-pixel-white neon-cyan">GLITCH EFFECT</h3>
                        </div>
                        <div className="p-px-12 bg-pixel-gray-2 text-center">
                            <div
                                className="text-2xl animate-pixel-glitch text-pixel-white"
                                data-text="ERROR 404"
                            >
                                ERROR 404
                            </div>
                            <p className="text-px-10 text-pixel-gray-10 mt-px-4">
                                System malfunction detected!
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal Demo */}
            <div className="mt-px-8 text-center">
                <button
                    className="px-px-12 py-px-8 bg-pixel-blue border-2 border-pixel-blue-bright text-pixel-white text-px-14 uppercase hover:bg-pixel-blue-bright shadow-pixel-4"
                    onClick={() => setShowModal(true)}
                >
                    OPEN MODAL
                </button>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-px-8">
                    <div
                        className="bg-pixel-gray-3 border-4 border-pixel-gray-12 shadow-pixel-4 rounded-px-4 max-w-md w-full"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-px-16 bg-pixel-gray-6 border-b-4 border-pixel-gray-10">
                            <h3 className="text-px-16 text-pixel-white text-center neon-yellow">⚠️ WARNING</h3>
                        </div>
                        <div className="p-px-16 bg-pixel-gray-3">
                            <p className="text-px-12 text-pixel-gray-14 mb-px-12 text-center">
                                Are you sure you want to shuffle the deck? This action cannot be undone!
                            </p>
                            <div className="flex gap-px-8 justify-center">
                                <button
                                    className="px-px-12 py-px-8 bg-pixel-red border-2 border-pixel-red-bright text-pixel-white text-px-12 uppercase hover:bg-pixel-red-bright shadow-pixel-2"
                                    onClick={() => setShowModal(false)}
                                >
                                    SHUFFLE
                                </button>
                                <button
                                    className="px-px-12 py-px-8 bg-pixel-gray-6 border-2 border-pixel-gray-10 text-pixel-white text-px-12 uppercase hover:bg-pixel-gray-8 shadow-pixel-2"
                                    onClick={() => setShowModal(false)}
                                >
                                    CANCEL
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
