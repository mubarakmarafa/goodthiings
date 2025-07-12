import React, { useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';

export default function LoginScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const { signInWithGoogle } = useAuth();

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      console.error('Google login error:', error);
      toast.error('Failed to sign in with Google. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white relative w-full h-screen" data-name="Login Screen">
      {/* Background Icon Grid with Multiple Images - Full Viewport Coverage */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat min-w-full min-h-full"
        data-name="Screenshot of Icon Grid"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 560 560'%3E%3Cdefs%3E%3Cpattern id='icons' x='0' y='0' width='320' height='320' patternUnits='userSpaceOnUse'%3E%3Cg%3E%3Ctext x='45' y='35' text-anchor='middle' font-size='22' transform='rotate(15 45 35)'%3E🍎%3C/text%3E%3Ctext x='180' y='25' text-anchor='middle' font-size='26'%3E🧠%3C/text%3E%3Ctext x='95' y='85' text-anchor='middle' font-size='20' transform='rotate(-10 95 85)'%3E🦜%3C/text%3E%3Ctext x='250' y='75' text-anchor='middle' font-size='24' transform='rotate(25 250 75)'%3E🛹%3C/text%3E%3Ctext x='30' y='140' text-anchor='middle' font-size='23'%3E🧠%3C/text%3E%3Ctext x='160' y='125' text-anchor='middle' font-size='21' transform='rotate(-20 160 125)'%3E🍎%3C/text%3E%3Ctext x='280' y='145' text-anchor='middle' font-size='25'%3E🦜%3C/text%3E%3Ctext x='75' y='185' text-anchor='middle' font-size='19' transform='rotate(30 75 185)'%3E🛹%3C/text%3E%3Ctext x='200' y='190' text-anchor='middle' font-size='24'%3E🍎%3C/text%3E%3Ctext x='300' y='210' text-anchor='middle' font-size='22' transform='rotate(-15 300 210)'%3E🧠%3C/text%3E%3Ctext x='50' y='245' text-anchor='middle' font-size='20'%3E🦜%3C/text%3E%3Ctext x='140' y='260' text-anchor='middle' font-size='23' transform='rotate(20 140 260)'%3E🛹%3C/text%3E%3Ctext x='240' y='250' text-anchor='middle' font-size='21'%3E🧠%3C/text%3E%3Ctext x='85' y='310' text-anchor='middle' font-size='25' transform='rotate(-25 85 310)'%3E🍎%3C/text%3E%3Ctext x='190' y='305' text-anchor='middle' font-size='19'%3E🦜%3C/text%3E%3Ctext x='270' y='295' text-anchor='middle' font-size='24' transform='rotate(10 270 295)'%3E🛹%3C/text%3E%3C/g%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='%23f8f8f8'/%3E%3Crect width='100%25' height='100%25' fill='url(%23icons)' opacity='0.15'/%3E%3C/svg%3E")`
        }}
      />

      {/* More Subtle Central Blur Effect */}
      <div
        className="absolute w-[945px] h-[945px] left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2"
        data-name="layer blur"
      >
        <div className="absolute inset-[-14.815%]">
          <svg
            className="block w-full h-full"
            fill="none"
            preserveAspectRatio="none"
            viewBox="0 0 1225 1225"
          >
            <defs>
              <filter
                colorInterpolationFilters="sRGB"
                filterUnits="userSpaceOnUse"
                height="1225"
                id="filter0_f_15_98"
                width="1225"
                x="0"
                y="0"
              >
                <feFlood floodOpacity="0" result="BackgroundImageFix" />
                <feBlend
                  in="SourceGraphic"
                  in2="BackgroundImageFix"
                  mode="normal"
                  result="shape"
                />
                <feGaussianBlur
                  result="effect1_foregroundBlur_15_98"
                  stdDeviation="50"
                />
              </filter>
            </defs>
            <circle
              cx="612.5"
              cy="612.5"
              fill="white"
              fillOpacity="0.25"
              r="472.5"
              filter="url(#filter0_f_15_98)"
            />
          </svg>
        </div>
      </div>

      {/* Login Form */}
      <div
        className="absolute bg-white h-[300px] left-1/2 rounded-3xl top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[378px] shadow-[0px_8px_32px_0px_rgba(0,0,0,0.15)] border-2 border-[rgba(213,213,213,0.5)]"
        data-name="Login Form"
      >
        <div className="flex flex-col h-full items-center justify-center p-8">
          {/* Apple Icon */}
          <div className="flex items-center justify-center w-[70px] h-[70px] shrink-0 mb-6">
            <img 
              src="/images/apple.png" 
              alt="App Logo" 
              className="w-[70px] h-[70px] object-contain"
            />
          </div>

          {/* Welcome Text */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Welcome to GoodThiings</h1>
            <p className="text-gray-600 text-sm">Sign in with Google to get started</p>
          </div>

          {/* Google Sign In Button */}
          <button 
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full bg-[#6AADFF] rounded-[20px] flex items-center justify-center pl-[18px] pr-2.5 py-3 hover:bg-[#5A9AEF] transition-colors outline-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center">
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
              ) : (
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path
                    fill="white"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="white"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="white"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="white"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              )}
              <span className="text-white text-lg font-['Helvetica_Neue'] font-bold">
                {isLoading ? 'Signing in...' : 'Continue with Google'}
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
} 