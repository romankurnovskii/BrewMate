import { AppType, IApp } from '../types/apps';
import { useAppContext } from '../utils/storage';
import AppContainer from './App/AppContainer';

type IProps = {
  apps: IApp[];
};

function AppList({ apps }: IProps) {
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
    return window.brewApi
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
        return resCode;
      });
  };

  const onClickUninstallHandler = async (appToken: string) => {
    return window.brewApi
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
        return resCode;
      });
  };

  const onClickHomepageHandler = async (url: string) => {
    window.open(url);
  };

  const appsMap = apps.map((app) => {
    const isHomebrewApp = app.appSourceType === AppType.Homebrew;
    return (
      <AppContainer
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
      <div className='row'>{appsMap}</div>
    </div>
  );
}

export default AppList;
