/* eslint-disable  */
import { BrewCLICommands, BrewCliCommandsNames } from '../../data/constants';
import MenuItem from './MenuItem';

type IProps = {
  onCommandClick: (command: BrewCLICommands) => void;
};

const MenuTools = ({ onCommandClick }: IProps) => {
  const handleClick = (command: BrewCLICommands) => {
    onCommandClick(command);
  };

  // TODO: use config file for such setup
  const commands = [
    BrewCLICommands.UPDATE,
    BrewCLICommands.UPGRADE,
    BrewCLICommands.UPGRADE_ALL,
    BrewCLICommands.OPEN_LOGS,
  ];

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
