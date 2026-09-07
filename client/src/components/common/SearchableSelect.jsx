import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SearchableSelect = ({ options, value, onChange, placeholder = "Search & Select...", required }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef(null);

    const selectedOption = options.find(opt => opt.value === value);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = options.filter(opt => opt.label.toLowerCase().includes(search.toLowerCase()));

    return (
        <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
            <div 
                className="input-field"
                onClick={() => setIsOpen(!isOpen)}
                style={{ 
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer',
                    color: selectedOption ? 'white' : 'rgba(255,255,255,0.4)',
                    background: 'rgba(255,255,255,0.02)',
                    minHeight: '42px', padding: '0 15px',
                    border: '1px solid rgba(255,255,255,0.1)'
                }}
            >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown size={16} style={{ transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
            </div>

            {/* Hidden native input for required validation form submission */}
            {required && <input type="text" value={value || ''} style={{ opacity: 0, position: 'absolute', height: 0, width: 0, pointerEvents: 'none', border: 'none' }} required onChange={() => {}} />}

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.15 }}
                        style={{
                            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                            background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '12px', marginTop: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                            overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '250px'
                        }}
                    >
                        <div style={{ padding: '10px', borderBottom: '1px solid rgba(255,255,255,0.05)', position: 'relative' }}>
                            <Search size={14} style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
                            <input 
                                type="text" 
                                autoFocus
                                placeholder="Search..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                onClick={e => e.stopPropagation()}
                                style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 12px 8px 32px', color: 'white', fontSize: '12px', outline: 'none' }}
                            />
                        </div>
                        <div style={{ overflowY: 'auto', flex: 1, padding: '5px' }}>
                            {filteredOptions.length === 0 ? (
                                <div style={{ padding: '15px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>No matches found</div>
                            ) : (
                                filteredOptions.map(opt => (
                                    <div
                                        key={opt.value}
                                        onClick={() => {
                                            onChange(opt.value);
                                            setIsOpen(false);
                                            setSearch('');
                                        }}
                                        style={{
                                            padding: '10px 15px', color: value === opt.value ? '#38bdf8' : 'white',
                                            background: value === opt.value ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
                                            borderRadius: '8px', cursor: 'pointer', fontSize: '13px', transition: 'background 0.2s',
                                            fontWeight: value === opt.value ? '700' : '500'
                                        }}
                                        onMouseEnter={e => { if (value !== opt.value) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                                        onMouseLeave={e => { if (value !== opt.value) e.currentTarget.style.background = 'transparent' }}
                                    >
                                        {opt.label}
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SearchableSelect;
