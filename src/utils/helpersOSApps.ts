import { AppType, IApp } from '../types/apps';
import { IOpenSourceApp } from '../types/opensource-apps';
import { getAppCategory } from './helpers';

export const convertOpenSourceAppsToCommonStructure = (
  apps: IOpenSourceApp[]
): IApp[] => {
  return apps.map((app) => {
    const category = getAppCategory(
      app.title,
      app.short_description + app.categories.join(' ')
    );

    return {
      id: app.repo_url,
      title: app.title,
      description: app.short_description,
      categories: [category],
      installed: null,
      homepage: app.official_site || app.repo_url,
      appSourceType: AppType.OpenSourceGithub,
      sourceMetaData: { ...app },
    };
  });
};