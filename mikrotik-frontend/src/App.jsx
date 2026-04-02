import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';

// --- Context & Protection ---
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// --- Layout & Pages (ดึงจากโฟลเดอร์ pages/) ---
import MainLayout from './layouts/MainLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard/Dashboard'; 
import DeviceList from './pages/DeviceList/DeviceList';
import GroupManagement from "./pages/GroupManagement/GroupManagement";
import AuditLog from './pages/AuditLog'; 
import ModelManager from './pages/ModelManager/ModelManager';
import UserManagement from './pages/UserManagement/UserManagement';
import UserProfile from './pages/UserProfile';
import GlobalSettings from './pages/GlobalSettings/GlobalSettings';

// --- Knowledge Base ---
import ArticleList from './pages/KnowledgeBase/ArticleList';
import ArticleDetail from './pages/KnowledgeBase/ArticleDetail';
import ArticleManager from './pages/KnowledgeBase/Admin/ArticleManager';


// --- Features (ระบบ Wizard แยกเฉพาะ) ---
import ConfigWizard from './pages/ConfigWizard/ConfigWizard';
import VPNTools from './pages/VPNTools/VPNTools';

import { useAuth } from './context/AuthContext';

// --- Wrapper Components ---
const HomeRedirect = () => {
  const { user } = useAuth();
  if (user?.role === 'GUEST') return <Navigate to="/knowledge-base" replace />;
  return <Navigate to="/dashboard" replace />;
};

const ConfigBuilderPage = () => {
  return <div className="py-10"><ConfigWizard mode="standalone" /></div>;
};

const VPNToolsPage = () => {
  return <div className="py-10"><VPNTools isModal={false} /></div>;
};

const CreateDevicePage = () => {
  const navigate = useNavigate();
  return <ConfigWizard mode="create" onFinish={() => navigate('/devices')} />;
};

const EditDevicePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const deviceData = location.state?.deviceData;

  if (!deviceData) return <Navigate to="/devices" replace />;
  return <ConfigWizard mode="edit" initialData={deviceData} onFinish={() => navigate('/devices')} />;
};

// --- Main App Component ---
function App() {
  return (
    // ✅ 1. เอา AuthProvider มาครอบทั้งหมด เพื่อให้ทุกหน้ารู้สถานะการล็อกอิน
    <AuthProvider>
      <Routes>
        
        {/* =========================================
            PUBLIC ROUTE (หน้า Login ไม่ต้องล็อกอินก็เข้าได้)
            ========================================= */}
        <Route path="/login" element={<Login />} />


        {/* =========================================
            PROTECTED ROUTES (ต้องล็อกอินถึงจะเข้าได้)
            ========================================= */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<MainLayout />}>
            
            {/* หน้าแรกให้ Redirect ไปตาม Role */}
            <Route index element={<HomeRedirect />} />
            
            {/*หน้าที่ทุกคน (รวมถึง EMPLOYEE) เข้าดูได้ (Read-only) ยกเว้น GUEST */}
            <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE']} />}>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="devices" element={<DeviceList />} />
              <Route path="groups" element={<GroupManagement />} />
              <Route path="config-builder" element={<ConfigBuilderPage />} />
              <Route path="vpn-tools" element={<VPNToolsPage />} />
            </Route>
            
            {/* หน้าที่ทุกคนเข้าได้รวมถึง GUEST */}
            <Route path="profile" element={<UserProfile />} />
            <Route path="knowledge-base" element={<ArticleList />} />
            <Route path="knowledge-base/:slug" element={<ArticleDetail />} />


            {/*หน้าที่ถูกล็อค เข้าได้เฉพาะ SUPER_ADMIN และ ADMIN เท่านั้น */}
            <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']} />}>
              <Route path="add-device" element={<CreateDevicePage />} />
              <Route path="edit-device/:id" element={<EditDevicePage />} />
              <Route path="models" element={<ModelManager />} />
              <Route path="users" element={<UserManagement />} />
              <Route path="audit-logs" element={<AuditLog />} />
            </Route>

            {/* หน้าที่เข้าได้เฉพาะ SUPER_ADMIN เท่านั้น*/}
            <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']} />}>
              <Route path="settings" element={<GlobalSettings />} />
              <Route path="knowledge-base/admin" element={<ArticleManager />} />
            </Route>

            {/* Catch-all Route: ถ้า URL ไม่ตรง ให้กลับไปหน้าหลักตาม Role */}
            <Route path="*" element={<HomeRedirect />} />

          </Route>
        </Route>

      </Routes>
    </AuthProvider>
  );
}

export default App;