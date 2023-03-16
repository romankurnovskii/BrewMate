/* eslint-disable  */

// TODO make generic
type IProps = {
  title: string;
  onClick: (title?: string) => void;
};

function ButtonDanger ({ title, onClick }: IProps) {
  return (
    <button
      type='button'
      className='btn btn-outline-danger mx-1 px-1'
      onClick={() => onClick(title)}
    >
      {title}
    </button>
  );
}

export default ButtonDanger;
