/* eslint-disable  */

type IProps = {
  isActive?: boolean;
  title: string;
  href?: string;
  className?: string;
  fontSize?: string;
  onClick: (title?: string) => void;
};

const MenuItem = ({
  title,
  href = '#',
  isActive,
  className = '',
  fontSize,
  onClick,
}: IProps) => {
  return (
    <a
      key={title + href}
      href={href}
      className={`nav-link ${isActive ? 'active' : ''} ${className}`}
      style={{ fontSize }}
      onClick={() => onClick(title)}
    >
      {title}
    </a>
  );
};

export default MenuItem;
