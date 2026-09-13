interface SiteOpeningProps {
  name: string;
  englishName: string;
}

export function SiteOpening({ name, englishName }: SiteOpeningProps) {
  return (
    <div className="site-opening" aria-hidden="true">
      <div className="site-opening__curtain" />
      <div className="site-opening__inner">
        <span className="site-opening__index">PORTFOLIO / {new Date().getFullYear()}</span>
        <div className="site-opening__name-mask">
          <strong className="site-opening__name">{englishName}</strong>
        </div>
        <span className="site-opening__rule" />
        <span className="site-opening__cn">{name}</span>
      </div>
    </div>
  );
}