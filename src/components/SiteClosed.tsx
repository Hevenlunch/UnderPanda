export function SiteClosed() {
  return (
    <main className="closed-site">
      <div className="closed-site__grain" aria-hidden="true" />

      <section className="closed-site__panel">
        <div className="closed-site__copy">
          <span className="closed-site__brand">UNDER PANDA</span>
          <p className="closed-site__eyebrow">TEMPORARILY CLOSED</p>
          <h1>
            抱歉，
            <br />
            <strong>什么都没有哦</strong>
          </h1>
          <p className="closed-site__note">
            网站暂时收起了一段风景。
            <br />
            等它重新开放，再来看看吧。
          </p>
          <div className="closed-site__status">
            <i />
            <span>OFFLINE / SEE YOU SOON</span>
          </div>
        </div>

        <div className="closed-site__visual" aria-hidden="true">
          <span className="closed-site__orbit closed-site__orbit--large" />
          <span className="closed-site__orbit closed-site__orbit--small" />
          <div className="closed-site__frame">
            <span className="closed-site__sun" />
            <span className="closed-site__horizon" />
            <span className="closed-site__lens" />
            <small>NO SIGNAL</small>
          </div>
        </div>
      </section>

      <footer className="closed-site__footer">
        <span>PHOTO / TRAVEL / LIFE</span>
        <i />
        <small>BACK LATER</small>
      </footer>
    </main>
  );
}