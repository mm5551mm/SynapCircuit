"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/context/AppContext";
import RatingStars from "./RatingStars";

type Review = { id: number; rating: number; comment: string | null; createdAt: string; userName: string };

export default function ProductReviews({ productId }: { productId: number }) {
  const { user, showToast } = useApp();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    const res = await fetch(`/api/products/${productId}/reviews`);
    const data = await res.json();
    setReviews(data.reviews ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      showToast("Please login to leave a review", "error");
      return;
    }
    setSubmitting(true);
    const res = await fetch(`/api/products/${productId}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, comment }),
    });
    setSubmitting(false);
    if (res.ok) {
      setComment("");
      showToast("Review submitted", "success");
      load();
    } else {
      const data = await res.json();
      showToast(data.error ?? "Could not submit review", "error");
    }
  }

  return (
    <div className="mt-6 space-y-6">
      {reviews.length === 0 ? (
        <p className="text-sm text-slate-500">No reviews yet. Be the first to review this product.</p>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <div key={r.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-slate-800">{r.userName}</p>
                <RatingStars rating={r.rating} />
              </div>
              {r.comment && <p className="mt-2 text-sm text-slate-600">{r.comment}</p>}
            </div>
          ))}
        </div>
      )}

      <form onSubmit={submitReview} className="rounded-xl border border-slate-200 p-4">
        <p className="mb-2 font-semibold text-slate-800">Leave a review</p>
        <div className="mb-2 flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button type="button" key={star} onClick={() => setRating(star)} className={`text-xl ${star <= rating ? "text-amber-400" : "text-slate-300"}`}>
              ★
            </button>
          ))}
        </div>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your thoughts about this product..."
          className="w-full rounded-lg border border-slate-300 p-3 text-sm"
          rows={3}
        />
        <button type="submit" disabled={submitting} className="mt-2 rounded-lg bg-violet-700 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-800">
          {submitting ? "Submitting..." : "Submit Review"}
        </button>
      </form>
    </div>
  );
}
