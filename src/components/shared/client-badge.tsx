interface ClientBadgeProps {
  client: {
    name: string;
    initials: string;
    colour: string;
    bgColour: string;
    logo?: string | null;
  };
  size?: number;
}

export function ClientBadge({ client, size = 28 }: ClientBadgeProps) {
  if (client.logo) {
    return (
      <img
        src={client.logo}
        alt={client.name}
        style={{
          height: size,
          maxWidth: size * 3,
          width: "auto",
          borderRadius: 4,
          objectFit: "contain",
          flexShrink: 0,
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 6,
        backgroundColor: client.bgColour,
        color: client.colour,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.35,
        fontWeight: 600,
        flexShrink: 0,
        lineHeight: 1,
      }}
    >
      {client.initials}
    </div>
  );
}
