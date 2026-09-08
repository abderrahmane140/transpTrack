import './App.css'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from './store/authStore'

import Layout            from './components/layout/Layout'
import Login             from './pages/auth/Login'
import Home              from './pages/public/Home'
import AdminDashboard    from './pages/admin/Dashboard'
import Vehicles          from './pages/admin/Vehicles'
import Drivers           from './pages/admin/Drivers'
import Employees         from './pages/admin/Employees'
import RoutesPage        from './pages/admin/Routes'
import LiveTracking      from './pages/admin/LiveTracking'
import DriverDashboard   from './pages/driver/Dashboard'
import EmployeeDashboard from './pages/employee/Dashboard'
import Trips from './pages/admin/Trip'

function ProtectedRoute({ children, allowedRoles }) {
  const { isLoggedIn, user } = useAuthStore()
  if (!isLoggedIn()) return <Navigate to="/login" replace />
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    if (user?.role === 'admin')    return <Navigate to="/admin"    replace />
    if (user?.role === 'driver')   return <Navigate to="/driver"   replace />
    if (user?.role === 'employee') return <Navigate to="/employee" replace />
    return <Navigate to="/login" replace />
  }
  return children
}
 
function RootRedirect() {
  const { isLoggedIn, user } = useAuthStore()
  if (isLoggedIn()) {
    if (user?.role === 'admin')    return <Navigate to="/admin"    replace />
    if (user?.role === 'driver')   return <Navigate to="/driver"   replace />
    if (user?.role === 'employee') return <Navigate to="/employee" replace />
  }
  // Guests see the public landing page
  return <Home />
}
function App() {

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/"      element={<RootRedirect />} />
 
        {/* Admin */}
        <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><Layout /></ProtectedRoute>}>
          <Route index            element={<AdminDashboard />} />
          <Route path="vehicles"  element={<Vehicles />}       />
          <Route path="drivers"   element={<Drivers />}        />
          <Route path="employees" element={<Employees />}      />
          <Route path="routes"    element={<RoutesPage />}     />
          <Route path="tracking"  element={<LiveTracking />}   />
          <Route path="trips" element={<Trips />} />
        </Route>
 
        {/* Driver */}
        <Route path="/driver" element={<ProtectedRoute allowedRoles={['driver']}><Layout /></ProtectedRoute>}>
          <Route index element={<DriverDashboard />} />
        </Route>
 
        {/* Employee */}
        <Route path="/employee" element={<ProtectedRoute allowedRoles={['employee']}><Layout /></ProtectedRoute>}>
          <Route index element={<EmployeeDashboard />} />
        </Route>
 
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
} 

export default App
