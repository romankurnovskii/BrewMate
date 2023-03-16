export interface IApp {
  id: string;
  title: string;
  description: string;
  installed: string | null; // version
  homepage: string;
}
