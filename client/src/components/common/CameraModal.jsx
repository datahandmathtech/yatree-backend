import React, { useRef, useState, useEffect } from 'react';
import { X, Camera } from 'lucide-react';

const CameraModal = ({ onCapture, onClose }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        startCamera();
        return () => stopCamera();
    }, []);

    const startCamera = async () => {
        try {
            const constraints = {
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            };
            const newStream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = newStream;
            if (videoRef.current) {
                videoRef.current.srcObject = newStream;
            }
        } catch (err) {
            console.error("Camera error:", err);
            setError("Could not access camera. Please allow permissions.");
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    };

    const capture = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (video && canvas) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            canvas.toBlob((blob) => {
                const file = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
                onCapture(file);
                stopCamera();
                onClose();
            }, 'image/jpeg', 0.8);
        }
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#1e293b', padding: '20px', borderRadius: '16px', width: '90%', maxWidth: '500px', position: 'relative' }}>
                <button type="button" onClick={() => { stopCamera(); onClose(); }} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
                    <X size={24} />
                </button>
                <h3 style={{ color: 'white', marginBottom: '20px', textAlign: 'center', marginTop: '10px' }}>Take Photo</h3>
                
                {error ? (
                    <div style={{ color: '#f43f5e', textAlign: 'center', padding: '20px' }}>{error}</div>
                ) : (
                    <div style={{ position: 'relative' }}>
                        <video 
                            ref={videoRef} 
                            autoPlay 
                            playsInline 
                            style={{ width: '100%', borderRadius: '12px', background: '#000', marginBottom: '20px', maxHeight: '60vh', objectFit: 'cover' }} 
                        />
                        <button 
                            type="button"
                            onClick={capture} 
                            style={{ 
                                position: 'absolute', bottom: '30px', left: '50%', transform: 'translateX(-50%)',
                                width: '60px', height: '60px', borderRadius: '50%', background: 'white',
                                border: '4px solid rgba(255,255,255,0.4)', backgroundClip: 'padding-box',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}
                        >
                            <Camera size={24} color="#1e293b" />
                        </button>
                    </div>
                )}
                <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>
        </div>
    );
};

export default CameraModal;
