import React, { useCallback, useState } from 'react';

interface FileUploadProps {
  onFileSelect: (base64: string) => void;
  selectedImage: string | null;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, selectedImage }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data URL prefix if present for Gemini API usually, but here we keep standard Base64 flow
      // The Gemini Service will handle specific format if needed, but standard <img src> needs prefix.
      // @google/genai usually expects base64 string without prefix for inlineData? 
      // Actually @google/genai usually takes raw base64. 
      // Let's store the full data URL for preview, and strip it when sending to API.
      onFileSelect(base64String); 
    };
    reader.readAsDataURL(file);
  }, [onFileSelect]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [handleFile]);

  const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  }, [handleFile]);

  return (
    <div className="w-full mb-6">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={`relative group cursor-pointer border-2 border-dashed rounded-2xl transition-all duration-300 h-64 flex flex-col items-center justify-center overflow-hidden
          ${isDragging ? 'border-brand-accent bg-brand-surface' : 'border-brand-surface hover:border-brand-muted'}
          ${selectedImage ? 'border-solid border-brand-accent' : ''}
        `}
      >
        <input
          type="file"
          accept="image/*"
          onChange={onChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
        />

        {selectedImage ? (
          <img 
            src={selectedImage} 
            alt="Preview" 
            className="absolute inset-0 w-full h-full object-cover z-10" 
          />
        ) : (
          <div className="text-center p-6 z-10 pointer-events-none">
            <div className="w-16 h-16 rounded-full bg-brand-surface flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8 text-brand-muted group-hover:text-brand-accent">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <p className="text-brand-text font-semibold text-lg">Toque para enviar foto</p>
            <p className="text-brand-muted text-sm mt-1">Ou arraste aqui</p>
          </div>
        )}
        
        {selectedImage && (
            <div className="absolute inset-0 bg-black/40 z-15 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <span className="text-white font-bold bg-black/50 px-4 py-2 rounded-lg">Trocar foto</span>
            </div>
        )}
      </div>
    </div>
  );
};