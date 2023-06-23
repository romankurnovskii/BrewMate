import { useState, useEffect } from 'react';
import Menu from './components/menu/Menu';
import AppsContainer from './components/AppsContainer';
import AppsSource from './components/menu/AppsSource';
import SecondColumn from './components/columns/SecondColumn';
import FooterContainer from './components/FooterContainer';
import HomebrewMenu from './components/menu/Homebrew';
import Search from './components/menu/Search';
import { BrewCLICommands } from './data/constants';
import { useAppContext } from './storage';
import { AppType, IApp } from './types/apps';
import { fetchOssApps, getAllCasks, runHomebrewCommand } from './utils/api';
import {  sortAppsByInstalled } from './utils/helpers';
import { convertOssApps2IApp } from './utils/helpersOSApps';

export const INSTALLED_CASK_CATEGORY_TITLE = 'Installed on Mac OS';

const App = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showTaps, setShowTaps] = useState(false);
  const [localTaps, setLocalTaps] = useState<string[]>([]);

  const [caskApps, setCaskApps] = useState<IApp[]>([]);
  const [installedApps, setInstalledApps] = useState<IApp[]>([]);
  const [ossApps, setOssApps] = useState<IApp[]>([]);
  const [appsSource, setAppsSource] = useState<AppType>(AppType.Homebrew);

  const [appSearchQuery, setAppSearchQuery] = useState<string>('');

  const { procsOutput, apps, setProcsOutput } = useAppContext();

  useEffect(() => {
    setIsLoading(true);
    fetchCasks().then(() => {
      setIsLoading(false);
    });
  }, []);

  const fetchCasks = async () => {
    getAllCasks().then((casksDict) => {
      setCaskApps(Object.values(casksDict));
    });
  };

  const getTop90days = () => {
    setIsLoading(true);
    setSelectedCategory('Popular');
    const sortedApps = sortAppsByInstalled(caskApps);
    setCaskApps(sortedApps);
    setIsLoading(false);
  };

  const renderInstalledCasks = async () => {
    setIsLoading(true);
    setSelectedCategory(INSTALLED_CASK_CATEGORY_TITLE);

    const [installedCasks, installedFormulas] =
      await window.brewApi.getInstalled();

    setInstalledApps(installedCasks);
    setIsLoading(false);
  };

  const onCategorySelect = (category: string) => {
    setIsLoading(true);
    setSelectedCategory(category);
    setShowTaps(false);
    setIsLoading(false);
  };

  const onSearchInput = (event: any) => {
    setSelectedCategory('Search');
    setAppSearchQuery(String(event.target.value || '').toLowerCase());
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

  const onCommandClickHandler = (command: BrewCLICommands): void => {
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
        }
      })
      .catch((err) => {
        setProcsOutput('Error: ' + err);
      });
  };

  const onAppsSourceChange = (event: any) => {
    setIsLoading(true);
    setAppsSource(event.target.value);

    setSelectedCategory(null);

    if (event.target.value === AppType.OpenSourceGithub) {
      fetchOssApps().then((apps) => {
        setOssApps(convertOssApps2IApp(apps));
      });
    }
    setIsLoading(false);
  };

  return (
    <div>
      <div className="container-fluid">
        <div className="row">
          <div
            className="col position-fixed bg-light overflow-auto"
            style={{
              maxWidth: '180px',
              lineHeight: '1.0',
              height: '100%',
            }}
          >
            <nav className="nav flex-column my-1">
              <Search onChange={onSearchInput} />
              <AppsSource
                appsSource={appsSource}
                onChange={onAppsSourceChange}
              />
              <hr />
              <Menu onCategorySelect={onCategorySelect} />
              {appsSource === AppType.Homebrew && (
                <HomebrewMenu
                  onClickTopInstalls={getTop90days}
                  onClickInstalled={renderInstalledCasks}
                  onClickBrewCommand={onCommandClickHandler}
                />
              )}
            </nav>
          </div>
          {showTaps && <SecondColumn taps={localTaps} />}
          <AppsContainer
            isLoading={isLoading}
            showTaps={showTaps}
            category={selectedCategory}
            searchQuery={appSearchQuery}
            apps={
              appsSource === AppType.Homebrew &&
              selectedCategory === INSTALLED_CASK_CATEGORY_TITLE
                ? installedApps
                : appsSource === AppType.Homebrew
                ? caskApps
                : ossApps
            }
          />
        </div>
        <FooterContainer statusMsg={procsOutput} />
      </div>
    </div>
  );
};

export default App;
