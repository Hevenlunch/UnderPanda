import { lazy, Suspense, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import contentSource from "./content/site.json";
import { DetailDrawer } from "./components/DetailDrawer";
import { Header } from "./components/Header";
import { Lightbox, type LightboxItem } from "./components/Lightbox";
import { PhotoGallery } from "./components/PhotoGallery";
import { SiteOpening } from "./components/SiteOpening";
import { TravelRoute } from "./components/TravelRoute";
import {
  loadTypography,
  normalizeTypography,
  saveTypography,
  typographyCssVariables,
  type TypographySettings,
} from "./typography";
import { appearanceCssVariables } from "./appearance";
import { useSiteMotion } from "./motion/useSiteMotion";
import type {
  CityItem,
  HobbyItem,
  SiteContent,
} from "./types";

const initialContent = contentSource as SiteContent;
const DevEditor = lazy(() =>
  import("./components/DevEditor").then((module) => ({ default: module.DevEditor })),
);

interface DrawerContent {
  kicker: string;
  title: string;
  description: string;
  image: string;
  photos?: string[];
  adaptivePhotos?: boolean;
  heroVariant?: "default" | "city";
}

interface OverlaySnapshot {
  drawer?: DrawerContent | null;
  lightboxIndex?: number | null;
  hobbyLightbox?: { items: LightboxItem[]; index: number } | null;
}

function SectionHeading({
  kicker,
  title,
  note,
}: {
  kicker: string;
  title: string;
  note?: string;
}) {
  return (
    <div className="section-heading" data-motion-heading>
      <p className="eyebrow">{kicker}</p>
      <h2 data-motion-title>{title}</h2>
      {note && <p className="section-note" data-motion-note>{note}</p>}
    </div>
  );
}

function App() {
  const [content, setContent] = useState<SiteContent>(initialContent);
  const [category, setCategory] = useState(initialContent.pageText.photography.all);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [drawer, setDrawer] = useState<DrawerContent | null>(null);
  const [hobbyLightbox, setHobbyLightbox] = useState<{
    items: LightboxItem[];
    index: number;
  } | null>(null);
  const overlayStateRef = useRef<OverlaySnapshot>({
    drawer,
    lightboxIndex,
    hobbyLightbox,
  });
  overlayStateRef.current = { drawer, lightboxIndex, hobbyLightbox };

  const overlayOpen = Boolean(drawer || lightboxIndex !== null || hobbyLightbox);

  useEffect(() => {
    document.body.classList.toggle("overlay-open", overlayOpen);
    return () => document.body.classList.remove("overlay-open");
  }, [overlayOpen]);

  useEffect(() => {
    window.history.replaceState(
      { ...window.history.state, underpandaOverlay: {} },
      "",
    );

    const onPopState = (event: PopStateEvent) => {
      const state = event.state as { underpandaOverlay?: OverlaySnapshot } | null;
      const snapshot = state?.underpandaOverlay ?? {};
      overlayStateRef.current = snapshot;
      setDrawer(snapshot.drawer ?? null);
      setLightboxIndex(snapshot.lightboxIndex ?? null);
      setHobbyLightbox(snapshot.hobbyLightbox ?? null);
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
  const [typography, setTypography] = useState<TypographySettings>(() =>
    initialContent.typography ? normalizeTypography(initialContent.typography) : loadTypography(),
  );
  const editorEnabled = Boolean(
    import.meta.env.DEV ||
      window.location.hostname === "preview.underpanda.cn" ||
      window.location.pathname.startsWith("/admin") ||
      new URLSearchParams(window.location.search).get("dev") === "1",
  );
  const siteRef = useRef<HTMLDivElement>(null);
  const appearanceStyle = useMemo(
    () => appearanceCssVariables(content.appearance),
    [content.appearance],
  );

  useSiteMotion(siteRef);

  useEffect(() => {
    document.title = content.pageText.browserTitle;
  }, [content.pageText.browserTitle]);

  useEffect(() => {
    const root = document.documentElement;
    const variables = typographyCssVariables(typography);
    for (const [name, value] of Object.entries(variables)) {
      root.style.setProperty(name, value);
    }
  }, [typography]);

  const categories = useMemo(
    () => [content.pageText.photography.all, ...content.photoCategories],
    [content.pageText.photography.all, content.photoCategories],
  );

  const visiblePhotographyCount = useMemo(
    () => content.photography.filter((photo) => photo.visible !== false).length,
    [content.photography],
  );
  const visiblePhotos = useMemo(
    () =>
      content.photography.filter(
        (photo) =>
          photo.visible !== false &&
          (category === content.pageText.photography.all || photo.category === category),
      ),
    [category, content.pageText.photography.all, content.photography],
  );

  useEffect(() => {
    if (!categories.includes(category)) setCategory(content.pageText.photography.all);
  }, [categories, category, content.pageText.photography.all]);

  const pushOverlay = (next: Partial<OverlaySnapshot>) => {
    const snapshot = { ...overlayStateRef.current, ...next };
    window.history.pushState(
      { ...window.history.state, underpandaOverlay: snapshot },
      "",
    );
    overlayStateRef.current = snapshot;
    setDrawer(snapshot.drawer ?? null);
    setLightboxIndex(snapshot.lightboxIndex ?? null);
    setHobbyLightbox(snapshot.hobbyLightbox ?? null);
  };

  const closeTopOverlay = () => {
    const state = window.history.state as { underpandaOverlay?: OverlaySnapshot } | null;
    const hasOverlayHistory = Boolean(state?.underpandaOverlay);
    if (hasOverlayHistory) {
      window.history.back();
      return;
    }
    overlayStateRef.current = {};
    setDrawer(null);
    setLightboxIndex(null);
    setHobbyLightbox(null);
  };
  const openHobby = (hobby: HobbyItem) => {
    const paragraphs = hobby.paragraphs?.filter((paragraph) => paragraph.trim()) ?? [];
    pushOverlay({
      drawer: {
      kicker: content.pageText.hobbies.drawerKicker,
      title: hobby.title,
      description: [hobby.summary, hobby.detail, ...paragraphs].filter(Boolean).join("\n\n"),
      image: hobby.image,
      photos: hobby.photos,
      adaptivePhotos: true,
      },
      lightboxIndex: null,
      hobbyLightbox: null,
    });
  };

  const openCity = (city: CityItem) => {
    const paragraphs = city.paragraphs?.filter((paragraph) => paragraph.trim()) ?? [];
    pushOverlay({
      drawer: {
      kicker: content.pageText.travel.drawerKicker,
      title: city.name,
      description: [city.date, city.note, ...paragraphs].filter(Boolean).join("\n\n"),
      image: city.image,
      photos: city.photos,
      adaptivePhotos: true,
      heroVariant: "city",
      },
      lightboxIndex: null,
      hobbyLightbox: null,
    });
  };

  return (
    <div
      ref={siteRef}
      className="site"
      style={{ ...typographyCssVariables(typography), ...appearanceStyle } as CSSProperties}
    >
      <SiteOpening name={content.profile.name} englishName={content.profile.englishName} />
      <Header content={content} />

      <main>
        <section id="home" className="hero page-section">
          <div className="hero-orb hero-orb-one" />
          <div className="hero-orb hero-orb-two" />
          <div className="hero-grid">
            <div className="hero-copy">
              <p className="eyebrow">{content.profile.eyebrow}</p>
              <h1>{content.profile.title}</h1>
              <p className="hero-intro">{content.profile.intro}</p>
              <div className="hero-actions">
                <button
                  className="button"
                  onClick={() =>
                    document
                      .getElementById("photography")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" })
                  }
                >
                  {content.pageText.actions.viewPhotos}
                  <span>↗</span>
                </button>
                <button
                  className="text-button"
                  onClick={() =>
                    document
                      .getElementById("about")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" })
                  }
                >
                  {content.pageText.actions.meetMe} <span>↓</span>
                </button>
              </div>
              <div className="hero-meta">
                <span>
                  <i />
                  {content.profile.location}
                </span>
                <span>{content.pageText.hero.meta}</span>
              </div>
            </div>

            <div
              className="hero-visual"
              style={
                {
                  "--hero-position": content.profile.heroImagePosition,
                  "--hero-position-mobile": content.profile.heroImageMobilePosition,
                } as CSSProperties
              }
            >
              <div className="hero-image-wrap">
                <picture>
                  <source media="(max-width: 900px)" srcSet={content.profile.heroImageSmall} />
                  <img src={content.profile.heroImage} alt={`${content.profile.name} 的首页照片`} loading="eager" decoding="async" fetchPriority="high" draggable={false} />
                </picture>
                <span className="image-index">01</span>
                <div className="hero-image-label">
                  <span>{content.pageText.hero.imageLabel}</span>
                  <strong>{content.profile.name}</strong>
                </div>
              </div>
              <div className="hero-photo-copy">
                <p className="hero-photo-eyebrow">{content.profile.eyebrow}</p>
                <div className="hero-photo-title" role="heading" aria-level={1}>
                  {content.profile.title}
                </div>
                <p className="hero-photo-intro">{content.profile.intro}</p>
                <div className="hero-photo-actions">
                  <button
                    className="button button-light"
                    onClick={() =>
                      document
                        .getElementById("photography")
                        ?.scrollIntoView({ behavior: "smooth", block: "start" })
                    }
                  >
                    {content.pageText.actions.viewPhotos}
                    <span>↗</span>
                  </button>
                  <button
                    className="text-button text-button-light"
                    onClick={() =>
                      document
                        .getElementById("about")
                        ?.scrollIntoView({ behavior: "smooth", block: "start" })
                    }
                  >
                    {content.pageText.actions.meetMe} <span>↓</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="scroll-cue">
            <span>{content.pageText.hero.scroll}</span>
            <i />
          </div>
        </section>

        <section id="about" className="page-section about-section">
          <div className="section-shell">
            <SectionHeading
              kicker={content.about.kicker}
              title={content.about.heading}
              note={content.pageText.about.note}
            />

            <div className="about-grid">
              <aside className="current-card">
                <span>{content.about.current.label}</span>
                <h3>{content.about.current.title}</h3>
                <p>{content.about.current.text}</p>
                <div className="current-card-line" />
                <small>LIFE IS HAPPENING NOW</small>
              </aside>
              <div className="about-story">
                <p className="about-lead">{content.about.lead}</p>
                {content.about.paragraphs.map((paragraph, index) => (
                  <p key={`${paragraph.slice(0, 12)}-${index}`}>{paragraph}</p>
                ))}
              </div>
            </div>

            <div className="trait-grid">
              {content.about.traits.map((trait, index) => (
                <article className="trait-card" key={trait.title}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <h3>{trait.title}</h3>
                  <p>{trait.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="photography" className="page-section photography-section">
          <div className="section-shell">
            <div className="split-heading">
              <SectionHeading
                kicker={content.pageText.photography.kicker}
                title={content.pageText.photography.title}
                note={content.pageText.photography.note}
              />
              <div className="photo-count">
                <strong>{String(visiblePhotographyCount).padStart(2, "0")}</strong>
                <span>SELECTED<br />MOMENTS</span>
              </div>
            </div>

            <div className="filter-row" aria-label="照片分类">
              {categories.map((item) => (
                <button
                  key={item}
                  className={category === item ? "active" : ""}
                  onClick={() => setCategory(item)}
                >
                  {item}
                </button>
              ))}
            </div>

            {visiblePhotos.length > 0 ? (
              <PhotoGallery
                items={visiblePhotos}
                imageMeta={content.imageMeta}
                onOpen={(index) =>
                  pushOverlay({ lightboxIndex: index, drawer: null, hobbyLightbox: null })
                }
                actionLabel={content.pageText.actions.photoAction}
              />
            ) : (
              <div className="photo-empty">
                <strong>{content.pageText.photography.emptyTitle}</strong>
                <span>{content.pageText.photography.emptyNote}</span>
              </div>
            )}
          </div>
        </section>

        <section id="hobbies" className="page-section hobbies-section">
          <div className="section-shell">
            <SectionHeading
              kicker={content.pageText.hobbies.kicker}
              title={content.pageText.hobbies.title}
              note={content.pageText.hobbies.note}
            />
            <div className="hobby-grid">
              {content.hobbies.map((hobby, index) => (
                <button className="hobby-card" key={hobby.id} onClick={() => openHobby(hobby)}>
                  <img src={hobby.image} alt={hobby.title} loading="lazy" decoding="async" draggable={false} />
                  <span className="hobby-number">{String(index + 1).padStart(2, "0")}</span>
                  <span className="hobby-copy">
                    <strong>{hobby.title}</strong>
                    <small>{hobby.summary}</small>
                    <em>{content.pageText.actions.hobbyAction}</em>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section id="travel" className="page-section travel-section">
          <div className="section-shell">
            <SectionHeading
              kicker={content.pageText.travel.kicker}
              title={content.pageText.travel.title}
              note={content.pageText.travel.note}
            />
            <TravelRoute
              cities={content.cities}
              onOpen={openCity}
              routeStyle={content.travelRouteStyle}
            />
            <div className="city-grid">
              {content.cities.map((city: CityItem, index) => (
                <button className="city-card" key={city.id} onClick={() => openCity(city)}>
                  <img src={city.image} alt={city.name} loading="lazy" decoding="async" draggable={false} />
                  <span className="city-index">{String(index + 1).padStart(2, "0")}</span>
                  <span className="city-copy">
                    <small>{city.date}</small>
                    <strong>{city.name}</strong>
                    <p>{city.note}</p>
                    <em>{content.pageText.actions.cityAction}</em>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="page-section work-section">
          <div className="section-shell work-grid">
            <div>
              <p className="eyebrow">{content.work.kicker}</p>
              <h2>{content.work.heading}</h2>
            </div>
            <div className="work-copy">
              <p>{content.work.text}</p>
              <small>{content.work.note}</small>
            </div>
          </div>
        </section>

        <section id="contact" className="page-section contact-section">
          <div className="section-shell contact-grid">
            <div>
              <p className="eyebrow">{content.contact.kicker}</p>
              <h2>{content.contact.heading}</h2>
              <p>{content.contact.text}</p>
            </div>
            <div className="contact-links">
              {content.contact.links.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target={link.href.startsWith("http") ? "_blank" : undefined}
                  rel={link.href.startsWith("http") ? "noreferrer" : undefined}
                >
                  <span>{link.label}</span>
                  <strong>{link.value}</strong>
                  <em>↗</em>
                </a>
              ))}
            </div>
          </div>
          <div className="site-footer section-shell">
            <span>© {new Date().getFullYear()} {content.profile.name}</span>
            <span>{content.pageText.footer.tagline}</span>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              aria-label="回到顶部"
            >
              {content.pageText.actions.backToTop}
            </button>
          </div>
        </section>
      </main>

      <Lightbox
        items={visiblePhotos}
        index={lightboxIndex}
        onClose={closeTopOverlay}
        onChange={setLightboxIndex}
        photoLabel={content.pageText.photography.lightboxLabel}
      />
      <Lightbox
        items={hobbyLightbox?.items ?? []}
        index={hobbyLightbox?.index ?? null}
        onClose={closeTopOverlay}
        onChange={(index) =>
          setHobbyLightbox((current) => (current ? { ...current, index } : null))
        }
        showDetails={false}
      />
      <DetailDrawer
        open={drawer !== null}
        kicker={drawer?.kicker ?? ""}
        title={drawer?.title ?? ""}
        description={drawer?.description ?? ""}
        image={drawer?.image ?? ""}
        photos={drawer?.photos}
        adaptivePhotos={drawer?.adaptivePhotos}
        heroVariant={drawer?.heroVariant}
        imageMeta={content.imageMeta}
        onPhotoClick={(index) => {
          const photos = drawer?.photos ?? [];
          pushOverlay({
            hobbyLightbox: {
              items: photos.map((photo, photoIndex) => ({
                id: `hobby-lightbox-${photoIndex}-${photo}`,
                title: `照片 ${photoIndex + 1}`,
                image: photo,
                caption: "",
              })),
              index,
            },
          });
        }}
        onClose={closeTopOverlay}
      />
      {editorEnabled && (
        <Suspense fallback={null}>
          <DevEditor
            enabled={editorEnabled}
            content={content}
            onChange={setContent}
            typography={typography}
            onApplyTypography={setTypography}
            onSaveTypography={(next) => {
              setTypography(next);
              saveTypography(next);
            }}
          />
        </Suspense>
      )}
    </div>
  );
}

export default App;



