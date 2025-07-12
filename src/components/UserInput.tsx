import { useState } from 'react';
import { useImageGeneration, type GeneratedImage } from '../hooks/useImageGeneration';
import { toast } from 'sonner';

type StyleType = '3d' | 'handdrawn';

interface Style {
  id: StyleType;
  name: string;
  image: string;
}

const STYLES: Style[] = [
  {
    id: 'handdrawn',
    name: 'Hand drawn style',
    image: '/images/handapple.png'
  },
  {
    id: '3d',
    name: '3D icon style', 
    image: '/images/apple.png'
  }
];

// Helper function to get friendly model name
const getModelDisplayName = (modelUsed?: string): string => {
  if (!modelUsed) return '';
  
  switch (modelUsed) {
    case 'gpt-image-1':
      return 'GPT-Image-1';
    case 'dall-e-3':
      return 'DALL-E 3';
    case 'dall-e-2':
      return 'DALL-E 2';
    case 'dev-mode':
      return 'Dev Mode';
    default:
      return modelUsed.toUpperCase();
  }
};

export default function UserInput() {
  const [inputValue, setInputValue] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<StyleType>('3d');
  const [previewImage, setPreviewImage] = useState<GeneratedImage | null>(null);
  const { generateImage, isGenerating, canGenerate, lastError } = useImageGeneration();

  const currentStyle = STYLES.find(style => style.id === selectedStyle) || STYLES[1];

  const handleStyleSelect = (styleId: StyleType) => {
    setSelectedStyle(styleId);
    setIsDropdownOpen(false);
  };

  const toggleDropdown = () => {
    // Don't allow dropdown when preview is active
    if (previewImage) return;
    setIsDropdownOpen(!isDropdownOpen);
  };

  const generateRandomPosition = () => {
    // Generate random position in a reasonable grid range
    const x = Math.floor(Math.random() * 20) - 10; // -10 to +10
    const y = Math.floor(Math.random() * 20) - 10; // -10 to +10
    return { x, y };
  };

  const handleSaveImage = () => {
    if (!previewImage) return;
    
    // The image was already generated and saved to the database
    // Just clear the preview and show success
    setPreviewImage(null);
    toast.success('Image saved to grid! 🎨');
    
    // Auto-pan to the image in the grid if the function exists
    if ((window as any).focusOnNewImage) {
      (window as any).focusOnNewImage(
        previewImage.id, 
        previewImage.grid_position_x, 
        previewImage.grid_position_y
      );
    }
  };

  const handleDiscardImage = () => {
    if (!previewImage) return;
    
    // For now, just clear the preview
    // In a full implementation, you might want to mark the image as deleted
    setPreviewImage(null);
    toast.success('Image discarded');
  };

  const handleGenerate = async () => {
    // Clear any previous errors
    if (lastError) {
      console.log('Clearing previous error');
    }

    // Validate input
    if (!inputValue.trim()) {
      toast.error('Please enter a prompt for your image');
      return;
    }

    if (!canGenerate) {
      toast.error('Please log in and provide an OpenAI API key');
      return;
    }

    const gridPosition = generateRandomPosition();
    console.log('🎯 Starting image generation:', {
      prompt: inputValue.trim(),
      style: selectedStyle,
      position: gridPosition
    });

    try {
      // Show loading toast
      toast.loading('Generating your image...', { id: 'generating' });

      // Generate the image
      const newImage = await generateImage(inputValue, selectedStyle, gridPosition);
      
      // Clear the input
      setInputValue('');
      
      // Show success with model info
      const modelName = getModelDisplayName(newImage.model_used);
      const successMessage = modelName 
        ? `Image created with ${modelName}! Choose to save or discard.`
        : 'Image created! Choose to save or discard.';
      
      toast.success(successMessage, { id: 'generating' });
      
      console.log('✅ Image generated successfully:', {
        id: newImage.id,
        model: newImage.model_used,
        prompt: newImage.prompt
      });
      
      // Show preview
      setPreviewImage(newImage);

    } catch (error: any) {
      console.error('❌ Image generation failed:', error);
      
      // Show error toast
      const errorMessage = error.message || 'Failed to generate image';
      toast.error(errorMessage, { id: 'generating' });
      
      // Log error details for debugging
      console.error('Error details:', {
        message: error.message,
        type: typeof error,
        error: error
      });
    }
  };

  return (
    <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 z-10">
      <div
        className={`bg-white relative rounded-3xl w-[378px] shadow-[0px_8px_32px_0px_rgba(0,0,0,0.15)] border-2 border-[rgba(213,213,213,0.5)] transition-all duration-300 ease-in-out ${
          previewImage 
            ? 'h-[380px]' // Expanded for preview with model info
            : isDropdownOpen 
            ? 'h-[140px]' // Style dropdown
            : 'h-[70px]'  // Normal input
        }`}
        data-name="User Input"
      >
        <div className="overflow-hidden h-full">
          {previewImage ? (
            // Preview state - show generated image with save/discard options
            <div className="flex flex-col h-full">
              {/* Blue Header Banner */}
              <div className="bg-[#6AADFF] rounded-2xl px-6 py-4 text-center m-1 mb-0">
                <p className="text-white text-[16px] font-semibold">
                  Here's your {previewImage.prompt}
                </p>
                {previewImage.model_used && (
                  <p className="text-white text-[12px] opacity-80 mt-1">
                    Generated with {getModelDisplayName(previewImage.model_used)}
                  </p>
                )}
              </div>
              
              {/* White Content Area */}
              <div className="bg-white pt-6 flex flex-col flex-1 rounded-b-3xl">
                {/* Generated Image */}
                <div className="flex-1 flex items-center justify-center mb-4 px-8">
                  <div className="flex items-center justify-center" style={{ maxWidth: '180px', maxHeight: '180px' }}>
                    <img 
                      src={previewImage.image_url} 
                      alt={previewImage.prompt}
                      className="max-w-full max-h-full object-contain drop-shadow-lg"
                                             onError={() => {
                         console.error('Image failed to load:', previewImage.image_url);
                         // You could set a fallback image here
                       }}
                    />
                  </div>
                </div>
                
                {/* Show revised prompt if available */}
                {previewImage.revised_prompt && previewImage.revised_prompt !== previewImage.prompt && (
                  <div className="px-4 mb-4">
                    <p className="text-xs text-gray-600 text-center">
                      <span className="font-semibold">AI Enhanced:</span> {previewImage.revised_prompt}
                    </p>
                  </div>
                )}
                
                {/* Action Buttons */}
                <div className="flex gap-3 px-1 pb-1">
                  <button
                    onClick={handleDiscardImage}
                    className="flex-1 h-[44px] bg-[#6AADFF] hover:bg-[#5A9AEF] rounded-2xl transition-colors font-semibold text-white text-[15px]"
                  >
                    Discard
                  </button>
                  <button
                    onClick={handleSaveImage}
                    className="flex-1 h-[44px] bg-[#6AADFF] hover:bg-[#5A9AEF] rounded-2xl transition-colors font-semibold text-white text-[15px]"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          ) : isDropdownOpen ? (
            // Dropdown state - show style options
            <div className="flex flex-col h-full">
              {STYLES.map((style, index) => (
                <button
                  key={style.id}
                  onClick={() => handleStyleSelect(style.id)}
                  className={`flex items-center h-[70px] bg-white hover:bg-white/80 transition-colors p-0 border-none outline-none focus:outline-none ${
                    index === 0 ? 'rounded-t-3xl' : ''
                  } ${
                    index === STYLES.length - 1 ? 'rounded-b-3xl' : ''
                  }`}
                >
                  {/* Style Icon */}
                  <div className="flex items-center justify-center w-[70px] h-[70px] shrink-0">
                    <img 
                      src={style.image} 
                      alt={style.name}
                      className="w-[70px] h-[70px] object-contain"
                    />
                  </div>
                  
                  {/* Style Label */}
                  <div className="flex-1 px-4">
                    <div className="text-[20px] font-['Helvetica_Neue'] font-bold text-black text-left">
                      {style.name}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            // Normal input state
            <div className="flex flex-row items-center justify-start h-full">
              {/* Style Selector Button */}
              <button 
                onClick={toggleDropdown}
                className="flex items-center justify-center w-[70px] h-[70px] shrink-0 bg-white hover:bg-white/80 rounded-l-3xl transition-colors p-0 border-none outline-none focus:outline-none"
                title={`Current style: ${currentStyle.name}`}
              >
                <img 
                  src={currentStyle.image} 
                  alt={currentStyle.name} 
                  className="w-[70px] h-[70px] object-contain"
                />
              </button>

              {/* Text Input Field */}
              <div className="flex-1 px-4">
                <input
                  type="text"
                  placeholder="An apple"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isGenerating && !previewImage && inputValue.trim()) {
                      e.preventDefault();
                      handleGenerate();
                    }
                  }}
                  disabled={isGenerating || !!previewImage}
                  className={`w-full h-full bg-transparent border-none outline-none text-[20px] font-['Helvetica_Neue'] font-bold placeholder-[#c1c1c1] ${
                    inputValue ? 'text-black' : 'text-[#c1c1c1]'
                  } ${(isGenerating || previewImage) ? 'opacity-50' : ''}`}
                />
              </div>

              {/* Generate Button */}
              <div className="pr-[5px]">
                <button 
                  onClick={handleGenerate}
                  disabled={isGenerating || !inputValue.trim() || !!previewImage}
                  className="w-[60px] h-[60px] bg-[#6AADFF] rounded-[20px] flex items-center justify-center hover:bg-[#5A9AEF] transition-colors outline-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  title={isGenerating ? 'Generating...' : 'Generate image'}
                >
                  {isGenerating ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <svg 
                      width="40" 
                      height="40" 
                      viewBox="0 0 40 40" 
                      fill="none" 
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-10 h-10"
                    >
                      <path 
                        fillRule="evenodd" 
                        clipRule="evenodd" 
                        d="M9.05242 26.1166C4.81095 23.1013 2.40818 21.1066 1.06226 19.8635C0.324709 19.1822 -0.0630866 18.2532 0.00870894 17.2961C0.0805667 16.3382 0.603642 15.4766 1.43939 14.9151C4.63957 12.7651 10.8555 9.48996 17.4185 6.55848C23.9661 3.63379 31.0321 0.972612 35.9158 0.132372C38.3042 -0.278553 40.1526 1.70309 39.9901 3.94195C39.6494 8.6369 38.5706 15.4374 37.1868 21.759C35.8154 28.0249 34.098 34.0439 32.4165 37.0472C31.4979 38.6879 29.5858 38.9344 28.1802 38.2162C26.9594 37.5925 24.9947 36.5086 22.1012 34.6967C19.6307 37.315 16.7906 39.2413 13.9377 39.922C15.3594 35.465 16.8271 29.4985 17.1936 27.9864C19.8425 24.65 24.1854 19.7709 27.8963 15.6953C29.7475 13.6621 31.4314 11.8398 32.6525 10.5258C33.263 9.8689 33.7577 9.33921 34.0994 8.97405C34.2703 8.79138 34.4029 8.64996 34.4927 8.55432L34.6285 8.40979C35.3014 7.69476 35.2678 6.56918 34.5528 5.89627C33.8379 5.22336 32.7127 5.25746 32.0398 5.97244L32.0391 5.97314L31.9002 6.12094C31.8093 6.21784 31.6754 6.36058 31.5034 6.54452C31.1591 6.91239 30.6616 7.44509 30.048 8.10534C28.821 9.42579 27.1286 11.2572 25.2673 13.3015C21.5562 17.3771 17.1336 22.3426 14.4014 25.7851C14.0749 26.1965 13.857 26.6584 13.7384 27.1477C13.3802 28.6253 12.0611 33.9756 10.7599 38.1759C10.7599 38.1759 10.7598 38.1764 10.7596 38.1772C10.5752 37.7709 10.4226 37.3251 10.293 36.8734C9.89785 35.4948 9.63305 33.7497 9.45198 32.0845C9.26922 30.4048 9.16531 28.7443 9.107 27.508C9.08051 26.9465 9.06327 26.4702 9.05242 26.1166Z" 
                        fill="white" 
                        style={{fill: "white", fillOpacity: 1}}
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 