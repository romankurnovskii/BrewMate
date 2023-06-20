type IProps = {
  onChange: (e: any) => void;
};

const Search = ({ onChange }: IProps) => {
  return (
    <div className="input-group my-1">
      <input
        type="text"
        className="form-control"
        placeholder="Search..."
        aria-label="Search"
        aria-describedby="search-icon"
        onChange={onChange}
      />
    </div>
  );
};

export default Search;
