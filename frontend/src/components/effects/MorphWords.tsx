import { useId } from "react";

export interface MorphPhrase {
  lead: string;
  emphasis: string;
}

export interface MorphWordsProps {
  words?: string[];
  phrases?: MorphPhrase[];
  intervalMs?: number;
  className?: string;
}

export function MorphWords({ words, phrases, intervalMs = 2800, className }: MorphWordsProps) {
  const uid = useId().replace(/:/g, "");

  if (phrases && phrases.length > 0) {
    const total = (intervalMs / 1000) * phrases.length;
    return (
      <span
        className={className}
        style={{
          position: "relative",
          display: "block",
          minHeight: "1.4em",
          width: "100%",
          textAlign: "center",
        }}
      >
        {phrases.map((p, i) => (
          <span
            key={`${uid}-p-${i}`}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              transformOrigin: "50% 50%",
              width: "max-content",
              maxWidth: "90vw",
              opacity: 0,
              animationName: "eq-morph-word",
              animationDuration: `${total}s`,
              animationDelay: `${i * (intervalMs / 1000)}s`,
              animationIterationCount: "infinite",
              animationTimingFunction: "ease-in-out",
            }}
          >
            {p.lead}{" "}
            <strong className="font-bold text-white">{p.emphasis}</strong>
          </span>
        ))}
      </span>
    );
  }

  const list = words ?? [];
  const total = (intervalMs / 1000) * list.length;

  return (
    <span
      className={className}
      style={{ position: "relative", display: "inline-block", minWidth: "9ch", height: "1.2em", verticalAlign: "bottom" }}
    >
      {list.map((word, i) => (
        <span
          key={`${uid}-${word}-${i}`}
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            whiteSpace: "nowrap",
            opacity: 0,
            animationName: "eq-morph-word",
            animationDuration: `${total}s`,
            animationDelay: `${i * (intervalMs / 1000)}s`,
            animationIterationCount: "infinite",
            animationTimingFunction: "ease-in-out",
          }}
        >
          {word}
        </span>
      ))}
    </span>
  );
}

export default MorphWords;
