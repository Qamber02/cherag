import { useEffect, useState, lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { ToastProvider } from './components/ui/ToastContext'
import { VideoProvider } from './components/premium/VideoContext'
import { useAuth } from './hooks/useAuth'

// Lazy load pages for better performance
const AuthPage = lazy(() => import('./components/AuthPage'));
const ResetPasswordPage = lazy(() => import('./components/ResetPasswordPage'));
const Dashboard = lazy(() => import('./components/Dashboard'));

function App() {
  const { session, loading } = useAuth();

  // Initialize theme from localStorage or system preference right away
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 animate-spin" /></div>
  }

  return (
    <ToastProvider>
      <VideoProvider>
        <Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
          <Routes>
            <Route path="/auth" element={session ? <Navigate to="/" /> : <AuthPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/" element={session ? <Dashboard session={session} /> : <Navigate to="/auth" />} />
          </Routes>
        </Suspense>
      </VideoProvider>
    </ToastProvider>
  )
}

export default App
