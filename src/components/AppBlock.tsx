/* eslint-disable jsx-a11y/anchor-is-valid */

import { useState } from 'react';
import { IHomebrewApp } from '../types/homebrew';
import Description from './App/Description';
import Title from './App/Title';
import ButtonIcon from './buttons/ButtonIcon';
import SpinnerSm from './spinners/SpinnerSm';

type IProps = {
  app: IHomebrewApp;
  onClickInstall: (appToken: string) => Promise<unknown>;
  onClickUninstall: (appToken: string) => Promise<unknown>;
};

function AppBlock({ app, onClickInstall, onClickUninstall }: IProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClickInstall = () => {
    setIsLoading(true);
    onClickInstall(app.token).then((res: any) => {
      setIsLoading(false);
      console.log('Result:', res);
    });
  };

  const handleClickUninstall = () => {
    setIsLoading(true);
    onClickUninstall(app.token).then((res) => {
      setIsLoading(false);
      console.log('Result:', res);
    });
  };

  const handleOpenWebsite = () => {
    console.log('App info:', app);
    window.open(app.homepage);
  };

  return (
    <div className='card m-1' style={{ width: '15rem', height: '7rem' }}>
      <div
        className='card-body row'
        style={{ textOverflow: 'clip', overflow: 'hidden' }}
      >
        <div className='col-10 p-0'>
          <div className='d-flex flex-column'>
            <Title title={app.name[0]} />
            <Description description={app.desc} />
          </div>
        </div>
        <div className='col-2 p-0 d-flex flex-column align-items-center'>
          {!app.installed && isLoading && <SpinnerSm />}
          {!app.installed && !isLoading && (
            <ButtonIcon
              title={'download'}
              colorType='success'
              onClick={handleClickInstall}
            />
          )}

          {app.installed && isLoading && <SpinnerSm />}
          {app.installed && !isLoading && (
            <ButtonIcon
              title={'delete'}
              colorType='danger'
              onClick={handleClickUninstall}
            />
          )}

          {app.count && (
            <span className='text-muted downloads-count mb-1'>{app.count}</span>
          )}

          <ButtonIcon
            title={'captive_portal'}
            colorType='info'
            onClick={handleOpenWebsite}
          />
        </div>
      </div>
    </div>
  );
}

export default AppBlock;
