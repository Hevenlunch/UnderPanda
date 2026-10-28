import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { filterWorkspaceItems, type WorkspaceItem } from "../workspaceItems";

interface Props {
  label: string;
  items: WorkspaceItem[];
  categories?: string[];
  addLabel: string;
  onAdd: () => void;
  onReorder: (fromId: string, toId: string) => void;
  renderEditor: (id: string) => ReactNode;
}
export function ContentWorkspace({label,items,categories,onAdd,addLabel,onReorder,renderEditor}:Props) {
  const [query,setQuery]=useState("");
  const [category,setCategory]=useState("");
  const [selectedId,setSelectedId]=useState<string|null>(items[0]?.id ?? null);
  const [editing,setEditing]=useState(false);
  const [dragging,setDragging]=useState<string|null>(null);
  const id=useId();
  const root=useRef<HTMLDivElement>(null);
  const list=useRef<HTMLDivElement>(null);
  const inspector=useRef<HTMLDivElement>(null);
  const listScroll=useRef(0);
  const previousIds=useRef(new Set(items.map(item=>item.id)));
  const lastIndex=useRef(0);
  const currentIndex=items.findIndex(item=>item.id===selectedId);
  if(currentIndex>=0)lastIndex.current=currentIndex;
  const selection=items.find(item=>item.id===selectedId);
  const filtered=filterWorkspaceItems(items,query,category);
  const canDrag=!query.trim() && !category;
  const drag=useRef<{id:string;x:number;y:number;moved:boolean}|null>(null);
  const reorderRef=useRef(onReorder);reorderRef.current=onReorder;
  const canDragRef=useRef(canDrag);canDragRef.current=canDrag;
  const choose=(nextId:string)=>{
    if(list.current && list.current.clientHeight>0)listScroll.current=list.current.scrollTop;
    lastIndex.current=items.findIndex(item=>item.id===nextId);
    setSelectedId(nextId);setEditing(true);
  };
  const back=()=>{
    setEditing(false);
    requestAnimationFrame(()=>{if(list.current)list.current.scrollTop=listScroll.current;root.current?.querySelector<HTMLButtonElement>(`[data-workspace-id="${selectedId}"] .workspace-select`)?.focus({preventScroll:true});});
  };
  useEffect(()=>{
    const added=items.filter(item=>!previousIds.current.has(item.id));
    previousIds.current=new Set(items.map(item=>item.id));
    if(added.length){setSelectedId(added[added.length-1].id);setEditing(true);setQuery("");setCategory("");return;}
    if(!items.some(item=>item.id===selectedId)){
      setSelectedId(items[Math.min(lastIndex.current,Math.max(0,items.length-1))]?.id ?? null);
      if(!items.length)setEditing(false);
    }
    if(category && !categories?.includes(category))setCategory("");
  },[items,selectedId,category,categories]);
  useEffect(()=>{if(inspector.current)inspector.current.scrollTop=0;},[selectedId]);
  useEffect(()=>{
    const move=(event:PointerEvent)=>{
      const current=drag.current;if(!current || !canDragRef.current)return;
      if(!current.moved && Math.hypot(event.clientX-current.x,event.clientY-current.y)<6)return;
      current.moved=true;event.preventDefault();
      const tile=document.elementFromPoint(event.clientX,event.clientY)?.closest<HTMLElement>('[data-workspace-id]');
      if(tile && root.current?.contains(tile) && tile.dataset.workspaceId && tile.dataset.workspaceId!==current.id)reorderRef.current(current.id,tile.dataset.workspaceId);
      const box=list.current?.getBoundingClientRect();
      if(box && list.current){if(event.clientY<box.top+36)list.current.scrollTop-=12;else if(event.clientY>box.bottom-36)list.current.scrollTop+=12;}
    };
    const stop=()=>{drag.current=null;setDragging(null);};
    window.addEventListener('pointermove',move,{passive:false});window.addEventListener('pointerup',stop);window.addEventListener('pointercancel',stop);
    return ()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',stop);window.removeEventListener('pointercancel',stop);};
  },[]);
  const sequence=filtered.some(item=>item.id===selectedId)?filtered:items;
  const index=sequence.findIndex(item=>item.id===selectedId);
  const adjacent=(offset:number)=>{const item=sequence[index+offset];if(item)choose(item.id);};
  return <div className="workspace-container"><div className={`content-workspace${editing?' is-editing':''}`} ref={root} aria-label={`${label}工作区`}>
    <div className="workspace-library">
      <div className="workspace-toolbar">
        <div className="workspace-heading"><h3>{label}</h3><span>{filtered.length} / {items.length}</span><button type="button" onClick={onAdd}>{addLabel}</button></div>
        <label className="workspace-search"><span className="sr-only">搜索{label}</span><input type="search" placeholder={`搜索${label}…`} value={query} onChange={e=>setQuery(e.target.value)} /></label>
        {categories && <label className="workspace-category"><span className="sr-only">筛选照片分类</span><select aria-label="筛选照片分类" value={category} onChange={e=>setCategory(e.target.value)}><option value="">所有分类</option>{categories.map(c=><option value={c} key={c}>{c}</option>)}</select></label>}
        <p className="workspace-hint">{canDrag?'点击缩略图编辑 · 拖动右上角手柄调整顺序':'当前为搜索或筛选结果 · 清除条件后可拖动排序'}</p>
      </div>
      <div className="workspace-grid-scroll" ref={list}>
        <div className="workspace-grid" role="group" aria-label={`${label}缩略图`}>
          {filtered.map(item=><div className={`workspace-item${selectedId===item.id?' is-selected':''}${dragging===item.id?' is-dragging':''}`} key={item.id} data-workspace-id={item.id}>
            <button type="button" className="workspace-select" aria-label={`编辑${label}：${item.title || '未命名'}`} aria-pressed={selectedId===item.id} aria-controls={`${id}-inspector`} onClick={()=>choose(item.id)}>
              <span className="workspace-thumbnail"><img src={item.image} alt={item.title} loading="lazy" decoding="async" draggable={false} />{item.visible===false && <span className="workspace-hidden-badge">已隐藏</span>}</span>
              <span className="workspace-item-title">{item.title || '未命名'}</span><span className="workspace-item-subtitle">{item.subtitle}</span>
            </button>
            <button type="button" className="workspace-drag" aria-label={`拖动排序：${item.title}`} disabled={!canDrag}
              onPointerDown={event=>{if(!canDrag || event.button!==0)return;event.preventDefault();drag.current={id:item.id,x:event.clientX,y:event.clientY,moved:false};setDragging(item.id);}}
              onClick={event=>event.preventDefault()}>⠿</button>
          </div>)}
        </div>
        {!filtered.length && <div className="workspace-empty" role="status"><strong>{items.length?'没有找到匹配项':'这里还没有内容'}</strong><p>{items.length?'换个关键词，或清除搜索和筛选。':`点击“${addLabel}”开始整理。`}</p>{items.length>0 && <button type="button" onClick={()=>{setQuery('');setCategory('');}}>清除搜索与筛选</button>}</div>}
      </div>
    </div>
    <div className="workspace-inspector" id={`${id}-inspector`}>
      <div className="workspace-inspector-head"><button type="button" className="workspace-back" onClick={back}>‹ 返回列表</button><strong>{selection?.title || '选择一项开始编辑'}</strong><div className="workspace-adjacent"><button type="button" aria-label="编辑上一项" disabled={index<=0} onClick={()=>adjacent(-1)}>‹</button><span>{index<0?0:index+1}/{sequence.length}</span><button type="button" aria-label="编辑下一项" disabled={index<0 || index>=sequence.length-1} onClick={()=>adjacent(1)}>›</button></div></div>
      <div className="workspace-inspector-scroll" ref={inspector} role="region" aria-label="选中内容编辑区">
        {selection ? <div key={selection.id}>{renderEditor(selection.id)}</div> : <p className="workspace-empty">从左侧选择一项，所有编辑字段会显示在这里。</p>}
      </div>
    </div>
  </div></div>;
}
