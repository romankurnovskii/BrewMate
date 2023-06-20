import { AppType, IApp } from '../types/apps';
import { useAppContext } from '../storage';
import AppContainer from './App/AppContainer';
import { IHomebrewApp } from '../types/homebrew';

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

  const getCaskInfo = async (caskToken: string): Promise<IApp> => {
    return window.brewApi.getCaskInfo(caskToken);
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
      .uninstallCask(appToken, handleCommandOutput)
      .then((resCode) => {
        console.log('uninstallCask Cask result code: ', resCode);
        if (resCode === 0) {
          setProcsOutput(appToken + ' is uninstalled');
          updateCasksData();
        } else {
          setProcsOutput(appToken + ' uninstall failed with code ' + resCode);
        }
        setTimeout(() => {
          setProcsOutput('');
        }, 5000);
        return resCode;
      });
  };

  const onClickHomepageHandler = async (app: IApp) => {
    if (!app.homepage) {
      getCaskInfo(app.id).then((updatedApp) => {
        window.open(updatedApp.homepage);
      });
    } else {
      window.open(app.homepage);
    }
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
        onClickHomepage={() => onClickHomepageHandler(app)}
      />
    );
  });

  return (
    <div className="d-flex align-content-start flex-wrap">
      <div className="row">{appsMap}</div>
    </div>
  );
}

export default AppList;
