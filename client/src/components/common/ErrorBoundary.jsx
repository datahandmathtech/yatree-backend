import React from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);
        
        // If it's a chunk load error (dynamic import failure), we can auto-reload or prompt
        if (error.name === 'ChunkLoadError' || (error.message && error.message.includes('fetch'))) {
            // Optional: You could auto-reload once, but a manual reload button is safer to avoid loops
            console.log("Chunk load error detected.");
        }
    }

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    height: '100vh', width: '100vw', background: 'var(--bg-dark, #0f172a)', color: 'white', padding: '20px', textAlign: 'center'
                }}>
                    <div style={{
                        background: 'rgba(255,255,255,0.05)', padding: '40px', borderRadius: '24px',
                        border: '1px solid rgba(255,255,255,0.1)', maxWidth: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center'
                    }}>
                        <div style={{
                            width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(244, 63, 94, 0.1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px'
                        }}>
                            <AlertTriangle size={32} color="#f43f5e" />
                        </div>
                        <h2 style={{ margin: '0 0 10px 0', fontSize: '20px', fontWeight: '700' }}>Connection Interrupted</h2>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', margin: '0 0 24px 0', lineHeight: '1.5' }}>
                            We couldn't load the requested page. This usually happens due to a temporary network issue or a server update.
                        </p>
                        <button
                            onClick={this.handleReload}
                            style={{
                                background: 'var(--primary, #3b82f6)', color: 'white', border: 'none', padding: '12px 24px',
                                borderRadius: '12px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                                transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseOut={(e) => e.currentTarget.style.transform = 'none'}
                        >
                            <RefreshCw size={16} />
                            Reload Application
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
