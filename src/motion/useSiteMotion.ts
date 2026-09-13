import { useLayoutEffect, type RefObject } from "react";
import { gsap, ScrollTrigger } from "./gsap";

const EASE_OUT = "power3.out";
const EASE_MASK = "power4.inOut";

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function revealHeading(heading: HTMLElement) {
  const kicker = heading.querySelector<HTMLElement>(".eyebrow");
  const title = heading.querySelector<HTMLElement>("[data-motion-title], h2");
  const note = heading.querySelector<HTMLElement>("[data-motion-note], .section-note");

  if (!title) return;

  const timeline = gsap.timeline({
    scrollTrigger: {
      trigger: heading,
      start: "top 82%",
      once: true,
    },
  });

  if (kicker) {
    timeline.fromTo(
      kicker,
      { clipPath: "inset(0% 100% 0% 0%)", x: -22 },
      { clipPath: "inset(0% 0% 0% 0%)", x: 0, duration: 0.72, ease: EASE_OUT },
      0,
    );
  }

  timeline.fromTo(
    title,
    {
      clipPath: "inset(100% 0% 0% 0%)",
      scaleY: 0.86,
      yPercent: 108,
      transformOrigin: "50% 100%",
    },
    {
      clipPath: "inset(0% 0% 0% 0%)",
      scaleY: 1,
      yPercent: 0,
      duration: 1.18,
      ease: "power4.out",
    },
    kicker ? 0.14 : 0,
  );

  if (note) {
    timeline.fromTo(
      note,
      { clipPath: "inset(100% 0% 0% 0%)", y: 32 },
      { clipPath: "inset(0% 0% 0% 0%)", y: 0, duration: 0.92, ease: EASE_OUT },
      0.48,
    );
  }
}

function revealItems(
  trigger: HTMLElement,
  items: HTMLElement[],
  options: {
    stagger?: number;
    y?: number;
    x?: number;
    scale?: number;
    start?: string;
    imageScale?: boolean;
  } = {},
) {
  if (items.length === 0) return;

  const {
    stagger = 0.1,
    y = 58,
    x = 0,
    scale = 1,
    start = "top 80%",
    imageScale = true,
  } = options;

  const timeline = gsap.timeline({
    scrollTrigger: {
      trigger,
      start,
      once: true,
    },
  });

  timeline.fromTo(
    items,
    {
      scale,
      scaleY: 0.9,
      x,
      y,
      transformOrigin: "50% 100%",
    },
    {
      scale: 1,
      scaleY: 1,
      x: 0,
      y: 0,
      duration: 1.02,
      ease: EASE_OUT,
      stagger,
    },
  );

  if (!imageScale) return;

  const images = items
    .map((item) => item.querySelector<HTMLElement>("img"))
    .filter((image): image is HTMLElement => image !== null);

  if (images.length > 0) {
    timeline.fromTo(
      images,
      { "--motion-scale": 1.07 },
      { "--motion-scale": 1, duration: 1.25, ease: "power3.out", stagger },
      0,
    );
  }
}

function addParallax(items: HTMLElement[], selector = "img", distance = 3) {
  if (window.innerWidth < 769) return;

  items.forEach((item) => {
    const image = item.matches(selector)
      ? item
      : item.querySelector<HTMLElement>(selector);

    if (!image) return;

    gsap.fromTo(
      image,
      { "--motion-shift": `${-distance}%` },
      {
        "--motion-shift": `${distance}%`,
        ease: "none",
        scrollTrigger: {
          trigger: item,
          start: "top bottom",
          end: "bottom top",
          scrub: 1,
          invalidateOnRefresh: true,
        },
      },
    );
  });
}

function createOpeningTimeline(root: HTMLElement) {
  const opening = root.querySelector<HTMLElement>(".site-opening");
  if (!opening) return null;
  const openingCurtain = opening.querySelector<HTMLElement>(".site-opening__curtain");

  const header = root.querySelector<HTMLElement>(".site-header");
  const openingIndex = opening.querySelector<HTMLElement>(".site-opening__index");
  const openingName = opening.querySelector<HTMLElement>(".site-opening__name");
  const openingRule = opening.querySelector<HTMLElement>(".site-opening__rule");
  const openingCn = opening.querySelector<HTMLElement>(".site-opening__cn");
  const heroImageWrap = root.querySelector<HTMLElement>(".hero-image-wrap");
  const heroImage = root.querySelector<HTMLElement>(".hero-image-wrap img");
  const heroTitles = Array.from(
    root.querySelectorAll<HTMLElement>(".hero h1, .hero-photo-title"),
  );
  const heroEyebrows = Array.from(
    root.querySelectorAll<HTMLElement>(".hero-copy .eyebrow, .hero-photo-eyebrow"),
  );
  const heroDetails = Array.from(
    root.querySelectorAll<HTMLElement>(
      ".hero-intro, .hero-actions, .hero-meta, .hero-photo-intro, .hero-photo-actions",
    ),
  );
  const scrollCue = root.querySelector<HTMLElement>(".scroll-cue");

  gsap.set(opening, { display: "block" });
  if (openingCurtain) {
    gsap.set(openingCurtain, { willChange: "transform", yPercent: 0 });
  }
  gsap.set(openingIndex, { clipPath: "inset(0% 100% 0% 0%)", x: -18 });
  gsap.set(openingName, { clipPath: "inset(100% 0% 0% 0%)", yPercent: 112 });
  gsap.set(openingRule, { scaleX: 0, transformOrigin: "left center" });
  gsap.set(openingCn, { clipPath: "inset(0% 100% 0% 0%)", x: -18 });

  if (header) {
    gsap.set(header, { clipPath: "inset(0% 0% 100% 0%)", yPercent: -36 });
  }
  if (heroImageWrap) {
    gsap.set(heroImageWrap, { clipPath: "inset(100% 0% 0% 0%)" });
  }
  if (heroImage) {
    gsap.set(heroImage, { scale: 1.09, yPercent: -0.8 });
  }
  if (heroTitles.length > 0) {
    gsap.set(heroTitles, {
      clipPath: "inset(100% 0% 0% 0%)",
      scaleX: 1.025,
      scaleY: 0.84,
      yPercent: 108,
      transformOrigin: "50% 100%",
    });
  }
  if (heroEyebrows.length > 0) {
    gsap.set(heroEyebrows, { clipPath: "inset(0% 100% 0% 0%)", x: -22 });
  }
  if (heroDetails.length > 0) {
    gsap.set(heroDetails, { clipPath: "inset(100% 0% 0% 0%)", y: 34 });
  }
  if (scrollCue) {
    gsap.set(scrollCue, { clipPath: "inset(0% 100% 0% 0%)", x: -18 });
  }

  const timeline = gsap.timeline({
    defaults: { ease: EASE_OUT },
    paused: true,
  });

  timeline
    .to(openingRule, { scaleX: 1, duration: 0.72, ease: "power3.inOut" }, 0)
    .to(openingIndex, { clipPath: "inset(0% 0% 0% 0%)", x: 0, duration: 0.66 }, 0.08)
    .to(openingName, { clipPath: "inset(0% 0% 0% 0%)", yPercent: 0, duration: 0.92 }, 0.2)
    .to(openingCn, { clipPath: "inset(0% 0% 0% 0%)", x: 0, duration: 0.68 }, 0.42)
    .to(
      opening.querySelector(".site-opening__inner"),
      { duration: 0.22, yPercent: -6, ease: "power3.inOut" },
      0.7,
    )
    .to(
      openingCurtain,
      { yPercent: -101, duration: 1.02, ease: EASE_MASK },
      0.88,
    );

  if (header) {
    timeline.to(
      header,
      { clipPath: "inset(0% 0% 0% 0%)", yPercent: 0, duration: 0.9 },
      1.02,
    );
  }
  if (heroImageWrap) {
    timeline.to(
      heroImageWrap,
      { clipPath: "inset(0% 0% 0% 0%)", duration: 1.14, ease: EASE_MASK },
      1.18,
    );
  }
  if (heroImage) {
    timeline.to(heroImage, { scale: 1.035, yPercent: 0, duration: 1.62 }, 1.18);
  }
  if (heroTitles.length > 0) {
    timeline.to(
      heroTitles,
      {
        clipPath: "inset(0% 0% 0% 0%)",
        scaleX: 1,
        scaleY: 1,
        yPercent: 0,
        duration: 1.16,
        ease: "power4.out",
        stagger: 0.06,
      },
      1.42,
    );
  }
  if (heroEyebrows.length > 0) {
    timeline.to(
      heroEyebrows,
      { clipPath: "inset(0% 0% 0% 0%)", x: 0, duration: 0.76 },
      1.5,
    );
  }
  if (heroDetails.length > 0) {
    timeline.to(
      heroDetails,
      {
        clipPath: "inset(0% 0% 0% 0%)",
        y: 0,
        duration: 0.88,
        stagger: 0.1,
      },
      1.68,
    );
  }
  if (scrollCue) {
    timeline.to(
      scrollCue,
      { clipPath: "inset(0% 0% 0% 0%)", x: 0, duration: 0.72 },
      1.92,
    );
  }

  timeline.set(opening, { display: "none" }, 2.12);
  timeline.set(
    [openingCurtain, header, heroImageWrap, heroTitles, heroEyebrows, heroDetails, scrollCue],
    { clearProps: "willChange" },
  );

  return timeline;
}

function createScrollMotion(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>("[data-motion-heading]").forEach(revealHeading);

  const aboutGrid = root.querySelector<HTMLElement>(".about-grid");
  const aboutStory = root.querySelector<HTMLElement>(".about-story");
  const currentCard = root.querySelector<HTMLElement>(".current-card");
  const traitGrid = root.querySelector<HTMLElement>(".trait-grid");
  const traitCards = Array.from(root.querySelectorAll<HTMLElement>(".trait-card"));
  const hobbyGrid = root.querySelector<HTMLElement>(".hobby-grid");
  const hobbyCards = Array.from(root.querySelectorAll<HTMLElement>(".hobby-card"));
  const cityGrid = root.querySelector<HTMLElement>(".city-grid");
  const cityCards = Array.from(root.querySelectorAll<HTMLElement>(".city-card"));
  const workGrid = root.querySelector<HTMLElement>(".work-grid");
  const workColumns = workGrid
    ? Array.from(workGrid.children).filter((child): child is HTMLElement => child instanceof HTMLElement)
    : [];
  const contactGrid = root.querySelector<HTMLElement>(".contact-grid");
  const contactLinks = Array.from(root.querySelectorAll<HTMLElement>(".contact-links a"));
  const footer = root.querySelector<HTMLElement>(".site-footer");

  if (aboutGrid && aboutStory) {
    const paragraphs = Array.from(aboutStory.querySelectorAll<HTMLElement>("p"));
    if (paragraphs.length > 0) {
      gsap.fromTo(
        paragraphs,
        { x: -28, y: 16 },
        {
          x: 0,
          y: 0,
          duration: 0.9,
          ease: EASE_OUT,
          stagger: 0.09,
          scrollTrigger: { trigger: aboutGrid, start: "top 78%", once: true },
        },
      );
    }
  }

  if (currentCard && aboutGrid) {
    gsap.fromTo(
      currentCard,
      { x: 46, scale: 0.985 },
      {
        x: 0,
        scale: 1,
        duration: 1.06,
        ease: EASE_OUT,
        scrollTrigger: { trigger: aboutGrid, start: "top 74%", once: true },
      },
    );
  }

  if (traitGrid) {
    revealItems(traitGrid, traitCards, { stagger: 0.12, y: 62, imageScale: false });
  }

  if (hobbyGrid) {
    revealItems(hobbyGrid, hobbyCards, { stagger: 0.14, y: 72 });
    addParallax(hobbyCards, "img", 3.2);
  }

  if (cityGrid) {
    revealItems(cityGrid, cityCards, { stagger: 0.12, y: 68, start: "top 82%" });
    addParallax(cityCards, "img", 2.6);
  }

  if (workGrid && workColumns.length > 0) {
    revealItems(workGrid, workColumns, { stagger: 0.12, y: 50, imageScale: false });
  }

  if (contactGrid) {
    const lead = Array.from(contactGrid.children).filter(
      (child): child is HTMLElement => child instanceof HTMLElement,
    );
    revealItems(contactGrid, lead, { stagger: 0.14, y: 54, imageScale: false });

    if (contactLinks.length > 0) {
      gsap.fromTo(
        contactLinks,
        { scaleY: 0.9, x: -34, transformOrigin: "0% 100%" },
        {
          scaleY: 1,
          x: 0,
          duration: 0.86,
          ease: EASE_OUT,
          stagger: 0.09,
          scrollTrigger: { trigger: contactGrid, start: "top 76%", once: true },
        },
      );
    }
  }

  if (footer) {
    gsap.fromTo(
      footer,
      { scaleY: 0.88, y: 24, transformOrigin: "50% 100%" },
      {
        scaleY: 1,
        y: 0,
        duration: 0.86,
        ease: EASE_OUT,
        scrollTrigger: { trigger: footer, start: "top 98%", once: true },
      },
    );
  }

  const heroImage = root.querySelector<HTMLElement>(".hero-image-wrap img");
  const hero = root.querySelector<HTMLElement>("#home");
  if (heroImage && hero && window.innerWidth >= 769) {
    gsap.fromTo(
      heroImage,
      { yPercent: -0.8 },
      {
        yPercent: 1.4,
        ease: "none",
        scrollTrigger: {
          trigger: hero,
          start: "top top",
          end: "bottom top",
          scrub: 1,
          invalidateOnRefresh: true,
        },
      },
    );
  }
}

export function useSiteMotion(rootRef: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduced = prefersReducedMotion();
    const openingTimeline: { current: gsap.core.Timeline | null } = { current: null };
    let scrollContext: ReturnType<typeof gsap.context> | null = null;
    let scrollDelay = 0;
    let refreshFrame = 0;
    let disposed = false;

    const initializeScrollMotion = () => {
      if (disposed || scrollContext) return;
      scrollContext = gsap.context(() => createScrollMotion(root), root);
      ScrollTrigger.refresh();
    };

    const scheduleScrollMotion = (delay = 140) => {
      if (disposed || scrollContext) return;
      window.clearTimeout(scrollDelay);
      scrollDelay = window.setTimeout(initializeScrollMotion, delay);
    };

    const context = gsap.context(() => {
      if (!reduced) openingTimeline.current = createOpeningTimeline(root);
    }, root);

    if (reduced) {
      const opening = root.querySelector<HTMLElement>(".site-opening");
      if (opening) gsap.set(opening, { display: "none" });
      initializeScrollMotion();
    }

    const currentTimeline = openingTimeline.current;
    if (!reduced && currentTimeline) {
      document.body.classList.add("opening-active");
      let openingStarted = false;
      let startFrame = 0;
      let startTimeout = 0;

      const startOpening = () => {
        if (openingStarted) return;
        openingStarted = true;
        currentTimeline.play(0);
      };

      const heroImageElement = root.querySelector<HTMLImageElement>(".hero-image-wrap img");
      if (heroImageElement && (!heroImageElement.complete || heroImageElement.naturalWidth === 0)) {
        const decode = heroImageElement.decode;
        if (typeof decode === "function") {
          heroImageElement.decode().then(startOpening).catch(startOpening);
          startTimeout = window.setTimeout(startOpening, 720);
        } else {
          startTimeout = window.setTimeout(startOpening, 420);
        }
      } else {
        startFrame = window.requestAnimationFrame(startOpening);
      }

      const finishOpening = () => {
        openingStarted = true;
        currentTimeline.progress(1);
        document.body.classList.remove("opening-active");
        scheduleScrollMotion();
      };

      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Enter" || event.key === " " || event.key === "Escape") {
          finishOpening();
        }
      };

      const onFirstIntent = () => scheduleScrollMotion(0);

      window.addEventListener("pointerdown", finishOpening, { once: true });
      window.addEventListener("keydown", onKeyDown, { once: true });
      window.addEventListener("wheel", onFirstIntent, { passive: true, once: true });
      window.addEventListener("touchstart", onFirstIntent, { passive: true, once: true });
      window.addEventListener("keydown", onFirstIntent, { once: true });
      currentTimeline.eventCallback("onComplete", () => {
        document.body.classList.remove("opening-active");
        scheduleScrollMotion();
      });

      const cleanupOpening = () => {
        window.removeEventListener("pointerdown", finishOpening);
        window.removeEventListener("keydown", onKeyDown);
        window.removeEventListener("wheel", onFirstIntent);
        window.removeEventListener("touchstart", onFirstIntent);
        window.removeEventListener("keydown", onFirstIntent);
        document.body.classList.remove("opening-active");
      };

      const refresh = () => {
        if (scrollContext) ScrollTrigger.refresh();
      };
      refreshFrame = window.requestAnimationFrame(refresh);
      document.fonts?.ready.then(refresh);
      window.addEventListener("load", refresh);

      return () => {
        disposed = true;
        window.cancelAnimationFrame(refreshFrame);
        window.cancelAnimationFrame(startFrame);
        window.clearTimeout(startTimeout);
        window.clearTimeout(scrollDelay);
        window.removeEventListener("load", refresh);
        cleanupOpening();
        scrollContext?.revert();
        context.revert();
      };
    }

    scheduleScrollMotion(0);

    const refresh = () => {
      if (scrollContext) ScrollTrigger.refresh();
    };
    refreshFrame = window.requestAnimationFrame(refresh);
    document.fonts?.ready.then(refresh);
    window.addEventListener("load", refresh);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(refreshFrame);
      window.clearTimeout(scrollDelay);
      window.removeEventListener("load", refresh);
      scrollContext?.revert();
      context.revert();
    };
  }, [rootRef]);
}