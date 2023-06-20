/* eslint-disable  */
import { useState } from 'react';
import { categories } from '../../data/categories';
import MenuItem from './MenuItem';
import MenuTools from './MenuTools';
import { BrewCLICommands } from '../../data/constants';

type IProps = {
  onClickTopInstalls: () => void;
  onClickInstalled: () => void;
  onClickBrewCommand: (command: BrewCLICommands) => void;
};
const HomebrewMenu = ({
  onClickTopInstalls,
  onClickInstalled,
  onClickBrewCommand,
}: IProps) => {
  return (
    <div>
      <hr />
      <MenuItem
        key="TopInstalls"
        title="Popular"
        isActive={false}
        onClick={onClickTopInstalls}
        href="#"
      />
      <MenuItem
        title="Installed"
        isActive={false}
        onClick={onClickInstalled}
        href="#"
      />
      <hr />
      <MenuTools onCommandClick={onClickBrewCommand} />
      <hr />
    </div>
  );
};

export default HomebrewMenu;
