import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import CanvasEditor from '../components/CanvasEditor';
import './Dashboard.css';

export default function Dashboard() {
    const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    return (
        <div className="dashboard">
            {!sidebarCollapsed && (
                <Sidebar
                    onPageSelect={setSelectedPageId}
                    selectedPageId={selectedPageId || undefined}
                />
            )}

            <div className="main-area">
                <button
                    className="toggle-sidebar-btn"
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    title={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
                >
                    {sidebarCollapsed ? '☰' : '✕'}
                </button>

                <CanvasEditor pageId={selectedPageId} />
            </div>
        </div>
    );
}
