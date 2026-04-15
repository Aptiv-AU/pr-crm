import { Avatar } from "@/components/ui/avatar";

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
  return <Avatar initials={contact.initials} bg={contact.avatarBg} fg={contact.avatarFg} size={size} />;
}
