import React, {useEffect, useRef, useState, DragEvent} from 'react';
import MediaGallery from './MediaGallery';
import Button from '../../components/TiptapEditor/components/ui/Button';

import './style.scss';

interface MediaLibraryProps {
  onInsert?: (image: ImageData) => void;
  onClose?: () => void;
}

interface ImageData {
  id?: string;
  url: string;
  created_at?: string;
  bytes?: number;
  format: string;
  display_name: string;
  width: number;
  height: number;
}

const MediaLibrary: React.FC<MediaLibraryProps> = ({onInsert, onClose}) => {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState<ImageData[]>([]);
  const [previews, setPreviews] = useState<ImageData[]>([]);
  const [selected, setSelected] = useState<ImageData | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const handleUploadClick = () => {
    const confirmUpload = window.confirm(
      "Please avoid uploading too many images unnecessarily to save storage space. Also, ensure your images comply with copyright rules. Do you wish to continue?"
    );

    if (confirmUpload) {
      fileInput.current?.click();
    }
  };

  const loadImage = (file: File): Promise<ImageData> => {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        resolve({
          url,
          width: image.width,
          height: image.height,
          format: file.type.split('/')[1],
          display_name: file.name.split(/\.\w+$/)[0]
        });
      };
      image.src = url;
    });
  };

  const uploadImage = async (file: File) => {
    if (!file.type.startsWith('image/')) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/images', {
        method: 'POST',
        body: formData,
      });
      return await response.json();
    } catch (error) {
      console.error('Upload error:', error);
    }
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    
    await processFiles(files);
  };

  const processFiles = async (files: FileList) => {
    setUploading(true);

    const previewPromises = Array.from(files).map(loadImage);
    const loadedPreviews = await Promise.all(previewPromises);
    setPreviews(loadedPreviews);

    const uploadPromises = Array.from(files).map(uploadImage);
    const uploadImages = await Promise.all(uploadPromises);

    loadedPreviews.forEach(preview => URL.revokeObjectURL(preview.url));
    setPreviews([]);
    setImages(prev => [...uploadImages.filter(Boolean), ...prev]);
    setUploading(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    await processFiles(files);
  };

  const handleFinish = () =>
    selected !== null && onInsert?.(selected)

  useEffect(() => {
    const fetchImages = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/images');
        const data = await response.json();
        setImages(data);
      } catch (error) {
        console.error('Error fetching images:', error);
      } finally {
        setLoading(false)
      }
    }

    fetchImages();
  }, []);

  return (
    <div className="media-library">
      <header className="media-library__header">
        <h2>Assets</h2>
        <Button disabled={loading || uploading} onClick={handleUploadClick}>Upload</Button>
      </header>

      <div className="media-library__content">
        {loading ? (
          <div className="media-library__spinner" aria-label="Loading images"/>
        ) : images.length > 0 ? (
          <MediaGallery data={[...previews, ...images]} onSelect={setSelected} selected={selected}/>
        ) : (
          <div 
            ref={dropZoneRef}
            className={`media-library__dropzone ${isDragging ? 'media-library__dropzone--active' : ''}`}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleUploadClick}
          >
            <div className="media-library__dropzone-content">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
              <h3>Upload images</h3>
              <p>Drag & drop image files here or click to browse</p>
              {uploading && <div className="media-library__spinner" aria-label="Uploading images"/>}
            </div>
          </div>
        )}
      </div>

      <footer className="media-library__footer">
        <Button variant="outline" className="media-library__btn media-library__btn--cancel" onClick={onClose}>
          Cancel
        </Button>
        <Button 
          className="media-library__btn media-library__btn--finish" 
          disabled={!selected || loading || uploading}
          onClick={handleFinish}
        >
          {selected ? 'Insert' : 'Select an image'}
        </Button>
      </footer>

      <input
        style={{display: 'none'}}
        type="file"
        multiple
        accept="image/*"
        ref={fileInput}
        onChange={handleFileChange}
      />
    </div>
  );
};

export default MediaLibrary;

