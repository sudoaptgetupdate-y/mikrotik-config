import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';

// --- Context & Protection ---
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// --- Layout & Pages (ดึงจากโฟลเดอร์ pages/) ---
import MainLayout from './layouts/MainLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard'; 
import AuditLog from './pages/AuditLog'; 
import ModelManager from './pages/ModelManager';
import UserManagement from './pages/UserManagement';
import UserProfile from './pages/UserProfile';
import GlobalSettings from './pages/GlobalSettings';

// --- Components ย่อย ---
import DeviceList from './pages/DeviceList';

// --- Features (ระบบ Wizard แยกเฉพาะ) ---
import ConfigWizard from './pages/ConfigWizard/ConfigWizard';

// --- Wrapper Components ---
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
            
            {/* หน้าแรกให้ Redirect ไป Dashboard ทันที */}
            <Route index element={<Navigate to="/dashboard" replace />} />
            
            {/*หน้าที่ทุกคน (รวมถึง EMPLOYEE) เข้าดูได้ (Read-only) */}
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="devices" element={<DeviceList />} />
            <Route path="profile" element={<UserProfile />} />


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
            </Route>

            {/* Catch-all Route: ถ้า URL ไม่ตรง ให้กลับไปหน้า dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />

          </Route>
        </Route>

      </Routes>
    </AuthProvider>
  );
}

export default App;