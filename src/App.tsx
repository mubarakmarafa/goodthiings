// GoodThiings AI - Main App Component (TypeScript fixes applied)
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import LoginScreen from "./components/auth/LoginScreen";
import ThiingsIcons from "./examples/ThiingsIcons";
import UserInput from "./components/UserInput";
import { Toaster } from 'sonner';
import './App.css'

function AppContent() {
  const { user, isLoading, login, signup } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <LoginScreen 
        onLogin={login}
        onSignUp={signup}
      />
    );
  }

  return (
    <div className="h-screen w-screen font-sans">
      <ThiingsIcons />
      <UserInput />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
      <Toaster position="top-center" richColors />
    </AuthProvider>
  );
}

export default App;
