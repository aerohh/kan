export interface MentionMember {
  id: string;
  label: string;
  image: string | null;
}

export interface MentionDoc {
  id: string;
  label: string;
}

export interface LabelRefItem {
  publicId: string;
  name: string;
  colourCode: string | null;
}
