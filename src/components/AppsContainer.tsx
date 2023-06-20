import { useEffect, useState } from 'react';
import { IApp } from '../types/apps';
import AppList from './AppList';
import SpinnerBg from './spinners/SpinnerBg';
import { INSTALLED_CASK_CATEGORY_TITLE } from '../App';
import { sortAppsByInstalled } from '../utils/helpers';

type IProps = {
  isLoading: boolean;
  showTaps: boolean;
  category: string | null;
  searchQuery?: string;
  apps: IApp[];
};

const AppsContainer = ({
  isLoading,
  showTaps,
  category,
  searchQuery,
  apps,
}: IProps) => {
  const [renderApps, setRenderApps] = useState<IApp[]>(apps);

  useEffect(() => {
    setRenderApps(apps);
  }, []);

  useEffect(() => {
    let filteredApps = apps;

    if (category === INSTALLED_CASK_CATEGORY_TITLE) {
      filteredApps = apps.filter((app) => app.installed != null);
    } else if (category === 'Search' && searchQuery && searchQuery !== '') {
      filteredApps = apps.filter((app) => {
        const id = app.id;
        const title = app.title;
        const categories = app.categories; // array
        const desc = app.description;

        const appStrInfo = `${id}  ${title} ${categories} ${desc}`;
        if (appStrInfo.toLowerCase().includes(searchQuery)) {
          return app;
        }
        return null;
      });
    } else if (category && category === 'Popular') {
      filteredApps = sortAppsByInstalled(apps).slice(0, 250);
    } else if (category) {
      filteredApps = apps.filter((app) => app.categories.includes(category));
    }
    setRenderApps(filteredApps);
  }, [apps, category, searchQuery]);

  return (
    <div
      className={`col-md-${showTaps ? '8' : '10'} offset-md-4`}
      style={{
        height: '100%',
        marginLeft: `${showTaps ? '420px' : '190px'}`,
      }}
    >
      <div className="header">
        <h1>
          {category}
          {!isLoading && <> {renderApps.length} apps</>}
        </h1>
      </div>

      <div className="d-flex flex-wrap">
        {isLoading ? <SpinnerBg /> : <AppList apps={renderApps} />}
      </div>
    </div>
  );
};

export default AppsContainer;
