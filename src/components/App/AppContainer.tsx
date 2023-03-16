import { useState } from 'react';
import { AppType, IApp } from '../../types/apps';
import { IHomebrewApp } from '../../types/homebrew';
import { ISerhiiLondarOSMACApp } from '../../types/serhii-londar';
import ButtonIcon from '../buttons/ButtonIcon';
import SpinnerSm from '../spinners/SpinnerSm';
import Description from './Description';
import InstallsCount from './InstallsCount';
import Title from './Title';

type IProps = {
  app: IApp;
  onClickHomepage: () => Promise<any>;
  onClickInstall?: () => Promise<any>;
  onClickUninstall?: () => Promise<any>;
};

function AppContainer({
  app,
  onClickHomepage,
  onClickInstall,
  onClickUninstall,
}: IProps) {
  const [isLoading, setIsLoading] = useState(false);
  const isHomebrew = app.appSourceType === AppType.Homebrew;
  const isSerhiiLondarOSMAC = app.appSourceType === AppType.SerhiiLondarOSMAC;

  let appData;
  let installsCount = 0;
  if (isHomebrew) {
    appData = app.sourceMetaData as IHomebrewApp;
    installsCount = appData.count ? appData.count : 0;
    console.log(321, appData);
  }
  if (isSerhiiLondarOSMAC) {
    appData = app.sourceMetaData as ISerhiiLondarOSMACApp;
    console.log(41, appData);
  }

  const onClickInstallHandler = () => {
    setIsLoading(true);
    if (onClickInstall) {
      onClickInstall().then((res: any) => {
        setIsLoading(false);
        console.log('Result:', res);
      });
    }
  };

  const onClickUninstallHandler = () => {
    setIsLoading(true);
    if (onClickUninstall) {
      onClickUninstall().then((res) => {
        setIsLoading(false);
        console.log('Result:', res);
      });
    }
  };

  const onClickHomepageHandler = () => {
    console.log('App info:', app);
    onClickHomepage();
  };

  const isSerhiiLondarOSMACApp = (
    appMetaData: ISerhiiLondarOSMACApp | IHomebrewApp
  ): appMetaData is ISerhiiLondarOSMACApp => {
    return app.appSourceType === AppType.SerhiiLondarOSMAC;
  };

  return (
    <div className='card m-1' style={{ width: '15rem', height: '7rem' }}>
      <div
        className='card-body row'
        style={{ textOverflow: 'clip', overflow: 'hidden' }}
      >
        <div className='col-10 p-0'>
          <div className='d-flex flex-column'>
            <Title title={app.title} />
            <Description description={app.description} />
          </div>
        </div>
        <div className='col-2 p-0 d-flex flex-column align-items-center'>
          {appData && isSerhiiLondarOSMACApp(appData) && appData.icon_url && (
            <img
              src={appData.icon_url}
              alt={`${app.title} icon`}
              width='21'
              height='21'
            />
          )}

          {onClickInstall &&
            !app.installed &&
            (isLoading ? (
              <SpinnerSm />
            ) : (
              <ButtonIcon
                title={'download'}
                colorType='success'
                onClick={onClickInstallHandler}
              />
            ))}

          {app.installed && onClickUninstall && isLoading && <SpinnerSm />}
          {onClickUninstall && app.installed && !isLoading && (
            <ButtonIcon
              title={'delete'}
              colorType='danger'
              onClick={onClickUninstallHandler}
            />
          )}

          {installsCount > 0 && <InstallsCount count={installsCount} />}

          <ButtonIcon
            title={'captive_portal'}
            colorType='info'
            onClick={onClickHomepageHandler}
          />
        </div>
      </div>
    </div>
  );
}

export default AppContainer;
