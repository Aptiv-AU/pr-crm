interface ContactAvatarProps {
  contact: {
    name: string;
    initials: string;
    avatarBg: string;
    avatarFg: string;
    photo?: string | null;
  };
  size?: number;
}

export function ContactAvatar({ contact, size = 30 }: ContactAvatarProps) {
  if (contact.photo) {
    return (
      <img
        src={contact.photo}
        alt={contact.name}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
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
        borderRadius: "50%",
        backgroundColor: contact.avatarBg,
        color: contact.avatarFg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.32,
        fontWeight: 600,
        flexShrink: 0,
        lineHeight: 1,
      }}
    >
      {contact.initials}
    </div>
  );
}
