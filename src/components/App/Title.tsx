/* eslint-disable jsx-a11y/anchor-is-valid */

type IProps = {
  title: string;
};

function Title({ title }: IProps) {
  return <h5 className='card-title'>{title}</h5>;
}

export default Title;
