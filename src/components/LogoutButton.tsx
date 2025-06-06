import { useAuth } from '../contexts/AuthContext';

export default function LogoutButton() {
  const { logout, user } = useAuth();

  // Only show logout button if user is logged in
  if (!user) return null;

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="fixed top-10 left-10 z-10">
      <div
        className="bg-white rounded-3xl shadow-[0px_8px_32px_0px_rgba(0,0,0,0.15)] border-2 border-[rgba(213,213,213,0.5)] transition-all duration-300 ease-in-out h-[70px]"
        data-name="Logout Button"
      >
        <div className="flex flex-row items-center justify-start h-full">
          {/* Logout Icon */}
          <div className="flex items-center justify-center w-[70px] h-[70px] shrink-0">
            <svg 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              className="w-6 h-6 text-gray-600"
            >
              <path 
                d="M17 7L15.59 8.41L18.17 11H8V13H18.17L15.59 15.59L17 17L22 12L17 7ZM4 5H12V3H4C2.9 3 2 3.9 2 5V19C2 20.1 2.9 21 4 21H12V19H4V5Z" 
                fill="currentColor"
              />
            </svg>
          </div>

          {/* Logout Text */}
          <div className="flex-1 px-4">
            <button
              onClick={handleLogout}
              className="w-full text-left text-[20px] font-['Helvetica_Neue'] font-bold text-gray-700 hover:text-gray-900 transition-colors outline-none focus:outline-none bg-transparent border-none cursor-pointer"
            >
              Logout
            </button>
          </div>

          {/* Username (small) */}
          <div className="pr-4">
            <div className="text-[12px] font-['Helvetica_Neue'] text-gray-500 max-w-[120px] truncate">
              {user.username}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 