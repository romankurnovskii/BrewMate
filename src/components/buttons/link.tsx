/* eslint-disable jsx-a11y/anchor-is-valid */

type IProps = {
  title: string;
  href?: string;
  onClick: (title?: string) => void;
};

function LinkBtn({ title, href = '#', onClick }: IProps) {
  return (
    <a href={href} className='card-link' onClick={() => onClick(title)}>
      {title}
    </a>
  );
}

export default LinkBtn;
