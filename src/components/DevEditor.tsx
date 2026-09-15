import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { CityItem, HobbyItem, PhotographyItem, SiteContent } from "../types";
import { normalizeAppearance } from "../appearance";
import {
  clearDevAuth,
  consumeOAuthRedirect,
  isPreviewEnvironment,
  loadDevAuth,
  loginWithGitHub,
  saveSiteContent,
  uploadPreparedImage,
  type DevAuth,
  type UploadedImage,
} from "../devBackend";
import {
  defaultTypography,
  fontPresets,
  type FontKey,
  type TypographyMode,
  type TypographyModeSettings,
  type TypographySettings,
} from "../typography";

interface DevEditorProps {
  enabled: boolean;
  content: SiteContent;
  onChange: (content: SiteContent) => void;
  typography: TypographySettings;
  onApplyTypography: (settings: TypographySettings) => void;
  onSaveTypography: (settings: TypographySettings) => void;
}

type EditorView = "content" | "photos" | "hobbies" | "travel" | "json" | "type";

const UNCATEGORIZED = "未分类";
const MAX_IMAGE_EDGE = 2200;
const OPTIMIZE_AT_BYTES = 600_000;
const MAX_CLIENT_FILE_SIZE = 45_000_000;

function contentForJson(content: SiteContent): SiteContent {
  return { ...content, appearance: normalizeAppearance(content.appearance) };
}

const jsonReferenceGroups = [
  {
    title: "页脚与回到顶部",
    fields: [
      ["appearance.desktop.text.footer.fontSize", '"0.74rem"'],
      ["appearance.desktop.text.footer.letterSpacing", '"0.08em"'],
      ["appearance.desktop.text.backToTop.fontSize", '"0.72rem"'],
      ["appearance.desktop.text.backToTop.fontWeight", '"500"'],
      ["appearance.desktop.moduleLabelScale", '"1.08"'],
      ["appearance.desktop.moduleIntroScale", '"1.05"'],
    ],
  },
  {
    title: "主要文字字号",
    fields: [
      ["appearance.desktop.text.nav.fontSize", '"13px"'],
      ["appearance.desktop.text.heroTitle.fontSize", '"clamp(1.8rem, 3.5vw, 4rem)"'],
      ["appearance.desktop.text.sectionTitle.fontSize", '"clamp(2.6rem, 5vw, 4.6rem)"'],
      ["appearance.desktop.text.body.fontSize", '"16px"'],
      ["appearance.desktop.text.photoTitle.fontSize", '"1.3rem"'],
    ],
  },
  {
    title: "PC 封面与卡片",
    fields: [
      ["appearance.desktop.hero.radiusTopLeft", '"32"'],
      ["appearance.desktop.hero.radiusBottomRight", '"14"'],
      ["appearance.desktop.hero.shadow", '"0 28px 72px rgba(28, 58, 67, 0.12)"'],
      ["appearance.desktop.cardRadius", '"4"'],
    ],
  },
] as const;

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("无法读取图片"));
    reader.readAsDataURL(file);
  });
}

function isHeicFile(file: File) {
  return file.type.includes("heic") || file.type.includes("heif") || /\.(heic|heif)$/i.test(file.name);
}

function imageBaseName(fileName: string) {
  return (
    fileName
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "photo"
  );
}

async function decodeImageFile(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (isHeicFile(file)) {
    throw new Error("HEIC/HEIF 图片需要先在手机或电脑上导出为 JPG，再上传。 ");
  }

  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      // Fall back to the browser's image decoder for formats it can display.
    }
  }

  return new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("浏览器无法读取这张图片，请尝试导出为 JPG、PNG 或 WebP。"));
    };
    image.src = objectUrl;
  });
}

async function preparePhotoForUpload(file: File) {
  if (file.size > MAX_CLIENT_FILE_SIZE) {
    throw new Error("图片超过 45 MB，请先压缩后再上传。");
  }

  if (file.type === "image/gif" || file.type === "image/svg+xml") {
    return { fileName: file.name, dataUrl: await readFileAsDataUrl(file), width: 0, height: 0 };
  }

  const source = await decodeImageFile(file);
  const sourceWidth = source.width;
  const sourceHeight = source.height;
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(sourceWidth, sourceHeight));
  const shouldOptimize =
    file.size > OPTIMIZE_AT_BYTES ||
    scale < 1 ||
    !["image/jpeg", "image/png", "image/webp"].includes(file.type);

  if (!shouldOptimize) {
    if ("close" in source) source.close();
    return {
      fileName: file.name,
      dataUrl: await readFileAsDataUrl(file),
      width: sourceWidth,
      height: sourceHeight,
    };
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sourceWidth * scale));
  canvas.height = Math.max(1, Math.round(sourceHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("浏览器无法处理这张图片。 ");

  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  if ("close" in source) source.close();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error("图片压缩失败。"))),
      "image/webp",
      0.82,
    );
  });

  const optimizedFile = new File([blob], `${imageBaseName(file.name)}.webp`, {
    type: "image/webp",
  });
  return {
    fileName: optimizedFile.name,
    dataUrl: await readFileAsDataUrl(optimizedFile),
    width: canvas.width,
    height: canvas.height,
  };
}

async function uploadImageFile(
  file: File,
  options: { online: boolean; token?: string },
) {
  const prepared = await preparePhotoForUpload(file);
  if (options.online) {
    if (!options.token) throw new Error("请先登录 GitHub，再上传图片。");
    return uploadPreparedImage(prepared, options.token);
  }

  const response = await fetch("/__dev-editor/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(prepared),
  });
  const responseText = await response.text();
  let result: { ok?: boolean; path?: string; message?: string } = {};
  try {
    result = JSON.parse(responseText) as typeof result;
  } catch {
    result.message = "上传接口没有返回有效结果，请确认使用 pnpm dev 启动项目。";
  }
  if (!response.ok || !result.path) throw new Error(result.message || "上传失败");
  return { path: result.path, width: prepared.width, height: prepared.height };
}

export function DevEditor({
  enabled,
  content,
  onChange,
  typography,
  onApplyTypography,
  onSaveTypography,
}: DevEditorProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<EditorView>("content");
  const [draft, setDraft] = useState(() => JSON.stringify(contentForJson(content), null, 2));
  const [status, setStatus] = useState("");
  const [jsonSearch, setJsonSearch] = useState("");
  const [jsonSearchStatus, setJsonSearchStatus] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [draftTypography, setDraftTypography] = useState<TypographySettings>(typography);
  const [typographyMode, setTypographyMode] = useState<TypographyMode>("desktop");
  const [auth, setAuth] = useState<DevAuth | null>(() => loadDevAuth());
  const [authBusy, setAuthBusy] = useState(false);
  const [dragPosition, setDragPosition] = useState<{ left: number; top: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const isOnline = !import.meta.env.DEV;
  const jsonTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cancelled = false;
    consumeOAuthRedirect()
      .then((nextAuth) => {
        if (cancelled || !nextAuth) return;
        setAuth(nextAuth);
        setOpen(true);
        setStatus(`已登录 @${nextAuth.login}，可以发布内容了`);
      })
      .catch((error) => {
        if (!cancelled) {
          setStatus(error instanceof Error ? error.message : "GitHub 登录回调失败");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    if (!open) setDragPosition(null);
  }, [open]);

  useEffect(() => {
    if (!open || view === "json") return;
    setDraft(JSON.stringify(contentForJson(content), null, 2));
  }, [content, open, view]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "d") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (!enabled) return null;

  const handleLogin = async () => {
    setAuthBusy(true);
    setStatus("正在打开 GitHub 登录…");
    try {
      const nextAuth = await loginWithGitHub();
      setAuth(nextAuth);
      setStatus(`已登录 @${nextAuth.login}，可以发布内容了`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "GitHub 登录失败");
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = () => {
    clearDevAuth();
    setAuth(null);
    setStatus("已退出线上编辑");
  };

  const startPanelDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!window.matchMedia("(min-width: 769px) and (pointer: fine)").matches) return;
    if ((event.target as HTMLElement).closest("button, input, textarea, select, a")) return;
    const panel = panelRef.current;
    if (!panel) return;

    const rect = panel.getBoundingClientRect();
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    };
    setIsDragging(true);
    event.preventDefault();

    const onMove = (moveEvent: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || moveEvent.pointerId !== drag.pointerId) return;
      const maxLeft = Math.max(8, window.innerWidth - drag.width - 8);
      const maxTop = Math.max(8, window.innerHeight - drag.height - 8);
      const left = Math.min(Math.max(8, drag.left + moveEvent.clientX - drag.startX), maxLeft);
      const top = Math.min(Math.max(8, drag.top + moveEvent.clientY - drag.startY), maxTop);
      setDragPosition({ left, top });
    };

    const onEnd = (endEvent: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || endEvent.pointerId !== drag.pointerId) return;
      dragRef.current = null;
      setIsDragging(false);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
      window.removeEventListener("pointercancel", onEnd);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onEnd);
    window.addEventListener("pointercancel", onEnd);
  };
  const updateProfile = (key: keyof SiteContent["profile"], value: string) => {
    onChange({ ...content, profile: { ...content.profile, [key]: value } });
  };

  const updateAboutText = (key: "kicker" | "heading" | "lead", value: string) => {
    onChange({ ...content, about: { ...content.about, [key]: value } });
  };

  const updateParagraph = (index: number, value: string) => {
    const paragraphs = [...content.about.paragraphs];
    paragraphs[index] = value;
    onChange({ ...content, about: { ...content.about, paragraphs } });
  };

  const addParagraph = () => {
    onChange({
      ...content,
      about: { ...content.about, paragraphs: [...content.about.paragraphs, ""] },
    });
  };

  const removeParagraph = (index: number) => {
    onChange({
      ...content,
      about: {
        ...content.about,
        paragraphs: content.about.paragraphs.filter((_, itemIndex) => itemIndex !== index),
      },
    });
  };

  const updateTrait = (index: number, key: "title" | "text", value: string) => {
    const traits = content.about.traits.map((trait, itemIndex) =>
      itemIndex === index ? { ...trait, [key]: value } : trait,
    );
    onChange({ ...content, about: { ...content.about, traits } });
  };

  const addTrait = () => {
    onChange({
      ...content,
      about: { ...content.about, traits: [...content.about.traits, { title: "新关键词", text: "" }] },
    });
  };

  const removeTrait = (index: number) => {
    onChange({
      ...content,
      about: {
        ...content.about,
        traits: content.about.traits.filter((_, itemIndex) => itemIndex !== index),
      },
    });
  };

  const updateCurrent = (key: "label" | "title" | "text", value: string) => {
    onChange({ ...content, about: { ...content.about, current: { ...content.about.current, [key]: value } } });
  };

  const updatePhotographyPageText = (
    key: "kicker" | "title" | "note" | "all",
    value: string,
  ) => {
    onChange({
      ...content,
      pageText: {
        ...content.pageText,
        photography: { ...content.pageText.photography, [key]: value },
      },
    });
  };

  const updateHobbiesPageText = (
    key: "kicker" | "title" | "note" | "drawerKicker",
    value: string,
  ) => {
    onChange({
      ...content,
      pageText: {
        ...content.pageText,
        hobbies: { ...content.pageText.hobbies, [key]: value },
      },
    });
  };

  const updateTravelPageText = (
    key: "kicker" | "title" | "note" | "drawerKicker",
    value: string,
  ) => {
    onChange({
      ...content,
      pageText: {
        ...content.pageText,
        travel: { ...content.pageText.travel, [key]: value },
      },
    });
  };
  const updateWork = (key: keyof SiteContent["work"], value: string) => {
    onChange({ ...content, work: { ...content.work, [key]: value } });
  };

  const updateContact = (key: "kicker" | "heading" | "text", value: string) => {
    onChange({ ...content, contact: { ...content.contact, [key]: value } });
  };

  const updateContactLink = (
    index: number,
    key: "label" | "value" | "href",
    value: string,
  ) => {
    const links = content.contact.links.map((link, linkIndex) =>
      linkIndex === index ? { ...link, [key]: value } : link,
    );
    onChange({ ...content, contact: { ...content.contact, links } });
  };

  const addContactLink = () => {
    onChange({
      ...content,
      contact: {
        ...content.contact,
        links: [...content.contact.links, { label: "新链接", value: "", href: "" }],
      },
    });
  };

  const removeContactLink = (index: number) => {
    onChange({
      ...content,
      contact: {
        ...content.contact,
        links: content.contact.links.filter((_, linkIndex) => linkIndex !== index),
      },
    });
  };

  const addCategory = () => {
    const name = newCategory.trim();
    if (!name || content.photoCategories.includes(name)) return;
    onChange({ ...content, photoCategories: [...content.photoCategories, name] });
    setNewCategory("");
  };

  const updateCategory = (index: number, nextName: string) => {
    const oldName = content.photoCategories[index];
    if (!oldName || oldName === UNCATEGORIZED) return;
    if (!nextName.trim()) return;
    const photoCategories = content.photoCategories.map((category, itemIndex) =>
      itemIndex === index ? nextName : category,
    );
    const photography = content.photography.map((photo) =>
      photo.category === oldName ? { ...photo, category: nextName || UNCATEGORIZED } : photo,
    );
    onChange({ ...content, photoCategories, photography });
  };

  const moveCategory = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= content.photoCategories.length) return;
    const photoCategories = [...content.photoCategories];
    [photoCategories[index], photoCategories[target]] = [photoCategories[target], photoCategories[index]];
    onChange({ ...content, photoCategories });
  };

  const removeCategory = (index: number) => {
    const name = content.photoCategories[index];
    if (!name || name === UNCATEGORIZED) return;
    onChange({
      ...content,
      photoCategories: content.photoCategories.filter((_, itemIndex) => itemIndex !== index),
      photography: content.photography.map((photo) =>
        photo.category === name ? { ...photo, category: UNCATEGORIZED } : photo,
      ),
    });
  };

  const updatePhoto = (
    id: string,
    key: keyof PhotographyItem,
    value: string | boolean | undefined,
  ) => {
    const photography = content.photography.map((photo) =>
      photo.id === id ? { ...photo, [key]: value } : photo,
    );
    onChange({ ...content, photography });
  };

  const addPhoto = () => {
    const category = content.photoCategories.find((item) => item !== UNCATEGORIZED) ?? UNCATEGORIZED;
    onChange({
      ...content,
      photography: [
        ...content.photography,
        {
          id: `photo-${Date.now()}`,
          title: "新照片",
          category,
          image: "/images/photo-city.svg",
          caption: "点击这里修改照片介绍。",
          note: "",
          visible: true,
        },
      ],
    });
  };

  const removePhoto = (index: number) => {
    onChange({
      ...content,
      photography: content.photography.filter((_, itemIndex) => itemIndex !== index),
    });
  };

  const movePhoto = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= content.photography.length) return;
    const photography = [...content.photography];
    [photography[index], photography[target]] = [photography[target], photography[index]];
    onChange({ ...content, photography });
  };

  const setPhotoLayout = (id: string, layout: "normal" | "wide" | "tall") => {
    const photography = content.photography.map((photo) =>
      photo.id === id
        ? { ...photo, wide: layout === "wide", tall: layout === "tall" }
        : photo,
    );
    onChange({ ...content, photography });
  };

  const saveContent = async (nextContent: SiteContent) => {
    if (isOnline) {
      if (!auth?.token) throw new Error("请先登录 GitHub，再发布内容。");
      await saveSiteContent(nextContent, auth.token);
      return;
    }

    const response = await fetch("/__dev-editor/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextContent),
    });
    if (!response.ok) throw new Error("save failed");
  };

  const reportUploadError = (error: unknown) => {
    const message = error instanceof Error ? error.message : "图片上传失败";
    setStatus(
      message === "Failed to fetch"
        ? "无法连接本地开发服务，请重启项目后再上传。"
        : message,
    );
  };

  const finishUpload = async (nextContent: SiteContent, successMessage: string) => {
    onChange(nextContent);
    try {
      await saveContent(nextContent);
      setStatus(successMessage);
    } catch {
      setStatus("图片已上传，但内容保存失败，请点击“保存内容”。");
    }
  };

  const mergeImageMeta = (base: SiteContent, uploads: UploadedImage[]) => {
    const imageMeta = { ...(base.imageMeta ?? {}) };
    uploads.forEach((upload) => {
      if (upload.width > 0 && upload.height > 0) {
        imageMeta[upload.path] = { width: upload.width, height: upload.height };
      }
    });
    return { ...base, imageMeta };
  };

  const uploadPhoto = async (id: string, file: File) => {
    setStatus("正在优化并上传图片…");
    try {
      const uploaded = await uploadImageFile(file, { online: isOnline, token: auth?.token });
      const nextContent = mergeImageMeta({
        ...content,
        photography: content.photography.map((photo) =>
          photo.id === id ? { ...photo, image: uploaded.path } : photo,
        ),
      }, [uploaded]);
      await finishUpload(nextContent, "图片已上传并保存");
    } catch (error) {
      reportUploadError(error);
    }
  };

  const updateHobbyItem = (id: string, updater: (hobby: HobbyItem) => HobbyItem) => {
    const nextContent = {
      ...content,
      hobbies: content.hobbies.map((hobby) => (hobby.id === id ? updater(hobby) : hobby)),
    };
    onChange(nextContent);
    return nextContent;
  };

  const updateHobbyText = (
    id: string,
    key: "title" | "summary" | "detail" | "image",
    value: string,
  ) => {
    updateHobbyItem(id, (hobby) => ({ ...hobby, [key]: value }));
  };

  const addHobby = () => {
    onChange({
      ...content,
      hobbies: [
        ...content.hobbies,
        {
          id: `hobby-${Date.now()}`,
          title: "新爱好",
          summary: "简单介绍这个爱好。",
          detail: "点击这里修改详情正文。",
          image: "/images/photo-detail.svg",
          paragraphs: [],
          photos: [],
        },
      ],
    });
  };

  const removeHobby = (index: number) => {
    onChange({ ...content, hobbies: content.hobbies.filter((_, itemIndex) => itemIndex !== index) });
  };

  const moveHobby = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= content.hobbies.length) return;
    const hobbies = [...content.hobbies];
    [hobbies[index], hobbies[target]] = [hobbies[target], hobbies[index]];
    onChange({ ...content, hobbies });
  };

  const updateHobbyParagraph = (id: string, index: number, value: string) => {
    updateHobbyItem(id, (hobby) => {
      const paragraphs = [...(hobby.paragraphs ?? [])];
      paragraphs[index] = value;
      return { ...hobby, paragraphs };
    });
  };

  const addHobbyParagraph = (id: string) => {
    updateHobbyItem(id, (hobby) => ({
      ...hobby,
      paragraphs: [...(hobby.paragraphs ?? []), ""],
    }));
  };

  const removeHobbyParagraph = (id: string, index: number) => {
    updateHobbyItem(id, (hobby) => ({
      ...hobby,
      paragraphs: (hobby.paragraphs ?? []).filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const updateHobbyPhoto = (id: string, index: number, value: string) => {
    updateHobbyItem(id, (hobby) => {
      const photos = [...(hobby.photos ?? [])];
      photos[index] = value;
      return { ...hobby, photos };
    });
  };

  const addHobbyPhotoPath = (id: string) => {
    updateHobbyItem(id, (hobby) => ({
      ...hobby,
      photos: [...(hobby.photos ?? []), "/images/photo-detail.svg"],
    }));
  };

  const removeHobbyPhoto = (id: string, index: number) => {
    updateHobbyItem(id, (hobby) => ({
      ...hobby,
      photos: (hobby.photos ?? []).filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const moveHobbyPhoto = (id: string, index: number, direction: -1 | 1) => {
    updateHobbyItem(id, (hobby) => {
      const photos = [...(hobby.photos ?? [])];
      const target = index + direction;
      if (target < 0 || target >= photos.length) return hobby;
      [photos[index], photos[target]] = [photos[target], photos[index]];
      return { ...hobby, photos };
    });
  };

  const uploadHobbyCover = async (id: string, file: File) => {
    setStatus("正在优化并上传爱好封面…");
    try {
      const uploaded = await uploadImageFile(file, { online: isOnline, token: auth?.token });
      const nextContent = mergeImageMeta(updateHobbyItem(id, (hobby) => ({ ...hobby, image: uploaded.path })), [uploaded]);
      await finishUpload(nextContent, "爱好封面已上传并保存");
    } catch (error) {
      reportUploadError(error);
    }
  };

  const uploadHobbyPhotos = async (id: string, files: File[]) => {
    if (files.length === 0) return;
    try {
      const uploadedImages: UploadedImage[] = [];
      for (const [index, file] of files.entries()) {
        setStatus(`正在优化并上传详情照片 ${index + 1}/${files.length}…`);
        uploadedImages.push(await uploadImageFile(file, { online: isOnline, token: auth?.token }));
      }
      const nextContent = mergeImageMeta(updateHobbyItem(id, (hobby) => ({
        ...hobby,
        photos: [...(hobby.photos ?? []), ...uploadedImages.map((upload) => upload.path)],
      })), uploadedImages);
      await finishUpload(nextContent, `已上传并保存 ${uploadedImages.length} 张详情照片`);
    } catch (error) {
      reportUploadError(error);
    }
  };

  const updateCityItem = (id: string, updater: (city: CityItem) => CityItem) => {
    const nextContent = {
      ...content,
      cities: content.cities.map((city) => (city.id === id ? updater(city) : city)),
    };
    onChange(nextContent);
    return nextContent;
  };

  const updateCityText = (
    id: string,
    key: "name" | "date" | "note" | "image",
    value: string,
  ) => {
    updateCityItem(id, (city) => ({ ...city, [key]: value }));
  };

  const addCity = () => {
    onChange({
      ...content,
      cities: [
        ...content.cities,
        {
          id: `city-${Date.now()}`,
          name: "新城市",
          date: "城市记录",
          note: "点击这里修改城市简介。",
          image: "/images/photo-city.svg",
          paragraphs: [],
          photos: [],
        },
      ],
    });
  };

  const removeCity = (index: number) => {
    onChange({ ...content, cities: content.cities.filter((_, itemIndex) => itemIndex !== index) });
  };

  const moveCity = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= content.cities.length) return;
    const cities = [...content.cities];
    [cities[index], cities[target]] = [cities[target], cities[index]];
    onChange({ ...content, cities });
  };

  const updateCityParagraph = (id: string, index: number, value: string) => {
    updateCityItem(id, (city) => {
      const paragraphs = [...(city.paragraphs ?? [])];
      paragraphs[index] = value;
      return { ...city, paragraphs };
    });
  };

  const addCityParagraph = (id: string) => {
    updateCityItem(id, (city) => ({
      ...city,
      paragraphs: [...(city.paragraphs ?? []), ""],
    }));
  };

  const removeCityParagraph = (id: string, index: number) => {
    updateCityItem(id, (city) => ({
      ...city,
      paragraphs: (city.paragraphs ?? []).filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const updateCityPhoto = (id: string, index: number, value: string) => {
    updateCityItem(id, (city) => {
      const photos = [...city.photos];
      photos[index] = value;
      return { ...city, photos };
    });
  };

  const addCityPhotoPath = (id: string) => {
    updateCityItem(id, (city) => ({
      ...city,
      photos: [...city.photos, "/images/photo-detail.svg"],
    }));
  };

  const removeCityPhoto = (id: string, index: number) => {
    updateCityItem(id, (city) => ({
      ...city,
      photos: city.photos.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const moveCityPhoto = (id: string, index: number, direction: -1 | 1) => {
    updateCityItem(id, (city) => {
      const photos = [...city.photos];
      const target = index + direction;
      if (target < 0 || target >= photos.length) return city;
      [photos[index], photos[target]] = [photos[target], photos[index]];
      return { ...city, photos };
    });
  };

  const uploadCityCover = async (id: string, file: File) => {
    setStatus("正在优化并上传城市封面…");
    try {
      const uploaded = await uploadImageFile(file, { online: isOnline, token: auth?.token });
      const nextContent = mergeImageMeta(updateCityItem(id, (city) => ({ ...city, image: uploaded.path })), [uploaded]);
      await finishUpload(nextContent, "城市封面已上传并保存");
    } catch (error) {
      reportUploadError(error);
    }
  };

  const uploadCityPhotos = async (id: string, files: File[]) => {
    if (files.length === 0) return;
    try {
      const uploadedImages: UploadedImage[] = [];
      for (const [index, file] of files.entries()) {
        setStatus(`正在优化并上传城市照片 ${index + 1}/${files.length}…`);
        uploadedImages.push(await uploadImageFile(file, { online: isOnline, token: auth?.token }));
      }
      const nextContent = mergeImageMeta(updateCityItem(id, (city) => ({
        ...city,
        photos: [...city.photos, ...uploadedImages.map((upload) => upload.path)],
      })), uploadedImages);
      await finishUpload(nextContent, `已上传并保存 ${uploadedImages.length} 张城市照片`);
    } catch (error) {
      reportUploadError(error);
    }
  };

  const applyJson = (value: string) => {
    setDraft(value);
    try {
      const parsed = JSON.parse(value) as SiteContent;
      onChange({ ...parsed, appearance: normalizeAppearance(parsed.appearance) });
      setStatus("JSON 已同步，缺失的外观字段已自动补默认值");
    } catch {
      setStatus("JSON 格式暂时不正确");
    }
  };

  const formatJson = () => {
    try {
      const parsed = JSON.parse(draft) as SiteContent;
      const formatted = JSON.stringify({ ...parsed, appearance: normalizeAppearance(parsed.appearance) }, null, 2);
      setDraft(formatted);
      setStatus("JSON 已格式化");
    } catch {
      setStatus("JSON 格式暂时不正确");
    }
  };

  const findInJson = () => {
    const query = jsonSearch.trim();
    const textarea = jsonTextareaRef.current;
    if (!query || !textarea) {
      setJsonSearchStatus("请输入要查找的文字");
      return;
    }

    const start = textarea.selectionEnd ?? 0;
    let index = draft.indexOf(query, start);
    const wrapped = index < 0;
    if (index < 0) index = draft.indexOf(query);
    if (index < 0) {
      setJsonSearchStatus("没有找到这段文字");
      return;
    }

    textarea.focus();
    textarea.setSelectionRange(index, index + query.length);
    const line = draft.slice(0, index).split("\n").length;
    setJsonSearchStatus(`${wrapped ? "已从头找到" : "已找到"}，第 ${line} 行`);
  };

  const save = async () => {
    setStatus(isOnline ? "正在发布…" : "正在保存…");
    try {
      await saveContent(contentForJson(content));
      setStatus(
        isOnline
          ? "已发布，Cloudflare 正在自动部署，约 1 分钟后刷新网页"
          : "已保存到 src/content/site.json",
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "保存失败");
    }
  };

  const resetTypography = () => {
    const next = {
      ...draftTypography,
      [typographyMode]: defaultTypography[typographyMode],
    };
    setDraftTypography(next);
    onApplyTypography(next);
    setStatus("已恢复当前端的默认字体设置");
  };

  const updateActiveTypography = (patch: Partial<TypographyModeSettings>) => {
    const next = {
      ...draftTypography,
      [typographyMode]: { ...draftTypography[typographyMode], ...patch },
    };
    setDraftTypography(next);
    onApplyTypography(next);
    setStatus("已实时应用到页面");
  };

  const activeTypography = draftTypography[typographyMode];
  const activeAppearance = normalizeAppearance(content.appearance)[typographyMode];
  const headingFont = fontPresets[activeTypography.headingFont].value;
  const bodyFont = fontPresets[activeTypography.bodyFont].value;

  const updateAppearanceMode = (patch: Partial<Pick<typeof activeAppearance, "moduleLabelScale" | "moduleIntroScale">>) => {
    const appearance = normalizeAppearance(content.appearance);
    onChange({
      ...content,
      appearance: {
        ...appearance,
        [typographyMode]: { ...appearance[typographyMode], ...patch },
      },
    });
    setStatus("已实时应用到页面");
  };

  return (
    <>
      <button className="dev-trigger" onClick={() => setOpen((value) => !value)}>
        DEV
      </button>
      <aside
        ref={panelRef}
        className={`dev-editor ${open ? "is-open" : ""}${isDragging ? " is-dragging" : ""}`}
        style={
          dragPosition
            ? { left: `${dragPosition.left}px`, top: `${dragPosition.top}px`, right: "auto", bottom: "auto" }
            : undefined
        }
        aria-hidden={!open}
      >
        <div className="dev-editor-head" onPointerDown={startPanelDrag} title="按住标题栏可拖动面板">
          <div>
            <span>{isOnline ? "ONLINE CONTENT STUDIO" : "LOCAL CONTENT STUDIO"}</span>
            <h2>内容与字体设置</h2>
          </div>
          <button onClick={() => setOpen(false)} aria-label="关闭编辑器">
            ×
          </button>
        </div>

        {isPreviewEnvironment ? (
          <div className="dev-auth-panel">
            <div>
              <strong>{auth ? `预览站已登录 @${auth.login}` : "预览站可测试登录"}</strong>
              <small>
                {auth
                  ? "可以测试 DEV 操作，但不能发布或上传。正式修改请回到 https://underpanda.cn/admin/。"
                  : "登录 GitHub 可测试手机和电脑登录流程，但不能发布或上传。"}
              </small>
            </div>
            {auth ? (
              <button onClick={handleLogout}>退出</button>
            ) : (
              <button onClick={handleLogin} disabled={authBusy}>
                {authBusy ? "登录中…" : "登录 GitHub"}
              </button>
            )}
          </div>
        ) : isOnline && (
          <div className="dev-auth-panel">
            <div>
              <strong>{auth ? `已登录 @${auth.login}` : "登录 GitHub 后即可发布"}</strong>
              <small>修改会立即在右侧网页预览，发布后约 1 分钟自动上线。</small>
            </div>
            {auth ? (
              <button onClick={handleLogout}>退出</button>
            ) : (
              <button onClick={handleLogin} disabled={authBusy}>
                {authBusy ? "登录中…" : "登录 GitHub"}
              </button>
            )}
          </div>
        )}

        <div className="dev-editor-tabs">
          <button className={view === "content" ? "active" : ""} onClick={() => setView("content")}>
            常用内容
          </button>
          <button className={view === "photos" ? "active" : ""} onClick={() => setView("photos")}>
            摄影管理
          </button>
          <button className={view === "hobbies" ? "active" : ""} onClick={() => setView("hobbies")}>
            爱好管理
          </button>
          <button className={view === "travel" ? "active" : ""} onClick={() => setView("travel")}>
            旅行管理
          </button>
          <button className={view === "type" ? "active" : ""} onClick={() => setView("type")}>
            字体设置
          </button>
          <button className={view === "json" ? "active" : ""} onClick={() => setView("json")}>
            JSON
          </button>
        </div>

        <div className="dev-editor-body">
          {view === "json" ? (
            <>
              <p className="dev-note">
                文字内容在 pageText，字号、页脚、BACK TO TOP 和 PC 封面样式在 appearance。修改后会实时同步；点击“保存内容”可写回 site.json。
              </p>
              <div className="dev-json-toolbar">
                <input
                  value={jsonSearch}
                  placeholder="例如：backToTop.fontSize"
                  onChange={(event) => setJsonSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      findInJson();
                    }
                  }}
                />
                <button onClick={findInJson}>查找下一个</button>
                <button onClick={formatJson}>格式化</button>
                <span>{jsonSearchStatus}</span>
              </div>
              <label className="dev-field">
                <span>完整内容与外观 JSON</span>
                <textarea
                  ref={jsonTextareaRef}
                  className="dev-json"
                  value={draft}
                  spellCheck={false}
                  onChange={(event) => applyJson(event.target.value)}
                />
              </label>
              <details className="dev-json-reference">
                <summary>JSON 字段速查与修改示例</summary>
                {jsonReferenceGroups.map((group) => (
                  <section key={group.title}>
                    <h4>{group.title}</h4>
                    <dl>
                      {group.fields.map(([path, example]) => (
                        <div key={path}>
                          <dt>{path}</dt>
                          <dd>{example}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                ))}
                <p>字号可填写 px、rem 或 clamp；圆角、边框宽度和偏移填写数字即可。</p>
              </details>
            </>
          ) : view === "type" ? (
            <>
              <p className="dev-note">
                所有字体、字号、缩放和间距都会实时更新页面。模块标签、模块介绍和自定义正文也可以在这里直接调整。
              </p>

              <div className="type-mode-switch" role="group" aria-label="选择编辑端">
                <span>编辑范围</span>
                <div className={`type-mode-track ${typographyMode}`}>
                  <button
                    className={typographyMode === "desktop" ? "active" : ""}
                    onClick={() => setTypographyMode("desktop")}
                  >
                    PC 端
                  </button>
                  <button
                    className={typographyMode === "mobile" ? "active" : ""}
                    onClick={() => setTypographyMode("mobile")}
                  >
                    移动端
                  </button>
                </div>
              </div>

              <div className="type-lab-section">
                <label className="dev-field">
                  <span>标题字体</span>
                  <select
                    value={activeTypography.headingFont}
                    onChange={(event) =>
                      updateActiveTypography({ headingFont: event.target.value as FontKey })
                    }
                  >
                    {Object.entries(fontPresets).map(([key, preset]) => (
                      <option key={key} value={key}>
                        {preset.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="dev-field">
                  <span>正文字体</span>
                  <select
                    value={activeTypography.bodyFont}
                    onChange={(event) =>
                      updateActiveTypography({ bodyFont: event.target.value as FontKey })
                    }
                  >
                    {Object.entries(fontPresets).map(([key, preset]) => (
                      <option key={key} value={key}>
                        {preset.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="dev-range">
                <span>导航字号 <b>{activeTypography.navSize}px</b></span>
                <input
                  type="range"
                  min="12"
                  max="34"
                  step="1"
                  value={activeTypography.navSize}
                  onChange={(event) => updateActiveTypography({ navSize: Number(event.target.value) })}
                />
              </label>

              <label className="dev-range">
                <span>模块标签缩放 <b>{activeAppearance.moduleLabelScale.toFixed(2)}×</b></span>
                <input
                  type="range"
                  min="0.8"
                  max="1.4"
                  step="0.01"
                  value={activeAppearance.moduleLabelScale}
                  onChange={(event) =>
                    updateAppearanceMode({ moduleLabelScale: Number(event.target.value) })
                  }
                />
              </label>

              <label className="dev-range">
                <span>模块介绍缩放 <b>{activeAppearance.moduleIntroScale.toFixed(2)}×</b></span>
                <input
                  type="range"
                  min="0.8"
                  max="1.4"
                  step="0.01"
                  value={activeAppearance.moduleIntroScale}
                  onChange={(event) =>
                    updateAppearanceMode({ moduleIntroScale: Number(event.target.value) })
                  }
                />
              </label>

              <label className="dev-range">
                <span>自定义正文基础字号 <b>{activeTypography.bodySize}px</b></span>
                <input
                  type="range"
                  min="14"
                  max="22"
                  step="1"
                  value={activeTypography.bodySize}
                  onChange={(event) => updateActiveTypography({ bodySize: Number(event.target.value) })}
                />
              </label>

              <label className="dev-range">
                <span>标题缩放 <b>{activeTypography.headingScale.toFixed(2)}×</b></span>
                <input
                  type="range"
                  min="0.65"
                  max="1.3"
                  step="0.02"
                  value={activeTypography.headingScale}
                  onChange={(event) =>
                    updateActiveTypography({ headingScale: Number(event.target.value) })
                  }
                />
              </label>

              <label className="dev-range">
                <span>自定义正文行高 <b>{activeTypography.lineHeight.toFixed(2)}</b></span>
                <input
                  type="range"
                  min="1.35"
                  max="2.1"
                  step="0.02"
                  value={activeTypography.lineHeight}
                  onChange={(event) =>
                    updateActiveTypography({ lineHeight: Number(event.target.value) })
                  }
                />
              </label>

              <label className="dev-range">
                <span>模块上下间距 <b>{activeTypography.sectionSpacing.toFixed(2)}×</b></span>
                <input
                  type="range"
                  min="0.5"
                  max="1.4"
                  step="0.02"
                  value={activeTypography.sectionSpacing}
                  onChange={(event) =>
                    updateActiveTypography({ sectionSpacing: Number(event.target.value) })
                  }
                />
              </label>

              <label className="dev-range">
                <span>内容块间距 <b>{activeTypography.blockSpacing.toFixed(2)}×</b></span>
                <input
                  type="range"
                  min="0.5"
                  max="1.4"
                  step="0.02"
                  value={activeTypography.blockSpacing}
                  onChange={(event) =>
                    updateActiveTypography({ blockSpacing: Number(event.target.value) })
                  }
                />
              </label>

              <label className="dev-range">
                <span>图片与卡片间距 <b>{activeTypography.gallerySpacing.toFixed(2)}×</b></span>
                <input
                  type="range"
                  min="0.5"
                  max="1.4"
                  step="0.02"
                  value={activeTypography.gallerySpacing}
                  onChange={(event) =>
                    updateActiveTypography({ gallerySpacing: Number(event.target.value) })
                  }
                />
              </label>

              <div
                className={`typo-lab-preview${typographyMode === "mobile" ? " is-mobile" : ""}`}
                style={{
                  fontFamily: bodyFont,
                  fontSize: `${activeTypography.bodySize}px`,
                  lineHeight: activeTypography.lineHeight,
                }}
              >
                <div className="typo-preview-nav" style={{ fontSize: `${activeTypography.navSize}px` }}>
                  首页&nbsp;&nbsp; 关于&nbsp;&nbsp; 摄影&nbsp;&nbsp; 生活&nbsp;&nbsp; 旅行
                </div>
                <p className="typo-preview-kicker">ABOUT / 关于我</p>
                <h3
                  style={{
                    fontFamily: headingFont,
                    fontSize: `${Math.round(38 * activeTypography.headingScale)}px`,
                  }}
                >
                  把生活过具体，也把自己慢慢讲清楚。
                </h3>
                <p>
                  我喜欢摄影，也喜欢在城市和自然之间走走停停。相机对我来说不只是设备，更像一种提醒。
                </p>
                <small>
                  {typographyMode === "desktop" ? "PC" : "MOBILE"} · NAV {activeTypography.navSize}px · BODY{' '}
                  {activeTypography.bodySize}px · TITLE {activeTypography.headingScale.toFixed(2)}× · SPACE{' '}
                  {activeTypography.sectionSpacing.toFixed(2)}×
                </small>
              </div>
            </>
          ) : view === "travel" ? (
            <>
              <p className="dev-note">
                城市顺序会同步影响顶部路线节点和下方城市卡片。详情照片使用自适应排列，点击后打开纯图片大图。
              </p>

              <section className="dev-section">
                <div className="dev-section-head"><h3>旅行模块文案</h3></div>
                <label className="dev-field"><span>小标签</span><input value={content.pageText.travel.kicker} onChange={(event) => updateTravelPageText("kicker", event.target.value)} /></label>
                <label className="dev-field"><span>主标题</span><input value={content.pageText.travel.title} onChange={(event) => updateTravelPageText("title", event.target.value)} /></label>
                <label className="dev-field"><span>导语</span><textarea value={content.pageText.travel.note} onChange={(event) => updateTravelPageText("note", event.target.value)} /></label>
                <label className="dev-field"><span>详情小标签</span><input value={content.pageText.travel.drawerKicker} onChange={(event) => updateTravelPageText("drawerKicker", event.target.value)} /></label>
              </section>

              <section className="dev-section">
                <div className="dev-section-head">
                  <h3>城市列表</h3>
                  <button onClick={addCity}>添加城市</button>
                </div>

                {content.cities.map((city, index) => (
                  <article className="dev-hobby-editor" key={city.id}>
                    <div className="dev-hobby-header">
                      <div className="dev-photo-preview dev-hobby-cover">
                        <img src={city.image} alt={city.name} />
                        <span>{String(index + 1).padStart(2, "0")}</span>
                      </div>
                      <div className="dev-hobby-heading">
                        <strong>{city.name || "未命名城市"}</strong>
                        <small>{city.photos.length} 张详情照片</small>
                      </div>
                      <div className="dev-photo-actions dev-hobby-header-actions">
                        <button onClick={() => moveCity(index, -1)}>上移</button>
                        <button onClick={() => moveCity(index, 1)}>下移</button>
                        <button onClick={() => removeCity(index)}>删除</button>
                      </div>
                    </div>

                    <label className="dev-field">
                      <span>主标题</span>
                      <input
                        value={city.name}
                        onChange={(event) => updateCityText(city.id, "name", event.target.value)}
                      />
                    </label>
                    <label className="dev-field">
                      <span>小标签</span>
                      <input
                        value={city.date}
                        onChange={(event) => updateCityText(city.id, "date", event.target.value)}
                      />
                    </label>
                    <label className="dev-field">
                      <span>导语</span>
                      <textarea
                        value={city.note}
                        onChange={(event) => updateCityText(city.id, "note", event.target.value)}
                      />
                    </label>
                    <label className="dev-field">
                      <span>封面图片路径</span>
                      <input
                        value={city.image}
                        onChange={(event) => updateCityText(city.id, "image", event.target.value)}
                      />
                    </label>
                    <div className="dev-photo-actions">
                      <label className="dev-upload">
                        上传封面图片
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            event.currentTarget.value = "";
                            if (file) void uploadCityCover(city.id, file);
                          }}
                        />
                      </label>
                    </div>

                    <div className="dev-hobby-subsection">
                      <div className="dev-subsection-head">
                        <h4>详情正文</h4>
                        <button onClick={() => addCityParagraph(city.id)}>添加段落</button>
                      </div>
                      {(city.paragraphs ?? []).map((paragraph, paragraphIndex) => (
                        <div className="dev-repeat-row" key={`${city.id}-paragraph-${paragraphIndex}`}>
                          <label className="dev-field">
                            <span>正文 {paragraphIndex + 1}</span>
                            <textarea
                              value={paragraph}
                              onChange={(event) =>
                                updateCityParagraph(city.id, paragraphIndex, event.target.value)
                              }
                            />
                          </label>
                          <button onClick={() => removeCityParagraph(city.id, paragraphIndex)}>删除</button>
                        </div>
                      ))}
                      {(city.paragraphs ?? []).length === 0 && (
                        <p className="dev-empty-note">还没有补充正文，可以点击“添加段落”。</p>
                      )}
                    </div>

                    <div className="dev-hobby-subsection">
                      <div className="dev-subsection-head">
                        <h4>详情照片</h4>
                        <label className="dev-upload">
                          上传多张照片
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(event) => {
                              const files = Array.from(event.target.files ?? []);
                              event.currentTarget.value = "";
                              if (files.length > 0) void uploadCityPhotos(city.id, files);
                            }}
                          />
                        </label>
                      </div>
                      {city.photos.map((photo, photoIndex) => (
                        <div className="dev-hobby-photo-row" key={`${city.id}-photo-${photoIndex}`}>
                          <img src={photo} alt={`${city.name} ${photoIndex + 1}`} />
                          <input
                            aria-label={`城市照片 ${photoIndex + 1} 路径`}
                            value={photo}
                            onChange={(event) =>
                              updateCityPhoto(city.id, photoIndex, event.target.value)
                            }
                          />
                          <div className="dev-row-actions">
                            <button onClick={() => moveCityPhoto(city.id, photoIndex, -1)}>↑</button>
                            <button onClick={() => moveCityPhoto(city.id, photoIndex, 1)}>↓</button>
                            <button onClick={() => removeCityPhoto(city.id, photoIndex)}>×</button>
                          </div>
                        </div>
                      ))}
                      <button className="dev-add-button" onClick={() => addCityPhotoPath(city.id)}>
                        ＋ 手动添加图片路径
                      </button>
                    </div>
                  </article>
                ))}
              </section>
            </>
          ) : view === "hobbies" ? (
            <>
              <p className="dev-note">
                外层爱好卡片保持现有样式。在这里编辑的正文、封面和详情照片，会显示在点击后的详情面板中。
              </p>

              <section className="dev-section">
                <div className="dev-section-head"><h3>爱好模块文案</h3></div>
                <label className="dev-field"><span>小标签</span><input value={content.pageText.hobbies.kicker} onChange={(event) => updateHobbiesPageText("kicker", event.target.value)} /></label>
                <label className="dev-field"><span>主标题</span><input value={content.pageText.hobbies.title} onChange={(event) => updateHobbiesPageText("title", event.target.value)} /></label>
                <label className="dev-field"><span>导语</span><textarea value={content.pageText.hobbies.note} onChange={(event) => updateHobbiesPageText("note", event.target.value)} /></label>
                <label className="dev-field"><span>详情小标签</span><input value={content.pageText.hobbies.drawerKicker} onChange={(event) => updateHobbiesPageText("drawerKicker", event.target.value)} /></label>
              </section>

              <section className="dev-section">
                <div className="dev-section-head">
                  <h3>爱好列表</h3>
                  <button onClick={addHobby}>添加爱好</button>
                </div>

                {content.hobbies.map((hobby, index) => (
                  <article className="dev-hobby-editor" key={hobby.id}>
                    <div className="dev-hobby-header">
                      <div className="dev-photo-preview dev-hobby-cover">
                        <img src={hobby.image} alt={hobby.title} />
                        <span>{String(index + 1).padStart(2, "0")}</span>
                      </div>
                      <div className="dev-hobby-heading">
                        <strong>{hobby.title || "未命名爱好"}</strong>
                        <small>{hobby.photos?.length ?? 0} 张详情照片</small>
                      </div>
                      <div className="dev-photo-actions dev-hobby-header-actions">
                        <button onClick={() => moveHobby(index, -1)}>上移</button>
                        <button onClick={() => moveHobby(index, 1)}>下移</button>
                        <button onClick={() => removeHobby(index)}>删除</button>
                      </div>
                    </div>

                    <label className="dev-field">
                      <span>主标题</span>
                      <input
                        value={hobby.title}
                        onChange={(event) => updateHobbyText(hobby.id, "title", event.target.value)}
                      />
                    </label>
                    <label className="dev-field">
                      <span>导语</span>
                      <textarea
                        value={hobby.summary}
                        onChange={(event) => updateHobbyText(hobby.id, "summary", event.target.value)}
                      />
                    </label>
                    <label className="dev-field">
                      <span>补充导语</span>
                      <textarea
                        value={hobby.detail}
                        onChange={(event) => updateHobbyText(hobby.id, "detail", event.target.value)}
                      />
                    </label>
                    <label className="dev-field">
                      <span>封面图片路径</span>
                      <input
                        value={hobby.image}
                        onChange={(event) => updateHobbyText(hobby.id, "image", event.target.value)}
                      />
                    </label>
                    <div className="dev-photo-actions">
                      <label className="dev-upload">
                        上传封面图片
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            event.currentTarget.value = "";
                            if (file) void uploadHobbyCover(hobby.id, file);
                          }}
                        />
                      </label>
                    </div>

                    <div className="dev-hobby-subsection">
                      <div className="dev-subsection-head">
                        <h4>详情正文</h4>
                        <button onClick={() => addHobbyParagraph(hobby.id)}>添加段落</button>
                      </div>
                      {(hobby.paragraphs ?? []).map((paragraph, paragraphIndex) => (
                        <div className="dev-repeat-row" key={`${hobby.id}-paragraph-${paragraphIndex}`}>
                          <label className="dev-field">
                            <span>正文 {paragraphIndex + 1}</span>
                            <textarea
                              value={paragraph}
                              onChange={(event) =>
                                updateHobbyParagraph(hobby.id, paragraphIndex, event.target.value)
                              }
                            />
                          </label>
                          <button onClick={() => removeHobbyParagraph(hobby.id, paragraphIndex)}>删除</button>
                        </div>
                      ))}
                      {(hobby.paragraphs ?? []).length === 0 && (
                        <p className="dev-empty-note">还没有补充正文，可以点击“添加段落”。</p>
                      )}
                    </div>

                    <div className="dev-hobby-subsection">
                      <div className="dev-subsection-head">
                        <h4>详情照片</h4>
                        <label className="dev-upload">
                          上传多张照片
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(event) => {
                              const files = Array.from(event.target.files ?? []);
                              event.currentTarget.value = "";
                              if (files.length > 0) void uploadHobbyPhotos(hobby.id, files);
                            }}
                          />
                        </label>
                      </div>
                      {(hobby.photos ?? []).map((photo, photoIndex) => (
                        <div className="dev-hobby-photo-row" key={`${hobby.id}-photo-${photoIndex}`}>
                          <img src={photo} alt={`${hobby.title} ${photoIndex + 1}`} />
                          <input
                            aria-label={`详情照片 ${photoIndex + 1} 路径`}
                            value={photo}
                            onChange={(event) =>
                              updateHobbyPhoto(hobby.id, photoIndex, event.target.value)
                            }
                          />
                          <div className="dev-row-actions">
                            <button onClick={() => moveHobbyPhoto(hobby.id, photoIndex, -1)}>↑</button>
                            <button onClick={() => moveHobbyPhoto(hobby.id, photoIndex, 1)}>↓</button>
                            <button onClick={() => removeHobbyPhoto(hobby.id, photoIndex)}>×</button>
                          </div>
                        </div>
                      ))}
                      <button className="dev-add-button" onClick={() => addHobbyPhotoPath(hobby.id)}>
                        ＋ 手动添加图片路径
                      </button>
                    </div>
                  </article>
                ))}
              </section>
            </>
          ) : view === "photos" ? (
            <>
              <p className="dev-note">
                分类和照片会同步影响 PC 与移动端。上传时大图会自动压缩；浏览器无法读取 HEIC 时，请先导出为 JPG。
              </p>

              <section className="dev-section">
                <div className="dev-section-head"><h3>摄影模块文案</h3></div>
                <label className="dev-field"><span>小标签</span><input value={content.pageText.photography.kicker} onChange={(event) => updatePhotographyPageText("kicker", event.target.value)} /></label>
                <label className="dev-field"><span>主标题</span><input value={content.pageText.photography.title} onChange={(event) => updatePhotographyPageText("title", event.target.value)} /></label>
                <label className="dev-field"><span>导语</span><textarea value={content.pageText.photography.note} onChange={(event) => updatePhotographyPageText("note", event.target.value)} /></label>
                <label className="dev-field"><span>分类总标签</span><input value={content.pageText.photography.all} onChange={(event) => updatePhotographyPageText("all", event.target.value)} /></label>
              </section>

              <section className="dev-section">
                <div className="dev-section-head">
                  <h3>照片分类</h3>
                  <span>{content.photoCategories.length} 个</span>
                </div>
                <div className="dev-category-list">
                  {content.photoCategories.map((category, index) => (
                    <div className="dev-category-row" key={index}>
                      <input
                        value={category}
                        disabled={category === UNCATEGORIZED}
                        onChange={(event) => updateCategory(index, event.target.value)}
                      />
                      <div className="dev-row-actions">
                        <button onClick={() => moveCategory(index, -1)} aria-label="分类上移">↑</button>
                        <button onClick={() => moveCategory(index, 1)} aria-label="分类下移">↓</button>
                        <button
                          onClick={() => removeCategory(index)}
                          disabled={category === UNCATEGORIZED}
                          aria-label="删除分类"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="dev-add-row">
                  <input
                    value={newCategory}
                    placeholder="新分类名称"
                    onChange={(event) => setNewCategory(event.target.value)}
                  />
                  <button onClick={addCategory}>添加分类</button>
                </div>
              </section>

              <section className="dev-section">
                <div className="dev-section-head">
                  <h3>照片列表</h3>
                  <button onClick={addPhoto}>添加照片</button>
                </div>
                {content.photography.map((photo, index) => (
                  <article className="dev-photo-editor" key={photo.id}>
                    <div className="dev-photo-preview">
                      <img src={photo.image} alt={photo.title} />
                      <span>{String(index + 1).padStart(2, "0")}</span>
                    </div>
                    <label className="dev-field">
                      <span>主标题</span>
                      <input value={photo.title} onChange={(event) => updatePhoto(photo.id, "title", event.target.value)} />
                    </label>
                    <label className="dev-field">
                      <span>分类</span>
                      <select value={photo.category} onChange={(event) => updatePhoto(photo.id, "category", event.target.value)}>
                        {content.photoCategories.map((category) => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>
                    </label>
                    <label className="dev-field">
                      <span>导语</span>
                      <textarea value={photo.caption} onChange={(event) => updatePhoto(photo.id, "caption", event.target.value)} />
                    </label>
                    <label className="dev-field">
                      <span>补充说明</span>
                      <input value={photo.note} onChange={(event) => updatePhoto(photo.id, "note", event.target.value)} />
                    </label>
                    <label className="dev-field">
                      <span>图片路径</span>
                      <input value={photo.image} onChange={(event) => updatePhoto(photo.id, "image", event.target.value)} />
                    </label>
                    <div className="dev-photo-row">
                      <label className="dev-field">
                        <span>版式</span>
                        <select
                          value={photo.wide ? "wide" : photo.tall ? "tall" : "normal"}
                          onChange={(event) => setPhotoLayout(photo.id, event.target.value as "normal" | "wide" | "tall")}
                        >
                          <option value="normal">普通</option>
                          <option value="wide">横向大图</option>
                          <option value="tall">竖向长图</option>
                        </select>
                      </label>
                      <label className="dev-check">
                        <input
                          type="checkbox"
                          checked={photo.visible !== false}
                          onChange={(event) => updatePhoto(photo.id, "visible", event.target.checked)}
                        />
                        <span>显示</span>
                      </label>
                    </div>
                    <div className="dev-photo-actions">
                      <label className="dev-upload">
                        上传图片
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            event.currentTarget.value = "";
                            if (file) void uploadPhoto(photo.id, file);
                          }}
                        />
                      </label>
                      <button onClick={() => movePhoto(index, -1)}>上移</button>
                      <button onClick={() => movePhoto(index, 1)}>下移</button>
                      <button onClick={() => removePhoto(index)}>删除</button>
                    </div>
                  </article>
                ))}
              </section>
            </>
          ) : (
            <>
              <p className="dev-note">常用内容按页面顺序排列。文本修改会即时更新，图片资源放在最底部的高级设置中。</p>

              <section className="dev-section">
                <div className="dev-section-head"><h3><i>01</i>基本信息</h3></div>
                <div className="dev-grid-two">
                  <label className="dev-field"><span>显示名称</span><input value={content.profile.name} onChange={(event) => updateProfile("name", event.target.value)} /></label>
                  <label className="dev-field"><span>英文名称</span><input value={content.profile.englishName} onChange={(event) => updateProfile("englishName", event.target.value)} /></label>
                </div>
              </section>

              <section className="dev-section">
                <div className="dev-section-head"><h3><i>02</i>地址信息</h3></div>
                <label className="dev-field">
                  <span>全站地址</span>
                  <input value={content.profile.location} onChange={(event) => updateProfile("location", event.target.value)} />
                </label>
                <p className="dev-inline-note">会同时显示在顶部导航和首屏信息中。</p>
              </section>

              <section className="dev-section">
                <div className="dev-section-head"><h3><i>03</i>首屏文案</h3></div>
                <label className="dev-field"><span>小标签</span><input value={content.profile.eyebrow} onChange={(event) => updateProfile("eyebrow", event.target.value)} /></label>
                <label className="dev-field"><span>主标题</span><input value={content.profile.title} onChange={(event) => updateProfile("title", event.target.value)} /></label>
                <label className="dev-field"><span>导语</span><textarea value={content.profile.intro} onChange={(event) => updateProfile("intro", event.target.value)} /></label>
              </section>

              <section className="dev-section">
                <div className="dev-section-head"><h3><i>04</i>最近在做什么</h3></div>
                <label className="dev-field"><span>小标签</span><input value={content.about.current.label} onChange={(event) => updateCurrent("label", event.target.value)} /></label>
                <label className="dev-field"><span>主标题</span><input value={content.about.current.title} onChange={(event) => updateCurrent("title", event.target.value)} /></label>
                <label className="dev-field"><span>导语</span><textarea value={content.about.current.text} onChange={(event) => updateCurrent("text", event.target.value)} /></label>
              </section>

              <section className="dev-section">
                <div className="dev-section-head"><h3><i>05</i>关于我</h3></div>
                <label className="dev-field"><span>小标签</span><input value={content.about.kicker} onChange={(event) => updateAboutText("kicker", event.target.value)} /></label>
                <label className="dev-field"><span>主标题</span><input value={content.about.heading} onChange={(event) => updateAboutText("heading", event.target.value)} /></label>
                <label className="dev-field"><span>导语</span><textarea value={content.about.lead} onChange={(event) => updateAboutText("lead", event.target.value)} /></label>
                {content.about.paragraphs.map((paragraph, index) => (
                  <div className="dev-repeat-row" key={`paragraph-${index}`}>
                    <label className="dev-field"><span>正文 {index + 1}</span><textarea value={paragraph} onChange={(event) => updateParagraph(index, event.target.value)} /></label>
                    <button onClick={() => removeParagraph(index)}>删除</button>
                  </div>
                ))}
                <button className="dev-add-button" onClick={addParagraph}>＋ 添加正文</button>
                {content.about.traits.map((trait, index) => (
                  <div className="dev-repeat-row" key={`trait-${index}`}>
                    <div className="dev-grid-two">
                      <label className="dev-field"><span>关键词 {index + 1}</span><input value={trait.title} onChange={(event) => updateTrait(index, "title", event.target.value)} /></label>
                      <label className="dev-field"><span>补充说明</span><input value={trait.text} onChange={(event) => updateTrait(index, "text", event.target.value)} /></label>
                    </div>
                    <button onClick={() => removeTrait(index)}>删除</button>
                  </div>
                ))}
                <button className="dev-add-button" onClick={addTrait}>＋ 添加关键词</button>
              </section>

              <section className="dev-section">
                <div className="dev-section-head"><h3><i>06</i>我在做什么</h3></div>
                <label className="dev-field"><span>小标签</span><input value={content.work.kicker} onChange={(event) => updateWork("kicker", event.target.value)} /></label>
                <label className="dev-field"><span>主标题</span><input value={content.work.heading} onChange={(event) => updateWork("heading", event.target.value)} /></label>
                <label className="dev-field"><span>导语</span><textarea value={content.work.text} onChange={(event) => updateWork("text", event.target.value)} /></label>
                <label className="dev-field"><span>补充说明</span><input value={content.work.note} onChange={(event) => updateWork("note", event.target.value)} /></label>
              </section>

              <section className="dev-section">
                <div className="dev-section-head"><h3><i>07</i>联系</h3></div>
                <label className="dev-field"><span>小标签</span><input value={content.contact.kicker} onChange={(event) => updateContact("kicker", event.target.value)} /></label>
                <label className="dev-field"><span>主标题</span><input value={content.contact.heading} onChange={(event) => updateContact("heading", event.target.value)} /></label>
                <label className="dev-field"><span>导语</span><textarea value={content.contact.text} onChange={(event) => updateContact("text", event.target.value)} /></label>
                {content.contact.links.map((link, index) => (
                  <div className="dev-repeat-row" key={`${link.label}-${index}`}>
                    <input aria-label={`链接 ${index + 1} 名称`} value={link.label} onChange={(event) => updateContactLink(index, "label", event.target.value)} />
                    <input aria-label={`链接 ${index + 1} 显示内容`} value={link.value} onChange={(event) => updateContactLink(index, "value", event.target.value)} />
                    <input aria-label={`链接 ${index + 1} 地址`} value={link.href} onChange={(event) => updateContactLink(index, "href", event.target.value)} />
                    <button onClick={() => removeContactLink(index)}>删除</button>
                  </div>
                ))}
                <button className="dev-add-button" onClick={addContactLink}>＋ 添加联系方式</button>
              </section>

              <details className="dev-advanced">
                <summary>
                  <span>高级图片设置</span>
                  <small>一般不需要修改</small>
                </summary>
                <div className="dev-advanced-body">
                  <label className="dev-field"><span>PC 首页图片路径</span><input value={content.profile.heroImage} onChange={(event) => updateProfile("heroImage", event.target.value)} /></label>
                  <label className="dev-field"><span>移动端首页图片路径</span><input value={content.profile.heroImageSmall} onChange={(event) => updateProfile("heroImageSmall", event.target.value)} /></label>
                  <div className="dev-grid-two">
                    <label className="dev-field"><span>PC 图片位置</span><input value={content.profile.heroImagePosition} onChange={(event) => updateProfile("heroImagePosition", event.target.value)} /></label>
                    <label className="dev-field"><span>手机图片位置</span><input value={content.profile.heroImageMobilePosition} onChange={(event) => updateProfile("heroImageMobilePosition", event.target.value)} /></label>
                  </div>
                </div>
              </details>
            </>
          )}
        </div>

        <div className="dev-editor-foot">
          <span>{view === "type" ? status || "修改会实时应用到页面" : status}</span>
          {view === "type" ? (
            <div className="dev-type-actions">
              <button className="dev-reset-button" onClick={resetTypography}>重置当前端</button>
              <button className="button button-small" onClick={() => { onApplyTypography(draftTypography); setStatus("已应用到页面，尚未保存为默认"); }}>应用到页面</button>
              <button
                className="button button-small button-outline"
                onClick={async () => {
                  onSaveTypography(draftTypography);
                  setStatus("正在保存字体设置…");
                  await save();
                  setStatus("字体设置已应用并保存");
                }}
              >
                保存为默认
              </button>
            </div>
          ) : (
            <button className="button button-small" onClick={save}>{isOnline ? "发布内容" : "保存内容"}</button>
          )}
        </div>
      </aside>
    </>
  );
}
