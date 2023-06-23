import LinkBtn from './buttons/link';
import { GITHUB_PROJECT_URL } from '../data/constants';
import SpinnerSm from './spinners/SpinnerSm';
import packageJson from '../../package.json';

type IProps = {
  statusMsg: string;
};

const FooterContainer = ({ statusMsg }: IProps) => {
  return (
    <div className="footer">
      <div className="row justify-content-between">
        <div
          className="col-auto text-left"
          style={{
            paddingBottom: '25px',
            fontSize: '14px',
          }}
        >
          {statusMsg.length > 0 && (
            <>
              <SpinnerSm />
              {statusMsg.substring(-10)}
            </>
          )}
        </div>
        <div
          className="col-auto text-right"
          style={{
            paddingBottom: '25px',
            paddingRight: '21px',
            fontSize: '14px',
          }}
        >
          <LinkBtn
            title="Github"
            onClick={() => {
              window.open(GITHUB_PROJECT_URL);
            }}
          />{' '}
          | &copy; 2023 BrewMate ver.{packageJson.version}
        </div>
      </div>
    </div>
  );
};

export default FooterContainer;
