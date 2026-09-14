import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { gsap } from "../motion/gsap";

export interface PhotoGalleryItem {
  id: string;
  image: string;
  title?: string;
  category?: string;
  wide?: boolean;
  tall?: boolean;
}

interface PhotoGalleryProps {
  items: PhotoGalleryItem[];
  imageMeta?: Record<string, { width: number; height: number }>;
  onOpen: (index: number) => void;
  showOverlay?: boolean;
  variant?: "page" | "drawer";
  actionLabel?: string;
}

interface LayoutPhoto {
  photo: PhotoGalleryItem;
  index: number;
  aspect: number;
}

interface GalleryRow {
  items: Array<LayoutPhoto & { width: number }>;
  height: number;
  gap: number;
  contain: boolean;
}

function fallbackAspect(photo: PhotoGalleryItem) {
  if (photo.wide) return 16 / 10;
  if (photo.tall) return 3 / 4;
  return 4 / 3;
}

function aspectFor(
  photo: PhotoGalleryItem,
  imageMeta: Record<string, { width: number; height: number }>,
) {
  const size = imageMeta[photo.image];
  if (!size || size.width <= 0 || size.height <= 0) return fallbackAspect(photo);
  return size.width / size.height;
}

function layoutPhotos(
  items: PhotoGalleryItem[],
  imageMeta: Record<string, { width: number; height: number }>,
  containerWidth: number,
  variant: "page" | "drawer",
): GalleryRow[] {
  if (containerWidth <= 0) return [];

  const photos = items.map<LayoutPhoto>((photo, index) => ({
    photo,
    index,
    aspect: aspectFor(photo, imageMeta),
  }));

  const drawer = variant === "drawer";
  const mobile = drawer ? containerWidth < 620 : containerWidth < 640;
  const gap = mobile ? (drawer ? 8 : 10) : drawer ? 10 : containerWidth < 900 ? 10 : 15;

  if (mobile) {
    const compactRows: GalleryRow[] = [];
    const compactTargetHeight = drawer ? 190 : 170;
    const compactTargetAspect = containerWidth / compactTargetHeight;
    let compactRow: LayoutPhoto[] = [];
    let compactRatioSum = 0;

    const commitCompactRow = (lastRow: boolean) => {
      if (compactRow.length === 0) return;
      const availableWidth = Math.max(100, containerWidth - gap * (compactRow.length - 1));
      const naturalHeight = availableWidth / compactRatioSum;
      const fillsEnough = compactRatioSum >= compactTargetAspect * 0.78;
      let height = naturalHeight;
      if (lastRow && !fillsEnough) height = Math.min(compactTargetHeight, naturalHeight);
      height = Math.min(drawer ? 300 : 260, height);

      compactRows.push({
        items: compactRow.map((item) => ({ ...item, width: height * item.aspect })),
        height,
        gap,
        contain: false,
      });
      compactRow = [];
      compactRatioSum = 0;
    };

    photos.forEach((item, index) => {
      compactRow.push(item);
      compactRatioSum += item.aspect;

      const isLast = index === photos.length - 1;
      const reachedTarget = compactRatioSum >= compactTargetAspect * 0.9;
      const reachedLimit = compactRow.length >= 3;

      if (isLast || (reachedTarget && compactRow.length >= 2) || reachedLimit) {
        commitCompactRow(isLast);
      }
    });

    return compactRows;
  }

  const targetHeight = drawer ? 280 : containerWidth < 900 ? 250 : 320;
  const targetAspect = containerWidth / targetHeight;
  const maxItemsPerRow = drawer ? 2 : containerWidth < 900 ? 4 : 5;
  const maxRowHeight = drawer ? 340 : 420;
  const rows: GalleryRow[] = [];
  let row: LayoutPhoto[] = [];
  let ratioSum = 0;

  const commitRow = (lastRow: boolean) => {
    if (row.length === 0) return;

    const availableWidth = Math.max(120, containerWidth - gap * (row.length - 1));
    const naturalHeight = availableWidth / ratioSum;
    const fillsEnough = ratioSum >= targetAspect * 0.6;

    let height = naturalHeight;
    if (lastRow && !fillsEnough) height = Math.min(targetHeight, naturalHeight);
    height = Math.min(maxRowHeight, height);

    rows.push({
      items: row.map((item) => ({ ...item, width: height * item.aspect })),
      height,
      gap,
      contain: false,
    });

    row = [];
    ratioSum = 0;
  };

  photos.forEach((item, index) => {
    row.push(item);
    ratioSum += item.aspect;

    const isLast = index === photos.length - 1;
    const reachedTarget = ratioSum >= targetAspect * 0.9;
    const singleIsWide = row.length === 1 && item.aspect >= targetAspect * 1.15;
    const reachedLimit = row.length >= maxItemsPerRow;

    if (isLast || (reachedTarget && row.length > 1) || singleIsWide || reachedLimit) {
      commitRow(isLast);
    }
  });

  return rows;
}

export function PhotoGallery({
  items,
  imageMeta = {},
  onOpen,
  showOverlay = true,
  variant = "page",
  actionLabel = "查看大图 ↗",
}: PhotoGalleryProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const updateWidth = () => {
      const nextWidth = Math.round(element.getBoundingClientRect().width);
      setContainerWidth((current) => (current === nextWidth ? current : nextWidth));
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const rows = useMemo(
    () => layoutPhotos(items, imageMeta, containerWidth, variant),
    [containerWidth, imageMeta, items, variant],
  );

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || containerWidth <= 0 || variant === "drawer") return;

    const cards = Array.from(container.querySelectorAll<HTMLElement>(".photo-card"));
    if (cards.length === 0) return;

    if (
      window.matchMedia(
        "(prefers-reduced-motion: reduce), (max-width: 768px), (pointer: coarse)",
      ).matches
    ) {
      gsap.set(cards, { clearProps: "transform,opacity,visibility" });
      return;
    }

    const context = gsap.context(() => {
      gsap.fromTo(
        cards,
        { autoAlpha: 0, y: 22 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.45,
          ease: "power2.out",
          stagger: 0.045,
          scrollTrigger: {
            trigger: container,
            start: "top 88%",
            once: true,
          },
        },
      );
    }, container);

    return () => context.revert();
  }, [containerWidth, items, variant]);

  return (
    <div className={`photo-grid${variant === "drawer" ? " photo-grid-drawer" : ""}`} ref={containerRef}>
      {rows.map((row, rowIndex) => (
        <div
          className="photo-row"
          key={`${row.items.map((item) => item.photo.id).join("-")}-${rowIndex}`}
          style={{ "--photo-gap": `${row.gap}px` } as CSSProperties}
        >
          {row.items.map(({ photo, index, width }) => (
            <button
              className={`photo-card${row.contain ? " photo-contain" : ""}`}
              key={photo.id}
              style={{ width: `${width}px`, height: `${row.height}px` }}
              onClick={() => onOpen(index)}
            >
              <img
                src={photo.image}
                alt={photo.title ?? "照片"}
                loading="lazy"
                decoding="async"
                draggable={false}
                width={imageMeta[photo.image]?.width}
                height={imageMeta[photo.image]?.height}
              />
              {showOverlay && (
                <span className="photo-overlay">
                  <small>{photo.category}</small>
                  <strong>{photo.title}</strong>
                  <em>{actionLabel}</em>
                </span>
              )}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
