interface AvatarProps {
  name: string;
  color?: string;
  initials?: string;
  size?: number;
  ring?: string;
}

export function Avatar({ name, color = "#5bcbf5", initials, size = 24, ring }: AvatarProps) {
  const i =
    initials ||
    name
      .split(" ")
      .map((p) => p[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <div
      className="grid place-items-center rounded-full font-semibold text-white shrink-0"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.42),
        background: `linear-gradient(135deg, ${color}, ${color}cc)`,
        boxShadow: ring ? `0 0 0 2px ${ring}` : undefined,
      }}
      title={name}
    >
      {i}
    </div>
  );
}

interface AvatarStackProps {
  people: { name: string; color?: string; initials?: string }[];
  max?: number;
  size?: number;
  ring?: string;
}

export function AvatarStack({ people, max = 4, size = 22, ring = "#0e2b48" }: AvatarStackProps) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <div className="flex items-center">
      {shown.map((p, i) => (
        <div key={i} style={{ marginLeft: i === 0 ? 0 : -6 }}>
          <Avatar {...p} size={size} ring={ring} />
        </div>
      ))}
      {rest > 0 && (
        <div
          style={{
            marginLeft: -6,
            width: size,
            height: size,
            fontSize: Math.round(size * 0.42),
            boxShadow: `0 0 0 2px ${ring}`,
          }}
          className="grid place-items-center rounded-full bg-[#14375a] font-semibold text-slate-300"
        >
          +{rest}
        </div>
      )}
    </div>
  );
}
