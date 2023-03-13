/* eslint-disable jsx-a11y/anchor-is-valid */

// TODO make generic
type IProps = {
  title: string;
  onClick: (title?: string) => void;
};

function ButtonInfo({ title, onClick }: IProps) {
  return (
    <button
      type='button'
      className='btn btn-outline-info mx-1 px-1'
      onClick={() => onClick(title)}
    >
      {title}
    </button>
  );
}

export default ButtonInfo;
