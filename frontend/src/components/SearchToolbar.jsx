import Button from './Button.jsx';

export default function SearchToolbar({
  keyword,
  orderBy,
  onKeywordChange,
  onOrderByChange,
  onSubmit,
}) {
  return (
    <form className="toolbar" onSubmit={onSubmit}>
      <input
        type="search"
        placeholder="검색어를 입력하세요"
        value={keyword}
        onChange={(event) => onKeywordChange(event.target.value)}
      />
      <select value={orderBy} onChange={(event) => onOrderByChange(event.target.value)}>
        <option value="recent">최신순</option>
        <option value="like">좋아요순</option>
      </select>
      <Button type="submit">검색</Button>
    </form>
  );
}
