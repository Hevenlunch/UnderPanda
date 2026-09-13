import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { gsap } from "../motion/gsap";
import type { CityItem, TravelRouteStyle } from "../types";

interface TravelRouteProps {
  cities: CityItem[];
  onOpen: (city: CityItem) => void;
  routeStyle: TravelRouteStyle;
}

interface RoutePoint {
  x: number;
  y: number;
}

function buildPath(points: RoutePoint[], columns: number, width: number) {
  if (points.length < 2) return "";

  let path = "";
  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const sameRow = Math.floor(index / columns) === Math.floor((index + 1) / columns);

    if (sameRow) {
      const middleX = (current.x + next.x) / 2;
      path += `M ${current.x} ${current.y} C ${middleX} ${current.y}, ${middleX} ${next.y}, ${next.x} ${next.y} `;
      continue;
    }

    const direction = current.x > width / 2 ? 1 : -1;
    const radius = Math.max(18, Math.abs(next.y - current.y) / 2);
    const sweep = direction > 0 ? 1 : 0;
    path += `M ${current.x} ${current.y} A ${radius} ${radius} 0 0 ${sweep} ${next.x} ${next.y} `;
  }
  return path.trim();
}

export function TravelRoute({ cities, onOpen, routeStyle }: TravelRouteProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const drawPathRef = useRef<SVGPathElement>(null);
  const visiblePathRef = useRef<SVGPathElement>(null);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [points, setPoints] = useState<RoutePoint[]>([]);

  const baseColumns = width < 520 ? 3 : 4;
  const columns = Math.max(1, Math.min(baseColumns, cities.length || 1));
  const activeStyle = width < 760 ? routeStyle.mobile : routeStyle.desktop;
  const rowHeight = activeStyle.rowHeight;
  const rows = Math.max(1, Math.ceil(cities.length / columns));
  const cssVariables = {
    "--route-city-font-size": `${activeStyle.cityFontSize}px`,
    "--route-city-padding-x": `${activeStyle.cityPaddingX}px`,
    "--route-city-padding-y": `${activeStyle.cityPaddingY}px`,
    "--route-dot-size": `${activeStyle.dotSize}px`,
    "--route-inner-dot-size": `${activeStyle.innerDotSize}px`,
    "--route-line-width": `${activeStyle.lineWidth}px`,
    "--route-dash": `${activeStyle.dashLength} ${activeStyle.dashGap}`,
  } as CSSProperties;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measure = () => {
      const containerRect = container.getBoundingClientRect();
      setWidth(Math.round(containerRect.width));
      setHeight(Math.round(containerRect.height));
      setPoints(
        nodeRefs.current.slice(0, cities.length).map((node) => {
          const dot = node?.querySelector<HTMLElement>(".route-dot");
          if (!node || !dot) return { x: 0, y: 0 };
          const dotRect = dot.getBoundingClientRect();
          return {
            x: dotRect.left - containerRect.left + dotRect.width / 2,
            y: dotRect.top - containerRect.top + dotRect.height / 2,
          };
        }),
      );
    };

    const frame = window.requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    window.addEventListener("resize", measure);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [cities.length, columns]);

  const path = useMemo(
    () => buildPath(points, columns, width),
    [columns, points, width],
  );

  useLayoutEffect(() => {
    const container = containerRef.current;
    const drawPath = drawPathRef.current;
    const visiblePath = visiblePathRef.current;
    if (!container || !drawPath || !visiblePath || !path) return;

    const nodes = nodeRefs.current
      .slice(0, cities.length)
      .filter((node): node is HTMLButtonElement => node !== null);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set(visiblePath, { opacity: 1 });
      gsap.set(drawPath, { opacity: 0 });
      return;
    }

    const length = drawPath.getTotalLength();
    if (!Number.isFinite(length) || length <= 0) return;

    const context = gsap.context(() => {
      gsap.set(visiblePath, { opacity: 0 });
      gsap.set(drawPath, { opacity: 1 });
      gsap.set(drawPath, {
        strokeDasharray: length,
        strokeDashoffset: length,
      });

      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: "top 80%",
          once: true,
        },
      });

      timeline
        .to(drawPath, {
          strokeDashoffset: 0,
          duration: 1.45,
          ease: "power2.inOut",
        })
        .set(visiblePath, { opacity: 1 })
        .set(drawPath, { opacity: 0 });

      if (nodes.length > 0) {
        timeline.fromTo(
          nodes,
          {
            scale: 0.86,
            scaleY: 0.84,
            y: 18,
            transformOrigin: "50% 100%",
          },
          {
            scale: 1,
            scaleY: 1,
            y: 0,
            duration: 0.78,
            ease: "power3.out",
            stagger: 0.09,
          },
          0.34,
        );
      }
    }, container);

    return () => context.revert();
  }, [cities.length, path]);

  return (
    <div className="route-line travel-route" ref={containerRef} style={cssVariables}>
      <svg
        className="route-svg"
        viewBox={`0 0 ${Math.max(width, 1)} ${Math.max(height, 1)}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path className="route-path-shadow" d={path} />
        <path ref={drawPathRef} className="route-draw-path" d={path} />
        <path ref={visiblePathRef} className="route-path" d={path} />
      </svg>
      <div
        className="route-grid"
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, ${rowHeight}px)`,
        }}
      >
        {cities.map((city, index) => {
          const row = Math.floor(index / columns);
          const positionInRow = index % columns;
          const column = row % 2 === 0 ? positionInRow + 1 : columns - positionInRow;
          return (
            <button
              className="route-node"
              key={city.id}
              ref={(node) => {
                nodeRefs.current[index] = node;
              }}
              style={{ gridColumn: column, gridRow: row + 1 }}
              onClick={() => onOpen(city)}
              aria-label={`查看城市记录：${city.name}`}
            >
              <span className="route-city-name">{city.name}</span>
              <i className="route-dot" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
