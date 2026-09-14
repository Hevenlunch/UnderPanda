import { useEffect } from "react";

export interface LightboxItem {
  id?: string;
  title: string;
  image: string;
  caption: string;
  note?: string;
}

interface LightboxProps {
  items: LightboxItem[];
  index: number | null;
  onClose: () => void;
  onChange: (index: number) => void;
  showDetails?: boolean;
  photoLabel?: string;
}

export function Lightbox({
  items,
  index,
  onClose,
  onChange,
  showDetails = true,
  photoLabel = "PHOTO",
}: LightboxProps) {
  useEffect(() => {
    if (index === null) return;
    const neighborIndexes = [
      (index - 1 + items.length) % items.length,
      (index + 1) % items.length,
    ];
    neighborIndexes.forEach((neighborIndex) => {
      const neighbor = items[neighborIndex];
      if (!neighbor || neighborIndex === index) return;
      const image = new Image();
      image.decoding = "async";
      image.src = neighbor.image;
    });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") onChange((index - 1 + items.length) % items.length);
      if (event.key === "ArrowRight") onChange((index + 1) % items.length);
    };
    document.body.classList.add("overlay-open");
    window.addEventListener("keydown", onKeyDown);
    return () => {
      if (!document.querySelector(".drawer-layer.is-open, .lightbox")) {
        document.body.classList.remove("overlay-open");
      }
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [index, items.length, onChange, onClose]);

  if (index === null) return null;
  const item = items[index];

  return (
    <div
      className={`lightbox${showDetails ? "" : " is-plain"}`}
      role="dialog"
      aria-modal="true"
      aria-label={item.title}
    >
      <button className="overlay-close lightbox-close" onClick={onClose} aria-label="关闭图片">
        ×
      </button>
      <button
        className="lightbox-nav lightbox-prev"
        onClick={() => onChange((index - 1 + items.length) % items.length)}
        aria-label="上一张"
      >
        ←
      </button>
      <div className="lightbox-frame">
        <img src={item.image} alt={item.title} loading="eager" decoding="async" draggable={false} />
        {showDetails && (
          <div className="lightbox-caption">
            <div>
              <span>{photoLabel} {String(index + 1).padStart(2, "0")}</span>
              <h3>{item.title}</h3>
            </div>
            <div>
              <p>{item.caption}</p>
              {item.note && <small>{item.note}</small>}
            </div>
          </div>
        )}
      </div>
      <button
        className="lightbox-nav lightbox-next"
        onClick={() => onChange((index + 1) % items.length)}
        aria-label="下一张"
      >
        →
      </button>
      <span className="lightbox-counter">
        {String(index + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}
      </span>
    </div>
  );
}
