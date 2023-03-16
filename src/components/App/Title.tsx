/* eslint-disable  */

type IProps = {
  title: string;
};

function Title ({ title }: IProps) {
  return <h5 className='card-title'>{title}</h5>;
}

export default Title;
