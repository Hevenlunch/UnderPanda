import { useEffect, useRef } from "react";
import { PhotoGallery } from "./PhotoGallery";

interface DetailDrawerProps {
  open: boolean;
  kicker: string;
  title: string;
  description: string;
  image: string;
  photos?: string[];
  imageMeta?: Record<string, { width: number; height: number }>;
  adaptivePhotos?: boolean;
  onPhotoClick?: (index: number) => void;
  onClose: () => void;
}

export function DetailDrawer({
  open,
  kicker,
  title,
  description,
  image,
  photos = [],
  imageMeta = {},
  adaptivePhotos = false,
  onPhotoClick,
  onClose,
}: DetailDrawerProps) {
  const closeRef = useRef(onClose);
  const backEntryRef = useRef(false);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.body.classList.add("overlay-open");
    window.addEventListener("keydown", onKeyDown);
    return () => {
      if (!document.querySelector(".drawer-layer.is-open, .lightbox")) {
        document.body.classList.remove("overlay-open");
      }
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const mobile = window.matchMedia("(max-width: 768px), (pointer: coarse)").matches;
    if (!mobile) return;

    window.history.pushState(
      { ...window.history.state, underpandaDetailDrawer: true },
      "",
    );
    backEntryRef.current = true;

    const onPopState = () => {
      backEntryRef.current = false;
      closeRef.current();
    };

    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
      if (backEntryRef.current) {
        backEntryRef.current = false;
        window.history.back();
      }
    };
  }, [open]);

  return (
    <div className={`drawer-layer ${open ? "is-open" : ""}`} aria-hidden={!open}>
      <button className="drawer-backdrop" onClick={onClose} aria-label="关闭详情" />
      <aside
        className={`detail-drawer${adaptivePhotos ? " detail-drawer-wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <button className="overlay-close drawer-close" onClick={onClose} aria-label="关闭详情">
          ×
        </button>
        <div className="drawer-mobile-hint">向右滑动或使用系统返回关闭</div>
        <div className="drawer-hero">
          {image && (
            <img
              src={image}
              alt={title}
              loading="eager"
              decoding="async"
              draggable={false}
              width={imageMeta[image]?.width}
              height={imageMeta[image]?.height}
            />
          )}
        </div>
        <div className="drawer-content">
          <p className="eyebrow">{kicker}</p>
          <h2>{title}</h2>
          <p className="drawer-description">{description}</p>
          {photos.length > 0 && adaptivePhotos ? (
            <div className="drawer-adaptive-gallery">
              <PhotoGallery
                items={photos.map((photo, index) => ({
                  id: `drawer-photo-${index}-${photo}`,
                  image: photo,
                  title: `${title} 照片 ${index + 1}`,
                }))}
                imageMeta={imageMeta}
                onOpen={onPhotoClick ?? (() => undefined)}
                showOverlay={false}
                variant="drawer"
              />
            </div>
          ) : photos.length > 0 ? (
            <div className="drawer-gallery">
              {photos.map((photo, index) => (
                <img key={`${photo}-${index}`} src={photo} alt={`${title} ${index + 1}`} loading="lazy" decoding="async" draggable={false} />
              ))}
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

