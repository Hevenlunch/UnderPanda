export const fontPresets = {
  serif: {
    label: "宋体 / 衬线",
    value: '"Iowan Old Style", "Baskerville", "Songti SC", "Noto Serif CJK SC", "STSong", serif',
  },
  sans: {
    label: "现代黑体",
    value: '"Inter", "PingFang SC", "Microsoft YaHei", "Noto Sans SC", system-ui, sans-serif',
  },
  wenkai: {
    label: "文楷 / 楷体",
    value: '"LXGW WenKai Screen", "LXGW WenKai", "KaiTi", "STKaiti", serif',
  },
  system: {
    label: "系统字体",
    value: 'system-ui, -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
  },
} as const;

export type FontKey = keyof typeof fontPresets;
export type TypographyMode = "desktop" | "mobile";

export interface TypographyModeSettings {
  headingFont: FontKey;
  bodyFont: FontKey;
  navSize: number;
  bodySize: number;
  headingScale: number;
  lineHeight: number;
  sectionSpacing: number;
  blockSpacing: number;
  gallerySpacing: number;
}

export interface TypographySettings {
  version: number;
  desktop: TypographyModeSettings;
  mobile: TypographyModeSettings;
}

const TYPOGRAPHY_VERSION = 2;

export const defaultDesktopTypography: TypographyModeSettings = {
  headingFont: "serif",
  bodyFont: "sans",
  navSize: 13,
  bodySize: 16,
  headingScale: 1,
  lineHeight: 1.7,
  sectionSpacing: 1,
  blockSpacing: 1,
  gallerySpacing: 1,
};

export const defaultMobileTypography: TypographyModeSettings = {
  headingFont: "serif",
  bodyFont: "sans",
  navSize: 22,
  bodySize: 15,
  headingScale: 0.78,
  lineHeight: 1.58,
  sectionSpacing: 0.72,
  blockSpacing: 0.72,
  gallerySpacing: 0.7,
};

export const defaultTypography: TypographySettings = {
  version: TYPOGRAPHY_VERSION,
  desktop: defaultDesktopTypography,
  mobile: defaultMobileTypography,
};

interface LegacyTypographySettings {
  headingFont?: FontKey;
  bodyFont?: FontKey;
  navSize?: number;
  mobileNavSize?: number;
  bodySize?: number;
  headingScale?: number;
  lineHeight?: number;
}

function numberOr(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function fontOr(value: unknown, fallback: FontKey): FontKey {
  return typeof value === "string" && value in fontPresets ? (value as FontKey) : fallback;
}

function normalizeMode(value: unknown, fallback: TypographyModeSettings): TypographyModeSettings {
  const mode = (value ?? {}) as Partial<TypographyModeSettings>;
  return {
    headingFont: fontOr(mode.headingFont, fallback.headingFont),
    bodyFont: fontOr(mode.bodyFont, fallback.bodyFont),
    navSize: numberOr(mode.navSize, fallback.navSize),
    bodySize: numberOr(mode.bodySize, fallback.bodySize),
    headingScale: numberOr(mode.headingScale, fallback.headingScale),
    lineHeight: numberOr(mode.lineHeight, fallback.lineHeight),
    sectionSpacing: numberOr(mode.sectionSpacing, fallback.sectionSpacing),
    blockSpacing: numberOr(mode.blockSpacing, fallback.blockSpacing),
    gallerySpacing: numberOr(mode.gallerySpacing, fallback.gallerySpacing),
  };
}

function migrateLegacyTypography(value: LegacyTypographySettings): TypographySettings {
  return {
    version: TYPOGRAPHY_VERSION,
    desktop: normalizeMode(
      {
        headingFont: value.headingFont,
        bodyFont: value.bodyFont,
        navSize: value.navSize,
        bodySize: value.bodySize,
        headingScale: value.headingScale,
        lineHeight: value.lineHeight,
      },
      defaultDesktopTypography,
    ),
    mobile: normalizeMode(
      {
        headingFont: value.headingFont,
        bodyFont: value.bodyFont,
      },
      defaultMobileTypography,
    ),
  };
}

export function normalizeTypography(value: unknown): TypographySettings {
  if (!value || typeof value !== "object") return defaultTypography;
  const parsed = value as Partial<TypographySettings> & LegacyTypographySettings;
  if (parsed.desktop || parsed.mobile) {
    const mobile = normalizeMode(parsed.mobile, defaultMobileTypography);
    if (numberOr(parsed.version, 1) < TYPOGRAPHY_VERSION) {
      mobile.navSize = defaultMobileTypography.navSize;
      mobile.bodySize = defaultMobileTypography.bodySize;
      mobile.headingScale = defaultMobileTypography.headingScale;
      mobile.lineHeight = defaultMobileTypography.lineHeight;
      mobile.sectionSpacing = defaultMobileTypography.sectionSpacing;
      mobile.blockSpacing = defaultMobileTypography.blockSpacing;
      mobile.gallerySpacing = defaultMobileTypography.gallerySpacing;
    }
    return {
      version: TYPOGRAPHY_VERSION,
      desktop: normalizeMode(parsed.desktop, defaultDesktopTypography),
      mobile,
    };
  }
  return migrateLegacyTypography(parsed);
}

export function loadTypography(): TypographySettings {
  try {
    const saved = window.localStorage.getItem("site-typography");
    return saved ? normalizeTypography(JSON.parse(saved)) : defaultTypography;
  } catch {
    return defaultTypography;
  }
}

export function saveTypography(settings: TypographySettings) {
  try {
    window.localStorage.setItem("site-typography", JSON.stringify(settings));
  } catch {
    // The page still works when storage is unavailable.
  }
}

export function typographyCssVariables(settings: TypographySettings) {
  const desktop = settings.desktop;
  const mobile = settings.mobile;
  return {
    "--desktop-heading-font": fontPresets[desktop.headingFont].value,
    "--desktop-body-font": fontPresets[desktop.bodyFont].value,
    "--desktop-nav-font-size": `${desktop.navSize}px`,
    "--desktop-root-font-size": "16px",
    "--desktop-body-font-size": "16px",
    "--desktop-body-line-height": "1.7",
    "--desktop-content-body-font-size": `${desktop.bodySize}px`,
    "--desktop-content-body-line-height": String(desktop.lineHeight),
    "--desktop-content-body-scale": String(desktop.bodySize / 16),
    "--desktop-heading-scale": String(desktop.headingScale),
    "--desktop-section-space-scale": String(desktop.sectionSpacing),
    "--desktop-block-space-scale": String(desktop.blockSpacing),
    "--desktop-gallery-space-scale": String(desktop.gallerySpacing),
    "--mobile-heading-font": fontPresets[mobile.headingFont].value,
    "--mobile-body-font": fontPresets[mobile.bodyFont].value,
    "--mobile-nav-font-size": `${mobile.navSize}px`,
    "--mobile-root-font-size": "15px",
    "--mobile-body-font-size": "15px",
    "--mobile-body-line-height": "1.58",
    "--mobile-content-body-font-size": `${mobile.bodySize}px`,
    "--mobile-content-body-line-height": String(mobile.lineHeight),
    "--mobile-content-body-scale": String(mobile.bodySize / 15),
    "--mobile-heading-scale": String(mobile.headingScale),
    "--mobile-section-space-scale": String(mobile.sectionSpacing),
    "--mobile-block-space-scale": String(mobile.blockSpacing),
    "--mobile-gallery-space-scale": String(mobile.gallerySpacing),
  };
}
