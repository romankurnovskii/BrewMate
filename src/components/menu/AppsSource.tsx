import { AppType } from '../../types/apps';

type IProps = {
  appsSource: string;
  onChange: (e: any) => void;
};

const AppsSource = ({ appsSource, onChange }: IProps) => {
  return (
    <div className="input-group my-1">
      <select className="form-select" value={appsSource} onChange={onChange}>
        <option value={AppType.Homebrew}>Homebrew</option>
        <option value={AppType.OpenSourceGithub}>Open Source</option>
      </select>
    </div>
  );
};

export default AppsSource;
