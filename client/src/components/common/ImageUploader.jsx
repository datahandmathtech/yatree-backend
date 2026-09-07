import React, { useState } from 'react';
import { Camera, Image as ImageIcon, Plus, X } from 'lucide-react';
import CameraModal from './CameraModal';

const ImageUploader = ({ file, onChange, label = 'Attach Receipt / Bill', color = '#0ea5e9' }) => {
    const [activeCamera, setActiveCamera] = useState(false);

    // Create an object URL for preview if the file is a File object,
    // or use the string directly if it's already an uploaded URL
    const previewUrl = file ? (typeof file === 'string' ? file : URL.createObjectURL(file)) : null;

    const handleGallerySelect = (e) => {
        if (e.target.files && e.target.files[0]) {
            onChange(e.target.files[0]);
        }
    };

    const handleCameraCapture = (capturedFile) => {
        onChange(capturedFile);
        setActiveCamera(false);
    };

    return (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={{ fontSize: '11px', fontWeight: '800', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                {label}
            </label>

            {file ? (
                <div style={{ position: 'relative', width: '100%' }}>
                    <div style={{ 
                        width: '100%', height: '80px', borderRadius: '12px', overflow: 'hidden', 
                        border: `1px solid ${color}40`, position: 'relative', background: '#121a2f', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        {(typeof file === 'string' && file.includes('.pdf')) || (file.type && file.type === 'application/pdf') ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                                <ImageIcon size={24} color={color} />
                                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)', fontWeight: 'bold' }}>PDF Document</span>
                            </div>
                        ) : (
                            <img src={previewUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        )}
                        <button 
                            type="button" 
                            onClick={() => onChange(null)} 
                            style={{ 
                                position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.6)', 
                                color: 'white', border: 'none', borderRadius: '50%', width: '28px', height: '28px', 
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                backdropFilter: 'blur(4px)'
                            }}
                        >
                            <X size={16} />
                        </button>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <button 
                            type="button" 
                            onClick={() => setActiveCamera(true)} 
                            style={{ flex: 1, padding: '6px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                        >
                            <Camera size={14} /> Retake
                        </button>
                        <label style={{ flex: 1, padding: '6px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                            <ImageIcon size={14} /> Replace
                            <input type="file" accept="image/*,application/pdf" onChange={handleGallerySelect} style={{ display: 'none' }} />
                        </label>
                    </div>
                </div>
            ) : (
                <div style={{ display: 'flex', gap: '12px' }}>
                    <div 
                        onClick={() => setActiveCamera(true)} 
                        style={{ 
                            flex: 1, height: '60px', borderRadius: '12px', background: '#121a2f', 
                            display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: '6px',
                            cursor: 'pointer', border: '1px dashed rgba(255,255,255,0.15)', transition: 'all 0.3s ease' 
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = color; e.currentTarget.style.background = '#1a223a'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.background = '#121a2f'; }}
                    >
                        <Camera size={18} color="rgba(255,255,255,0.7)" strokeWidth={1.5} />
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)', fontWeight: '600' }}>Camera</span>
                    </div>

                    <label 
                        style={{ 
                            flex: 1, height: '60px', borderRadius: '12px', background: '#121a2f', 
                            display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: '6px',
                            cursor: 'pointer', border: '1px dashed rgba(255,255,255,0.15)', transition: 'all 0.3s ease' 
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = color; e.currentTarget.style.background = '#1a223a'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.background = '#121a2f'; }}
                    >
                        <ImageIcon size={18} color="rgba(255,255,255,0.7)" strokeWidth={1.5} />
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)', fontWeight: '600' }}>Gallery / File</span>
                        <input type="file" accept="image/*,application/pdf" onChange={handleGallerySelect} style={{ display: 'none' }} />
                    </label>
                </div>
            )}

            {activeCamera && (
                <CameraModal
                    onCapture={handleCameraCapture}
                    onClose={() => setActiveCamera(false)}
                />
            )}
        </div>
    );
};

export default ImageUploader;
