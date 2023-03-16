import { useState } from 'react';
import { IApp } from '../../types/apps';
import ButtonIcon from '../buttons/ButtonIcon';
import SpinnerSm from '../spinners/SpinnerSm';
import Description from './Description';
import Title from './Title';

type IProps = {
  app: IApp;
  onClickHomepage: () => Promise<any>;
  onClickInstall?: () => Promise<any>;
  onClickUninstall?: () => Promise<any>;
};

function App({
  app,
  onClickHomepage,
  onClickInstall,
  onClickUninstall,
}: IProps) {
  const [isLoading, setIsLoading] = useState(false);

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

          {/* {app.count && (
            <span className='text-muted downloads-count mb-1'>{app.count}</span>
          )} */}

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

export default App;
