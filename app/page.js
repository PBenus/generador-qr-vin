'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import QRCode from 'qrcode';

export default function Home() {
    const [allVins, setAllVins] = useState([]);
    const [query, setQuery] = useState('');
    const [filtered, setFiltered] = useState([]);
    const [selectedVin, setSelectedVin] = useState(null);
    const [qrDataUrl, setQrDataUrl] = useState(null);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [highlightIndex, setHighlightIndex] = useState(-1);

    const inputRef = useRef(null);
    const listRef = useRef(null);
    const containerRef = useRef(null);

    // Fetch all VINs on mount
    useEffect(() => {
        async function loadVins() {
            try {
                setLoading(true);
                setError(null);
                const res = await fetch('/api/vins');
                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.error || 'Error al cargar VINs');
                }

                setAllVins(data.results || []);
            } catch (err) {
                console.error('UI Fetch Error:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        loadVins();
    }, []);

    // Filter VINs when query changes
    useEffect(() => {
        if (!query || query.length < 2) {
            setFiltered([]);
            setIsOpen(false);
            return;
        }

        const q = query.toUpperCase().trim();
        const matches = allVins.filter(
            (vin) => vin.endsWith(q) || vin.includes(q)
        );
        setFiltered(matches.slice(0, 20));
        setIsOpen(matches.length > 0);
        setHighlightIndex(-1);
    }, [query, allVins]);

    // Generate QR code when a VIN is selected
    useEffect(() => {
        if (!selectedVin) {
            setQrDataUrl(null);
            return;
        }

        QRCode.toDataURL(selectedVin, {
            width: 400,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#ffffff',
            },
            errorCorrectionLevel: 'H',
        })
            .then((url) => setQrDataUrl(url))
            .catch((err) => console.error('QR generation error:', err));
    }, [selectedVin]);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(e) {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = useCallback((vin) => {
        setSelectedVin(vin);
        setQuery(vin);
        setIsOpen(false);
        setHighlightIndex(-1);
    }, []);

    const handleKeyDown = useCallback(
        (e) => {
            if (!isOpen || filtered.length === 0) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setHighlightIndex((prev) => Math.min(prev + 1, filtered.length - 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setHighlightIndex((prev) => Math.max(prev - 1, 0));
            } else if (e.key === 'Enter' && highlightIndex >= 0) {
                e.preventDefault();
                handleSelect(filtered[highlightIndex]);
            } else if (e.key === 'Escape') {
                setIsOpen(false);
            }
        },
        [isOpen, filtered, highlightIndex, handleSelect]
    );

    // Scroll highlighted item into view
    useEffect(() => {
        if (highlightIndex >= 0 && listRef.current) {
            const items = listRef.current.querySelectorAll('.dropdown-item');
            if (items[highlightIndex]) {
                items[highlightIndex].scrollIntoView({ block: 'nearest' });
            }
        }
    }, [highlightIndex]);

    const handleDownload = () => {
        if (!qrDataUrl || !selectedVin) return;
        const link = document.createElement('a');
        link.download = `QR_${selectedVin}.png`;
        link.href = qrDataUrl;
        link.click();
    };

    const handleClear = () => {
        setQuery('');
        setSelectedVin(null);
        setQrDataUrl(null);
        setIsOpen(false);
        inputRef.current?.focus();
    };

    const highlightMatch = (vin, q) => {
        if (!q) return vin;
        const idx = vin.indexOf(q.toUpperCase());
        if (idx === -1) return vin;
        return (
            <>
                <span className="vin-dim">{vin.substring(0, idx)}</span>
                <span className="vin-highlight">{vin.substring(idx, idx + q.length)}</span>
                <span className="vin-dim">{vin.substring(idx + q.length)}</span>
            </>
        );
    };

    return (
        <main className="main">
            {/* Background decorative elements */}
            <div className="bg-glow bg-glow-1" />
            <div className="bg-glow bg-glow-2" />

            <div className="card">
                {/* Header */}
                <div className="header">
                    <div className="logo-icon">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="7" height="7" />
                            <rect x="14" y="3" width="7" height="7" />
                            <rect x="3" y="14" width="7" height="7" />
                            <rect x="14" y="14" width="7" height="7" />
                        </svg>
                    </div>
                    <h1>Generador QR</h1>
                    <p className="subtitle">Busca un VIN por sus últimos dígitos y genera un código QR</p>
                </div>

                {/* Search section */}
                <div className="search-section" ref={containerRef}>
                    <label htmlFor="vin-search" className="search-label">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" />
                            <path d="M21 21l-4.35-4.35" />
                        </svg>
                        Buscar VIN
                    </label>

                    <div className="input-wrapper">
                        <input
                            ref={inputRef}
                            id="vin-search"
                            type="text"
                            className="search-input"
                            placeholder={loading ? 'Cargando VINs...' : 'Escribe los últimos 4-6 dígitos...'}
                            value={query}
                            onChange={(e) => {
                                setQuery(e.target.value);
                                setSelectedVin(null);
                            }}
                            onKeyDown={handleKeyDown}
                            onFocus={() => {
                                if (filtered.length > 0) setIsOpen(true);
                            }}
                            disabled={loading}
                            autoComplete="off"
                        />
                        {query && (
                            <button className="clear-btn" onClick={handleClear} title="Limpiar">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        )}
                    </div>

                    {/* Status badge */}
                    {!loading && !error && (
                        <div className="status-badge">
                            <span className="status-dot" />
                            {allVins.length} VINs cargados
                        </div>
                    )}

                    {error && (
                        <div className="error-badge">
                            ⚠ {error}
                        </div>
                    )}

                    {/* Dropdown */}
                    {isOpen && (
                        <ul className="dropdown" ref={listRef} role="listbox">
                            {filtered.map((vin, i) => (
                                <li
                                    key={vin}
                                    className={`dropdown-item ${i === highlightIndex ? 'highlighted' : ''}`}
                                    onClick={() => handleSelect(vin)}
                                    role="option"
                                    aria-selected={i === highlightIndex}
                                >
                                    <span className="dropdown-vin">
                                        {highlightMatch(vin, query)}
                                    </span>
                                    <svg className="dropdown-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="9 18 15 12 9 6" />
                                    </svg>
                                </li>
                            ))}
                        </ul>
                    )}

                    {query.length >= 2 && filtered.length === 0 && !isOpen && !selectedVin && (
                        <div className="no-results">
                            No se encontraron VINs con "<strong>{query}</strong>"
                        </div>
                    )}
                </div>

                {/* QR Code Section */}
                {selectedVin && qrDataUrl && (
                    <div className="qr-section">
                        <div className="qr-divider" />

                        <div className="selected-vin-badge">
                            <span className="badge-label">VIN Seleccionado</span>
                            <span className="badge-value">{selectedVin}</span>
                        </div>

                        <div className="qr-container">
                            <div className="qr-frame">
                                <img src={qrDataUrl} alt={`QR Code for ${selectedVin}`} className="qr-image" />
                            </div>
                        </div>

                        <button className="download-btn" onClick={handleDownload}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            Descargar QR
                        </button>
                    </div>
                )}
            </div>

            {/* Footer */}
            <footer className="footer">
                Generador QR — VIN Search
            </footer>
        </main>
    );
}
