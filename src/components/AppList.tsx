import { useEffect, useState } from 'react';
import { AppType, IApp } from '../types/apps';
import { IHomebrewApp } from '../types/homebrew';
import { useAppContext } from '../utils/storage';
import App from './App/App';

//TODO: handle scroll

type IProps = {
  apps: IHomebrewApp[];
  appsNew: IApp[];
};

function AppList({ apps, appsNew }: IProps) {
  const [appBlocksNeeded, setAppBlocksNeeded] = useState(200);
  const { setProcsOutput, updateCasksData } = useAppContext();

  const handleCommandOutput = async (data: string) => {
    const maxLength = 100;
    let renderLine = data;
    console.log(renderLine);
    if (renderLine.length > maxLength) {
      renderLine = renderLine.substring(renderLine.length - maxLength);
    }
    setProcsOutput(renderLine);
  };

  const onClickInstallHandler = async (appToken: string) => {
    await window.brewApi
      .installCask(appToken, handleCommandOutput)
      .then((resCode) => {
        if (resCode === 0) {
          setProcsOutput(appToken + ' is installed');
          updateCasksData();
        } else {
          setProcsOutput(appToken + ' install failed with code ' + resCode);
        }
        console.log('Install Cask result code: ', resCode);
        setTimeout(() => {
          setProcsOutput('');
        }, 5000);
      });
  };

  const onClickUninstallHandler = async (appToken: string) => {
    await window.brewApi
      .unInstallCask(appToken, handleCommandOutput)
      .then((resCode) => {
        console.log('UnInstallCask Cask result code: ', resCode);
        if (resCode === 0) {
          setProcsOutput(appToken + ' is uninstalled');
          updateCasksData();
        } else {
          setProcsOutput(appToken + ' uninstalle failed with code ' + resCode);
        }
        setTimeout(() => {
          setProcsOutput('');
        }, 5000);
      });
  };

  const handleScroll = () => {
    try {
      const { scrollTop, clientHeight, clientWidth } = document.documentElement;

      const [appBlockHeight, appBlockWidth] = [125, 300];
      const appBloksPerPage = Math.floor(
        ((clientHeight / appBlockHeight) * clientWidth) / appBlockWidth
      );

      const pagesCount =
        scrollTop > clientHeight + 5 ? Math.floor(scrollTop / clientHeight) : 1;
      const appBlocksScrolled = apps.slice(0, appBlocksNeeded).length;
      const tmpAppBlocksNeeded =
        appBlocksScrolled + pagesCount * appBloksPerPage;

      setAppBlocksNeeded(tmpAppBlocksNeeded);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    // Remove event listener on cleanup
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onClickHomepageHandler = async (url: string) => {
    window.open(url);
  };

  const appsMap = appsNew.map((app) => {
    const isHomebrewApp = app.appSourceType === AppType.Homebrew;

    return (
      <App
        key={app.id}
        app={app}
        onClickInstall={
          isHomebrewApp ? () => onClickInstallHandler(app.id) : undefined
        }
        onClickUninstall={
          isHomebrewApp ? () => onClickUninstallHandler(app.id) : undefined
        }
        onClickHomepage={() => onClickHomepageHandler(app.homepage)}
      />
    );
  });

  return (
    <div className='d-flex align-content-start flex-wrap'>
      <div className='row'>
        {appsMap}
        {/* {apps.map((app) => (
          <AppBlock
            key={app.token}
            app={app}
            onClickInstall={onClickInstallHandler}
            onClickUninstall={onClickUninstallHandler}
          />
        ))} */}
      </div>
    </div>
  );
}

export default AppList;
