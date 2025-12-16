import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { authApi } from '../services/api';

interface User {
    id: string;
    email: string;
    username: string;
    createdAt: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    login: (emailOrUsername: string, password: string) => Promise<void>;
    register: (email: string, username: string, password: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            const savedToken = localStorage.getItem('token');
            if (savedToken) {
                try {
                    const response = await authApi.getMe();
                    setUser(response.data.user);
                    setToken(savedToken);
                } catch {
                    localStorage.removeItem('token');
                    setToken(null);
                }
            }
            setIsLoading(false);
        };

        initAuth();
    }, []);

    const login = async (emailOrUsername: string, password: string) => {
        const response = await authApi.login({ emailOrUsername, password });
        const { user, token } = response.data;
        localStorage.setItem('token', token);
        setUser(user);
        setToken(token);
    };

    const register = async (email: string, username: string, password: string) => {
        const response = await authApi.register({ email, username, password });
        const { user, token } = response.data;
        localStorage.setItem('token', token);
        setUser(user);
        setToken(token);
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
        setToken(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
