from pathlib import Path
import json
import re
import yaml

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "src" / "content" / "site.json"
TARGET = ROOT / "public" / "admin" / "config.yml"

LABELS = {
    "pageText": "页面文字", "browserTitle": "浏览器标题", "navigation": "导航",
    "home": "首页", "about": "关于", "photography": "摄影", "hobbies": "生活",
    "travel": "旅行", "contact": "联系", "actions": "按钮文字",
    "viewPhotos": "查看照片按钮", "meetMe": "认识我按钮", "photoAction": "照片操作文字",
    "hobbyAction": "爱好操作文字", "cityAction": "城市操作文字", "backToTop": "返回顶部",
    "hero": "首页首屏", "meta": "顶部小字", "imageLabel": "图片标签", "scroll": "滚动提示",
    "note": "说明", "all": "全部分类", "emptyTitle": "空状态标题",
    "emptyNote": "空状态说明", "lightboxLabel": "大图标签", "drawerKicker": "详情页小标签",
    "footer": "页脚", "tagline": "页脚标语", "mobileMenu": "手机菜单", "kicker": "小标签",
    "title": "标题", "travelRouteStyle": "旅行路线样式", "desktop": "电脑端", "mobile": "手机端",
    "rowHeight": "每行高度", "cityFontSize": "城市字号", "cityPaddingX": "城市横向留白",
    "cityPaddingY": "城市纵向留白", "dotSize": "圆点大小", "innerDotSize": "内圆点大小",
    "lineWidth": "线条粗细", "dashLength": "虚线长度", "dashGap": "虚线间距",
    "profile": "个人信息", "name": "显示名称", "englishName": "英文名称", "eyebrow": "顶部短句",
    "intro": "个人简介", "location": "所在城市", "avatar": "头像", "heroImage": "首页大图",
    "heroImageSmall": "首页小图", "heroImagePosition": "电脑端图片位置",
    "heroImageMobilePosition": "手机端图片位置", "heading": "主标题", "lead": "引导语",
    "paragraphs": "段落", "traits": "个人特点", "text": "正文", "current": "最近在做",
    "label": "标签", "photoCategories": "摄影分类", "photography": "摄影照片",
    "id": "内部标识", "category": "分类", "image": "图片", "caption": "图片说明",
    "wide": "横向宽图", "tall": "纵向长图", "visible": "是否显示", "summary": "摘要",
    "detail": "详情", "photos": "照片列表", "cities": "旅行城市", "date": "日期",
    "work": "工作与研究方向", "links": "联系链接", "value": "显示文字", "href": "跳转链接",
    "appearance": "外观设置", "cardRadius": "卡片圆角", "moduleLabelScale": "模块标签缩放",
    "moduleIntroScale": "模块介绍缩放", "radiusTopLeft": "左上圆角", "radiusTopRight": "右上圆角",
    "radiusBottomRight": "右下圆角", "radiusBottomLeft": "左下圆角", "borderWidth": "边框粗细",
    "borderColor": "边框颜色", "innerInset": "内边距", "shadow": "阴影",
    "fontSize": "字号", "lineHeight": "行高", "letterSpacing": "字间距", "fontWeight": "字重",
    "nav": "导航", "heroTitle": "首页标题", "heroIntro": "首页简介",
    "sectionTitle": "模块标题", "sectionNote": "模块说明", "body": "正文",
    "button": "按钮", "aboutLead": "关于我引导语", "currentCardTitle": "最近在做标题",
    "hobbyTitle": "爱好标题", "cityTitle": "城市标题", "photoTitle": "照片标题",
    "contactLink": "联系链接", "mobileMenuTitle": "手机菜单标题", "drawerTitle": "详情标题",
}

IMAGE_KEYS = {"avatar", "image", "heroImage", "heroImageSmall"}
TEXT_KEYS = {"intro", "note", "lead", "summary", "detail", "text", "caption", "paragraph", "paragraphs", "emptyNote"}
TEXT_LIST_KEYS = {"paragraphs"}
IMAGE_LIST_KEYS = {"photos"}


def label_for(key: str) -> str:
    return LABELS.get(key, re.sub(r"([a-z0-9])([A-Z])", r"\1 \2", key).replace("_", " ").strip().title())


def merge_object_shapes(values):
    keys = []
    for item in values:
        if isinstance(item, dict):
            for key in item:
                if key not in keys:
                    keys.append(key)
    shape = {}
    for key in keys:
        chosen = None
        for item in values:
            if isinstance(item, dict) and key in item and item[key] is not None:
                chosen = item[key]
                break
        shape[key] = chosen if chosen is not None else ""
    return shape


def field_for(key, value, path):
    field = {"label": label_for(key), "name": key}

    if isinstance(value, bool):
        field["widget"] = "boolean"
    elif isinstance(value, int) and not isinstance(value, bool):
        field["widget"] = "number"
        field["value_type"] = "int"
    elif isinstance(value, float):
        field["widget"] = "number"
        field["value_type"] = "float"
    elif isinstance(value, str):
        if key in IMAGE_KEYS:
            field["widget"] = "image"
        elif key in TEXT_KEYS:
            field["widget"] = "text"
        else:
            field["widget"] = "string"
    elif isinstance(value, list):
        field["widget"] = "list"
        if not value:
            field["field"] = {"label": "条目", "name": "item", "widget": "string"}
        elif all(isinstance(item, str) for item in value):
            if key in IMAGE_LIST_KEYS or any(item.startswith("/images/") for item in value):
                field["field"] = {"label": "图片", "name": "image", "widget": "image"}
            elif key in TEXT_LIST_KEYS:
                field["field"] = {"label": "段落", "name": "paragraph", "widget": "text"}
            else:
                field["field"] = {"label": "条目", "name": "item", "widget": "string"}
        elif all(isinstance(item, dict) for item in value):
            shape = merge_object_shapes(value)
            field["fields"] = [field_for(child_key, child_value, f"{path}[].{child_key}") for child_key, child_value in shape.items()]
        else:
            field["field"] = {"label": "条目", "name": "item", "widget": "string"}
    elif isinstance(value, dict):
        field["widget"] = "object"
        field["fields"] = [field_for(child_key, child_value, f"{path}.{child_key}") for child_key, child_value in value.items()]
    elif value is None:
        field["widget"] = "string"
    else:
        field["widget"] = "string"

    if key == "id":
        field["hint"] = "内部标识，除非有明确原因，否则不要修改。"
    return field


content = json.loads(SOURCE.read_text(encoding="utf-8"))
config = {
    "backend": {
        "name": "github",
        "repo": "Hevenlunch/UnderPanda",
        "branch": "main",
        "base_url": "https://auth.underpanda.cn",
        "auth_endpoint": "auth",
    },
    "publish_mode": "simple",
    "site_url": "https://underpanda.cn",
    "display_url": "https://underpanda.cn",
    "media_folder": "public/images/uploads",
    "public_folder": "/images/uploads",
    "collections": [
        {
            "name": "site",
            "label": "网站内容",
            "files": [
                {
                    "name": "site-content",
                    "label": "全站内容",
                    "file": "src/content/site.json",
                    "fields": [field_for(key, value, key) for key, value in content.items()],
                }
            ],
        }
    ],
}

TARGET.write_text(yaml.safe_dump(config, allow_unicode=True, sort_keys=False, width=1000), encoding="utf-8")
print(f"WROTE {TARGET}")
print(f"TOP_LEVEL_FIELDS {len(config['collections'][0]['files'][0]['fields'])}")