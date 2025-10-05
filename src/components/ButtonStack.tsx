import { FavoriteButton } from './FavoriteButton';
import { LanguageButton } from './LanguageButton';

interface Poem {
  id: number;
  title: string;
  text: string;
  htmlText: string;
  poet: {
    id: number;
    name: string;
    fullName: string;
  };
}

interface ButtonStackProps {
  poem?: Poem;
  onAuthRequired: () => void;
}

export function ButtonStack({ poem, onAuthRequired }: ButtonStackProps) {
  return (
    <div className="fixed bottom-16 right-8 z-30 flex flex-col gap-2">
      <LanguageButton />
      {poem && (
        <FavoriteButton 
          poem={poem} 
          onAuthRequired={onAuthRequired}
        />
      )}
    </div>
  );
}