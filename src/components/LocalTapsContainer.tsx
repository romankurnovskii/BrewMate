type IProps = {
  taps: string[];
};

const LocalTapsContainer = ({ taps }: IProps) => {
  return (
    <div
      className="col position-fixed bg-light overflow-auto "
      style={{
        width: '100%',
        maxWidth: '220px',
        height: '100%',
        marginLeft: '190px',
        marginRight: '5px',
        padding: '10px',
      }}
    >
      <h1 className="mt-2 mb-4">Brew taps</h1>
      {taps.map((tap, index) => (
        <div key={index} className="row my-0 py-0 ">
          <p
            className="col-md-8"
            style={{
              paddingBottom: '0px',
              fontSize: '12px',
            }}
          >
            {tap}
          </p>
          {/* <div className='col-md-1'>
            <ButtonIcon
              title={'delete'}
              colorType='danger'
              onClick={console.log}
            />
          </div>
          <div className='col-md-1'>
            <ButtonIcon
              title={'captive_portal'}
              colorType='info'
              onClick={console.log}
            />
          </div> */}
        </div>
      ))}
      {/* <button className='btn btn-sm btn-success mt-3'>+</button> */}
    </div>
  );
};

export default LocalTapsContainer;
