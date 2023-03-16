/* eslint-disable jsx-a11y/anchor-is-valid */

type IProps = {
  count: number;
};

function InstallsCount({ count }: IProps) {
  return <span className='text-muted downloads-count mb-1'>{count}</span>;
}

export default InstallsCount;
