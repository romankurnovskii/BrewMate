/* eslint-disable jsx-a11y/anchor-is-valid */
import { BrewCLICommands, BrewCliCommandsNames } from '../../data/constants';
import MenuItem from './MenuItem';

type IProps = {
  onCommandClick: (command: BrewCLICommands) => void;
};

const MenuTools = ({ onCommandClick }: IProps) => {
  const handleClick = (command: BrewCLICommands) => {
    onCommandClick(command);
  };

  //TODO: use config file for such setup
  const commands = [BrewCLICommands.UPDATE, BrewCLICommands.UPGRADE];

  return (
    <div>
      {commands.map((command) => {
        const commandName = BrewCliCommandsNames[command];
        if (commandName) {
          return (
            <MenuItem
              key={commandName}
              title={commandName}
              href='#'
              className='my-0'
              fontSize='12px'
              onClick={() => handleClick(command)}
            />
          );
        }
        return null;
      })}
    </div>
  );
};

export default MenuTools;
