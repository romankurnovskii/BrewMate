/* eslint-disable  */

// TODO make generic
type IProps = {
  title: string;
  onClick: (title?: string) => void;
};

function ButtonSuccess ({ title, onClick }: IProps) {
  return (
    <button
      type='button'
      className='btn btn-outline-success mx-1 px-1'
      onClick={() => onClick(title)}
    >
      {title}
    </button>
  );
}

export default ButtonSuccess;
