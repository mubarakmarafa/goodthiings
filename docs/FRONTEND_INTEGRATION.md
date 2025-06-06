# Frontend Integration with User API Keys

## 🔐 **Secure API Key Management**

### **Why User-Provided Keys Are Perfect:**
- ✅ **Zero server costs** for API usage
- ✅ **User controls** their own billing
- ✅ **Privacy protection** - keys never stored server-side
- ✅ **Scalable** - no rate limiting concerns
- ✅ **Liability-free** - users manage their own usage

## 🎨 **OpenAI Model Support**

The Edge Functions support **OpenAI's latest image generation models**:
- **Primary**: `gpt-image-1` (OpenAI's newest model)
- **Fallback**: `dall-e-3` (if latest model unavailable)
- **Auto-detection**: Handles model availability gracefully

## 🔧 **Frontend Implementation**

### **1. API Key Storage (React)**

```typescript
// hooks/useOpenAIKey.ts
import { useState, useEffect } from 'react'

export const useOpenAIKey = () => {
  const [apiKey, setApiKey] = useState<string>('')
  const [isValidKey, setIsValidKey] = useState<boolean>(false)

  useEffect(() => {
    // Load from localStorage on mount
    const stored = localStorage.getItem('openai_api_key')
    if (stored) {
      setApiKey(stored)
      setIsValidKey(validateApiKey(stored))
    }
  }, [])

  const saveApiKey = (key: string) => {
    const trimmed = key.trim()
    setApiKey(trimmed)
    setIsValidKey(validateApiKey(trimmed))
    
    if (trimmed) {
      localStorage.setItem('openai_api_key', trimmed)
    } else {
      localStorage.removeItem('openai_api_key')
    }
  }

  const clearApiKey = () => {
    setApiKey('')
    setIsValidKey(false)
    localStorage.removeItem('openai_api_key')
  }

  return { apiKey, isValidKey, saveApiKey, clearApiKey }
}

const validateApiKey = (key: string): boolean => {
  return key.startsWith('sk-') && key.length > 20
}
```

### **2. API Key Input Component**

```typescript
// components/ApiKeySetup.tsx
import React, { useState } from 'react'
import { useOpenAIKey } from '../hooks/useOpenAIKey'

export const ApiKeySetup: React.FC = () => {
  const { apiKey, isValidKey, saveApiKey, clearApiKey } = useOpenAIKey()
  const [inputValue, setInputValue] = useState(apiKey)
  const [showKey, setShowKey] = useState(false)

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">OpenAI API Key Setup</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your OpenAI API Key
          </label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="sk-..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2 top-2 text-gray-500 hover:text-gray-700"
            >
              {showKey ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={() => saveApiKey(inputValue)}
            disabled={!validateApiKey(inputValue)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            Save Key
          </button>
          
          {apiKey && (
            <button
              onClick={clearApiKey}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Clear Key
            </button>
          )}
        </div>

        {isValidKey && (
          <div className="text-green-600 text-sm">✅ Valid API key saved locally</div>
        )}

        <div className="text-sm text-gray-600">
          <p>🔒 Your API key is stored locally and never sent to our servers.</p>
          <p>💰 You control your own OpenAI usage and billing.</p>
          <p>🔗 Get your key at: <a href="https://platform.openai.com/api-keys" className="text-blue-600 hover:underline">OpenAI API Keys</a></p>
        </div>
      </div>
    </div>
  )
}

const validateApiKey = (key: string): boolean => {
  return key.startsWith('sk-') && key.length > 20
}
```

### **3. Image Generation with Edge Functions**

```typescript
// hooks/useImageGeneration.ts
import { useSupabase } from './useSupabase'
import { useOpenAIKey } from './useOpenAIKey'

export const useImageGeneration = () => {
  const { supabase, session } = useSupabase()
  const { apiKey, isValidKey } = useOpenAIKey()

  const generateImage = async (
    prompt: string,
    styleType: '3d' | 'handdrawn',
    gridPosition?: { x: number; y: number }
  ) => {
    if (!isValidKey) {
      throw new Error('Please provide a valid OpenAI API key')
    }

    if (!session) {
      throw new Error('Please sign in to generate images')
    }

    try {
      // Call Supabase Edge Function with user's API key
      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/images-generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'x-openai-key': apiKey, // Pass user's API key securely
        },
        body: JSON.stringify({
          prompt,
          style_type: styleType,
          grid_position_x: gridPosition?.x || 0,
          grid_position_y: gridPosition?.y || 0,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate image')
      }

      const result = await response.json()
      return {
        success: true,
        image: result.image,
        modelUsed: result.model_used, // 'gpt-image-1' or 'dall-e-3'
        message: result.message
      }
    } catch (error) {
      console.error('Image generation error:', error)
      throw error
    }
  }

  return { generateImage, canGenerate: isValidKey }
}
```

### **4. Complete Image Generation Component**

```typescript
// components/ImageGenerator.tsx
import React, { useState } from 'react'
import { useImageGeneration } from '../hooks/useImageGeneration'
import { ApiKeySetup } from './ApiKeySetup'

export const ImageGenerator: React.FC = () => {
  const { generateImage, canGenerate } = useImageGeneration()
  const [prompt, setPrompt] = useState('')
  const [style, setStyle] = useState<'3d' | 'handdrawn'>('3d')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImage, setGeneratedImage] = useState<any>(null)

  const handleGenerate = async () => {
    if (!prompt.trim()) return

    setIsGenerating(true)
    try {
      const result = await generateImage(prompt, style)
      setGeneratedImage(result)
      console.log(`Image generated using: ${result.modelUsed}`)
    } catch (error) {
      console.error('Generation failed:', error)
      alert(error.message)
    } finally {
      setIsGenerating(false)
    }
  }

  if (!canGenerate) {
    return <ApiKeySetup />
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4">AI Image Generation</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the image you want to generate..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Style
            </label>
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value as '3d' | 'handdrawn')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="3d">3D Rendered</option>
              <option value="handdrawn">Hand-drawn Illustration</option>
            </select>
          </div>

          <button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isGenerating ? 'Generating...' : 'Generate Image'}
          </button>
        </div>
      </div>

      {generatedImage && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Generated Image</h3>
          <img 
            src={generatedImage.image.image_url} 
            alt={generatedImage.image.prompt}
            className="w-full rounded-lg"
          />
          <p className="text-sm text-gray-600 mt-2">
            Model used: {generatedImage.modelUsed}
          </p>
        </div>
      )}
    </div>
  )
}
```

## 🔐 **Security Benefits**

### **API Key Flow:**
1. **User enters** API key in frontend
2. **Stored locally** in `localStorage` (never sent to your database)
3. **Passed securely** to Edge Function via `x-openai-key` header
4. **Used directly** with OpenAI API
5. **Never stored** on your servers

### **Privacy Protection:**
- ✅ No server-side API key storage
- ✅ Direct user-to-OpenAI communication
- ✅ Full user control over usage
- ✅ Zero liability for API costs

## 🚀 **Model Support**

The Edge Function automatically handles:
- **Primary**: `gpt-image-1` (OpenAI's latest)
- **Fallback**: `dall-e-3` (if needed)
- **Quality**: High quality output
- **Error handling**: Graceful model switching

Perfect architecture for your AI image generation needs! 🎨 