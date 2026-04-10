export const compressImage = async (
  file: File,
  maxWidthPx: number = 1024,
  quality: number = 0.8
): Promise<File> => {
  return new Promise((resolve) => {
    try {
      if (!file.type.startsWith('image/')) {
        resolve(file); // Return original if not an image
        return;
      }

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions
          if (width > maxWidthPx) {
            height = Math.round((height * maxWidthPx) / width);
            width = maxWidthPx;
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(file); // Fallback to original
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                resolve(file); // Fallback to original
                return;
              }
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            },
            file.type,
            quality
          );
        };
        img.onerror = () => {
          resolve(file); // Fallback to original
        };
      };
      reader.onerror = () => {
        resolve(file); // Fallback to original
      };
    } catch (error) {
      console.error('Error compressing image:', error);
      resolve(file); // Fallback to original securely
    }
  });
};
