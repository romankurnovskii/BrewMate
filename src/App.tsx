/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable jsx-a11y/anchor-is-valid */
import { useState, useEffect } from 'react';
import AppList from './components/AppList';
import { IHomebrewApp } from './types/homebrew';
import { BrewCLICommands, GITHUB_PROJECT_URL } from './data/constants';
import LinkBtn from './components/buttons/link';
import { runHomebrewCommand } from './utils/api';
import {
  convertHomebrewAppstoCommonStructure,
  getAppCategory,
  shuffleArray,
  sortAppsByInstalled,
} from './utils/helpers';
import { useAppContext } from './utils/storage';
import SpinnerBg from './components/spinners/SpinnerBg';
import SpinnerSm from './components/spinners/SpinnerSm';
import Menu from './components/menu/Menu';
import MenuItem from './components/menu/MenuItem';
import MenuTools from './components/menu/MenuTools';
import packageJson from '../package.json';
import { IApp } from './types/apps';

function App() {
  const [renderApps, setRenderApps] = useState<IHomebrewApp[]>([]);
  const [appsNewStructure, setAppsNewStructure] = useState<IApp[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    procsOutput,
    casks,
    installedApps,
    updateInstalledApps,
    updateCasksData,
    setProcsOutput,
  } = useAppContext();

  const INSTALLED_CASS_CATEGORY_TITLE = 'Installed on Mac OS';

  useEffect(() => {
    setIsLoading(true);
    updateCasksData().then((res) => {
      setIsLoading(false);
    });

    if (casks.length > 0) {
      setRenderApps(casks);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedCategory) {
      setRenderApps(casks);
    }
    const converteNewApps = convertHomebrewAppstoCommonStructure(renderApps);
    setAppsNewStructure(converteNewApps);
  }, [casks]);

  // Converts casks to common structure
  useEffect(() => {
    const converteNewApps = convertHomebrewAppstoCommonStructure(renderApps);
    setAppsNewStructure(converteNewApps);
  }, [renderApps]);

  const getTop30days = () => {
    setIsLoading(true);
    setSelectedCategory('Month Popular');
    const sortedCasks = sortAppsByInstalled(casks);
    setRenderApps(sortedCasks);
    setIsLoading(false);
  };

  const renderInstalledCasks = async () => {
    setIsLoading(true);
    setSelectedCategory(INSTALLED_CASS_CATEGORY_TITLE);
    updateInstalledApps().then(() => {
      setRenderApps(installedApps);
      setIsLoading(false);
    });
    setRenderApps(installedApps);
    setIsLoading(false);
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    // sort by categories
    // update rendered

    if (!category) {
      setRenderApps(casks);
      return;
    }

    // sortApps(brewApps);
    let filteredApps = category
      ? // eslint-disable-next-line array-callback-return
        casks.filter((cask) => {
          const cat = getAppCategory(cask.name[0], cask.desc);
          if (cat === category) {
            return cask;
          }
        })
      : casks;

    filteredApps = shuffleArray(filteredApps);
    setRenderApps(filteredApps);
  };

  const onSearchInput = (event: any) => {
    const searchQuery = String(event.target.value || '').toLowerCase();

    // eslint-disable-next-line array-callback-return
    const filtered = casks.filter((app) => {
      const token = app.token;
      let title = app.name; // array
      const desc = app.desc;

      let appStrInfo = `${token} ${title} ${desc}`;
      if (appStrInfo.toLowerCase().includes(searchQuery)) {
        return app;
      }
    });
    setRenderApps(filtered);
  };

  const handleCommandOutput = async (data: string) => {
    const maxLength = 100;
    let renderLine = data;
    console.log(renderLine);
    if (renderLine.length > maxLength) {
      renderLine = renderLine.substring(renderLine.length - maxLength);
    }
    setProcsOutput(renderLine);
  };

  const onCommandClickHandler = (command: BrewCLICommands) => {
    setProcsOutput('Executing ' + command);
    runHomebrewCommand(command, handleCommandOutput)
      .then(() => {
        setTimeout(() => {
          setProcsOutput('');
        }, 5000);
      })
      .catch((err) => {
        setProcsOutput('Error: ' + err);
      });
  };

  return (
    <div>
      <div className='container-fluid'>
        <div className='row'>
          {/* TODO: move to container */}
          <div
            className='col-md-2 position-fixed bg-light'
            style={{
              minWidth: '150px',
              maxWidth: '180px',
              lineHeight: '1.0',
              height: '100%',
            }}
          >
            <nav className='nav flex-column my-1'>
              <div className='input-group my-1'>
                <input
                  type='text'
                  className='form-control'
                  placeholder='Search...'
                  aria-label='Search'
                  aria-describedby='search-icon'
                  onChange={(e) => onSearchInput(e)}
                />
              </div>
              <hr />
              <Menu onCategorySelect={handleCategorySelect} />
              <hr />

              <MenuItem
                key='TopMonthItem'
                title='Month Popular'
                isActive={false}
                onClick={getTop30days}
                href='#'
              />

              <MenuItem
                title='Installed'
                isActive={false}
                onClick={renderInstalledCasks}
                href='#'
              />
              <hr />

              <MenuTools onCommandClick={onCommandClickHandler} />
            </nav>
          </div>

          <div className='col-md-10 offset-md-2'>
            <div className='header'>
              <h1>
                {selectedCategory} {!isLoading && <>{renderApps.length} apps</>}
              </h1>
            </div>
            <div className='d-flex flex-wrap'>
              {isLoading ? <SpinnerBg /> : <AppList apps={appsNewStructure} />}
            </div>
          </div>
        </div>

        <div className='footer'>
          <div className='row justify-content-between'>
            <div className='col-auto text-left'>
              &copy; 2023 BrewMate ver.{packageJson.version}
            </div>
            <div
              className='col text-center'
              style={{
                paddingBottom: '25px',
                paddingLeft: '21px',
                fontSize: '14px',
              }}
            >
              {procsOutput.length > 0 && (
                <>
                  <SpinnerSm />
                  {procsOutput.substring(-10)}
                </>
              )}
            </div>
            <div className='col-auto text-right'>
              <LinkBtn
                title='Github'
                onClick={() => {
                  window.open(GITHUB_PROJECT_URL);
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
