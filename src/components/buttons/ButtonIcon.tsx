type IProps = {
  title: string;
  colorType?: 'success' | 'danger' | 'info';
  onClick: (title?: string) => void;
};

function ButtonIcon ({ title, colorType, onClick }: IProps) {
  const iconColor = colorType ? 'text-' + colorType : '';
  return (
    <button className='btn p-1 btn-sm' onClick={() => onClick(title)}>
      <span className={`material-symbols-outlined ${iconColor}`}>{title}</span>
    </button>
  );
}

export default ButtonIcon;
