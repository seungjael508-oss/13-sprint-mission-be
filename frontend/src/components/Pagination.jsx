import Button from './Button.jsx';

export default function Pagination({ page, limit, totalCount, onPageChange }) {
  const totalPages = Math.max(Math.ceil(totalCount / limit), 1);

  return (
    <div className="pagination" aria-label="pagination">
      <Button
        variant="secondary"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        이전
      </Button>
      <span>
        {page} / {totalPages}
      </span>
      <Button
        variant="secondary"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        다음
      </Button>
    </div>
  );
}
