import { useEffect, useState } from "react";
import {
  cachedStats,
  formatViews,
  hasSubmittedRating,
  loadCommunityStats,
  submitCommunityRating,
  type CommunityStatsData,
} from "../communityStats";

interface CommunityStatsProps {
  visible: boolean;
}

const emptyStats: CommunityStatsData = {
  views: 0,
  ratingCount: 0,
  average: null,
};

export function CommunityStats({ visible }: CommunityStatsProps) {
  const [stats, setStats] = useState<CommunityStatsData>(() => cachedStats() ?? emptyStats);
  const [statsLoaded, setStatsLoaded] = useState(() => cachedStats() !== null);
  const [selected, setSelected] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(() => hasSubmittedRating());
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    let active = true;
    loadCommunityStats()
      .then((next) => {
        if (!active) return;
        setStats(next);
        setStatsLoaded(true);
      })
      .catch(() => {
        if (!active) return;
        setStatsLoaded(cachedStats() !== null);
      });
    return () => {
      active = false;
    };
  }, []);

  const submit = async () => {
    if (selected === null || confirmed || submitting) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const next = await submitCommunityRating(selected);
      setStats(next);
      setConfirmed(true);
    } catch {
      setSubmitError("评分暂时失败，请稍后再试");
    } finally {
      setSubmitting(false);
    }
  };

  if (!visible) return null;

  return (
    <div className={`community-stats section-shell${confirmed ? " is-confirmed" : ""}`}>
      <div className="community-views">
        <small>VISITS</small>
        <strong>{statsLoaded ? formatViews(stats.views) : "--"}</strong>
        <span>浏览量</span>
      </div>

      <i className="community-divider" aria-hidden="true" />

      <div className="community-rating" aria-live="polite">
        <div className="community-rating-copy">
          <small>COMMUNITY SCORE</small>
          <span>给网站打个分</span>
        </div>

        {confirmed ? (
          <strong className="community-average">
            平均评分：{stats.average !== null ? stats.average.toFixed(1) : "--"}
          </strong>
        ) : (
          <>
            <div className="community-stars" role="radiogroup" aria-label="网站评分">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={selected !== null && value <= selected ? "is-active" : ""}
                  aria-label={`${value} 星`}
                  aria-checked={selected === value}
                  role="radio"
                  onClick={() => setSelected(value)}
                >
                  ★
                </button>
              ))}
            </div>
            <button
              type="button"
              className="community-confirm"
              disabled={selected === null || submitting}
              onClick={submit}
            >
              {submitting ? "提交中…" : "确定"}
            </button>
            {submitError && <small className="community-error">{submitError}</small>}
          </>
        )}
      </div>
    </div>
  );
}