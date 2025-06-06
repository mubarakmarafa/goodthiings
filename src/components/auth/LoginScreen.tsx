import React, { useState } from 'react';
import { toast } from 'sonner';

interface LoginScreenProps {
  onLogin: (email: string, password: string, apiKey: string) => Promise<void>;
  onSignUp: (email: string, password: string, apiKey: string) => Promise<void>;
  onResetPassword: (email: string) => Promise<void>;
}

export default function LoginScreen({ onLogin, onSignUp, onResetPassword }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [forceLoginOnly, setForceLoginOnly] = useState(false);

  const handleForgotPassword = async () => {
    if (!username) {
      toast.error('Please enter your username first');
      return;
    }

    try {
      setIsLoading(true);
      await onResetPassword(username);
      toast.success('Password reset email sent! Check your inbox and follow the instructions.');
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast.error(error.message || 'Failed to send password reset email');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestDirectAuth = async () => {
    if (!username || !password) {
      toast.error('Please enter username and password first');
      return;
    }

    console.log('🧪 Starting direct auth test...');
    try {
      setIsLoading(true);
      
      // Call the global test function we added to window
      const result = await (window as any).testDirectAuth(username, password);
      
      if (result.success) {
        toast.success('✅ Direct auth SUCCESS! Issue is with Edge Functions. Check console for details.');
      } else {
        toast.error('❌ Direct auth FAILED. Issue is with Supabase/credentials. Check console for details.');
      }
    } catch (error: any) {
      console.error('Direct auth test error:', error);
      toast.error('Test failed: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckUserStatus = async () => {
    if (!username) {
      toast.error('Please enter your username first');
      return;
    }

    console.log('🔍 Checking user status...');
    try {
      setIsLoading(true);
      
      // Call the global test function we added to window
      const result = await (window as any).checkUserStatus(username);
      
      if (result.exists) {
        toast.success('✅ User exists and password reset sent! Check console for details.');
      } else {
        toast.error('❌ User status check failed. Check console for details.');
      }
    } catch (error: any) {
      console.error('User status check error:', error);
      toast.error('Status check failed: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password || !apiKey) {
      toast.error('Please fill in all fields');
      return;
    }

    if (!apiKey.startsWith('sk-')) {
      toast.error('OpenAI API key should start with "sk-"');
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('🔐 Starting authentication with:', { username, hasPassword: !!password, hasApiKey: !!apiKey });
      
      // More robust approach: Check which HTTP status code we get
      let loginSuccessful = false;
      let shouldTrySignup = false;
      
      try {
        console.log('🔍 Attempting LOGIN first...');
        await onLogin(username, password, apiKey);
        loginSuccessful = true;
        console.log('✅ LOGIN successful!');
        toast.success('Welcome back!');
      } catch (loginError: any) {
        console.log('❌ LOGIN failed with error:', {
          message: loginError.message,
          status: loginError.status,
          errorObject: loginError
        });
        
        // More robust error detection for different environments
        const errorMsg = loginError.message?.toLowerCase() || '';
        
        console.log('🔍 Analyzing login error:', {
          originalMessage: loginError.message,
          lowerCaseMessage: errorMsg,
          status: loginError.status
        });
        
        // Check for various forms of "user not found" or "invalid credentials"
        if (errorMsg.includes('invalid login credentials') || 
            errorMsg.includes('user not found') ||
            errorMsg.includes('invalid email or password') ||
            errorMsg.includes('email not found') ||
            errorMsg.includes('no user found') ||
            errorMsg.includes('authentication failed') ||
            errorMsg.includes('401') ||
            loginError.status === 401) {
          
          console.log('🎯 Error indicates user not found - will try SIGNUP');
          shouldTrySignup = true;
          
        } else if (errorMsg.includes('email not confirmed') || 
                   errorMsg.includes('confirm your email') ||
                   errorMsg.includes('verify your email')) {
          console.log('📧 Email confirmation required');
          toast.error('Please check your email and click the confirmation link, then try again.');
          throw loginError;
        } else if (errorMsg.includes('too many') || errorMsg.includes('rate limit')) {
          console.log('⏳ Rate limit hit');
          toast.error('Too many attempts. Please wait a moment and try again.');
          throw loginError;
                  } else {
            // For other errors (like wrong password), don't try signup
            console.log('🚫 Other login error - NOT trying signup:', loginError.message);
            
            // Special handling for "Invalid login credentials"
            if (errorMsg.includes('invalid login credentials')) {
              toast.error('Login failed. This could be: wrong password, unconfirmed email, or account locked. Try checking your email for confirmation or contact support.');
            } else {
              toast.error(`Login failed: ${loginError.message}`);
            }
            throw loginError;
          }
      }
      
      // If login failed due to user not existing, try signup (unless force login only)
      if (!loginSuccessful && shouldTrySignup && !forceLoginOnly) {
        console.log('🆕 Login suggests user doesn\'t exist - attempting SIGNUP...');
        toast.info('Creating your account...');
        try {
          await onSignUp(username, password, apiKey);
          console.log('✅ SIGNUP successful!');
          toast.success('Account created successfully! Welcome to GoodThiings!');
        } catch (signupError: any) {
          console.log('❌ SIGNUP also failed:', {
            message: signupError.message,
            status: signupError.status,
            errorObject: signupError
          });
          
          const signupErrorMsg = signupError.message?.toLowerCase() || '';
          
          // Handle signup-specific errors
          if (signupErrorMsg.includes('user already registered') || 
              signupErrorMsg.includes('email already exists') ||
              signupErrorMsg.includes('already have an account')) {
            toast.error('An account with this email already exists. Please try logging in instead, or use a different email.');
          } else if (signupErrorMsg.includes('email') && signupErrorMsg.includes('invalid')) {
            toast.error('Please use a valid email address (try Gmail, Yahoo, or your work email)');
          } else if (signupErrorMsg.includes('weak') || signupErrorMsg.includes('password')) {
            toast.error('Password must be at least 6 characters long');
          } else if (signupErrorMsg.includes('email rate limit') || signupErrorMsg.includes('too many')) {
            toast.error('Too many signup attempts. Please wait a moment and try again.');
          } else {
            toast.error(`Account creation failed: ${signupError.message}`);
          }
          throw signupError;
        }
      } else if (!loginSuccessful && shouldTrySignup && forceLoginOnly) {
        // User has force login enabled but login failed
        console.log('🔒 Force login enabled - not attempting signup');
        toast.error('Login failed. Please check your email and password, or uncheck "I have an existing account" to create a new account.');
      }
      
    } catch (error: any) {
      console.error('Auth error:', error);
      // Only show generic error if we haven't already shown a specific one
      const errorMsg = error.message?.toLowerCase() || '';
      if (!errorMsg.includes('login failed:') && 
          !errorMsg.includes('account creation failed:') && 
          !errorMsg.includes('please check your email') &&
          !errorMsg.includes('please use a valid email') &&
          !errorMsg.includes('password must be') &&
          !errorMsg.includes('too many') &&
          !errorMsg.includes('already exists')) {
        toast.error(error.message || 'Authentication failed');
      }
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
        className="absolute bg-white h-[360px] left-1/2 rounded-3xl top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[378px] shadow-[0px_8px_32px_0px_rgba(0,0,0,0.15)] border-2 border-[rgba(213,213,213,0.5)]"
        data-name="Login Form"
      >
        <form onSubmit={handleSubmit} className="flex flex-col h-full items-center justify-between p-0 relative w-full">
          {/* Apple Icon */}
          <div className="flex items-center justify-center w-[70px] h-[70px] shrink-0 mt-4">
            <img 
              src="/images/apple.png" 
              alt="App Logo" 
              className="w-[70px] h-[70px] object-contain"
            />
          </div>

          {/* Form Fields */}
          <div className="flex-1 w-full px-2 py-4">
            <div className="flex flex-col gap-2 w-full">
              {/* Username Input */}
              <div className="bg-[#f3f3f3] rounded-2xl w-full">
                <input
                  type="text"
                  placeholder="john123"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full h-full bg-transparent border-none outline-none text-[20px] font-['Helvetica_Neue'] font-bold text-[#333] placeholder-[#c1c1c1] px-4 py-3"
                  autoComplete="username"
                  required
                  disabled={isLoading}
                />
              </div>

              {/* Password Input */}
              <div className="bg-[#f3f3f3] rounded-2xl w-full relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="password1234"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-full bg-transparent border-none outline-none text-[20px] font-['Helvetica_Neue'] font-bold text-[#333] placeholder-[#c1c1c1] px-4 py-3 pr-14"
                  autoComplete="new-password"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 w-10 h-10 flex items-center justify-center outline-none focus:outline-none hover:bg-gray-100 rounded-full transition-colors p-0 m-0 border-0 bg-transparent"
                  disabled={isLoading}
                  style={{ padding: 0, margin: 0, border: 'none', background: 'transparent' }}
                >
                  {showPassword ? (
                    // Hide password icon (eye with slash)
                    <svg
                      width="30"
                      height="17"
                      viewBox="0 0 30 17"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-6 h-4"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M2.3275 0.078867C1.76779 0.0630003 0.900249 0.257867 0.212169 1.31193C-0.104345 1.7968 -0.0427112 2.39827 0.238682 2.8454C1.03914 4.11727 1.97161 5.24813 3.00484 6.23293L0.865442 8.1142C0.165256 8.72987 -0.159584 9.79347 0.459196 10.6311C0.707722 10.9676 1.03147 11.3275 1.44122 11.6411C2.27048 12.2758 3.33245 11.889 3.92088 11.2105L6.16513 8.62233C7.14493 9.20073 8.1724 9.6778 9.2302 10.0509L8.1338 13.2985C7.8356 14.1817 8.0874 15.2646 9.0422 15.6809C9.42593 15.8483 9.88647 15.9983 10.3983 16.0653C11.4342 16.2011 12.1605 15.3359 12.3303 14.4541L13.0097 10.9267C13.6706 11.0037 14.3353 11.0424 15.0002 11.0424C15.5329 11.0424 16.0655 11.0175 16.5961 10.9681L17.2675 14.4541C17.4373 15.3359 18.1637 16.2011 19.1995 16.0653C19.7113 15.9983 20.1719 15.8483 20.5556 15.6809C21.5104 15.2646 21.7622 14.1817 21.464 13.2985L20.4091 10.1739C21.4977 9.8164 22.5565 9.35 23.5671 8.7774L25.6769 11.2105C26.2654 11.889 27.3273 12.2758 28.1566 11.6411C28.5663 11.3275 28.8901 10.9676 29.1386 10.6311C29.7574 9.79347 29.4325 8.72987 28.7324 8.1142L26.8008 6.41567C27.9117 5.38873 28.9112 4.19673 29.7617 2.8454C30.0431 2.39827 30.1047 1.7968 29.7882 1.31193C29.1001 0.257867 28.2325 0.0630003 27.6728 0.078867C27.2357 0.091267 26.9207 0.379 26.7284 0.6492C23.8841 4.64433 19.4499 6.51407 15.0002 6.51407C10.5504 6.51407 6.1162 4.64433 3.27194 0.6492C3.0796 0.379 2.76467 0.0912003 2.3275 0.078867Z"
                        fill="#B1B1B1"
                      />
                    </svg>
                  ) : (
                    // Show password icon (open eye)
                    <svg
                      width="32"
                      height="30"
                      viewBox="0 0 32 30"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-6 h-5"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M15.9998 0C16.7518 0 17.3615 0.609646 17.3615 1.36168V4.70266C18.894 4.82435 20.3685 5.14988 21.7555 5.65174L23.4701 2.68703C23.8466 2.03603 24.68 1.81271 25.3317 2.18823C25.9832 2.56374 26.2062 3.3959 25.8297 4.0469L24.2428 6.79072C25.4358 7.46087 26.5347 8.27237 27.5149 9.20212L29.6556 7.0638C30.1876 6.53234 31.0506 6.53207 31.583 7.06319C32.1154 7.59432 32.1157 8.45572 31.5836 8.98718L29.3293 11.239C30.4597 12.7473 31.3254 14.4564 31.8591 16.3035C32.0467 16.9525 32.047 17.6415 31.8599 18.2907C29.9141 25.045 23.5296 29.957 15.9987 29.957C8.47213 29.957 2.09073 25.0507 0.140851 18.3025C-0.0466838 17.6534 -0.0469554 16.9644 0.140068 16.3152C0.672284 14.4678 1.53654 12.7582 2.66549 11.2493L0.412699 8.98643C-0.117877 8.45347 -0.115191 7.59207 0.418698 7.06244C0.952587 6.53275 1.81551 6.53547 2.34609 7.06843L4.47874 9.21063C5.45784 8.2804 6.55569 7.46836 7.74771 6.79746L6.1677 4.04183C5.79363 3.38943 6.01973 2.55811 6.67273 2.18503C7.32566 1.81195 8.15826 2.03838 8.53231 2.69078L10.233 5.65684C11.6231 5.15241 13.1014 4.8252 14.6381 4.7029V1.36168C14.6381 0.609646 15.2477 0 15.9998 0ZM15.9998 7.37318C15.9835 7.37318 15.9673 7.37291 15.9512 7.37236C13.9509 7.37917 12.0548 7.79727 10.3466 8.54184C10.3394 8.54613 10.3321 8.55035 10.3248 8.55458C10.2387 8.60373 10.1495 8.64247 10.0587 8.6712C8.32656 9.47344 6.79766 10.6149 5.56283 12.0037C5.53547 12.038 5.50621 12.0713 5.47506 12.1035C4.2272 13.5351 3.28884 15.223 2.757 17.0691C2.71209 17.225 2.71215 17.3906 2.75719 17.5465C4.36459 23.1095 9.66408 27.2337 15.9987 27.2337C22.337 27.2337 27.6389 23.1046 29.243 17.5368C29.2879 17.3809 29.2878 17.2153 29.2428 17.0594C28.7161 15.2369 27.7933 13.5688 26.5675 12.1495C26.5543 12.1373 26.5413 12.1248 26.5285 12.112C26.4734 12.0571 26.424 11.9986 26.3803 11.9373C25.138 10.5585 23.6039 9.42782 21.8686 8.63662C21.8119 8.61565 21.756 8.59073 21.7013 8.56166C19.9805 7.80436 18.0676 7.3789 16.0486 7.37229C16.0324 7.37291 16.0161 7.37318 15.9998 7.37318ZM8.66344 17.302C8.66344 13.2563 11.9486 9.97856 15.9985 9.97856C20.0484 9.97856 23.3336 13.2563 23.3336 17.302C23.3336 21.3477 20.0484 24.6254 15.9985 24.6254C11.9486 24.6254 8.66344 21.3477 8.66344 17.302Z"
                        fill="#B1B1B1"
                      />
                    </svg>
                  )}
                </button>
              </div>

              {/* API Key Input */}
              <div className="bg-[#f3f3f3] rounded-2xl w-full">
                <input
                  type="password"
                  placeholder="sk-1234..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full h-full bg-transparent border-none outline-none text-[20px] font-['Helvetica_Neue'] font-bold text-[#333] placeholder-[#c1c1c1] px-4 py-3"
                  autoComplete="off"
                  required
                  disabled={isLoading}
                />
              </div>
              
              {/* Force Login Only Toggle */}
              <div className="flex items-center gap-2 px-2 mt-1">
                <input
                  type="checkbox"
                  id="forceLoginOnly"
                  checked={forceLoginOnly}
                  onChange={(e) => setForceLoginOnly(e.target.checked)}
                  className="w-4 h-4 text-[#6AADFF] bg-gray-100 border-gray-300 rounded focus:ring-[#6AADFF] focus:ring-2"
                  disabled={isLoading}
                />
                <label 
                  htmlFor="forceLoginOnly" 
                  className="text-sm font-medium text-gray-700 cursor-pointer"
                >
                  I have an existing account (login only)
                </label>
              </div>
              
              {/* Helper Actions */}
              <div className="flex flex-col items-center gap-2 px-2 mt-2">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={isLoading || !username}
                  className="text-sm text-[#6AADFF] hover:text-[#5A9AEF] underline disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Forgot Password?
                </button>
                
                {/* Debug Test Buttons */}
                <div className="flex gap-3 text-xs">
                  <button
                    type="button"
                    onClick={handleTestDirectAuth}
                    disabled={isLoading || !username || !password}
                    className="text-gray-500 hover:text-gray-700 underline disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    🧪 Test Direct Auth
                  </button>
                  <button
                    type="button"
                    onClick={handleCheckUserStatus}
                    disabled={isLoading || !username}
                    className="text-gray-500 hover:text-gray-700 underline disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    🔍 Check User Status
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="w-full px-[5px] pb-[5px]">
            <button 
              type="submit"
              disabled={isLoading}
              className="bg-[#6AADFF] rounded-[20px] w-full flex items-center justify-between pl-[18px] pr-2.5 py-2.5 hover:bg-[#5A9AEF] transition-colors outline-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="text-[20px] font-['Helvetica_Neue'] font-bold text-white">
                {isLoading ? 'Authenticating...' : 'Continue'}
              </span>
              <div className="w-[40px] h-[39.844px] flex items-center justify-center">
                {isLoading ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 40 40"
                    fill="none"
                    className="w-8 h-8"
                  >
                    <path
                      clipRule="evenodd"
                      d="M9.05218 26.0386C4.8107 23.0232 2.40794 21.0286 1.06202 19.7855C0.324465 19.1042 -0.0633308 18.1752 0.0084648 17.2181C0.0803226 16.2602 0.603398 15.3986 1.43915 14.8371C4.63933 12.6871 10.8553 9.41196 17.4182 6.48048C23.9659 3.55579 31.0318 0.894609 35.9156 0.0543689C38.304 -0.356556 40.1524 1.62509 39.9899 3.86394C39.6492 8.55889 38.5703 15.3594 37.1866 21.681C35.8151 27.9469 34.0978 33.9659 32.4163 36.9692C31.4977 38.6099 29.5856 38.8564 28.1799 38.1382C26.9591 37.5145 24.9945 36.4306 22.101 34.6187C19.6305 37.237 16.7903 39.1632 13.9374 39.844C15.3592 35.387 16.8268 29.4205 17.1933 27.9084C19.8422 24.572 24.1852 19.6929 27.8961 15.6173C29.7473 13.584 31.4312 11.7618 32.6523 10.4478C33.2628 9.79089 33.7574 9.2612 34.0991 8.89605C34.27 8.71338 34.4027 8.57196 34.4925 8.47632L34.6283 8.33178C35.3012 7.61676 35.2676 6.49118 34.5525 5.81827C33.8376 5.14536 32.7124 5.17945 32.0396 5.89444L32.0388 5.89513L31.9 6.04294C31.8091 6.13984 31.6752 6.28257 31.5031 6.46652C31.1588 6.83439 30.6613 7.36709 30.0477 8.02734C28.8207 9.34778 27.1284 11.1792 25.267 13.2235C21.5562 17.2991 17.1333 22.2646 14.4012 25.7071C14.0747 26.1184 13.8567 26.5804 13.7381 27.0697C13.38 28.5473 12.0609 33.8976 10.7596 38.0979C10.7596 38.0979 10.7596 38.0984 10.7594 38.0992C10.5749 37.6929 10.4223 37.2471 10.2928 36.7954C9.8976 35.4168 9.6328 33.6717 9.45174 32.0065C9.26898 30.3268 9.16507 28.6663 9.10676 27.43C9.08027 26.8685 9.06302 26.3922 9.05218 26.0386Z"
                      fill="white"
                      fillRule="evenodd"
                    />
                  </svg>
                )}
              </div>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 