import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AllProviders } from './context';
import { AuthProvider, ProtectedRoute } from './auth';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import ErrorBoundary from './components/common/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AllProviders>
          <Router>
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/orders" element={<Orders />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/settings" element={<Settings />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          </Router>
        </AllProviders>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
