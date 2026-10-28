import { useState } from "react";
import {
  CITY_RATING_DIMENSIONS, getCityRatingSummary, isCityScore, REVISIT_OPTIONS,
} from "../cityRatings";
import type { CityRating, CityRatingKey, RevisitIntention } from "../types";
import { CityRatingPanel } from "./CityRating";

interface CityRatingEditorProps {
  cityName: string;
  rating?: CityRating;
  onChange: (rating: CityRating) => void;
}

function ScoreInput({ label, value, onChange }: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <div className="city-score-control city-score-slider">
      <input type="range" min="0" max="10" step="0.5"
        aria-label={`${label}分数`} aria-valuetext={value === null ? "未评分，滑动后评分" : `${value.toFixed(1)} 分`}
        value={value ?? 0}
        style={{ "--score-fill": `${(value ?? 0) * 10}%` } as import("react").CSSProperties}
        onChange={(event) => onChange(event.target.valueAsNumber)}
        onPointerDown={() => { if (value === null) onChange(0); }}
        onKeyDown={(event) => { if (value === null && ["ArrowLeft", "ArrowDown", "Home"].includes(event.key)) onChange(0); }} />
      <output className="city-score-output" aria-live="polite">{value === null ? "未评分" : value.toFixed(1)}</output>
      <button type="button" className="city-score-clear" aria-label={`清空${label}分数`}
        disabled={value === null} onClick={() => onChange(null)}>清空</button>
    </div>
  );
}

export function CityRatingEditor({ cityName, rating, onChange }: CityRatingEditorProps) {
  const [preview, setPreview] = useState(false);
  const current: CityRating = rating ?? { enabled: false, scores: {} };
  const { average, completed, total } = getCityRatingSummary(current);
  const update = (patch: Partial<CityRating>) => {
    onChange({ ...current, ...patch, updatedAt: new Date().toISOString() });
  };
  const updateScore = (key: CityRatingKey, value: number | null) => {
    update({ scores: { ...current.scores, [key]: value } });
  };

  return (
    <details className="dev-hobby-subsection city-rating-editor" aria-label={`${cityName}城市评分设置`}>
      <summary className="city-rating-editor-toggle">
        <span>城市评分与再访意愿</span>
        <span>{current.enabled ? `${completed}/${total} 项` : "未启用"}<span aria-hidden="true"> ⌄</span></span>
      </summary>
      <div className="city-rating-editor-content">
      <label className="dev-toggle-row">
        <input type="checkbox" checked={current.enabled === true}
          onChange={(event) => update({ enabled: event.target.checked })} />
        <span><strong>显示城市评分</strong><small>关闭时保留已填内容，前台隐藏评分和再访意愿。</small></span>
      </label>
      <p className="dev-note city-rating-editor-note">每项 0～10 分，间隔 0.5；分数越高体验越好。未体验可留空，0 分表示实际评价。十项填满后生成综合分。</p>
      <p className="dev-note">评分参考：6 普通 · 7 不错 · 8 优秀 · 9 惊艳 · 10 极其难忘</p>
      <div className="city-rating-editor-fields">
        {CITY_RATING_DIMENSIONS.map(({ key, label, description }) => {
          const score = current.scores?.[key];
          return (
            <div className="city-rating-editor-field" key={key}>
              <div className="city-rating-editor-label"><span>{label}</span><small>{description}</small></div>
              <ScoreInput label={label} value={isCityScore(score) ? score : null}
                onChange={(value) => updateScore(key, value)} />
              <label className="dev-field city-rating-reason-field">
                <span>{label}的评分理由（可选）</span>
                <textarea rows={2} value={current.reasons?.[key] ?? ""}
                  placeholder="为什么给这个分数？留下当时的感受。"
                  onChange={(event) => update({ reasons: { ...current.reasons, [key]: event.target.value } })} />
              </label>
            </div>
          );
        })}
      </div>
      <label className="dev-field">
        <span>再访意愿（可选，不计入总分）</span>
        <select value={current.revisit ?? ""}
          onChange={(event) => update({ revisit: event.target.value as RevisitIntention | "" })}>
          <option value="">暂不填写</option>
          {REVISIT_OPTIONS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <div className="city-rating-editor-summary" aria-live="polite" aria-atomic="true">
        <span>已完成 {completed}/{total} 项</span>
        <strong>{average !== null ? `综合评分 ${average.toFixed(2)} / 10` : "填满十项后生成综合分"}</strong>
      </div>
      <div className="dev-photo-actions">
        <button type="button" aria-expanded={preview} onClick={() => setPreview((value) => !value)}>
          {preview ? "收起评分预览" : "预览评分效果"}
        </button>
      </div>
      {preview && (
        <div className="city-rating-editor-preview">
          {!current.enabled && <p className="dev-note">当前评分已关闭，以下仅供预览，前台暂不显示。</p>}
          <CityRatingPanel rating={{ ...current, enabled: true }} />
        </div>
      )}
      <p className="dev-note city-rating-editor-note">一句话城市印象沿用上方简介。修改会实时预览，点击编辑器底部的“保存内容”或“发布内容”后保存。</p>
      </div>
    </details>
  );
}
