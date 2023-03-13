import React, { createContext, useContext, useState } from 'react';
import { IHomebrewApp } from '../types/homebrew';
import { getLocalInstalledApps, updateAllCasks } from './api';
import { updateInstalledStatusApps } from './helpers';

export const getDataFromStorage = (key: string) => {
  const data = localStorage.getItem(key);
  if (data) {
    return JSON.parse(data);
  }
  return null;
};

export const saveDataToStorage = (key: string, data: any) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// React Store Context

interface IAppContext {
  procsOutput: string;
  setProcsOutput: (output: string) => void;
  casks: IHomebrewApp[];
  setCasks: (apps: IHomebrewApp[]) => void;
  installedApps: IHomebrewApp[];
  setInstalledApps: (apps: IHomebrewApp[]) => void;
  updateCasksData: () => Promise<any>;
}

const AppContext = createContext<IAppContext>({
  procsOutput: '',
  setProcsOutput: () => {},
  casks: [],
  setCasks: () => {},
  installedApps: [],
  setInstalledApps: () => {},
  updateCasksData: () => Promise.resolve(),
});

export const useAppContext = () => useContext(AppContext);

export const AppContextProvider = ({ children }: any) => {
  const [procsOutput, setProcsOutput] = useState('');
  const [casks, setCasks] = useState<IHomebrewApp[]>([]);
  const [installedApps, setInstalledApps] = useState<IHomebrewApp[]>([]);

  const updateCasksData = async () => {
    console.log('Updating casks data');
    return Promise.all([updateAllCasks(), getLocalInstalledApps()])
      .then(([fetchedCasks, installedApps]) => {
        const allCasksUpdated = updateInstalledStatusApps(
          fetchedCasks,
          installedApps
        );
        setCasks(allCasksUpdated);
        setInstalledApps(installedApps);
        return allCasksUpdated;
      })
      .catch(console.error);
  };

  return (
    <AppContext.Provider
      value={{
        procsOutput,
        setProcsOutput,
        casks,
        setCasks,
        installedApps,
        setInstalledApps,
        updateCasksData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
