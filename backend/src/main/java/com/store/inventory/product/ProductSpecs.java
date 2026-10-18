package com.store.inventory.product;

import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.jpa.domain.Specification;

public final class ProductSpecs {

    private ProductSpecs() {}

    public static Specification<Product> filter(String q, Long categoryId, StockStatus status, Boolean active) {
        return (root, query, cb) -> {
            List<Predicate> ps = new ArrayList<>();
            if (q != null && !q.isBlank()) {
                String like = "%" + escape(q.trim().toLowerCase()) + "%";
                ps.add(cb.or(
                        cb.like(cb.lower(root.get("name")), like, '\\'),
                        cb.like(cb.lower(root.get("sku")), like, '\\'),
                        cb.like(cb.lower(root.get("barcode")), like, '\\')));
            }
            if (categoryId != null) {
                ps.add(cb.equal(root.get("category").get("id"), categoryId));
            }
            if (active != null) {
                ps.add(cb.equal(root.get("active"), active));
            }
            if (status != null) {
                switch (status) {
                    case OUT_OF_STOCK -> ps.add(cb.lessThanOrEqualTo(root.get("quantity"), 0));
                    case LOW_STOCK -> {
                        ps.add(cb.greaterThan(root.get("quantity"), 0));
                        ps.add(cb.lessThanOrEqualTo(root.<Integer>get("quantity"), root.<Integer>get("reorderThreshold")));
                    }
                    case IN_STOCK -> ps.add(cb.greaterThan(root.<Integer>get("quantity"), root.<Integer>get("reorderThreshold")));
                }
            }
            return cb.and(ps.toArray(Predicate[]::new));
        };
    }

    private static String escape(String s) {
        return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}
