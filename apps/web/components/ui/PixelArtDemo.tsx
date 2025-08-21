'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

export function PixelArtDemo() {
    const [health, setHealth] = useState(75);
    const [showModal, setShowModal] = useState(false);

    return (
        <div className="min-h-screen p-8 bg-pixel-gray-1 crt-screen">
            {/* Header */}
            <div className="pixel-card pixel-corner-decoration mb-8">
                <div className="pixel-card-header">
                    <h1 className="text-2xl neon-yellow animate-pulse">
                        🎮 PIXEL ART TAROT THEME DEMO
                    </h1>
                </div>
                <div className="pixel-card-body">
                    <p className="text-pixel-gray-12">
                        Explore the retro 8-bit styling for your tarot card game!
                    </p>
                </div>
            </div>

            {/* Button Showcase */}
            <section className="mb-8">
                <h2 className="text-xl pixel-font font-bold text-pixel-white mb-4 neon-blue">
                    PIXEL BUTTONS
                </h2>
                <div className="flex flex-wrap gap-4">
                    <button className="pixel-btn">DEFAULT</button>
                    <button className="pixel-btn-primary">PRIMARY</button>
                    <button className="pixel-btn-secondary">SECONDARY</button>
                    <button className="pixel-btn-danger">DANGER</button>
                    <button className="pixel-btn animate-pixel-flicker">FLICKER</button>
                </div>
            </section>

            {/* Color Palette */}
            <section className="mb-8">
                <h2 className="text-xl pixel-font font-bold text-pixel-white mb-4 neon-green">
                    8-BIT COLOR PALETTE
                </h2>
                <div className="grid grid-cols-4 gap-2 mb-4">
                    {Object.entries({
                        'Red': 'bg-pixel-red',
                        'Green': 'bg-pixel-green',
                        'Blue': 'bg-pixel-blue',
                        'Yellow': 'bg-pixel-yellow',
                        'Magenta': 'bg-pixel-magenta',
                        'Cyan': 'bg-pixel-cyan',
                        'Orange': 'bg-pixel-orange',
                        'Purple': 'bg-pixel-purple',
                        'Pink': 'bg-pixel-pink',
                        'Brown': 'bg-pixel-brown',
                    }).map(([name, className]) => (
                        <div key={name} className="pixel-card">
                            <div className={`h-8 ${className} rounded-px-1 mb-1`}></div>
                            <div className="pixel-font text-px-10 text-center text-pixel-white">{name}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Progress & Health Bar */}
            <section className="mb-8">
                <h2 className="text-xl pixel-font font-bold text-pixel-white mb-4 neon-yellow">
                    PROGRESS & HEALTH
                </h2>
                <div className="pixel-card max-w-md">
                    <div className="pixel-card-header">
                        <span className="neon-red">PLAYER HEALTH</span>
                    </div>
                    <div className="pixel-card-body">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="pixel-loading"></div>
                            <span className="pixel-font text-pixel-white">{health}/100 HP</span>
                        </div>
                        <div className="pixel-progress mb-4">
                            <div
                                className="pixel-progress-bar"
                                style={{ width: `${health}%` }}
                            ></div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                className="pixel-btn-danger"
                                onClick={() => setHealth(Math.max(0, health - 10))}
                            >
                                -10 HP
                            </button>
                            <button
                                className="pixel-btn-primary"
                                onClick={() => setHealth(Math.min(100, health + 10))}
                            >
                                +10 HP
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Badges & Status */}
            <section className="mb-8">
                <h2 className="text-xl pixel-font font-bold text-pixel-white mb-4 neon-purple">
                    BADGES & STATUS
                </h2>
                <div className="flex flex-wrap gap-2">
                    <span className="pixel-badge">DEFAULT</span>
                    <span className="pixel-badge-success">SUCCESS</span>
                    <span className="pixel-badge-warning">WARNING</span>
                    <span className="pixel-badge-error">ERROR</span>
                    <span className="pixel-badge animate-pulse">PULSE</span>
                </div>
            </section>

            {/* Table Example */}
            <section className="mb-8">
                <h2 className="text-xl pixel-font font-bold text-pixel-white mb-4 neon-cyan">
                    DATA TABLE
                </h2>
                <div className="pixel-card">
                    <table className="pixel-table">
                        <thead>
                            <tr>
                                <th>CARD</th>
                                <th>SUIT</th>
                                <th>COST</th>
                                <th>ATTACK</th>
                                <th>HEALTH</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>The Fool</td>
                                <td className="text-pixel-yellow-bright">✨ Major</td>
                                <td className="text-pixel-yellow">3</td>
                                <td className="text-pixel-red">2</td>
                                <td className="text-pixel-green">4</td>
                            </tr>
                            <tr>
                                <td>Fireball</td>
                                <td className="text-pixel-red">🔥 Wands</td>
                                <td className="text-pixel-yellow">2</td>
                                <td className="text-pixel-red">3</td>
                                <td className="text-pixel-gray-8">—</td>
                            </tr>
                            <tr>
                                <td>Healing Wave</td>
                                <td className="text-pixel-blue">💧 Cups</td>
                                <td className="text-pixel-yellow">1</td>
                                <td className="text-pixel-gray-8">—</td>
                                <td className="text-pixel-green">+2</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Animation Showcase */}
            <section className="mb-8">
                <h2 className="text-xl pixel-font font-bold text-pixel-white mb-4 neon-red">
                    ANIMATIONS
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="pixel-card text-center">
                        <div className="text-2xl mb-2 animate-pixel-bounce">🎯</div>
                        <div className="pixel-font text-px-10 text-pixel-white">BOUNCE</div>
                    </div>
                    <div className="pixel-card text-center">
                        <div className="text-2xl mb-2 animate-pixel-rotate">⭐</div>
                        <div className="pixel-font text-px-10 text-pixel-white">ROTATE</div>
                    </div>
                    <div className="pixel-card text-center">
                        <div className="text-2xl mb-2 animate-pixel-scale">💎</div>
                        <div className="pixel-font text-px-10 text-pixel-white">SCALE</div>
                    </div>
                    <div className="pixel-card text-center">
                        <div className="text-2xl mb-2 animate-pixel-shake">⚡</div>
                        <div className="pixel-font text-px-10 text-pixel-white">SHAKE</div>
                    </div>
                </div>
            </section>

            {/* Glitch Text */}
            <section className="mb-8">
                <h2 className="text-xl pixel-font font-bold text-pixel-white mb-4 neon-magenta">
                    GLITCH EFFECTS
                </h2>
                <div className="pixel-card">
                    <div className="pixel-card-body text-center">
                        <div
                            className="pixel-glitch-text text-3xl pixel-font font-bold"
                            data-text="TAROТ ERROR"
                        >
                            TAROT ERROR
                        </div>
                        <p className="mt-4 text-pixel-gray-10 pixel-font">
                            System malfunction detected in the mystic realm...
                        </p>
                    </div>
                </div>
            </section>

            {/* Modal Demo */}
            <section className="mb-8">
                <h2 className="text-xl pixel-font font-bold text-pixel-white mb-4 neon-yellow">
                    MODAL DIALOG
                </h2>
                <button
                    className="pixel-btn-primary"
                    onClick={() => setShowModal(true)}
                >
                    OPEN MODAL
                </button>

                {showModal && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
                        onClick={() => setShowModal(false)}
                    >
                        <div
                            className="pixel-modal max-w-md w-full"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="pixel-modal-header">
                                <h3 className="neon-yellow">⚠️ WARNING</h3>
                            </div>
                            <div className="pixel-modal-body">
                                <p className="mb-6 text-center">
                                    Are you sure you want to shuffle the deck? This action cannot be undone!
                                </p>
                                <div className="flex gap-4 justify-center">
                                    <button
                                        className="pixel-btn-danger"
                                        onClick={() => setShowModal(false)}
                                    >
                                        SHUFFLE
                                    </button>
                                    <button
                                        className="pixel-btn-secondary"
                                        onClick={() => setShowModal(false)}
                                    >
                                        CANCEL
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </section>

            {/* Navigation Demo */}
            <section>
                <h2 className="text-xl pixel-font font-bold text-pixel-white mb-4 neon-green">
                    NAVIGATION BAR
                </h2>
                <nav className="pixel-nav">
                    <div className="pixel-nav-item active">HOME</div>
                    <div className="pixel-nav-item">DECKS</div>
                    <div className="pixel-nav-item">CARDS</div>
                    <div className="pixel-nav-item">SETTINGS</div>
                </nav>
            </section>

            {/* Usage Instructions */}
            <div className="pixel-card mt-8">
                <div className="pixel-card-header">
                    <h2 className="neon-blue">HOW TO USE</h2>
                </div>
                <div className="pixel-card-body">
                    <div className="space-y-2 text-px-12 pixel-font">
                        <p><strong>🎨 Colors:</strong> Use <code>bg-pixel-red</code>, <code>text-pixel-blue</code>, etc.</p>
                        <p><strong>📐 Spacing:</strong> Use <code>p-px-8</code>, <code>m-px-16</code> for pixel-perfect spacing</p>
                        <p><strong>🔤 Typography:</strong> Add <code>pixel-font</code> class for retro monospace text</p>
                        <p><strong>✨ Animations:</strong> Use <code>animate-pixel-bounce</code>, <code>animate-pixel-flicker</code>, etc.</p>
                        <p><strong>🎭 Effects:</strong> Try <code>neon-red</code>, <code>pixel-glitch-text</code>, <code>crt-screen</code></p>
                        <p><strong>🧱 Components:</strong> Use <code>pixel-btn</code>, <code>pixel-card</code>, <code>pixel-modal</code>, etc.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
