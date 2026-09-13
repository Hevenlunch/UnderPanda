import { useEffect, useMemo, useState } from "react";
import type { SiteContent } from "../types";

interface HeaderProps {
  content: SiteContent;
}

export function Header({ content }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeId, setActiveId] = useState("home");
  const [scrolled, setScrolled] = useState(false);
  const navigation = content.pageText.navigation;
  const navItems = useMemo(
    () => [
      { id: "home", label: navigation.home },
      { id: "about", label: navigation.about },
      { id: "photography", label: navigation.photography },
      { id: "hobbies", label: navigation.hobbies },
      { id: "travel", label: navigation.travel },
      { id: "contact", label: navigation.contact },
    ],
    [navigation],
  );

  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;
      setScrolled(window.scrollY > 24);
      const marker = window.scrollY + window.innerHeight * 0.32;
      let current = "home";
      for (const item of navItems) {
        const element = document.getElementById(item.id);
        if (element && element.offsetTop <= marker) current = item.id;
      }
      setActiveId(current);
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, [navItems]);

  useEffect(() => {
    document.body.classList.toggle("menu-open", menuOpen);
    return () => document.body.classList.remove("menu-open");
  }, [menuOpen]);

  const goTo = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <header className={`site-header ${scrolled ? "is-scrolled" : ""}`}>
        <div className="nav-shell">
          <button className="brand" onClick={() => goTo("home")} aria-label="回到首页">
            <span className="brand-mark">{content.profile.name.slice(0, 1)}</span>
            <span className="brand-copy">
              <strong>{content.profile.name}</strong>
              <small>{content.profile.englishName}</small>
            </span>
          </button>

          <nav className="desktop-nav" aria-label="主导航">
            {navItems.map((item) => (
              <button
                key={item.id}
                className={activeId === item.id ? "active" : ""}
                onClick={() => goTo(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="nav-actions">
            <span className="nav-status">
              <i />
              {content.profile.location}
            </span>
            <button
              className={`menu-toggle ${menuOpen ? "is-open" : ""}`}
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "关闭菜单" : "打开菜单"}
            >
              <span />
              <span />
            </button>
          </div>
        </div>
      </header>

      <div className={`mobile-menu ${menuOpen ? "is-open" : ""}`} aria-hidden={!menuOpen}>
        <div className="mobile-menu-panel">
          <p className="mobile-menu-kicker">{content.pageText.mobileMenu.kicker}</p>
          <h2>{content.profile.title}</h2>
          <div className="mobile-nav-list">
            {navItems.map((item, index) => (
              <button key={item.id} onClick={() => goTo(item.id)}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {item.label}
              </button>
            ))}
          </div>
          <p className="mobile-menu-note">{content.profile.intro}</p>
        </div>
      </div>
    </>
  );
}
