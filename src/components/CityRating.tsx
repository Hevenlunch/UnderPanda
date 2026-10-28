import {
  CITY_RATING_DIMENSIONS, getCityRatingSummary,
  getRevisitLabel, isCityScore,
} from "../cityRatings";
import type { CityRating } from "../types";

export function CityRatingBadge({ rating }: { rating?: CityRating }) {
  const { average } = getCityRatingSummary(rating);
  if (rating?.enabled !== true || average === null) return null;
  return (
    <span className="city-rating-badge" aria-label={`个人综合评分 ${average.toFixed(2)} 分，满分 10 分`}>
      <span>{average.toFixed(2)}</span><span className="city-rating-badge-unit"> / 10</span>
    </span>
  );
}

export function CityRatingPanel({ rating }: { rating?: CityRating }) {
  if (rating?.enabled !== true) return null;
  const { average, completed, total } = getCityRatingSummary(rating);
  const revisit = getRevisitLabel(rating.revisit);

  return (
    <section className="city-rating" aria-label="我的城市印象">
      <div className="city-rating-heading">
        <div>
          <h3 className="eyebrow">MY CITY IMPRESSIONS / 我的城市印象</h3>
        </div>
        {revisit && <span className="city-revisit"><span>再访意愿</span>{revisit}</span>}
      </div>
      <div className="city-rating-overview" aria-live="polite" aria-atomic="true">
        {average !== null ? (
          <>
            <p className="city-rating-total"><span>{average.toFixed(2)}</span><span> / 10</span></p>

          </>
        ) : (
          <>
            <p className="city-rating-pending">评分整理中</p>
            <p className="city-rating-meta">已完成 {completed}/{total} 项 · 填满后显示综合分</p>
          </>
        )}
      <p className="city-rating-disclaimer">评分来自我的亲身经历与主观感受，仅代表我眼中的这座城市。</p>
      </div>
      <details className="city-rating-details">
        <summary>
          <span className="city-rating-expand">展开十项评分</span>
          <span className="city-rating-collapse">收起十项评分</span>
          <span className="city-rating-chevron" aria-hidden="true">⌄</span>
        </summary>
        <div className="city-rating-grid">
          {CITY_RATING_DIMENSIONS.map(({ key, label, description }) => {
            const score = rating.scores?.[key];
            const scored = isCityScore(score);
            const reason = rating.reasons?.[key]?.trim();
            return (
              <div className="city-rating-item" key={key}>
                <div className="city-rating-item-heading">
                  <span>{label}</span>
                  <span className="city-rating-value">{scored ? score.toFixed(1) : "未评分"}</span>
                </div>
                <div className="city-rating-track" role={scored ? "meter" : undefined} aria-label={label}
                  aria-valuemin={0} aria-valuemax={10}
                  aria-valuenow={scored ? score : undefined}
                  aria-valuetext={scored ? `${score.toFixed(1)} 分，满分 10 分` : "未评分"}>
                  <span style={{ width: `${scored ? score * 10 : 0}%` }} />
                </div>
                {reason ? <p className="city-rating-reason">{reason}</p> : <span className="sr-only">{description}</span>}
              </div>
            );
          })}
        </div>
      </details>
    </section>
  );
}
