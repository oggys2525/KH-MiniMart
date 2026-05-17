import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './layouts/AdminLayout';
import StaffLayout from './layouts/StaffLayout';
import Login from './pages/Login';
import AdminDashboard from './pages/Admin/AdminDashboard';
import Products from './pages/Admin/Products';
import CreateProduct from './pages/Admin/CreateProduct';
import CategoriesList from './pages/Admin/CategoriesList';
import UserList from './pages/Admin/UserList';
import CreateUser from './pages/Admin/CreateUser';
import InventoryAlerts from './pages/Admin/InventoryAlerts';
import SalesReports from './pages/Admin/SalesReports';
import Customers from './pages/Admin/Customers';
import Expenses from './pages/Admin/Expenses';
import ManageStock from './pages/Admin/ManageStock';
import StockIns from './pages/Admin/StockIns';
import SalesHistory from './pages/Admin/SalesHistory';
import Orders from './pages/Admin/Orders';
import Payments from './pages/Admin/Payments';
import Roles from './pages/Admin/Roles';
import Suppliers from './pages/Admin/Suppliers';
import StaffPermissions from './pages/Admin/StaffPermissions';
import Settings from './pages/Admin/Settings';
import SystemTexts from './pages/Admin/SystemTexts';
import StaffDashboard from './pages/Staff/StaffDashboard';
import StaffOverview from './pages/Staff/StaffOverview';
import StaffPOS from './pages/Staff/StaffPOS';
import StaffOrders from './pages/Staff/StaffOrders';
import StaffProducts from './pages/Staff/StaffProducts';
import StaffCustomers from './pages/Staff/StaffCustomers';
import StaffReports from './pages/Staff/StaffReports';
import StaffSettings from './pages/Staff/StaffSettings';
import StaffProfile from './pages/Staff/StaffProfile';
import StaffChangePassword from './pages/Staff/StaffChangePassword';
import SalesReport from './pages/SalesReport/SalesReport';
import CustomerDisplay from './pages/Customer/CustomerDisplay';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/customer-display" element={<CustomerDisplay />} />
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/admin" element={<ProtectedRoute allowedRoles={['Admin']}><AdminLayout /></ProtectedRoute>}>
          <Route index element={<AdminDashboard />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="products" element={<Products />} />
          <Route path="products/create" element={<CreateProduct />} />
          <Route path="categories" element={<CategoriesList />} />
          <Route path="manage-stock" element={<ManageStock />} />
          <Route path="stock-ins" element={<StockIns />} />
          <Route path="inventory-alerts" element={<InventoryAlerts />} />
          <Route path="sales-history" element={<SalesHistory />} />
          <Route path="orders" element={<Orders />} />
          <Route path="sales-reports" element={<SalesReports />} />
          <Route path="sales-report" element={<SalesReport />} />
          <Route path="payments" element={<Payments />} />
          <Route path="customers" element={<Customers />} />
          <Route path="users" element={<UserList />} />
          <Route path="users/create" element={<CreateUser />} />
          <Route path="roles" element={<Roles />} />
          <Route path="suppliers" element={<Suppliers />} />
          <Route path="staff-permissions" element={<StaffPermissions />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="settings" element={<Settings />} />
          <Route path="system-texts" element={<SystemTexts />} />
        </Route>
        <Route path="/staff" element={<ProtectedRoute allowedRoles={['Staff']}><StaffLayout /></ProtectedRoute>}>
          <Route index element={<StaffDashboard />} />
          <Route path="dashboard" element={<StaffDashboard />} />
          <Route path="overview" element={<StaffOverview />} />
          <Route path="pos" element={<StaffPOS />} />
          <Route path="orders" element={<StaffOrders />} />
          <Route path="products" element={<StaffProducts />} />
          <Route path="customers" element={<StaffCustomers />} />
          <Route path="reports" element={<StaffReports />} />
          <Route path="settings" element={<StaffSettings />} />
          <Route path="sales-report" element={<SalesReport />} />
          <Route path="profile" element={<StaffProfile />} />
          <Route path="change-password" element={<StaffChangePassword />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;