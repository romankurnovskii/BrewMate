/* eslint-disable  */

type IProps = {
  title: string;
  onClick: (title: string) => {};
};

function UrlBtn ({ title, onClick }: IProps) {
  return (
    <a href='#' onClick={() => onClick(title)}>
      {title}
    </a>
  );
}

export default UrlBtn;
