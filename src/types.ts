import type { Appearance } from "./appearance";

export interface Profile {
  name: string;
  englishName: string;
  eyebrow: string;
  title: string;
  intro: string;
  location: string;
  avatar: string;
  heroImage: string;
  heroImageSmall: string;
  heroImagePosition: string;
  heroImageMobilePosition: string;
}

export interface Trait {
  title: string;
  text: string;
}

export interface About {
  kicker: string;
  heading: string;
  lead: string;
  paragraphs: string[];
  traits: Trait[];
  current: {
    label: string;
    title: string;
    text: string;
  };
}

export interface PhotographyItem {
  id: string;
  title: string;
  category: string;
  image: string;
  caption: string;
  note: string;
  wide?: boolean;
  tall?: boolean;
  visible?: boolean;
}

export interface HobbyItem {
  id: string;
  title: string;
  summary: string;
  detail: string;
  image: string;
  paragraphs?: string[];
  photos?: string[];
}

export interface CityItem {
  id: string;
  name: string;
  date: string;
  note: string;
  image: string;
  photos: string[];
  paragraphs?: string[];
}

export interface WorkNote {
  kicker: string;
  heading: string;
  text: string;
  note: string;
}

export interface ContactLink {
  label: string;
  value: string;
  href: string;
}

export interface Contact {
  kicker: string;
  heading: string;
  text: string;
  links: ContactLink[];
}

export interface PageText {
  browserTitle: string;
  navigation: {
    home: string;
    about: string;
    photography: string;
    hobbies: string;
    travel: string;
    contact: string;
  };
  actions: {
    viewPhotos: string;
    meetMe: string;
    photoAction: string;
    hobbyAction: string;
    cityAction: string;
    backToTop: string;
  };
  hero: {
    meta: string;
    imageLabel: string;
    scroll: string;
  };
  about: {
    note: string;
  };
  photography: {
    kicker: string;
    title: string;
    note: string;
    all: string;
    emptyTitle: string;
    emptyNote: string;
    lightboxLabel: string;
  };
  hobbies: {
    kicker: string;
    title: string;
    note: string;
    drawerKicker: string;
  };
  travel: {
    kicker: string;
    title: string;
    note: string;
    drawerKicker: string;
  };
  footer: {
    tagline: string;
  };
  mobileMenu: {
    kicker: string;
  };
}

export interface TravelRouteModeStyle {
  rowHeight: number;
  cityFontSize: number;
  cityPaddingX: number;
  cityPaddingY: number;
  dotSize: number;
  innerDotSize: number;
  lineWidth: number;
  dashLength: number;
  dashGap: number;
}

export interface TravelRouteStyle {
  desktop: TravelRouteModeStyle;
  mobile: TravelRouteModeStyle;
}

export interface SiteContent {
  appearance?: Appearance;
  pageText: PageText;
  travelRouteStyle: TravelRouteStyle;
  profile: Profile;
  about: About;
  photoCategories: string[];
  photography: PhotographyItem[];
  hobbies: HobbyItem[];
  cities: CityItem[];
  work: WorkNote;
  contact: Contact;
}


