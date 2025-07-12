import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

export default function LogoutButton() {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully');
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Failed to sign out');
    }
  };

  // Don't render if user is not authenticated
  if (!user) {
    return null;
  }

  return (
    <button
      onClick={handleSignOut}
      className="fixed top-4 right-4 z-50 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors font-medium"
    >
      Sign Out
    </button>
  );
} 