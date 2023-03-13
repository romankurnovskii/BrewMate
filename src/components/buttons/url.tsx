/* eslint-disable jsx-a11y/anchor-is-valid */

type IProps = {
  title: string;
  onClick: (title: string) => {};
};

function UrlBtn({ title, onClick }: IProps) {
  return (
    <a href='#' onClick={() => onClick(title)}>
      {title}
    </a>
  );
}

export default UrlBtn;
