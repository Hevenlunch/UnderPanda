export const STYLE_PROPERTIES = {
  maxWidth: { label: "最大宽度", unit: "px", min: 100, max: 2000, step: 10, fallback: 1180 },
  fontSize: { label: "字体大小", unit: "px", min: 8, max: 100, step: 1, fallback: 16 },
  lineHeight: { label: "文字行高", unit: "倍", min: 0.8, max: 4, step: 0.05, fallback: 1.7 },
  letterSpacing: { label: "字间距", unit: "px", min: -3, max: 16, step: 0.5, fallback: 0 },
  marginTop: { label: "上方间距", unit: "px", min: 0, max: 200, step: 1, fallback: 0 },
  marginBottom: { label: "下方间距", unit: "px", min: 0, max: 200, step: 1, fallback: 0 },
  paddingTop: { label: "内部上留白", unit: "px", min: 0, max: 160, step: 1, fallback: 0 },
  paddingBottom: { label: "内部下留白", unit: "px", min: 0, max: 160, step: 1, fallback: 0 },
  paddingLeft: { label: "内部左留白", unit: "px", min: 0, max: 100, step: 1, fallback: 0 },
  paddingRight: { label: "内部右留白", unit: "px", min: 0, max: 100, step: 1, fallback: 0 },
  gap: { label: "子项间距", unit: "px", min: 0, max: 100, step: 1, fallback: 12 },
  borderRadius: { label: "圆角大小", unit: "px", min: 0, max: 100, step: 1, fallback: 0 },
} as const;
export type StyleNumberKey = keyof typeof STYLE_PROPERTIES;
export type VisualProperty = StyleNumberKey | "fontWeight" | "color" | "backgroundColor" | "textAlign" | "fontFamily";
export interface VisualRule { label: string; values: Partial<Record<VisualProperty, string>> }
export type VisualStyles = Partial<Record<"desktop" | "mobile", Record<string, VisualRule>>>;
export interface StyleTarget { label: string; selector: string; aliases: string }
const target = (label: string, selector: string, aliases = ""): StyleTarget => ({ label, selector: `.site ${selector}`, aliases });
export const STYLE_TARGETS: StyleTarget[] = [
  target("城市评分 · 小标签标题", ".city-rating h3.eyebrow", "我的城市印象 MY CITY IMPRESSIONS 评分标题 字体字号"),
  target("城市评分 · 详情总分数字", ".city-rating-total > span:first-child", "综合分 分数字号"),
  target("城市评分 · 卡片总分数字", ".city-rating-badge", "外面 外层 首页评分"),
  target("城市评分 · 主观说明", ".city-rating-disclaimer", "评分来自 免责声明"),
  target("城市评分 · 再访意愿标签", ".city-revisit", "一定再去 有机会 去过就好"),
  target("城市评分 · 展开收起按钮", ".city-rating-details summary", "十项评分"),
  target("城市评分 · 每项名称", ".city-rating-item-heading", "风景 美食 交通"),
  target("城市评分 · 每项分数", ".city-rating-value"),
  target("城市评分 · 每项理由", ".city-rating-reason"),
  target("城市评分 · 整块区域", ".city-rating", "分隔 留白 紧凑"),
  target("城市评分 · 十项排列间距", ".city-rating-grid", "条形图"),
  target("全站 · 小标签", ".eyebrow", "TRAVEL ABOUT PHOTOGRAPHY 标签 英文"),
  target("全站 · 模块大标题", ".section-heading h2", "旅行 摄影 爱好 标题"),
  target("全站 · 模块介绍", ".section-note", "导语 简介"),
  target("全站 · 内容宽度与留白", ".section-shell", "模块 边距"),
  target("全站 · 按钮", ".button", "看看我的照片"),
  target("导航 · 菜单文字", ".desktop-nav button", "首页 关于 摄影 生活 旅行 联系"),
  target("导航 · 中文站名", ".brand-copy strong", "垫底熊猫"),
  target("导航 · 英文站名", ".brand-copy small", "UNDER PANDA"),
  target("首页 · 主标题", ".hero h1", "ENFJ"),
  target("首页 · 自我介绍", ".hero-intro", "简介"),
  target("首页 · 照片圆角", ".hero-image-wrap", "封面"),
  target("关于 · 开头介绍", ".about-lead"),
  target("关于 · 正文", ".about-story p:not(.about-lead)", "行距"),
  target("关于 · 最近在做什么", ".current-card h3"),
  target("关于 · 性格标题", ".trait-card h3", "乐观 幽默 靠谱"),
  target("摄影 · 分类按钮", ".filter-row button"),
  target("摄影 · 照片标题", ".photo-card strong"),
  target("摄影 · 照片行间距", ".photo-row"),
  target("爱好 · 卡片标题", ".hobby-card strong"),
  target("爱好 · 卡片简介", ".hobby-card small"),
  target("旅行 · 城市卡片名称", ".city-copy strong", "青岛 上海"),
  target("旅行 · 城市卡片简介", ".city-copy p"),
  target("旅行 · 城市卡片小标签", ".city-copy small", "日期"),
  target("旅行 · 城市卡片间距", ".city-grid"),
  target("详情 · 城市爱好标题", ".drawer-content h2", "青岛 城市名称 弹窗"),
  target("详情 · 正文字号与行高", ".drawer-description", "游记 城市介绍 自定义正文 行距"),
  target("详情 · 小标签", ".drawer-content > .eyebrow", "TRAVEL 旅行 LIFE"),
  target("详情 · 内容留白", ".drawer-content", "面板 边距"),
  target("详情 · 照片上方间距", ".drawer-adaptive-gallery", "图片 正文 之间 照片间距 图片间距"),
  target("联系 · 标题", ".contact-grid h2"),
  target("联系 · 介绍文字", ".contact-grid > div > p"),
  target("页脚 · 版权文字", ".site-footer > p", "底部 COPYRIGHT"),
  target("页脚 · 返回顶部", ".site-footer button", "BACK TO TOP"),
];

export function safeSelector(selector: string) {
  return selector.startsWith(".site ") && selector.length < 700
    && /^[a-zA-Z0-9_ .#>():\-]+$/.test(selector)
    && !/(?:^|[ >])(?:script|style|iframe)(?:[ .#>:]|$)|\.dev-/i.test(selector);
}
export function safeStyleValue(key: string, value: string) {
  if (typeof value !== "string") return false;
  if (key === "color" || key === "backgroundColor") return /^#[0-9a-fA-F]{6}$/.test(value);
  if (key === "textAlign") return /^(left|center|right|justify)$/.test(value);
  if (key === "fontFamily") return ["serif", "sans-serif", "system-ui", "KaiTi, serif"].includes(value);
  if (key === "fontWeight") return /^(400|500|600|700|800)$/.test(value);
  const spec = STYLE_PROPERTIES[key as StyleNumberKey];
  if (!spec) return false;
  const suffix = key === "lineHeight" ? "" : "px";
  if (!(suffix ? /^-?\d+(\.\d+)?px$/ : /^\d+(\.\d+)?$/).test(value)) return false;
  const n = Number.parseFloat(value);
  return n >= spec.min && n <= spec.max;
}
export function visualStylesCss(styles?: VisualStyles) {
  return (["desktop", "mobile"] as const).map(mode => {
    const rules = Object.entries(styles?.[mode] ?? {}).flatMap(([selector, rule]) => {
      if (!safeSelector(selector) || !rule || typeof rule !== "object") return [];
      const declarations = Object.entries(rule.values ?? {}).flatMap(([key, value]) => {
        if (!safeStyleValue(key, value)) return [];
        return `${key.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`)}:${value}!important`;
      });
      return declarations.length ? [`${selector}{${declarations.join(";")}}`] : [];
    }).join("\n");
    return `@media (${mode === "desktop" ? "min-width:901px" : "max-width:900px"}){${rules}}`;
  }).join("\n");
}
