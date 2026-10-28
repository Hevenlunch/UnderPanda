import type { CityRating, CityRatingKey, RevisitIntention } from "./types";

export const CITY_RATING_DIMENSIONS: ReadonlyArray<{
  key: CityRatingKey;
  label: string;
  description: string;
}> = [
  { key: "scenery", label: "风景景观", description: "自然风光、城市建筑、夜景与整体视觉感受" },
  { key: "food", label: "美食体验", description: "好吃程度、地方特色和选择丰富度" },
  { key: "transport", label: "交通便利", description: "公交地铁、打车与景点之间的通达性" },
  { key: "affordability", label: "消费友好度", description: "餐饮、住宿、门票与交通是否经济实惠；越实惠分数越高" },
  { key: "culture", label: "历史文化", description: "历史底蕴、博物馆、文化遗产与地方特色" },
  { key: "atmosphere", label: "城市氛围", description: "烟火气、生活节奏、街头感受与城市气质" },
  { key: "activities", label: "游玩丰富度", description: "可探索的景点、活动和体验是否丰富" },
  { key: "comfort", label: "游览舒适度", description: "步行环境、拥挤程度、卫生与旅游设施" },
  { key: "photography", label: "摄影友好度", description: "拍摄题材、机位、光线与创作灵感" },
  { key: "hospitality", label: "游客友好度", description: "服务、指引、沟通便利与实际接待体验" },
];

export const REVISIT_OPTIONS: ReadonlyArray<{ value: RevisitIntention; label: string }> = [
  { value: "definitely", label: "一定再去" },
  { value: "maybe", label: "有机会再去" },
  { value: "once", label: "去过就好" },
];

export function isCityScore(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
    && value >= 0 && value <= 10 && Number.isInteger(value * 2);
}

export function getCityRatingSummary(rating?: CityRating) {
  const values = CITY_RATING_DIMENSIONS
    .map(({ key }) => rating?.scores?.[key])
    .filter(isCityScore);
  return {
    completed: values.length,
    total: CITY_RATING_DIMENSIONS.length,
    average: values.length === CITY_RATING_DIMENSIONS.length
      ? values.reduce((sum, value) => sum + value, 0) / CITY_RATING_DIMENSIONS.length
      : null,
  };
}

export function getRevisitLabel(value: unknown): string | undefined {
  return REVISIT_OPTIONS.find((option) => option.value === value)?.label;
}

export function formatRatingDate(value?: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return undefined;
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(date).replaceAll("/", ".");
}
