package com.store.inventory.order;

import java.util.Set;

public enum OrderStatus {
    PLACED, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED;

    /** Statuses a manager may move this order into. */
    public Set<OrderStatus> allowedNext() {
        return switch (this) {
            case PLACED -> Set.of(CONFIRMED, CANCELLED);
            case CONFIRMED -> Set.of(PROCESSING, CANCELLED);
            case PROCESSING -> Set.of(SHIPPED, CANCELLED);
            case SHIPPED -> Set.of(DELIVERED);
            case DELIVERED, CANCELLED -> Set.of();
        };
    }
}
