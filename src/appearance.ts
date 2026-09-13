export const appearanceTextKeys = [
  "nav",
  "eyebrow",
  "heroTitle",
  "heroIntro",
  "sectionTitle",
  "sectionNote",
  "body",
  "button",
  "aboutLead",
  "currentCardTitle",
  "hobbyTitle",
  "cityTitle",
  "photoTitle",
  "contactLink",
  "footer",
  "backToTop",
  "mobileMenuTitle",
  "drawerTitle",
] as const;

export type AppearanceTextKey = (typeof appearanceTextKeys)[number];

export interface AppearanceTextStyle {
  fontSize: string;
  lineHeight: string;
  letterSpacing: string;
  fontWeight: string;
}

export interface HeroAppearance {
  radiusTopLeft: number;
  radiusTopRight: number;
  radiusBottomRight: number;
  radiusBottomLeft: number;
  borderWidth: number;
  borderColor: string;
  innerInset: number;
  shadow: string;
}

export interface AppearanceMode {
  cardRadius: number;
  moduleLabelScale: number;
  moduleIntroScale: number;
  hero: HeroAppearance;
  text: Record<AppearanceTextKey, AppearanceTextStyle>;
}

export interface Appearance {
  desktop: AppearanceMode;
  mobile: AppearanceMode;
}

const desktopText: Record<AppearanceTextKey, AppearanceTextStyle> = {
  nav: { fontSize: "var(--nav-font-size)", lineHeight: "1.2", letterSpacing: "0em", fontWeight: "400" },
  eyebrow: { fontSize: "0.7rem", lineHeight: "1.2", letterSpacing: "0.18em", fontWeight: "700" },
  heroTitle: {
    fontSize: "clamp(1.8rem, 3.5vw, 4rem)",
    lineHeight: "1.03",
    letterSpacing: "-0.045em",
    fontWeight: "500",
  },
  heroIntro: {
    fontSize: "1.22rem",
    lineHeight: "var(--body-line-height)",
    letterSpacing: "0em",
    fontWeight: "400",
  },
  sectionTitle: {
    fontSize: "clamp(2.6rem, 5vw, 4.6rem)",
    lineHeight: "1.02",
    letterSpacing: "-0.045em",
    fontWeight: "500",
  },
  sectionNote: {
    fontSize: "1rem",
    lineHeight: "var(--body-line-height)",
    letterSpacing: "0em",
    fontWeight: "400",
  },
  body: {
    fontSize: "var(--content-body-font-size)",
    lineHeight: "var(--content-body-line-height)",
    letterSpacing: "0em",
    fontWeight: "400",
  },
  button: { fontSize: "0.84rem", lineHeight: "1.2", letterSpacing: "0em", fontWeight: "400" },
  aboutLead: { fontSize: "1.58rem", lineHeight: "1.55", letterSpacing: "0em", fontWeight: "400" },
  currentCardTitle: {
    fontSize: "1.7rem",
    lineHeight: "1.2",
    letterSpacing: "0em",
    fontWeight: "500",
  },
  hobbyTitle: { fontSize: "1.6rem", lineHeight: "1.2", letterSpacing: "0em", fontWeight: "500" },
  cityTitle: { fontSize: "1.8rem", lineHeight: "1.2", letterSpacing: "0em", fontWeight: "500" },
  photoTitle: { fontSize: "1.3rem", lineHeight: "1.2", letterSpacing: "0em", fontWeight: "500" },
  contactLink: { fontSize: "1.15rem", lineHeight: "1.2", letterSpacing: "0em", fontWeight: "500" },
  footer: { fontSize: "0.74rem", lineHeight: "1.4", letterSpacing: "0.08em", fontWeight: "500" },
  backToTop: {
    fontSize: "0.72rem",
    lineHeight: "1.4",
    letterSpacing: "0.08em",
    fontWeight: "500",
  },
  mobileMenuTitle: {
    fontSize: "clamp(2rem, 8vw, 3.7rem)",
    lineHeight: "1.04",
    letterSpacing: "-0.055em",
    fontWeight: "500",
  },
  drawerTitle: {
    fontSize: "2.65rem",
    lineHeight: "1.05",
    letterSpacing: "-0.045em",
    fontWeight: "500",
  },
};

const mobileText: Record<AppearanceTextKey, AppearanceTextStyle> = {
  ...desktopText,
  nav: { fontSize: "var(--nav-font-size)", lineHeight: "1.2", letterSpacing: "0em", fontWeight: "400" },
  heroTitle: {
    fontSize: "clamp(2.85rem, 14vw, 4.7rem)",
    lineHeight: "0.97",
    letterSpacing: "-0.045em",
    fontWeight: "500",
  },
  heroIntro: {
    fontSize: "0.98rem",
    lineHeight: "var(--body-line-height)",
    letterSpacing: "0em",
    fontWeight: "400",
  },
  sectionTitle: {
    fontSize: "clamp(2.25rem, 11vw, 3.5rem)",
    lineHeight: "1.02",
    letterSpacing: "-0.045em",
    fontWeight: "500",
  },
  body: {
    fontSize: "var(--content-body-font-size)",
    lineHeight: "var(--content-body-line-height)",
    letterSpacing: "0em",
    fontWeight: "400",
  },
  aboutLead: { fontSize: "1.3rem", lineHeight: "1.5", letterSpacing: "0em", fontWeight: "400" },
  photoTitle: { fontSize: "0.88rem", lineHeight: "1.2", letterSpacing: "0em", fontWeight: "500" },
  drawerTitle: {
    fontSize: "2.1rem",
    lineHeight: "1.05",
    letterSpacing: "-0.045em",
    fontWeight: "500",
  },
};

export const defaultAppearance: Appearance = {
  desktop: {
    cardRadius: 4,
    moduleLabelScale: 1.08,
    moduleIntroScale: 1.05,
    hero: {
      radiusTopLeft: 32,
      radiusTopRight: 32,
      radiusBottomRight: 14,
      radiusBottomLeft: 32,
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.3)",
      innerInset: 14,
      shadow: "0 28px 72px rgba(28, 58, 67, 0.12)",
    },
    text: desktopText,
  },
  mobile: {
    cardRadius: 4,
    moduleLabelScale: 1.08,
    moduleIntroScale: 1.05,
    hero: {
      radiusTopLeft: 0,
      radiusTopRight: 0,
      radiusBottomRight: 0,
      radiusBottomLeft: 0,
      borderWidth: 0,
      borderColor: "rgba(255, 255, 255, 0)",
      innerInset: 0,
      shadow: "none",
    },
    text: mobileText,
  },
};

function textString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function finiteNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeMode(value: unknown, fallback: AppearanceMode): AppearanceMode {
  const input = (value ?? {}) as Partial<AppearanceMode>;
  const inputText = (input.text ?? {}) as Partial<Record<AppearanceTextKey, Partial<AppearanceTextStyle>>>;
  const inputHero = (input.hero ?? {}) as Partial<HeroAppearance>;
  const text = {} as Record<AppearanceTextKey, AppearanceTextStyle>;

  for (const key of appearanceTextKeys) {
    const base = fallback.text[key];
    const current = inputText[key] ?? {};
    text[key] = {
      fontSize: textString(current.fontSize, base.fontSize),
      lineHeight: textString(current.lineHeight, base.lineHeight),
      letterSpacing: textString(current.letterSpacing, base.letterSpacing),
      fontWeight: textString(current.fontWeight, base.fontWeight),
    };
  }

  return {
    cardRadius: finiteNumber(input.cardRadius, fallback.cardRadius),
    moduleLabelScale: finiteNumber(input.moduleLabelScale, fallback.moduleLabelScale),
    moduleIntroScale: finiteNumber(input.moduleIntroScale, fallback.moduleIntroScale),
    hero: {
      radiusTopLeft: finiteNumber(inputHero.radiusTopLeft, fallback.hero.radiusTopLeft),
      radiusTopRight: finiteNumber(inputHero.radiusTopRight, fallback.hero.radiusTopRight),
      radiusBottomRight: finiteNumber(inputHero.radiusBottomRight, fallback.hero.radiusBottomRight),
      radiusBottomLeft: finiteNumber(inputHero.radiusBottomLeft, fallback.hero.radiusBottomLeft),
      borderWidth: finiteNumber(inputHero.borderWidth, fallback.hero.borderWidth),
      borderColor: textString(inputHero.borderColor, fallback.hero.borderColor),
      innerInset: finiteNumber(inputHero.innerInset, fallback.hero.innerInset),
      shadow: textString(inputHero.shadow, fallback.hero.shadow),
    },
    text,
  };
}

export function normalizeAppearance(value: unknown): Appearance {
  const input = (value ?? {}) as Partial<Appearance>;
  return {
    desktop: normalizeMode(input.desktop, defaultAppearance.desktop),
    mobile: normalizeMode(input.mobile, defaultAppearance.mobile),
  };
}

function propertyName(key: AppearanceTextKey, property: keyof AppearanceTextStyle) {
  const token = key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
  const suffix = property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
  return `--ui-${token}-${suffix}`;
}

export function appearanceCssVariables(value: unknown) {
  const appearance = normalizeAppearance(value);
  const variables: Record<string, string> = {};

  for (const mode of ["desktop", "mobile"] as const) {
    const settings = appearance[mode];
    for (const key of appearanceTextKeys) {
      const style = settings.text[key];
      for (const property of Object.keys(style) as Array<keyof AppearanceTextStyle>) {
        variables[`--ui-${mode}-${propertyName(key, property).slice(5)}`] = String(style[property]);
      }
    }

    variables[`--ui-${mode}-card-radius`] = `${settings.cardRadius}px`;
    variables[`--ui-${mode}-module-label-scale`] = String(settings.moduleLabelScale);
    variables[`--ui-${mode}-module-intro-scale`] = String(settings.moduleIntroScale);
    variables[`--ui-${mode}-hero-radius-top-left`] = `${settings.hero.radiusTopLeft}px`;
    variables[`--ui-${mode}-hero-radius-top-right`] = `${settings.hero.radiusTopRight}px`;
    variables[`--ui-${mode}-hero-radius-bottom-right`] = `${settings.hero.radiusBottomRight}px`;
    variables[`--ui-${mode}-hero-radius-bottom-left`] = `${settings.hero.radiusBottomLeft}px`;
    variables[`--ui-${mode}-hero-border-width`] = `${settings.hero.borderWidth}px`;
    variables[`--ui-${mode}-hero-border-color`] = settings.hero.borderColor;
    variables[`--ui-${mode}-hero-inner-inset`] = `${settings.hero.innerInset}px`;
    variables[`--ui-${mode}-hero-shadow`] = settings.hero.shadow;
  }

  return variables;
}