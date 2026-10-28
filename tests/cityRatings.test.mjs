import assert from "node:assert/strict";
import test from "node:test";
import {
  CITY_RATING_DIMENSIONS, formatRatingDate, getCityRatingSummary, getRevisitLabel, isCityScore,
} from "../src/cityRatings.ts";

const ratingWith = (values) => ({
  enabled: true,
  scores: Object.fromEntries(CITY_RATING_DIMENSIONS.map(({ key }, i) => [key, values[i]])),
});

test("a city with no rating has no manufactured average", () => {
  assert.deepEqual(getCityRatingSummary(), { completed: 0, total: 10, average: null });
});
test("ten equally weighted dimensions give the correct two-decimal average", () => {
  const result = getCityRatingSummary(ratingWith([9, 8, 7.5, 7, 8.5, 9, 8, 8, 9.5, 8.5]));
  assert.equal(result.completed, 10);
  assert.equal(result.average.toFixed(2), "8.30");
});
test("a missing or null dimension prevents an official average", () => {
  for (const missing of [undefined, null]) {
    const result = getCityRatingSummary(ratingWith([8, 8, 8, 8, 8, 8, 8, 8, 8, missing]));
    assert.equal(result.completed, 9);
    assert.equal(result.average, null);
  }
});
test("zero is a real score, unlike an unfilled dimension", () => {
  assert.equal(getCityRatingSummary(ratingWith(Array(10).fill(0))).average, 0);
  assert.equal(getCityRatingSummary(ratingWith(Array(10).fill(10))).average, 10);
});
test("only finite numeric half-point scores within 0 to 10 count", () => {
  for (const invalid of [-0.5, 10.5, 8.2, NaN, Infinity, "8", "", null, undefined, false]) {
    assert.equal(isCityScore(invalid), false);
    assert.equal(getCityRatingSummary(ratingWith([8, 8, 8, 8, 8, 8, 8, 8, 8, invalid])).average, null);
  }
  for (const valid of [0, 0.5, 7.5, 10]) assert.equal(isCityScore(valid), true);
});
test("extra fields and revisit intention never affect the average", () => {
  const rating = ratingWith(Array(10).fill(8));
  rating.scores.other = 100;
  rating.revisit = "once";
  assert.equal(getCityRatingSummary(rating).average, 8);
});
test("hiding ratings retains entered scores for later use", () => {
  const rating = { ...ratingWith(Array(10).fill(8)), enabled: false };
  assert.equal(getCityRatingSummary(rating).average, 8);
});
test("revisit supports three choices and hides empty or unknown values", () => {
  assert.equal(getRevisitLabel("definitely"), "一定再去");
  assert.equal(getRevisitLabel("maybe"), "有机会再去");
  assert.equal(getRevisitLabel("once"), "去过就好");
  for (const value of [undefined, "", "unknown"]) assert.equal(getRevisitLabel(value), undefined);
});
test("update date follows Shanghai time and invalid dates stay hidden", () => {
  assert.equal(formatRatingDate("2026-10-27T17:00:00Z"), "2026.10.28");
  assert.equal(formatRatingDate("not-a-date"), undefined);
  assert.equal(formatRatingDate(), undefined);
});
