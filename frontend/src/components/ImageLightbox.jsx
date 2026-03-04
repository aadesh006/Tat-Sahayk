import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

const ImageLightbox = ({ images, startIndex = 0, onClose }) => {
  const [current, setCurrent] = useState(startIndex);

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!images?.length) return null;

  return (
    <div
      className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center"
      onClick={onClose}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
      >
        <X size={24} />
      </button>

      {/* Prev */}
      {images.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); setCurrent((c) => (c - 1 + images.length) % images.length); }}
          className="absolute left-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white"
        >
          <ChevronLeft size={28} />
        </button>
      )}

      {/* Image */}
      <img
        src={images[current]}
        alt="Full view"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
      />

      {/* Next */}
      {images.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); setCurrent((c) => (c + 1) % images.length); }}
          className="absolute right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white"
        >
          <ChevronRight size={28} />
        </button>
      )}

      {/* Counter */}
      {images.length > 1 && (
        <div className="absolute bottom-4 text-white/60 text-sm">
          {current + 1} / {images.length}
        </div>
      )}
    </div>
  );
};

export default ImageLightbox;