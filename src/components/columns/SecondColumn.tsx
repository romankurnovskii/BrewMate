import LocalTapsContainer from '../LocalTapsContainer';

type IProps = {
  taps: string[];
};

const SecondColumn = ({ taps }: IProps) => {
  return <LocalTapsContainer taps={taps} />;
};

export default SecondColumn;
