/* eslint-disable  */
import { useState } from 'react';
import { categories } from '../../data/categories';
import MenuItem from './MenuItem';

type IProps = {
  onCategorySelect: (category: string) => void;
};
const Menu = ({ onCategorySelect }: IProps) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const handleClick = (category: string) => {
    setSelectedCategory(category);
    onCategorySelect(category);
  };

  return (
    <div>
      {Object.keys(categories).map((category) => {
        return (
          <MenuItem
            key={category}
            title={category}
            isActive={selectedCategory === category}
            onClick={() => handleClick(category)}
            href="#"
          />
        );
      })}
    </div>
  );
};

export default Menu;
