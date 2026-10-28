import { useEffect, useRef, useState } from "react";
import type { SiteContent } from "../types";
import { STYLE_PROPERTIES, STYLE_TARGETS, type StyleNumberKey, type StyleTarget, type VisualProperty } from "../visualSettings";

const propertyLabels: Record<string,string> = { pageText:"页面文案",profile:"个人资料",about:"关于我",work:"我在做什么",contact:"联系",navigation:"导航",actions:"按钮",hero:"首页",photography:"摄影",hobbies:"爱好",travel:"旅行",footer:"页脚",mobileMenu:"手机菜单",name:"名字",englishName:"英文名",title:"标题",heading:"标题",kicker:"小标签",eyebrow:"小标签",intro:"介绍",note:"简介",text:"正文",lead:"开头介绍",paragraphs:"正文段落",summary:"简介",detail:"详情",date:"日期标签",location:"所在地",tagline:"签名",label:"标签",value:"显示内容",href:"链接",browserTitle:"浏览器标题",drawerKicker:"详情小标签",current:"最近在做什么",traits:"性格",links:"联系链接",all:"全部分类",viewPhotos:"查看照片按钮",meetMe:"认识我按钮",cityAction:"查看城市记录按钮",hobbyAction:"展开爱好按钮",photoAction:"查看大图按钮",backToTop:"返回顶部",meta:"底部介绍",imageLabel:"照片标签",scroll:"滚动提示",emptyTitle:"空状态标题",emptyNote:"空状态说明",lightboxLabel:"大图标签",home:"首页" };
function textFields(content: SiteContent) {
  const result: {path:string[];label:string;value:string}[]=[];
  const walk=(value:unknown,path:string[],label:string)=>{
    if(typeof value === "string") { result.push({path,label,value}); return; }
    if(value && typeof value === "object") Object.entries(value).forEach(([key,item])=>{
      if(/image|avatar|password|photos|position/i.test(key))return;
      walk(item,[...path,key],`${label} · ${propertyLabels[key] ?? (/^\d+$/.test(key) ? `第 ${Number(key)+1} 项` : key)}`);
    });
  };
  for(const key of ["pageText","profile","about","work","contact"] as const)walk(content[key],[key],propertyLabels[key]);
  for(const kind of ["cities","hobbies"] as const)content[kind].forEach((item,index)=>{
    const title="name" in item ? item.name : item.title;
    for(const key of ["name","title","date","note","summary","detail","paragraphs"]) {
      const val=(item as unknown as Record<string,unknown>)[key];
      if(val!==undefined)walk(val,[kind,String(index),key],`${kind==="cities"?"城市":"爱好"} · ${title} · ${propertyLabels[key]}`);
    }
  });
  return result;
}
const routeFields = [
  ["rowHeight","路线每行高度",35,220], ["cityFontSize","路线城市名称字号",8,40],
  ["cityPaddingX","城市名称左右留白",0,40], ["cityPaddingY","城市名称上下留白",0,30],
  ["dotSize","路线圆点大小",5,60], ["innerDotSize","圆点中心大小",1,40],
  ["lineWidth","路线线条粗细",1,10], ["dashLength","路线虚线长度",1,30], ["dashGap","路线虚线间隔",1,30],
] as const;
export function VisualSettings({content,onChange}: {content:SiteContent;onChange:(content:SiteContent)=>void}) {
  const [query,setQuery]=useState("");
  const [mode,setMode]=useState<"desktop"|"mobile">("desktop");
  const [kind,setKind]=useState("styles");
  const [propertyGroup,setPropertyGroup]=useState("text");
  const history=useRef<SiteContent[]>([]);
  const [undoCount,setUndoCount]=useState(0);
  const commit=(next:SiteContent)=>{history.current=[...history.current.slice(-19),content];setUndoCount(history.current.length);onChange(next);};
  const undo=()=>{const previous=history.current.pop();if(previous)onChange(previous);setUndoCount(history.current.length);};
  const [selected,setSelected]=useState("");
  const [picked,setPicked]=useState<StyleTarget[]>([]);
  const [picking,setPicking]=useState(false);
  const [notice,setNotice]=useState("");
  const [highlight,setHighlight]=useState<{left:number;top:number;width:number;height:number}|null>(null);
  const [revision,setRevision]=useState(0);
  useEffect(()=>{setRevision(v=>v+1);},[selected,mode,content.visualStyles]);
  const panelRef=useRef<HTMLDivElement>(null);
  const saved=Object.values(content.visualStyles ?? {}).flatMap(items=>Object.entries(items ?? {}).map(([selector,rule])=>({selector,label:rule.label,aliases:"已修改 自定义 点选"})));
  const targets=[...STYLE_TARGETS,...picked,...saved].filter((v,i,arr)=>arr.findIndex(x=>x.selector===v.selector)===i);
  const active=targets.find(t=>t.selector===selected) ?? STYLE_TARGETS[0];
  const words=query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const compact=(s:string)=>s.toLowerCase().replace(/[\s·/（）()，、]+/g, "");
  const matches=(s:string)=>words.every(w=>compact(s).includes(compact(w)));
  const filtered=targets.filter(t=>matches(`${t.label} ${t.aliases} ${content.visualStyles?.[mode]?.[t.selector] ? "已修改" : ""} 字体 大小 字号 颜色 行高 间距 留白 圆角`));
  useEffect(()=>{
    if(query.trim() && filtered.length && !filtered.some(t=>t.selector===selected))setSelected(filtered[0].selector);
  },[query,selected]);
  const texts=textFields(content).filter(t=>matches(`${t.label} ${t.value}`));
  const current=content.visualStyles?.[mode]?.[active.selector]?.values ?? {};
  const setProperty=(key:VisualProperty,value?:string)=>{
    const styles=structuredClone(content.visualStyles ?? {});
    const entries=styles[mode] ?? {};
    const values={...entries[active.selector]?.values};
    if(value===undefined)delete values[key];else values[key]=value;
    if(Object.keys(values).length)entries[active.selector]={label:active.label,values};else delete entries[active.selector];
    styles[mode]=entries;
    commit({...content,visualStyles:styles});
  };
  const reset=()=>{
    const styles=structuredClone(content.visualStyles ?? {});
    if(styles[mode])delete styles[mode]![active.selector];
    commit({...content,visualStyles:styles});setRevision(v=>v+1);
  };
  const computed=(()=>{try { const el=document.querySelector(active.selector); return el ? getComputedStyle(el) : null; }catch{return null;}})();
  const computedNumber=(key:StyleNumberKey)=>{
    const spec=STYLE_PROPERTIES[key];
    const raw=current[key] ?? computed?.[key] ?? "";
    let n=parseFloat(raw);
    if(key==="lineHeight" && !current[key] && raw.endsWith("px"))n/=parseFloat(computed?.fontSize ?? "16");
    return Number.isFinite(n)?Math.min(spec.max,Math.max(spec.min,n)):spec.fallback;
  };
  useEffect(()=>{
    if(!picking)return;
    const getTarget=(event:Event)=>event.target instanceof Element ? event.target : null;
    const move=(event:PointerEvent)=>{
      const el=getTarget(event);
      if(!el?.closest('.site') || el.closest('.dev-editor, .dev-trigger')){setHighlight(null);return;}
      const r=el.getBoundingClientRect();setHighlight({left:r.left,top:r.top,width:r.width,height:r.height});
    };
    const click=(event:MouseEvent)=>{
      const el=getTarget(event);
      if(!el?.closest('.site') || el.closest('.dev-editor, .dev-trigger'))return;
      event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
      const known=STYLE_TARGETS.filter(t=>{try{return el.matches(t.selector);}catch{return false;}}).sort((a,b)=>b.selector.length-a.selector.length)[0];
      let choice=known;
      if(!choice){
        const parts:string[]=[];let node:Element|null=el;
        while(node && !node.classList.contains('site') && parts.length<7){
          if(node.id && /^[a-zA-Z][\w-]*$/.test(node.id)){parts.unshift(`#${node.id}`);break;}
          const classes=[...node.classList].filter(c=>/^[a-zA-Z][\w-]*$/.test(c) && !/^(is-|active|motion)/.test(c));
          parts.unshift(node.tagName.toLowerCase()+classes.map(c=>`.${c}`).join(''));
          node=node.parentElement;
        }
        choice={label:`点选 · ${(el.textContent?.trim().replace(/\s+/g,' ').slice(0,24) || el.getAttribute('alt') || '页面区域')}`,selector:`.site ${parts.join(' > ')}`,aliases:'点选 自定义'};
      }
      setPicked(items=>[...items,choice]);setSelected(choice.selector);setQuery('');setKind('styles');setPicking(false);setHighlight(null);setNotice('已选中。修改会作用于同类元素；每项都可以恢复原样。');setRevision(v=>v+1);
    };
    const key=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();setPicking(false);setHighlight(null);}};
    document.addEventListener('pointermove',move,true);document.addEventListener('click',click,true);document.addEventListener('keydown',key,true);
    return ()=>{document.removeEventListener('pointermove',move,true);document.removeEventListener('click',click,true);document.removeEventListener('keydown',key,true);};
  },[picking]);
  const updateText=(path:string[],value:string)=>{
    const next=structuredClone(content);let obj=next as unknown as Record<string,unknown>;
    for(const part of path.slice(0,-1))obj=obj[part] as Record<string,unknown>;
    obj[path[path.length-1]]=value;commit(next);
  };
  return <div className="visual-settings" ref={panelRef} data-revision={revision}>
    <p className="dev-note">搜索名称，或直接点选网页上的元素。修改即时预览，保存后保留。</p>
    <label className="dev-field"><span>搜索设置或文字</span><input type="search" placeholder="例如：评分小标签、详情正文、照片间距" value={query} onChange={e=>setQuery(e.target.value)} /></label>
    <div className="visual-settings-tools"><button type="button" aria-pressed={picking} onClick={()=>{setPicking(v=>!v);setHighlight(null);}}>{picking?'取消点选（Esc）':'点选页面元素'}</button><select aria-label="设置分类" value={kind} onChange={e=>setKind(e.target.value)}><option value="styles">外观样式</option><option value="text">文字内容</option><option value="route">旅行路线</option></select><button type="button" disabled={!undoCount} onClick={undo}>撤销上一步</button></div>
    {query.trim() && <div className="visual-settings-modes" role="group" aria-label="搜索结果分类"><button type="button" aria-pressed={kind==='styles'} onClick={()=>setKind('styles')}>外观 {filtered.length}</button><button type="button" aria-pressed={kind==='text'} onClick={()=>setKind('text')}>文字 {texts.length}</button><button type="button" aria-pressed={kind==='route'} onClick={()=>setKind('route')}>路线 {routeFields.filter(([,label])=>matches(label)).length}</button></div>}
    {picking && <p className="visual-settings-notice" role="status">请点击网页里的文字或区域。点选期间不会触发该元素原本的操作，按 Esc 可退出。</p>}
    {notice && <p className="dev-note" role="status">{notice}</p>}
    {kind==='styles' && <>
      <div className="visual-settings-modes" role="group" aria-label="外观编辑范围">{(['desktop','mobile'] as const).map(m=><button type="button" key={m} aria-pressed={mode===m} onClick={()=>setMode(m)}>{m==='desktop'?'电脑端':'手机端'}</button>)}</div>
      <p className="dev-note">电脑与手机独立设置；切换编辑范围不会改变预览窗口宽度。</p>
      <label className="dev-field"><span>找到 {filtered.length} 个可调整区域</span><select aria-label="选择调整区域" value={filtered.some(t=>t.selector===selected)?selected:''} onChange={e=>{setSelected(e.target.value);setRevision(v=>v+1);}}><option value="" disabled>请选择匹配区域</option>{filtered.map(t=><option key={t.selector} value={t.selector}>{t.label}</option>)}</select></label>
      {!selected && <p className="dev-note">先从上方选择区域，或点选网页上的元素，再调整文字与布局。</p>}
      {filtered.length===0 && <p className="dev-note">没有找到这个名称。试试更短的关键词，或用“点选页面元素”直接选中它。</p>}
      {filtered.length>0 && selected && <>
      <div className="visual-settings-active"><span>同类元素统一调整</span><button type="button" onClick={reset}>此区域恢复原样</button></div>

      <div className="visual-settings-modes" role="group" aria-label="调整项目分类"><button type="button" aria-pressed={propertyGroup==='text'} onClick={()=>setPropertyGroup('text')}>文字样式</button><button type="button" aria-pressed={propertyGroup==='layout'} onClick={()=>setPropertyGroup('layout')}>布局与留白</button></div>
      {Object.entries(STYLE_PROPERTIES).filter(([key])=>propertyGroup==='text' ? ['fontSize','lineHeight','letterSpacing'].includes(key) : !['fontSize','lineHeight','letterSpacing'].includes(key)).map(([key,spec])=>{
        const property=key as StyleNumberKey;const value=computedNumber(property);
        return <div className="visual-setting-field" key={key}>
          <div className="visual-setting-label"><span>{spec.label}</span><span>{current[property] ? `${parseFloat(current[property]!)} ${spec.unit}` : '跟随原样'}<button type="button" aria-label={`恢复${spec.label}`} disabled={!current[property]} onClick={()=>setProperty(property)}>恢复</button></span></div>
          <div className="visual-setting-inputs"><input type="range" aria-label={`${active.label}${spec.label}`} min={spec.min} max={spec.max} step={spec.step} value={value} onChange={e=>setProperty(property,e.target.value+(property==='lineHeight'?'':'px'))} /><input type="number" aria-label={`${active.label}${spec.label}数值`} min={spec.min} max={spec.max} step={spec.step} value={Number(value.toFixed(2))} onChange={e=>{const n=e.target.valueAsNumber;if(Number.isFinite(n)&&n>=spec.min&&n<=spec.max)setProperty(property,String(n)+(property==='lineHeight'?'':'px'));}} /></div>
        </div>;
      })}
      {propertyGroup==='text' && <label className="dev-field"><span>字体粗细</span><select value={current.fontWeight ?? ''} onChange={e=>setProperty('fontWeight',e.target.value||undefined)}><option value="">跟随原样</option>{['400','500','600','700','800'].map((v,i)=><option value={v} key={v}>{['正常','适中','稍粗','加粗','很粗'][i]}</option>)}</select></label>}
      {(['color','backgroundColor'] as const).filter(key=>propertyGroup==='text'?key==='color':key==='backgroundColor').map(key=><div className="visual-setting-color" key={key}><label>{key==='color'?'文字颜色':'背景颜色'}<input type="color" aria-label={`${active.label}${key==='color'?'文字颜色':'背景颜色'}`} value={current[key] ?? '#3f8290'} onChange={e=>setProperty(key,e.target.value)} /></label><span>{current[key] ?? '跟随原样'}</span><button type="button" disabled={!current[key]} onClick={()=>setProperty(key)}>恢复</button></div>)}
      {propertyGroup==='text' && <>
      <label className="dev-field"><span>文字对齐</span><select value={current.textAlign ?? ''} onChange={e=>setProperty('textAlign',e.target.value||undefined)}><option value="">跟随原样</option><option value="left">左对齐</option><option value="center">居中</option><option value="right">右对齐</option><option value="justify">两端对齐</option></select></label>
      <label className="dev-field"><span>字体类型</span><select value={current.fontFamily ?? ''} onChange={e=>setProperty('fontFamily',e.target.value||undefined)}><option value="">跟随原样</option><option value="serif">宋体 / 衬线</option><option value="sans-serif">黑体 / 无衬线</option><option value="system-ui">系统字体</option><option value="KaiTi, serif">楷体</option></select></label>
      </>}
      </>}
      <details className="visual-settings-directory"><summary>查看全部区域，或按名称选择</summary>{filtered.map(t=><button type="button" key={t.selector} onClick={()=>{setSelected(t.selector);panelRef.current?.scrollIntoView({block:'start',behavior:'smooth'});}}>{t.label}</button>)}</details>
    </>}
    {kind==='route' && <>
      <div className="visual-settings-modes" role="group" aria-label="路线编辑范围">{(['desktop','mobile'] as const).map(m=><button type="button" key={m} aria-pressed={mode===m} onClick={()=>setMode(m)}>{m==='desktop'?'电脑端':'手机端'}</button>)}</div>
      {routeFields.filter(([,label])=>matches(label)).map(([key,label,min,max])=><label className="dev-range" key={key}><span>{label} <b>{content.travelRouteStyle[mode][key]} px</b></span><input type="range" min={min} max={max} step="1" value={content.travelRouteStyle[mode][key]} onChange={e=>commit({...content,travelRouteStyle:{...content.travelRouteStyle,[mode]:{...content.travelRouteStyle[mode],[key]:Number(e.target.value)}}})} /></label>)}
    </>}
    {kind==='text' && <><p className="dev-note">共找到 {texts.length} 项文字。图片上传、评分和排序继续使用对应管理页。</p>{texts.map(t=><label className="dev-field" key={t.path.join('.')}><span>{t.label}</span><textarea value={t.value} onChange={e=>updateText(t.path,e.target.value)} /></label>)}</>}
    {highlight && <div className="visual-settings-highlight" style={{position:'fixed',...highlight}} aria-hidden="true" />}
  </div>;
}
