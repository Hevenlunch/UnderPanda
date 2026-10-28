import { useEffect, useState, type FormEvent } from "react";
import { PhotoGallery } from "./PhotoGallery";
import { CityRatingPanel } from "./CityRating";
import type { CityRating } from "../types";

interface PasswordLock {
  password: string;
  hobbyId: string;
}

interface DetailDrawerProps {
  open: boolean;
  kicker: string;
  title: string;
  description: string;
  body?: string;
  cityId?: string;
  cityRating?: CityRating;
  image: string;
  photos?: string[];
  imageMeta?: Record<string, { width: number; height: number }>;
  adaptivePhotos?: boolean;
  heroVariant?: "default" | "city";
  passwordLock?: PasswordLock;
  onPhotoClick?: (index: number) => void;
  onClose: () => void;
}

export function DetailDrawer({
  open,
  kicker,
  title,
  description,
  body,
  cityId,
  cityRating,
  image,
  photos = [],
  imageMeta = {},
  adaptivePhotos = false,
  heroVariant = "default",
  passwordLock,
  onPhotoClick,
  onClose,
}: DetailDrawerProps) {
  const [passwordInput, setPasswordInput] = useState("");
  const [unlockedHobbyId, setUnlockedHobbyId] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState(false);
  const isLocked = Boolean(passwordLock && unlockedHobbyId !== passwordLock.hobbyId);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    setPasswordInput("");
    setPasswordError(false);
  }, [passwordLock?.hobbyId, open]);

  const unlockHobby = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!passwordLock || passwordInput !== passwordLock.password) {
      setPasswordError(true);
      return;
    }
    setUnlockedHobbyId(passwordLock.hobbyId);
    setPasswordError(false);
    setPasswordInput("");
  };

  return (
    <div className={`drawer-layer ${open ? "is-open" : ""}`} aria-hidden={!open}>
      <button className="drawer-backdrop" onClick={onClose} aria-label="关闭详情" />
      <aside
        className={`detail-drawer${adaptivePhotos ? " detail-drawer-wide" : ""}${heroVariant === "city" ? " detail-drawer-city" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <button className="overlay-close drawer-close" onClick={onClose} aria-label="关闭详情">
          ×
        </button>
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
        <div className={`drawer-content${isLocked ? " drawer-content-locked" : ""}`}>
          {isLocked && (
            <div className="drawer-lock-gate">
              <div className="drawer-lock-card">
                <span className="drawer-lock-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <rect x="5" y="10" width="14" height="11" rx="2" stroke="currentColor" strokeWidth="1.6" />
                    <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    <circle cx="12" cy="15" r="1" fill="currentColor" />
                    <path d="M12 16v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </span>
                <p className="eyebrow">PRIVATE / 私人内容</p>
                <h3>输入密码后继续浏览</h3>
                <p>这部分内容仅向知道密码的访客开放。</p>
                <form onSubmit={unlockHobby}>
                  <label className="sr-only" htmlFor={`hobby-password-${passwordLock?.hobbyId}`}>访问密码</label>
                  <input
                    id={`hobby-password-${passwordLock?.hobbyId}`}
                    type="password"
                    autoComplete="current-password"
                    placeholder="请输入访问密码"
                    value={passwordInput}
                    onChange={(event) => {
                      setPasswordInput(event.target.value);
                      setPasswordError(false);
                    }}
                    aria-invalid={passwordError}
                    aria-describedby={passwordError ? "hobby-password-error" : undefined}
                    required
                  />
                  <button type="submit">解锁查看</button>
                </form>
                {passwordError && <span id="hobby-password-error" className="drawer-lock-error" role="alert">密码不正确，请再试一次。</span>}
              </div>
            </div>
          )}
          <p className="eyebrow">{kicker}</p>
          <h2>{title}</h2>
          <p className="drawer-description">{description}</p>
          {heroVariant === "city" && <CityRatingPanel key={cityId} rating={cityRating} />}
          {body && <p className="drawer-description">{body}</p>}
          {photos.length > 0 && adaptivePhotos ? (
            <div className="drawer-adaptive-gallery">
              <PhotoGallery
                items={photos.map((photo, index) => ({
                  id: `drawer-photo-${index}-${photo}`,
                  image: photo,
                  title: `${title} 照片 ${index + 1}`,
                }))}
                imageMeta={imageMeta}
                drawerColumns={3}
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

