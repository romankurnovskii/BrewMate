import { useState, useEffect } from 'react';
import AppList from './components/AppList';
import { IHomebrewApp } from './types/homebrew';
import { BrewCLICommands, GITHUB_PROJECT_URL } from './data/constants';
import LinkBtn from './components/buttons/link';
import { runHomebrewCommand } from './utils/api';
import { shuffleArray, sortAppsByInstalled } from './utils/helpers';
import { useAppContext } from './utils/storage';
import SpinnerBg from './components/spinners/SpinnerBg';
import SpinnerSm from './components/spinners/SpinnerSm';
import Menu from './components/menu/Menu';
import MenuItem from './components/menu/MenuItem';
import MenuTools from './components/menu/MenuTools';
import packageJson from '../package.json';
import { AppType, IApp } from './types/apps';
import { convertHomebrewAppstoCommonStructure } from './utils/helpersHomebrew';
import SecondColumn from './components/columns/SecondColumn';

const App = () => {
  const [selectedSource, setSelectedSource] = useState<AppType>(
    AppType.Homebrew
  );
  const [renderApps, setRenderApps] = useState<IHomebrewApp[]>([]);
  const [appsNewStructure, setAppsNewStructure] = useState<IApp[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showTaps, setShowTaps] = useState(false);
  const [localTaps, setLocalTaps] = useState<string[]>([]);

  const {
    procsOutput,
    apps,
    casks,
    installedApps,
    updateInstalledApps,
    updateCasksData,
    setProcsOutput,
    updateAppsFromOpenSource,
  } = useAppContext();

  const INSTALLED_CASS_CATEGORY_TITLE = 'Installed on Mac OS';

  useEffect(() => {
    setIsLoading(true);
    updateCasksData().then((res) => {
      setIsLoading(false);
    });
    updateAppsFromOpenSource();
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
    setAppsNewStructure(apps[selectedSource]);
  }, [renderApps]);

  const getTop90days = () => {
    setIsLoading(true);
    setSelectedCategory('Popular');
    const sortedApps = sortAppsByInstalled(apps[AppType.Homebrew]);
    setAppsNewStructure(sortedApps.slice(0, 250));
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
    // setIsLoading(false);
  };

  const handleCategorySelect = (category: string) => {
    setIsLoading(true);
    setSelectedCategory(category);
    setShowTaps(false);
    // sort by categories
    // update rendered

    if (!category) {
      setAppsNewStructure(apps[selectedSource]);
      setIsLoading(false);
      return;
    }

    let filteredApps = apps[selectedSource].filter((app) =>
      app.categories.includes(category)
    );

    filteredApps = shuffleArray(filteredApps);
    setAppsNewStructure(filteredApps);
    setIsLoading(false);
  };

  const onSearchInput = (event: any) => {
    const searchQuery = String(event.target.value || '').toLowerCase();

    // eslint-disable-next-line array-callback-return
    const filtered = apps[selectedSource].filter((app) => {
      const title = app.title;
      const categories = app.categories; // array
      const desc = app.description;

      const appStrInfo = `${title} ${categories} ${desc}`;
      if (appStrInfo.toLowerCase().includes(searchQuery)) {
        return app;
      }
    });
    setAppsNewStructure(filtered);
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

    if (command === BrewCLICommands.TAPS) {
      setShowTaps(true);
    } else {
      setShowTaps(false);
    }

    runHomebrewCommand(command, handleCommandOutput)
      .then((output?: any) => {
        setTimeout(() => {
          setProcsOutput('');
        }, 5000);
        if (output && command === BrewCLICommands.TAPS) {
          setLocalTaps(output);
          console.log(151, output);
        }
      })
      .catch((err) => {
        setProcsOutput('Error: ' + err);
      });
  };

  const handleSourceChange = (event: any) => {
    setIsLoading(true);
    setSelectedCategory(null);
    setSelectedSource(event.target.value);
    if (event.target.value === AppType.OpenSourceGithub) {
      setAppsNewStructure(apps[AppType.OpenSourceGithub]);
    } else {
      setAppsNewStructure(apps[AppType.Homebrew]);
    }
    setIsLoading(false);
  };

  return (
    <div>
      <div className='container-fluid'>
        <div className='row'>
          {/* TODO: move to container */}

          <div
            className='col position-fixed bg-light overflow-auto'
            style={{
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
              <div className='input-group my-1'>
                <select
                  className='form-select'
                  value={selectedSource}
                  onChange={handleSourceChange}
                >
                  <option value={AppType.Homebrew}>Homebrew</option>
                  <option value={AppType.OpenSourceGithub}>Open Source</option>
                </select>
              </div>
              <hr />

              <Menu onCategorySelect={handleCategorySelect} />

              {selectedSource === AppType.Homebrew && (
                <>
                  <hr />
                  <MenuItem
                    key='TopInstalls'
                    title='Popular'
                    isActive={false}
                    onClick={getTop90days}
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
                  <hr />
                </>
              )}
            </nav>
          </div>

          {/* New column */}
          {showTaps && <SecondColumn taps={localTaps} />}

          {/* <div className='col-md-10 offset-md-2'> */}
          <div
            className={`col-md-${showTaps ? '8' : '10'} offset-md-4`}
            style={{
              height: '100%',
              marginLeft: `${showTaps ? '420px' : '190px'}`,
            }}
          >
            <div className='header'>
              <h1>
                {selectedCategory}
                {!isLoading && <> {appsNewStructure.length} apps</>}
              </h1>
            </div>

            <div className='d-flex flex-wrap'>
              {isLoading ? <SpinnerBg /> : <AppList apps={appsNewStructure} />}
            </div>
          </div>
        </div>

        <div className='footer'>
          <div className='row justify-content-between'>
            <div
              className='col-auto text-left'
              style={{
                paddingBottom: '25px',
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
            <div
              className='col-auto text-right'
              style={{
                paddingBottom: '25px',
                paddingRight: '21px',
                fontSize: '14px',
              }}
            >
              <LinkBtn
                title='Github'
                onClick={() => {
                  window.open(GITHUB_PROJECT_URL);
                }}
              />{' '}
              | &copy; 2023 BrewMate ver.{packageJson.version}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
