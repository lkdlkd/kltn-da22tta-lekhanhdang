"""test_engine.py — quick sanity check for recommend_engine v2"""
import sys
import numpy as np
sys.path.insert(0, '.')

from services.recommend_engine import (
    compute_stats, build_room_vector, build_criteria_vector,
    content_scores_batch, quality_scores_batch, score_and_rank,
)

rooms = [
    {'_id': '1', 'price': 1_200_000, 'area': 20, 'capacity': 1,
     'roomType': 'phong_tro', 'amenities': ['wifi', 'dieu_hoa'],
     'location': {'coordinates': [105.97, 10.25]},
     '_behavior': 0.8},
    {'_id': '2', 'price': 2_500_000, 'area': 35, 'capacity': 2,
     'roomType': 'chung_cu_mini', 'amenities': ['wifi', 'may_giat', 'tu_lanh'],
     'location': {'coordinates': [105.96, 10.24]},
     '_behavior': 0.3},
    {'_id': '3', 'price': 700_000, 'area': 12, 'capacity': 1,
     'roomType': 'ky_tuc_xa', 'amenities': [],
     'location': {'coordinates': [105.98, 10.26]},
     '_behavior': 0.1},
]

stats  = compute_stats(rooms)
target = rooms[0]
tvec   = build_room_vector(target, stats)

# Test 1: zero-vector should not produce nan
zero_room = {'price': 0, 'area': 0, 'capacity': 1, 'roomType': '', 'amenities': []}
zvec   = build_room_vector(zero_room, stats)
matrix = np.vstack([build_room_vector(r, stats) for r in rooms[1:]])
c = content_scores_batch(zvec, matrix)
assert not np.any(np.isnan(c)), f"FAIL: nan in zero-vector cosine: {c}"
print(f"[PASS] zero-vector cosine: {c} (no nan)")

# Test 2: quality scores — room 1 (highest _behavior=0.8) > room 2 > room 3
q = quality_scores_batch(rooms)
assert q[0] > q[1] > q[2], f"FAIL: quality order wrong: {q}"
print(f"[PASS] quality scores: {q}")

# Test 3: full ranking — room 1 is target, candidates are rooms 2 & 3
#   room 2 (bigger, more amenities) should score okay but not as close as type match would
results = score_and_rank(
    candidates=rooms[1:],
    target_vec=tvec,
    center={'lat': 10.25, 'lng': 105.97},
    radius_km=5.0,
    weights={'content': 0.55, 'location': 0.25, 'quality': 0.20},
    stats=stats,
    limit=5,
)
assert len(results) == 2, f"FAIL: expected 2 results, got {len(results)}"
assert all('_score' in r for r in results), "FAIL: _score missing"
print(f"[PASS] ranking: " + ", ".join(f"id={r['_id']} score={r['_score']}" for r in results))

# Test 4: wizard criteria vector
criteria = {'priceMin': 1_000_000, 'priceMax': 2_000_000, 'areaMin': 15,
            'capacity': 1, 'amenities': ['wifi'], 'roomType': None}
cvec = build_criteria_vector(criteria, stats)
assert cvec.shape[0] == tvec.shape[0], "FAIL: criteria vector dim mismatch"
print(f"[PASS] criteria vector dim: {cvec.shape[0]}")

# Test 5: no GPS scenario — location weight=0, weights redistribute
results_no_gps = score_and_rank(
    candidates=rooms[1:],
    target_vec=tvec,
    center=None,
    radius_km=5.0,
    weights={'content': 0.55, 'location': 0.25, 'quality': 0.20},
    stats=stats,
    limit=5,
)
assert not any(np.isnan(r['_score']) for r in results_no_gps), "FAIL: nan in no-GPS scores"
print(f"[PASS] no-GPS scores: " + ", ".join(f"id={r['_id']} score={r['_score']}" for r in results_no_gps))

print("\n=== ALL 5 TESTS PASSED ===")
