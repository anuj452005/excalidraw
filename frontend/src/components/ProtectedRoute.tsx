import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { token, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
                color: 'rgba(255, 255, 255, 0.7)'
            }}>
                Loading...
            </div>
        );
    }

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
}
