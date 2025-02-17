/* eslint-disable  */

type IProps = {
  description: string;
};

function Description({ description }: IProps) {
  return <p className="card-text">{description}</p>;
}

export default Description;
