export default function RatingStars({ rating, size = 14 }: { rating: number; size?: number }) {
  const rounded = Math.round(rating * 2) / 2;
  return (
    <div className="flex items-center gap-0.5" aria-label={`Rating: ${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = rounded >= star;
        const half = !filled && rounded >= star - 0.5;
        return (
          <span
            key={star}
            style={{ fontSize: size }}
            className={filled || half ? "text-amber-400" : "text-slate-300"}
          >
            {half ? "\u2bea" : "\u2605"}
          </span>
        );
      })}
    </div>
  );
}
