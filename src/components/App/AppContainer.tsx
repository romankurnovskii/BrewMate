import { useState } from 'react';
import { AppType, IApp } from '../../types/apps';
import { IHomebrewApp } from '../../types/homebrew';
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
  let installsCount = 0;
  if (isHomebrew) {
    const appData = app.sourceMetaData as IHomebrewApp;
    installsCount = appData.count ? appData.count : 0;
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

  // console.log(64,app.title)

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
