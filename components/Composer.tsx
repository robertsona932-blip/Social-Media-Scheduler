import React, { useRef, useState } from 'react';
import { ImageIcon, CalendarIcon, SparklesIcon, BlueskyIcon, FacebookIcon } from './Icons';
import { generatePostSuggestion } from '../services/geminiService';
import { Platform } from '../types';

interface ComposerProps {
  content: string;
  setContent: (content: string) => void;
  imageUrl: string | null;
  setImageUrl: (url: string | null) => void;
  setImageFile: (file: File | null) => void;
  scheduledTime: string;
  setScheduledTime: (time: string) => void;
  onSchedule: (platform: Platform) => void;
  onPostNow: (platform: Platform) => void;
  selectedPlatform: Platform;
  setSelectedPlatform: (platform: Platform) => void;
  isConnected: { [key in Platform]?: boolean };
}

const PlatformButton: React.FC<{ platform: Platform; icon: React.ReactNode; isSelected: boolean; onClick: () => void; }> = ({ platform, icon, isSelected, onClick }) => (
    <button
        onClick={onClick}
        className={`flex-1 flex items-center justify-center gap-3 p-3 rounded-lg border-2 transition-all duration-200 ${isSelected ? 'bg-indigo-600/20 border-indigo-500 text-white' : 'bg-slate-900/50 border-slate-700 text-slate-300 hover:border-slate-500'}`}
    >
        {icon}
        <span className="font-bold">{platform}</span>
    </button>
);


const Composer: React.FC<ComposerProps> = ({
  content,
  setContent,
  imageUrl,
  setImageUrl,
  setImageFile,
  scheduledTime,
  setScheduledTime,
  onSchedule,
  onPostNow,
  selectedPlatform,
  setSelectedPlatform,
  isConnected
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [aiTopic, setAiTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const isBluesky = selectedPlatform === Platform.Bluesky;
  const characterLimit = 300;
  const isContentTooLong = isBluesky && content.length > characterLimit;


  const handleFile = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      setImageUrl(URL.createObjectURL(file));
    } else {
      alert("Invalid file type. Please select an image file (e.g., JPG, PNG). This app creates feed posts, not stories, and does not support video uploads.");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImageUrl(null);
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };
  
  const handleGenerateClick = async () => {
      if (!aiTopic) return;
      setIsGenerating(true);
      const suggestion = await generatePostSuggestion(aiTopic);
      setContent(suggestion);
      setIsGenerating(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!imageUrl) {
        setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0] && !imageUrl) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const isActionDisabled = !content.trim() || !isConnected[selectedPlatform] || isContentTooLong;
  const actionDisabledTitle = !isConnected[selectedPlatform] 
      ? `Please connect to ${selectedPlatform} first` 
      : isContentTooLong 
      ? `Post is over the ${characterLimit} character limit for Bluesky`
      : "";

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-6 relative transition-all duration-300 ${isDragging ? 'border-indigo-500 border-dashed ring-4 ring-indigo-500/30' : ''}`}
    >
      {isDragging && (
        <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm flex flex-col items-center justify-center rounded-2xl z-10 pointer-events-none">
            <ImageIcon className="w-16 h-16 text-indigo-400 mb-4" />
            <p className="text-xl font-bold text-slate-100">Drop image to upload</p>
        </div>
      )}
      
      <div>
        <h3 className="text-lg font-semibold text-slate-200 mb-2">1. Select Platform</h3>
        <div className="flex gap-4">
            <PlatformButton
                platform={Platform.Bluesky}
                icon={<BlueskyIcon className="w-6 h-6" />}
                isSelected={selectedPlatform === Platform.Bluesky}
                onClick={() => setSelectedPlatform(Platform.Bluesky)}
            />
            <PlatformButton
                platform={Platform.Facebook}
                icon={<FacebookIcon className="w-6 h-6" />}
                isSelected={selectedPlatform === Platform.Facebook}
                onClick={() => setSelectedPlatform(Platform.Facebook)}
            />
        </div>
      </div>
      
      <div>
        <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold text-slate-200">2. Compose Post</h3>
            {selectedPlatform === Platform.Facebook && (
                <p className="text-xs text-slate-400">Creates a Page feed post.</p>
            )}
        </div>
        <div className="relative">
            <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind?"
            className="w-full h-32 bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition resize-none"
            />
            {isBluesky && (
                <span className={`absolute bottom-3 right-3 text-xs ${isContentTooLong ? 'text-red-400 font-semibold' : 'text-slate-400'}`}>
                    {content.length} / {characterLimit}
                </span>
            )}
        </div>
        {imageUrl && (
            <div className="relative mt-4">
            <img src={imageUrl} alt="Preview" className="rounded-lg max-h-60 w-auto" />
            <button
                onClick={removeImage}
                className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1.5 hover:bg-black/80 transition"
                aria-label="Remove image"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
            </div>
        )}
        <div className="flex items-center space-x-4 mt-2">
            <button onClick={() => fileInputRef.current?.click()} className="text-slate-400 hover:text-indigo-400 transition flex items-center gap-2 p-2 rounded-md hover:bg-slate-700/50 disabled:opacity-50 disabled:cursor-not-allowed" disabled={!!imageUrl}>
            <ImageIcon className="w-6 h-6" />
            <span className="text-sm font-medium text-slate-300">Add Image</span>
            </button>
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
            {!imageUrl && <p className="text-sm text-slate-500">or drag and drop</p>}
        </div>
      </div>

      <div className="space-y-3 pt-4 border-t border-slate-700">
        <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2"><SparklesIcon className="w-5 h-5 text-indigo-400" /> Generate with AI</h3>
        <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={aiTopic}
              onChange={(e) => setAiTopic(e.target.value)}
              placeholder="e.g., a new product launch..."
              className="flex-grow bg-slate-900 border border-slate-700 rounded-md py-2 px-3 text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
            />
            <button
                onClick={handleGenerateClick}
                disabled={isGenerating || !aiTopic}
                className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-indigo-500 transition disabled:bg-slate-600 disabled:cursor-not-allowed flex items-center justify-center"
            >
               {isGenerating ? (
                   <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                   </>
               ) : 'Generate'}
            </button>
        </div>
      </div>
      
      <div className="space-y-3 pt-4 border-t border-slate-700">
        <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2"><CalendarIcon className="w-5 h-5 text-indigo-400" /> 3. Schedule or Post</h3>
        <input
          type="datetime-local"
          value={scheduledTime}
          onChange={(e) => setScheduledTime(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 rounded-md py-2 px-3 text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
        />
        <div className="pt-2 flex flex-col sm:flex-row gap-3" title={actionDisabledTitle}>
            <button
            onClick={() => onPostNow(selectedPlatform)}
            disabled={isActionDisabled}
            className="w-full sm:w-auto flex-1 bg-transparent border-2 border-indigo-600 text-indigo-300 font-bold py-3 px-4 rounded-lg hover:bg-indigo-600 hover:text-white transition disabled:border-slate-600 disabled:text-slate-500 disabled:bg-transparent disabled:cursor-not-allowed text-lg"
            >
            Post Now
            </button>
            <button
            onClick={() => onSchedule(selectedPlatform)}
            disabled={isActionDisabled || !scheduledTime}
            className="w-full sm:w-auto flex-1 bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-500 transition disabled:bg-slate-600 disabled:cursor-not-allowed text-lg"
            >
            Schedule Post
            </button>
        </div>
      </div>
    </div>
  );
};

export default Composer;